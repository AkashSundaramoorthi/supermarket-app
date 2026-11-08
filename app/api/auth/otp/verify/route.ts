import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import {
  checkOtpVerifyBruteForce,
  recordFailedOtpVerifyAttempt,
  recordSuccessfulOtpVerify,
} from "@/lib/security/rateLimiter";
import { TEST_PHONE_NUMBERS } from "../send/route";

const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\d{10}$/),
  code: z.string().min(4).max(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = verifyOtpSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid phone or code format" },
        { status: 400 },
      );
    }

    const { phone, code } = result.data;
    const identifier = `phone:${phone}`;
    const internationalPhone = `+91${phone}`;

    // 1. Check Brute-Force Lockout
    const check = checkOtpVerifyBruteForce(identifier);
    if (!check.allowed) {
      const mins = Math.ceil((check.lockedUntilSeconds || 60) / 60);
      return NextResponse.json(
        {
          error: `Verification locked due to excessive failed attempts. Please try again in ${mins} minutes.`,
          locked: true,
          retryAfterSeconds: check.lockedUntilSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": String(check.lockedUntilSeconds || 900) },
        },
      );
    }

    // 2. Recognized Test Phone Number Verification
    const testConfig = TEST_PHONE_NUMBERS[phone];
    if (testConfig) {
      if (code !== testConfig.otp) {
        const attemptResult = recordFailedOtpVerifyAttempt(identifier);
        return NextResponse.json(
          {
            error: `Invalid verification code. Use test code ${testConfig.otp}.`,
            remainingAttempts: attemptResult.remainingAttempts,
          },
          { status: 401 },
        );
      }

      recordSuccessfulOtpVerify(identifier);

      if (isSupabaseConfigured()) {
        const supabase = createAdminClient();
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, phone, full_name")
          .eq("phone", phone)
          .single();

        return NextResponse.json({
          success: true,
          isTestNumber: true,
          user: {
            id: profile?.id || `user_test_${phone}`,
            phone: internationalPhone,
            name: profile?.full_name || testConfig.name,
          },
        });
      }

      return NextResponse.json({
        success: true,
        isTestNumber: true,
        user: {
          id: `user_test_${phone}`,
          phone: internationalPhone,
          name: testConfig.name,
        },
      });
    }

    // 3. Live Supabase SMS OTP Verification
    if (isSupabaseConfigured()) {
      const supabase = createAdminClient();
      const { data, error } = await supabase.auth.verifyOtp({
        phone: internationalPhone,
        token: code,
        type: "sms",
      });

      if (error || !data.session) {
        const attemptResult = recordFailedOtpVerifyAttempt(identifier);
        if (attemptResult.locked) {
          return NextResponse.json(
            {
              error: `Invalid code. Too many failed attempts. Verification locked for ${attemptResult.lockoutMinutes} minutes.`,
              locked: true,
            },
            { status: 429 },
          );
        }

        return NextResponse.json(
          {
            error: `Invalid verification code. ${attemptResult.remainingAttempts} attempts remaining.`,
            remainingAttempts: attemptResult.remainingAttempts,
          },
          { status: 401 },
        );
      }

      recordSuccessfulOtpVerify(identifier);
      return NextResponse.json({
        success: true,
        user: data.user,
        session: data.session,
      });
    }

    // Fallback Mock Verification
    if (code !== "123456") {
      const attemptResult = recordFailedOtpVerifyAttempt(identifier);
      return NextResponse.json(
        {
          error: `Invalid verification code. ${attemptResult.remainingAttempts} attempts remaining.`,
          remainingAttempts: attemptResult.remainingAttempts,
        },
        { status: 401 },
      );
    }

    recordSuccessfulOtpVerify(identifier);
    return NextResponse.json({
      success: true,
      demoMode: true,
      user: {
        id: `user_demo_${phone}`,
        phone: internationalPhone,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
