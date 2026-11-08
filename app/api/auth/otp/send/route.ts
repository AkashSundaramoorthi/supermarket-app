import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { checkOtpSendRateLimit } from "@/lib/security/rateLimiter";

// Verified test phone numbers registered in Supabase
export const TEST_PHONE_NUMBERS: Record<string, { otp: string; name: string }> = {
  "9876543210": { otp: "123456", name: "Verified Customer" },
  "9999999999": { otp: "123456", name: "Store Tester" },
  "9888888888": { otp: "123456", name: "Akash S" },
};

const sendOtpSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, "Enter a valid 10-digit mobile number"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = sendOtpSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Invalid phone number" },
        { status: 400 },
      );
    }

    const { phone } = result.data;

    // Rate Limiting Protection (Phone + IP)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const phoneLimit = checkOtpSendRateLimit(`phone:${phone}`);
    if (!phoneLimit.allowed) {
      return NextResponse.json(
        {
          error: phoneLimit.reason || "Too many OTP requests. Please wait before retrying.",
          retryAfterSeconds: phoneLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": String(phoneLimit.retryAfterSeconds || 60) },
        },
      );
    }

    const ipLimit = checkOtpSendRateLimit(`ip:${ip}`);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests from your network. Please wait a few moments.",
          retryAfterSeconds: ipLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": String(ipLimit.retryAfterSeconds || 60) },
        },
      );
    }

    // Check if test phone number
    if (TEST_PHONE_NUMBERS[phone]) {
      const testInfo = TEST_PHONE_NUMBERS[phone];
      return NextResponse.json({
        success: true,
        isTestNumber: true,
        testOtp: testInfo.otp,
        message: `Test number recognized for ${testInfo.name}. Use code ${testInfo.otp}.`,
      });
    }

    const internationalPhone = `+91${phone}`;

    if (isSupabaseConfigured()) {
      const supabase = createAdminClient();
      const { error } = await supabase.auth.signInWithOtp({
        phone: internationalPhone,
      });

      if (error) {
        // If phone provider has not been configured with Twilio/SMS credentials in dashboard
        if (
          error.message?.includes("provider_disabled") ||
          error.message?.includes("Unsupported phone provider")
        ) {
          return NextResponse.json(
            {
              error:
                "SMS provider not yet configured in Supabase Auth. Use test number 9876543210 (Code: 123456).",
              suggestedTestNumber: "9876543210",
              suggestedOtp: "123456",
            },
            { status: 400 },
          );
        }

        console.error("Supabase SMS OTP send error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `OTP sent to ${internationalPhone}`,
      });
    }

    // Fallback mode
    return NextResponse.json({
      success: true,
      demoMode: true,
      message: "SMS simulated. Use code 123456.",
      demoOtp: "123456",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
