import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders, validateCorsAndOrigin } from "@/lib/security/cors";
import { updateSession } from "@/lib/supabase/middleware";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");

  // 1. API Route CORS and Cross-Origin Protections
  if (pathname.startsWith("/api")) {
    const corsCheck = validateCorsAndOrigin(request);
    if (!corsCheck.allowed && corsCheck.response) {
      return corsCheck.response;
    }

    const response = NextResponse.next();
    const headers = getCorsHeaders(origin);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Essential security headers
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return response;
  }

  // 2. Refresh Supabase Session Cookies for Pages
  let response = NextResponse.next();
  if (isSupabaseConfigured()) {
    try {
      response = await updateSession(request);
    } catch {
      // Fallback
    }
  }

  // Security Headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/).*)",
  ],
};
