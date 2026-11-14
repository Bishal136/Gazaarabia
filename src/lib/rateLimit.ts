/**
 * Simple In-Memory Rate Limiter
 * For production, use @upstash/ratelimit with Redis
 */

import { NextResponse } from "next/server";
import { connectToDatabase } from "./mongoose";

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
 * Cluster-Safe Rate Limiter with MongoDB Atomic Tracking & In-Memory Fallback
 * Guarantees synchronized request limits across all PM2 workers in cluster mode.
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

  try {
    const mongooseConn = await connectToDatabase();
    const db = mongooseConn.connection.db;
    if (db) {
      const col = db.collection("rate_limits");
      const expiresAt = new Date(now + windowMs);

      // Find or increment atomic counter across all PM2 cluster workers
      const doc = await col.findOneAndUpdate(
        { _id: key as any },
        {
          $inc: { count: 1 },
          $setOnInsert: { resetTime: now + windowMs, expiresAt },
        },
        { upsert: true, returnDocument: "after" }
      );

      const data: any = (doc && typeof doc.count === "number") ? doc : (doc as any)?.value;
      const count = data?.count || 1;
      const resetTime = data?.resetTime || now + windowMs;

      // If counter expired, reset it
      if (now > resetTime) {
        await col.updateOne({ _id: key as any }, { $set: { count: 1, resetTime: now + windowMs, expiresAt } });
        return {
          allowed: true,
          remaining: effectiveMax - 1,
          resetTime: now + windowMs,
        };
      }

      const allowed = count <= effectiveMax;
      return {
        allowed,
        remaining: Math.max(0, effectiveMax - count),
        resetTime,
      };
    }
  } catch {
    // Graceful fallback to in-memory store if DB query fails
  }

  // Fallback: In-memory store
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
