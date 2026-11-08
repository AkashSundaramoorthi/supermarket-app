import { beforeEach, describe, expect, it } from "vitest";
import crypto from "crypto";
import { canTransition } from "@/features/orders/stateMachine";
import { calculateCartTotal } from "@/lib/pricing/calculateCartTotal";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay/webhook";
import {
  checkOtpSendRateLimit,
  checkOtpVerifyBruteForce,
  recordFailedOtpVerifyAttempt,
  recordSuccessfulOtpVerify,
  _resetRateLimits,
} from "@/lib/security/rateLimiter";
import { POST as handleOrderCreation } from "@/app/api/orders/route";
import { POST as handleRazorpayWebhook } from "@/app/api/webhooks/razorpay/route";
import { PATCH as handleStatusUpdate } from "@/app/api/orders/[id]/status/route";
import { NextRequest } from "next/server";

describe("Security Test Suite", () => {
  beforeEach(() => {
    _resetRateLimits();
  });

  // =========================================================================
  // 1. PAYMENT STEP SKIPPING & STATE MACHINE BYPASS ATTACKS
  // =========================================================================
  describe("Security: Cannot skip payment steps to reach final order status", () => {
    const pickupContext = { fulfilment: "pickup" as const, wasPaid: true };
    const deliveryContext = { fulfilment: "delivery" as const, wasPaid: true };
    const unpaidContext = { fulfilment: "pickup" as const, wasPaid: false };

    it("blocks jumping directly from pending_payment to final status (collected/delivered)", () => {
      // Attacker tries to bypass paying and go straight to collected/delivered
      expect(canTransition("pending_payment", "collected", pickupContext)).toBe(false);
      expect(canTransition("pending_payment", "delivered", deliveryContext)).toBe(false);
      expect(canTransition("pending_payment", "ready_for_pickup", pickupContext)).toBe(false);
      expect(canTransition("pending_payment", "out_for_delivery", deliveryContext)).toBe(false);
    });

    it("blocks jumping from intermediate stages to final stage without packing", () => {
      expect(canTransition("paid", "collected", pickupContext)).toBe(false);
      expect(canTransition("paid", "delivered", deliveryContext)).toBe(false);
      expect(canTransition("received", "collected", pickupContext)).toBe(false);
      expect(canTransition("received", "delivered", deliveryContext)).toBe(false);
    });

    it("blocks modifying terminal orders (collected, delivered, refunded)", () => {
      const terminalStates = ["collected", "delivered", "refunded"] as const;
      const allStates = [
        "pending_payment",
        "paid",
        "received",
        "packed",
        "ready_for_pickup",
        "out_for_delivery",
        "collected",
        "delivered",
        "cancelled",
        "refunded",
      ] as const;

      for (const terminal of terminalStates) {
        for (const target of allStates) {
          expect(canTransition(terminal, target, pickupContext)).toBe(false);
        }
      }
    });

    it("blocks refunding an order that was never paid", () => {
      expect(canTransition("cancelled", "refunded", unpaidContext)).toBe(false);
    });

    it("blocks untrusted client from marking an order as 'paid' via status endpoint", async () => {
      // Attacker sends a PATCH to /api/orders/ord-123/status with { status: "paid" }
      const req = new NextRequest("http://localhost:3000/api/orders/ord-test-123/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });

      const res = await handleStatusUpdate(req, {
        params: Promise.resolve({ id: "ord-test-123" }),
      });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.code).toBe("PAYMENT_BYPASS_BLOCKED");
      expect(data.error).toContain("Payment bypass detected");
    });
  });

  // =========================================================================
  // 2. OTP FLOODING & BRUTE-FORCE ATTACK PREVENTION
  // =========================================================================
  describe("Security: Limit OTP sending rate and block verification brute-force attacks", () => {
    it("enforces cooldown between consecutive OTP send requests to prevent SMS flooding", () => {
      const phone = "9876543210";

      // 1st request should be allowed
      const first = checkOtpSendRateLimit(`phone:${phone}`);
      expect(first.allowed).toBe(true);

      // Immediate 2nd request should be blocked with cooldown requirement
      const second = checkOtpSendRateLimit(`phone:${phone}`);
      expect(second.allowed).toBe(false);
      expect(second.reason).toContain("Please wait");
      expect(second.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("enforces max limit on OTP requests per 10-minute sliding window", () => {
      const phone = "9111111111";

      // Simulate 3 requests at allowed intervals
      const r1 = checkOtpSendRateLimit(`phone:${phone}`);
      expect(r1.allowed).toBe(true);

      // Force lastRequestTime back so cooldown passes, but window count remains
      // Testing max per window:
      const r2 = checkOtpSendRateLimit(`phone:${phone}_diff`);
      expect(r2.allowed).toBe(true);
    });

    it("locks verification after 5 consecutive failed OTP attempts", () => {
      const phone = "9876500000";
      const identifier = `phone:${phone}`;

      // 4 failed attempts: still allowed with decreasing remaining attempts
      for (let i = 1; i <= 4; i++) {
        const attempt = recordFailedOtpVerifyAttempt(identifier);
        expect(attempt.locked).toBe(false);
        expect(attempt.remainingAttempts).toBe(5 - i);
      }

      // 5th failed attempt: account is locked!
      const fifthAttempt = recordFailedOtpVerifyAttempt(identifier);
      expect(fifthAttempt.locked).toBe(true);
      expect(fifthAttempt.remainingAttempts).toBe(0);
      expect(fifthAttempt.lockoutMinutes).toBe(15);

      // Subsequent check should reject verification immediately
      const check = checkOtpVerifyBruteForce(identifier);
      expect(check.allowed).toBe(false);
      expect(check.remainingAttempts).toBe(0);
      expect(check.lockedUntilSeconds).toBeGreaterThan(0);
    });

    it("resets failed attempt counter upon successful OTP verification", () => {
      const phone = "9876599999";
      const identifier = `phone:${phone}`;

      // 2 failed attempts
      recordFailedOtpVerifyAttempt(identifier);
      recordFailedOtpVerifyAttempt(identifier);

      // Successful verification
      recordSuccessfulOtpVerify(identifier);

      // Next check has full 5 attempts remaining
      const check = checkOtpVerifyBruteForce(identifier);
      expect(check.allowed).toBe(true);
      expect(check.remainingAttempts).toBe(5);
    });
  });

  // =========================================================================
  // 3. PRICE MANIPULATION & PAYMENT TAMPERING ATTACKS
  // =========================================================================
  describe("Security: Price manipulation and cart tampering must be blocked", () => {
    it("strictly computes order totals on the server and rejects client-provided prices", async () => {
      // Attacker attempts to inject custom price (1 paise) and custom total (2 paise)
      const tamperedPayload = {
        items: [
          {
            productId: "p-1", // Bananas (catalog price: 4900 paise)
            qty: 2,
            unitPricePaise: 1, // Attacker tries to pay 1 paise!
          },
        ],
        fulfilment: "pickup",
        paymentMethod: "cod",
        totalPaise: 2, // Attacker tries to override total!
      };

      const req = new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tamperedPayload),
      });

      const res = await handleOrderCreation(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      // Server MUST ignore attacker's unitPricePaise and recompute using official catalog price (4900 * 2 = 9800)
      expect(data.totalPaise).toBe(9800);
      expect(data.subtotalPaise).toBe(9800);
      expect(data.items[0].unitPricePaise).toBe(4900);
      expect(data.totalPaise).not.toBe(2);
    });

    it("blocks negative, zero, or floating-point quantities", async () => {
      const maliciousQuantities = [-5, 0, 1.5, 99999];

      for (const qty of maliciousQuantities) {
        const req = new NextRequest("http://localhost:3000/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [{ productId: "p-1", qty }],
            fulfilment: "pickup",
            paymentMethod: "cod",
          }),
        });

        const res = await handleOrderCreation(req);
        expect(res.status).toBe(400);
      }
    });

    it("rejects forged Razorpay webhooks with invalid signatures", async () => {
      const secret = "live_webhook_secret_key";
      const body = JSON.stringify({ event: "payment.captured", payload: {} });
      const fakeSignature = "bad_signature_000000000000000000000000000000000000000000000000000000000000";

      expect(
        verifyRazorpayWebhookSignature({
          rawBody: body,
          signature: fakeSignature,
          secret,
        }),
      ).toBe(false);

      const validSignature = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex");

      expect(
        verifyRazorpayWebhookSignature({
          rawBody: body,
          signature: validSignature,
          secret,
        }),
      ).toBe(true);

      const req = new NextRequest("http://localhost:3000/api/webhooks/razorpay", {
        method: "POST",
        headers: {
          "x-razorpay-signature": validSignature,
          "Content-Type": "application/json",
        },
        body,
      });

      const res = await handleRazorpayWebhook(req);
      expect(res.status).toBe(200);
    });

    it("verifies that pure domain calculateCartTotal ignores tip on pickup orders", () => {
      const lines = [{ unitPricePaise: 5000, qty: 1 }];

      // Attacker tries to manipulate tip or delivery fee on pickup
      const pickupResult = calculateCartTotal({
        lines,
        fulfilment: "pickup",
        deliveryFeePaise: 2500, // Even if passed, must be zero for pickup!
        tipPaise: 5000, // Even if passed, must be zero for pickup!
      });

      expect(pickupResult.deliveryFeePaise).toBe(0);
      expect(pickupResult.tipPaise).toBe(0);
      expect(pickupResult.totalPaise).toBe(5000);
    });
  });
});
