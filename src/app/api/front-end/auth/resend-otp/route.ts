import { NextResponse } from "next/server";
import { connectToDatabase, mongoose } from "@/lib/mongoose";
import { sendOtpEmail } from "@/lib/helpers/emailHelper";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    // Rate limit: 5 requests per 15 mins
    const rateLimitResult = await rateLimit(req, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
    });

    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    const { email } = await req.json();
    const normalizedEmail = (email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
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
        message: "Your account is already verified. You can log in directly.",
        isAlreadyVerified: true,
      });
    }

    // Generate fresh 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { otpCode: otp, otpExpiresAt, updatedAt: new Date() } }
    );

    await sendOtpEmail({
      to: user.email,
      name: user.name,
      otp,
    });

    return NextResponse.json({
      success: true,
      message: "A new verification code has been sent to your email address.",
    });
  } catch (error: any) {
    console.error("Error in resend-otp:", error);
    return NextResponse.json({ message: "Failed to resend verification code" }, { status: 500 });
  }
}
