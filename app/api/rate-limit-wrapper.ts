import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIdentifier, RateLimitType, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * Higher-order function that wraps API route handlers with rate limiting
 *
 * @param handler - The API route handler function
 * @param type - The type of rate limit to apply (default, auth, evidencePack, upload, ai)
 * @returns Wrapped handler with rate limiting applied
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  type: RateLimitType = "default"
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Get client identifier
    const identifier = getClientIdentifier(req.headers);

    // Check rate limit
    const limit = await rateLimit(identifier, type);

    if (!limit.allowed) {
      const retryAfter = limit.reset - Math.floor(Date.now() / 1000);
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Limit": limit.limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": limit.reset.toString(),
          },
        }
      );
    }

    // Call the handler
    const response = await handler(req);

    // Add rate limit headers to response
    response.headers.set("X-RateLimit-Limit", limit.limit.toString());
    response.headers.set("X-RateLimit-Remaining", limit.remaining.toString());
    response.headers.set("X-RateLimit-Reset", limit.reset.toString());

    return response;
  };
}

/**
 * Standalone rate limit check for use within handlers
 * Returns a response if rate limited, null if allowed
 */
export async function checkRateLimit(
  req: NextRequest,
  type: RateLimitType = "default"
): Promise<NextResponse | null> {
  const identifier = getClientIdentifier(req.headers);
  const limit = await rateLimit(identifier, type);

  if (!limit.allowed) {
    const retryAfter = limit.reset - Math.floor(Date.now() / 1000);
    return NextResponse.json(
      {
        error: "Too many requests. Please try again later.",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": limit.limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": limit.reset.toString(),
        },
      }
    );
  }

  return null;
}

/**
 * Get rate limit info for adding headers to response
 */
export async function getRateLimitHeaders(
  req: NextRequest,
  type: RateLimitType = "default"
): Promise<Record<string, string>> {
  const identifier = getClientIdentifier(req.headers);
  const limit = await rateLimit(identifier, type);

  return {
    "X-RateLimit-Limit": limit.limit.toString(),
    "X-RateLimit-Remaining": limit.remaining.toString(),
    "X-RateLimit-Reset": limit.reset.toString(),
  };
}
