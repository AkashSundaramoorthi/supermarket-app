import { NextRequest, NextResponse } from "next/server";

export function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : [];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return Array.from(
    new Set([
      appUrl,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      ...envOrigins,
    ]),
  );
}

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) {
    // Non-browser / same-origin requests or server-to-server (e.g. mobile apps, webhooks, cURL)
    return true;
  }

  const allowedOrigins = getAllowedOrigins();

  try {
    const originUrl = new URL(origin);
    return allowedOrigins.some((allowed) => {
      try {
        const allowedUrl = new URL(allowed);
        return originUrl.origin === allowedUrl.origin;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = isAllowedOrigin(origin);
  const allowOriginHeader = allowed && origin ? origin : getAllowedOrigins()[0];

  return {
    "Access-Control-Allow-Origin": allowOriginHeader,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key, x-razorpay-signature",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400", // 24 hours
  };
}

export function validateCorsAndOrigin(req: NextRequest): {
  allowed: boolean;
  response?: NextResponse;
} {
  const origin = req.headers.get("origin");

  // Handle preflight OPTIONS requests
  if (req.method === "OPTIONS") {
    if (origin && !isAllowedOrigin(origin)) {
      return {
        allowed: false,
        response: new NextResponse(null, {
          status: 403,
          statusText: "Forbidden CORS Origin",
        }),
      };
    }

    return {
      allowed: false,
      response: new NextResponse(null, {
        status: 204,
        headers: getCorsHeaders(origin),
      }),
    };
  }

  // State-changing requests (POST, PATCH, PUT, DELETE) must verify Origin to prevent CSRF
  const isStateChanging = ["POST", "PATCH", "PUT", "DELETE"].includes(req.method);
  const pathname = req.nextUrl?.pathname || "";

  // Webhooks are server-to-server and rely on cryptographic signature rather than browser origin
  const isWebhook = pathname.startsWith("/api/webhooks");

  if (isStateChanging && !isWebhook && origin) {
    if (!isAllowedOrigin(origin)) {
      return {
        allowed: false,
        response: NextResponse.json(
          {
            error: "Cross-Origin Request Blocked: Unauthorized Origin",
            code: "CORS_ORIGIN_BLOCKED",
          },
          { status: 403, headers: getCorsHeaders(null) },
        ),
      };
    }
  }

  return { allowed: true };
}
