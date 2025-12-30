import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Allowed redirect paths after authentication
const ALLOWED_REDIRECTS = [
  "/dashboard",
  "/onboarding",
  "/issues",
  "/evidence",
  "/evidence-packs",
  "/comms",
  "/settings",
];

/**
 * Validates and sanitizes the redirect path to prevent open redirect attacks
 */
function getSafeRedirectPath(next: string | null): string {
  if (!next) return "/dashboard";

  // Must start with / and not be a protocol-relative URL (//)
  if (!next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }

  // Remove any query strings or fragments for path checking
  const pathOnly = next.split("?")[0].split("#")[0];

  // Check if the path starts with an allowed prefix
  const isAllowed = ALLOWED_REDIRECTS.some(
    (allowed) => pathOnly === allowed || pathOnly.startsWith(`${allowed}/`)
  );

  return isAllowed ? next : "/dashboard";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // Handle OAuth errors
  if (error) {
    console.error("Auth callback error:", error, errorDescription);
    const loginUrl = new URL("/auth/login", requestUrl.origin);
    loginUrl.searchParams.set("error", error);
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Session exchange error:", exchangeError);
      const loginUrl = new URL("/auth/login", requestUrl.origin);
      loginUrl.searchParams.set("error", "session_error");
      return NextResponse.redirect(loginUrl);
    }
  }

  const safeRedirect = getSafeRedirectPath(next);
  return NextResponse.redirect(new URL(safeRedirect, requestUrl.origin));
}

