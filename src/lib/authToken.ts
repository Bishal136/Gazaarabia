import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

/**
 * Extract JWT token from either Authorization header or Cookie
 */
export function getTokenFromHeader(req: Request): string | null {
  let token: string | null = null;

  // 1. Try Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  // 2. Try cookies if header not found
  if (!token) {
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const match =
        cookieHeader.match(/auth_token=([^;]+)/) ||
        cookieHeader.match(/token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }
  }

  return token || null;
}

/**
 * Decode and get the user ID from token
 */
export function getUserIdFromToken(token: string): number | null {
  try {
    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) return null;

    const decoded = jwt.verify(token, secret) as { id: number };
    return decoded.id;
  } catch {
    return null;
  }
}

/**
 * Middleware-like helper to check token and return user ID
 */
export async function checkAuth(req: NextRequest): Promise<number | null> {
  const token = getTokenFromHeader(req);
  if (!token) return null;
  return getUserIdFromToken(token);
}

/**
 * Helper to fetch authenticated user and role from MongoDB
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<any | null> {
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
