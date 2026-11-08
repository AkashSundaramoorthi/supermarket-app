import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiter for failed admin login attempts
const failedAttemptsMap = new Map<string, { count: number; lockedUntil: number }>();

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const now = Date.now();

    const record = failedAttemptsMap.get(ip);
    if (record && record.lockedUntil > now) {
      const waitSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return NextResponse.json(
        {
          error: `Firewall lockout active. Too many failed attempts. Try again in ${waitSeconds} seconds.`,
          locked: true,
          retryAfter: waitSeconds,
        },
        { status: 429 }
      );
    }

    const { password } = await request.json();
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD || "freshmart2026";

    if (!password || password !== masterPassword) {
      const currentAttempts = (record?.count || 0) + 1;
      const willLock = currentAttempts >= 5;
      const lockedUntil = willLock ? now + 15 * 60 * 1000 : 0; // 15 min lock

      failedAttemptsMap.set(ip, { count: currentAttempts, lockedUntil });

      return NextResponse.json(
        {
          error: "Invalid admin password. Access denied.",
          remainingAttempts: Math.max(0, 5 - currentAttempts),
          locked: willLock,
        },
        { status: 401 }
      );
    }

    // Success - reset failed counter
    failedAttemptsMap.delete(ip);

    // Create session token
    const sessionToken = Buffer.from(`admin_session_${Date.now()}_${Math.random()}`).toString("base64");

    const response = NextResponse.json({
      success: true,
      message: "Owner security layer unlocked",
      token: sessionToken,
    });

    response.cookies.set("qm_admin_auth", sessionToken, {
      httpOnly: false, // Accessible to client auth state check
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400, // 24 hours
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Internal server error during verification" },
      { status: 500 }
    );
  }
}
