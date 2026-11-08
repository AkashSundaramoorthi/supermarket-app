import { NextRequest, NextResponse } from "next/server";

export function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : [];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
  const vercelProdUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : null;

  return Array.from(
    new Set([
      appUrl,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      ...(vercelUrl ? [vercelUrl] : []),
      ...(vercelProdUrl ? [vercelProdUrl] : []),
      ...envOrigins,
    ]),
  );
}

export function isAllowedOrigin(origin: string | null, requestUrl?: string): boolean {
  if (!origin) {
    // Non-browser / same-origin requests or server-to-server (e.g. mobile apps, webhooks, cURL)
    return true;
  }

  // Same-origin fast path
  if (requestUrl) {
    try {
      const originUrl = new URL(origin);
      const reqUrl = new URL(requestUrl);
      if (originUrl.origin === reqUrl.origin) {
        return true;
      }
    } catch {
      // Continue to list checking
    }
  }

  const allowedOrigins = getAllowedOrigins();

  try {
    const originUrl = new URL(origin);

    // Allow Vercel preview and production deployments for this application
    if (
      originUrl.hostname.endsWith(".vercel.app") &&
      (originUrl.hostname.startsWith("supermarket-app") ||
        originUrl.hostname.includes("supermarket"))
    ) {
      return true;
    }

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

export function getCorsHeaders(origin: string | null, requestUrl?: string): Record<string, string> {
  const allowed = isAllowedOrigin(origin, requestUrl);
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
  const host = req.headers.get("host");

  // Determine if this is a same-origin request
  const isSameOrigin =
    origin &&
    (origin === req.nextUrl.origin ||
      (host && origin.replace(/^https?:\/\//, "") === host));

  const allowed = isSameOrigin || isAllowedOrigin(origin, req.url);

  // Handle preflight OPTIONS requests
  if (req.method === "OPTIONS") {
    if (origin && !allowed) {
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
        headers: getCorsHeaders(origin, req.url),
      }),
    };
  }

  // State-changing requests (POST, PATCH, PUT, DELETE) must verify Origin to prevent CSRF
  const isStateChanging = ["POST", "PATCH", "PUT", "DELETE"].includes(req.method);
  const pathname = req.nextUrl?.pathname || "";

  // Webhooks are server-to-server and rely on cryptographic signature rather than browser origin
  const isWebhook = pathname.startsWith("/api/webhooks");

  if (isStateChanging && !isWebhook && origin) {
    if (!allowed) {
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
