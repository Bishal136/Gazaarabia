/**
 * Simple In-Memory Rate Limiter
 * For production, use @upstash/ratelimit with Redis
 */

import { NextResponse } from "next/server";

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
  message?: string; // Custom error message
}

/**
 * Rate limiter middleware
 * Returns true if request is allowed, false if rate limited
 */
export async function rateLimit(
  req: Request,
  options: RateLimitOptions
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  // Allow internal requests (e.g., NextAuth authorize loopback calls) to bypass rate limiting
  const internalAuth = req.headers.get("x-internal-auth");
  const secret = process.env.NEXTAUTH_SECRET || "internal-auth-secret";
  if (internalAuth && internalAuth === secret) {
    return {
      allowed: true,
      remaining: 999,
      resetTime: Date.now() + options.windowMs,
    };
  }

  // In development mode, relax limit significantly to prevent locking during testing
  const isDev = process.env.NODE_ENV === "development";
  const effectiveMax = isDev ? Math.max(options.maxRequests, 200) : options.maxRequests;

  const {
    windowMs,
    keyGenerator = (r) => getClientIp(r),
  } = options;

  const key = keyGenerator(req);
  const now = Date.now();

  // Initialize or get existing rate limit data
  if (!store[key] || now > store[key].resetTime) {
    store[key] = {
      count: 0,
      resetTime: now + windowMs,
    };
  }

  const remaining = effectiveMax - store[key].count;
  const allowed = store[key].count < effectiveMax;

  if (allowed) {
    store[key].count++;
  }

  return {
    allowed,
    remaining: Math.max(0, remaining - 1),
    resetTime: store[key].resetTime,
  };
}

/**
 * Extract client IP from request
 */
export function getClientIp(req: Request): string {
  // Try to get IP from headers (in order of preference)
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const clientIp = req.headers.get("x-client-ip");
  if (clientIp) return clientIp.trim();

  // Fallback
  return "unknown";
}

/**
 * Reset rate limit store (useful for unlocking or testing)
 */
export function resetRateLimitStore(key?: string) {
  if (key) {
    delete store[key];
  } else {
    for (const k in store) {
      delete store[k];
    }
  }
}

/**
 * Cleanup expired entries from store (run periodically)
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const key in store) {
    if (now > store[key].resetTime) {
      delete store[key];
    }
  }
}

// Cleanup every 5 minutes
if (typeof global !== "undefined") {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

/**
 * Rate limit response helper
 */
export function rateLimitResponse(resetTime: number) {
  const retryAfter = Math.max(1, Math.ceil((resetTime - Date.now()) / 1000));

  return NextResponse.json(
    {
      message: "Too many requests. Please try again later.",
      retryAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Reset": String(resetTime),
      },
    }
  );
}
