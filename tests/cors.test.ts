import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { isAllowedOrigin, validateCorsAndOrigin } from "@/lib/security/cors";
import { proxy } from "@/proxy";

describe("CORS & Origin Security Test Suite", () => {
  it("allows same-origin and trusted origins", () => {
    expect(isAllowedOrigin("http://localhost:3000")).toBe(true);
    expect(isAllowedOrigin("http://127.0.0.1:3000")).toBe(true);
    expect(isAllowedOrigin("https://supermarket-app-wheat.vercel.app")).toBe(true);
    expect(isAllowedOrigin("https://supermarket-app-git-master-akashsundaramoorthis-projects.vercel.app")).toBe(true);
    expect(isAllowedOrigin(null)).toBe(true); // Non-browser / same-origin server requests
  });

  it("identifies and blocks untrusted cross-origin requests", () => {
    expect(isAllowedOrigin("https://evil-phishing.com")).toBe(false);
    expect(isAllowedOrigin("http://malicious-site.org:8080")).toBe(false);
    expect(isAllowedOrigin("https://attacker.campusmarket.evil.com")).toBe(false);
  });

  it("handles CORS preflight OPTIONS requests from trusted origins", () => {
    const req = new NextRequest("http://localhost:3000/api/orders", {
      method: "OPTIONS",
      headers: {
        origin: "http://localhost:3000",
        "access-control-request-method": "POST",
      },
    });

    const check = validateCorsAndOrigin(req);
    expect(check.allowed).toBe(false); // Signals preflight handled directly
    expect(check.response).toBeDefined();
    expect(check.response?.status).toBe(204);
    expect(check.response?.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    expect(check.response?.headers.get("access-control-allow-methods")).toContain("POST");
    expect(check.response?.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("rejects CORS preflight OPTIONS requests from untrusted origins", () => {
    const req = new NextRequest("http://localhost:3000/api/orders", {
      method: "OPTIONS",
      headers: {
        origin: "https://evil-hacker.com",
        "access-control-request-method": "POST",
      },
    });

    const check = validateCorsAndOrigin(req);
    expect(check.allowed).toBe(false);
    expect(check.response?.status).toBe(403);
  });

  it("blocks state-changing mutation requests (POST/PATCH) from untrusted origins", async () => {
    // Attacker site triggers cross-origin POST to place an order or drain wallet
    const req = new NextRequest("http://localhost:3000/api/orders", {
      method: "POST",
      headers: {
        origin: "https://unauthorized-third-party.com",
        "content-type": "application/json",
      },
      body: JSON.stringify({ items: [{ productId: "p-1", qty: 1 }] }),
    });

    const check = validateCorsAndOrigin(req);
    expect(check.allowed).toBe(false);
    expect(check.response?.status).toBe(403);

    const data = await check.response?.json();
    expect(data.code).toBe("CORS_ORIGIN_BLOCKED");
  });

  it("allows server-to-server webhook requests without browser Origin header", () => {
    const webhookReq = new NextRequest("http://localhost:3000/api/webhooks/razorpay", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // Notice: No 'origin' header, typical of server-to-server webhooks (Razorpay/cURL)
      },
      body: JSON.stringify({ event: "payment.captured" }),
    });

    const check = validateCorsAndOrigin(webhookReq);
    expect(check.allowed).toBe(true);
  });

  it("proxy sets essential HTTP security headers on all responses", async () => {
    const req = new NextRequest("http://localhost:3000/cart");
    const res = await proxy(req);

    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(res.headers.get("Permissions-Policy")).toContain("camera=()");
  });
});
