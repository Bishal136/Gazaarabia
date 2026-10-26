import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { logTokenRefresh, logRateLimited } from "@/lib/authLogging";

export async function POST(req: Request) {
  try {
    // Rate limit: 10 refresh attempts per 5 minutes per IP (prevent token refresh spam)
    const rateLimitResult = await rateLimit(req, {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 10, // 10 attempts
      keyGenerator: (r) => `refresh:${getClientIp(r)}`, // Separate limit for refresh
    });

    if (!rateLimitResult.allowed) {
      logRateLimited(req, "refresh");
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    const { refreshToken } = await req.json();

    if (!refreshToken) {
      return NextResponse.json(
        { message: "Refresh token is required" },
        { status: 400 }
      );
    }

    // Verify refresh token signature
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any;
    } catch {
      logTokenRefresh(req, 0, false, "Invalid token signature");
      return NextResponse.json(
        { message: "Invalid or expired refresh token" },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ message: "Database connection failed" }, { status: 500 });
    }

    // Check if token exists in MongoDB and is not revoked
    const storedToken = await db.collection("refresh_tokens").findOne({ token: refreshToken });

    if (!storedToken || storedToken.isRevoked || new Date() > new Date(storedToken.expiresAt)) {
      logTokenRefresh(req, decoded.id, false, "Token revoked or expired");
      return NextResponse.json(
        { message: "Refresh token is invalid or expired" },
        { status: 401 }
      );
    }

    const user = await db.collection("users").findOne({ id: storedToken.userId });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const userRole = await db.collection("roles").findOne({ id: user.roleId });
    const roleName = userRole ? userRole.name : "";

    let affiliate = null;
    if (roleName.toLowerCase() === "affiliate") {
      affiliate = await db.collection("affiliate").findOne({ userId: user.id });
    }

    // Issue new access token (7 days)
    const newAccessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        roleId: user.roleId,
        roleName: roleName,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    // Log successful token refresh
    logTokenRefresh(req, user.id, true);

    return NextResponse.json({
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roleId: user.roleId,
        roleName: roleName,
        affiliateId: affiliate ? affiliate.id : null,
        affiliateType: affiliate ? affiliate.type : null,
        stripeCustomerId: user.stripeCustomerId,
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
