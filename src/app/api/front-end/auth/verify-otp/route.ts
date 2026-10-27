import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";
import { sendWelcomeEmail1, sendSubscribeConfirmationEmail } from "@/lib/helpers/emailHelper";
import { otpService } from "@/lib/services/otpService";

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    const normalizedEmail = (email || "").trim().toLowerCase();
    const normalizedOtp = (otp || "").toString().trim();

    if (!normalizedEmail || !normalizedOtp) {
      return NextResponse.json(
        { message: "Email and 6-digit verification code are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ message: "Database connection failed" }, { status: 500 });
    }

    const user = await db.collection("users").findOne({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json({ message: "No account found with this email" }, { status: 404 });
    }

    if (user.isVerified === true) {
      return NextResponse.json({
        success: true,
        message: "Account is already verified. You can log in.",
        isAlreadyVerified: true,
      });
    }

    // Check OTP using dedicated Otp schema in MongoDB (with user fallback)
    const verifyResult = await otpService.verifyOtp({
      email: normalizedEmail,
      otp: normalizedOtp,
      purpose: "registration",
    });

    if (!verifyResult.isValid) {
      return NextResponse.json(
        { message: verifyResult.message || "Invalid verification code. Please check and try again." },
        { status: 400 }
      );
    }

    // Fetch user role
    const userRole = await db.collection("roles").findOne({ id: user.roleId });
    const roleName = userRole ? userRole.name : "customer";

    // Auto-subscribe to newsletter
    try {
      await db.collection("subscribers").updateOne(
        { email: normalizedEmail },
        {
          $set: {
            name: user.name,
            phone: user.phone || "",
            isActive: true,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            id: Date.now(),
            email: normalizedEmail,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );

      await sendSubscribeConfirmationEmail({
        to: normalizedEmail,
        name: user.name,
      });
    } catch (e) {
      console.warn("Subscriber hook error:", e);
    }

    // Send Welcome Email
    try {
      await sendWelcomeEmail1({
        to: user.email,
        name: user.name,
        userId: user.id,
      });
    } catch (e) {
      console.warn("Welcome email error:", e);
    }

    // Generate JWT access token (7 days)
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        roleId: user.roleId,
        roleName,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    // Generate refresh token (3 days)
    const refreshTokenString = jwt.sign(
      { id: user.id, type: "refresh" },
      process.env.JWT_SECRET as string,
      { expiresIn: "3d" }
    );

    await db.collection("refresh_tokens").insertOne({
      token: refreshTokenString,
      userId: user.id,
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      isRevoked: false,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Email successfully verified! Your account is now active.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roleId: user.roleId,
        roleName,
      },
      accessToken,
      refreshToken: refreshTokenString,
    });
  } catch (error: any) {
    console.error("Error in verify-otp:", error);
    return NextResponse.json({ message: "Server error during verification" }, { status: 500 });
  }
}
