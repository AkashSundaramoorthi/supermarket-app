import { describe, expect, it } from "vitest";
import { POST as sendOtp } from "@/app/api/auth/otp/send/route";
import { POST as verifyOtp } from "@/app/api/auth/otp/verify/route";
import { NextRequest } from "next/server";

describe("Test Phone Number OTP Flow", () => {
  it("recognizes test phone number and returns fixed test OTP", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543210" }),
    });
    const res = await sendOtp(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.isTestNumber).toBe(true);
    expect(json.testOtp).toBe("123456");
  });

  it("verifies test phone number with code 123456", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543210", code: "123456" }),
    });
    const res = await verifyOtp(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.isTestNumber).toBe(true);
    expect(json.user.phone).toBe("+919876543210");
  });

  it("rejects invalid code for test phone number", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543210", code: "999999" }),
    });
    const res = await verifyOtp(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("Invalid verification code");
  });
});
