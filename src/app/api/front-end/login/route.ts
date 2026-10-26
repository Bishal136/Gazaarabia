import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { logLoginAttempt, logRateLimited } from "@/lib/authLogging";

export async function POST(req: Request) {
  try {
    // Rate limit: 5 attempts per 15 minutes per IP
    const rateLimitResult = await rateLimit(req, {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 attempts
    });

    if (!rateLimitResult.allowed) {
      const { email } = await req.json().catch(() => ({ email: "unknown" }));
      logRateLimited(req, "login", email);
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    const { email, password, role } = await req.json();

    if (!email || !password || !role) {
      return NextResponse.json(
        { message: "Email, password, and role are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const db = mongoose.connection.db;

    if (!db) {
      return NextResponse.json(
        { message: "Database connection failed" },
        { status: 500 }
      );
    }

    // Fetch user from MongoDB
    const user = await db.collection("users").findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      logLoginAttempt(req, email, false, "User not found");
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Fetch user role
    const userRole = await db.collection("roles").findOne({ id: user.roleId });
    const roleName = userRole ? userRole.name : "";

    // Role-based validation
    if (!roleName || roleName.toLowerCase() !== role.toLowerCase()) {
      logLoginAttempt(req, email, false, `Invalid role: ${role}`);
      return NextResponse.json(
        {
          message: `Access denied. This account is not associated with the "${role}" portal.`,
        },
        { status: 403 }
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      logLoginAttempt(req, email, false, "Invalid password");
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check affiliate if role is affiliate
    let affiliate = null;
    if (roleName.toLowerCase() === "affiliate") {
      affiliate = await db.collection("affiliate").findOne({ userId: user.id });
    }

    // Generate JWT with role name (1 hour expiration)
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        roleId: user.roleId,
        roleName: roleName,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    // Generate refresh token (3 days expiration)
    const refreshTokenString = jwt.sign(
      { id: user.id, type: "refresh" },
      process.env.JWT_SECRET as string,
      { expiresIn: "3d" }
    );

    // Store refresh token in MongoDB
    await db.collection("refresh_tokens").insertOne({
      token: refreshTokenString,
      userId: user.id,
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      isRevoked: false,
      createdAt: new Date(),
    });

    // Log successful login
    logLoginAttempt(req, email, true);

    return NextResponse.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roleId: user.roleId,
        roleName: roleName,
        affiliateId: affiliate ? affiliate.id : null,
        affiliateType: affiliate ? affiliate.type : null,
        stripeCustomerId: user.stripeCustomerId || null,
      },
      accessToken,
      refreshToken: refreshTokenString,
    });
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
