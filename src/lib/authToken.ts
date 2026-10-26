import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { getToken as getNextAuthToken } from "next-auth/jwt";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

/**
 * Extract JWT token from either Authorization header or Cookie
 */
export function getTokenFromHeader(req: Request): string | null {
  let token: string | null = null;

  // 1. Try Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1]?.trim() || null;
  }

  // Treat string "undefined" or "null" as null
  if (token === "undefined" || token === "null" || token === "") {
    token = null;
  }

  // 2. Try cookies if header not found
  if (!token) {
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const match =
        cookieHeader.match(/auth_token=([^;]+)/) ||
        cookieHeader.match(/token=([^;]+)/);
      if (match) {
        token = match[1]?.trim() || null;
      }
    }
  }

  if (token === "undefined" || token === "null" || token === "") {
    token = null;
  }

  return token || null;
}

/**
 * Decode and get the user ID from token
 */
export function getUserIdFromToken(token: string): number | null {
  try {
    if (!token || token === "undefined" || token === "null") return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) return null;

    const decoded = jwt.verify(token, secret) as { id: number };
    return decoded.id;
  } catch {
    return null;
  }
}

/**
 * Middleware-like helper to check token and return user ID.
 * Supports:
 * 1. Bearer token in Authorization header
 * 2. auth_token / token in cookies
 * 3. NextAuth session token in cookies (fallback)
 */
export async function checkAuth(req: Request | NextRequest): Promise<number | null> {
  // 1. Check custom JWT from header or cookies
  const token = getTokenFromHeader(req);
  if (token) {
    const userId = getUserIdFromToken(token);
    if (userId) return userId;
  }

  // 2. Check NextAuth session token from cookies
  try {
    const nextAuthToken = await getNextAuthToken({
      req: req as any,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (nextAuthToken) {
      const rawId = nextAuthToken.user_id || nextAuthToken.id;
      const userId = Number(rawId);
      if (!isNaN(userId) && userId > 0) {
        return userId;
      }
    }
  } catch {
    // NextAuth extraction error
  }

  return null;
}

/**
 * Helper to fetch authenticated user and role from MongoDB
 */
export async function getAuthenticatedUser(req: Request | NextRequest): Promise<any | null> {
  const userId = await checkAuth(req);
  if (!userId) return null;

  try {
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) return null;

    const user = await db.collection("users").findOne({ id: userId });
    if (!user) return null;

    const role = await db.collection("roles").findOne({ id: user.roleId });
    return {
      ...user,
      role: role ? { name: role.name } : { name: "" },
    };
  } catch {
    return null;
  }
}
