/**
 * Production-ready Rate Limiting
 *
 * Uses Upstash Redis in production for distributed rate limiting
 * Falls back to in-memory store for development/testing
 */

// Rate limit configurations for different endpoints
export const RATE_LIMITS = {
  // General API requests
  default: { requests: 60, window: 60 }, // 60 requests per minute
  // Authentication endpoints (stricter to prevent brute force)
  auth: { requests: 5, window: 60 }, // 5 attempts per minute
  // Evidence pack generation (expensive operation)
  evidencePack: { requests: 3, window: 60 }, // 3 per minute
  // File uploads
  upload: { requests: 10, window: 60 }, // 10 uploads per minute
  // AI features (costly)
  ai: { requests: 5, window: 60 }, // 5 AI requests per minute
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number; // Unix timestamp when the limit resets
  limit: number;
}

// In-memory store for development/fallback
interface MemoryStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

const memoryStore: MemoryStore = {};

/**
 * Check if Upstash Redis is configured
 */
function isUpstashConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/**
 * Rate limit using Upstash Redis (production)
 */
async function rateLimitWithUpstash(
  identifier: string,
  type: RateLimitType = "default"
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[type];
  const key = `ratelimit:${type}:${identifier}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - config.window;

  try {
    const response = await fetch(
      `${process.env.UPSTASH_REDIS_REST_URL}/pipeline`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          // Remove old entries outside the window
          ["ZREMRANGEBYSCORE", key, "0", windowStart.toString()],
          // Add current request
          ["ZADD", key, now.toString(), `${now}:${Math.random()}`],
          // Count requests in window
          ["ZCARD", key],
          // Set expiry on the key
          ["EXPIRE", key, config.window.toString()],
        ]),
      }
    );

    if (!response.ok) {
      console.error("Upstash rate limit error:", await response.text());
      // Fall back to allowing the request if Redis fails
      return {
        allowed: true,
        remaining: config.requests,
        reset: now + config.window,
        limit: config.requests,
      };
    }

    const results = await response.json();
    const count = results[2]?.result || 0;
    const allowed = count <= config.requests;

    return {
      allowed,
      remaining: Math.max(0, config.requests - count),
      reset: now + config.window,
      limit: config.requests,
    };
  } catch (error) {
    console.error("Upstash rate limit error:", error);
    // Fall back to allowing the request if Redis fails
    return {
      allowed: true,
      remaining: config.requests,
      reset: now + config.window,
      limit: config.requests,
    };
  }
}

/**
 * Rate limit using in-memory store (development/fallback)
 */
function rateLimitWithMemory(
  identifier: string,
  type: RateLimitType = "default"
): RateLimitResult {
  const config = RATE_LIMITS[type];
  const key = `${type}:${identifier}`;
  const now = Math.floor(Date.now() / 1000);

  const entry = memoryStore[key];

  // If no entry or window has passed, reset
  if (!entry || now >= entry.resetAt) {
    memoryStore[key] = {
      count: 1,
      resetAt: now + config.window,
    };
    return {
      allowed: true,
      remaining: config.requests - 1,
      reset: now + config.window,
      limit: config.requests,
    };
  }

  // Increment count
  entry.count++;

  const allowed = entry.count <= config.requests;

  return {
    allowed,
    remaining: Math.max(0, config.requests - entry.count),
    reset: entry.resetAt,
    limit: config.requests,
  };
}

/**
 * Main rate limit function - uses Redis in production, memory in development
 */
export async function rateLimit(
  identifier: string,
  type: RateLimitType = "default"
): Promise<RateLimitResult> {
  if (isUpstashConfigured()) {
    return rateLimitWithUpstash(identifier, type);
  }

  // Use memory store for development
  return rateLimitWithMemory(identifier, type);
}

/**
 * Synchronous rate limit for backwards compatibility
 * Uses memory store only - for use in middleware or sync contexts
 */
export function rateLimitSync(
  identifier: string,
  type: RateLimitType = "default"
): RateLimitResult {
  return rateLimitWithMemory(identifier, type);
}

/**
 * Get client identifier from request headers
 */
export function getClientIdentifier(headers: Headers): string {
  // Try to get real IP from various headers (in order of reliability)
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(",")[0].trim();
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback
  return "unknown";
}

// Cleanup memory store periodically (every minute)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Math.floor(Date.now() / 1000);
    Object.keys(memoryStore).forEach((key) => {
      if (memoryStore[key].resetAt <= now) {
        delete memoryStore[key];
      }
    });
  }, 60 * 1000);
}
