import { describe, expect, it } from "vitest";
import crypto from "crypto";
import { verifyRazorpayWebhookSignature } from "./webhook";

describe("verifyRazorpayWebhookSignature", () => {
  const secret = "test_webhook_secret_key_123";
  const payload = JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: { id: "pay_123", amount: 5000 } } },
  });

  it("verifies a valid HMAC-SHA256 signature", () => {
    const validSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const result = verifyRazorpayWebhookSignature({
      rawBody: payload,
      signature: validSignature,
      secret,
    });

    expect(result).toBe(true);
  });

  it("rejects an invalid signature", () => {
    const result = verifyRazorpayWebhookSignature({
      rawBody: payload,
      signature: "invalid_signature_hex_value_0000000000000000000000000000000000000000000000000000000000000000",
      secret,
    });

    expect(result).toBe(false);
  });

  it("rejects empty inputs gracefully", () => {
    expect(
      verifyRazorpayWebhookSignature({
        rawBody: "",
        signature: "",
        secret,
      }),
    ).toBe(false);
  });
});
