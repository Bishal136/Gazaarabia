import { connectToDatabase, mongoose } from "@/lib/mongoose";
import { Otp } from "@/models";

export interface CreateOtpParams {
  email: string;
  purpose?: "registration" | "login" | "password_reset";
  validityMinutes?: number;
}

export interface VerifyOtpParams {
  email: string;
  otp: string;
  purpose?: "registration" | "login" | "password_reset";
}

/**
 * Service to manage OTP creation, storage, and validation in MongoDB.
 * Utilizes the dedicated `otps` collection with MongoDB TTL auto-expiration.
 */
export const otpService = {
  /**
   * Generates a 6-digit OTP, saves it in the `otps` collection (and updates users collection),
   * and returns the generated code and expiry timestamp.
   */
  async createOtp({
    email,
    purpose = "registration",
    validityMinutes = 10,
  }: CreateOtpParams): Promise<{ otp: string; expiresAt: Date }> {
    await connectToDatabase();
    const normalizedEmail = email.trim().toLowerCase();

    // Invalidate any existing unused OTPs for this email & purpose
    await Otp.deleteMany({
      email: normalizedEmail,
      purpose,
      isUsed: false,
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + validityMinutes * 60 * 1000);

    // Save in dedicated Otp collection
    await Otp.create({
      email: normalizedEmail,
      otp,
      purpose,
      expiresAt,
      isUsed: false,
      attempts: 0,
    });

    // Also mirror to users collection for backward compatibility
    const db = mongoose.connection.db;
    if (db) {
      await db.collection("users").updateOne(
        { email: normalizedEmail },
        {
          $set: {
            otpCode: otp,
            otpExpiresAt: expiresAt,
            updatedAt: new Date(),
          },
        }
      );
    }

    return { otp, expiresAt };
  },

  /**
   * Validates the given OTP against MongoDB.
   * Checks both the dedicated `otps` collection and falls back to `users` collection.
   */
  async verifyOtp({
    email,
    otp,
    purpose = "registration",
  }: VerifyOtpParams): Promise<{ isValid: boolean; message?: string }> {
    await connectToDatabase();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.toString().trim();

    // 1. Look up in dedicated Otp collection
    const otpDoc = await Otp.findOne({
      email: normalizedEmail,
      purpose,
      isUsed: false,
    }).sort({ createdAt: -1 });

    const db = mongoose.connection.db;
    const userDoc = db
      ? await db.collection("users").findOne({ email: normalizedEmail })
      : null;

    // If neither exists
    if (!otpDoc && (!userDoc || !userDoc.otpCode)) {
      return {
        isValid: false,
        message: "No active verification code found for this email. Please request a new code.",
      };
    }

    // Check expiration
    const expiresAt = otpDoc ? otpDoc.expiresAt : userDoc?.otpExpiresAt;
    if (expiresAt && new Date() > new Date(expiresAt)) {
      return {
        isValid: false,
        message: "Verification code has expired. Please request a new one.",
      };
    }

    // Check code match
    const expectedOtp = otpDoc ? otpDoc.otp : userDoc?.otpCode?.toString().trim();
    if (expectedOtp !== normalizedOtp) {
      if (otpDoc) {
        await Otp.updateOne({ _id: otpDoc._id }, { $inc: { attempts: 1 } });
      }
      return {
        isValid: false,
        message: "Invalid verification code. Please check and try again.",
      };
    }

    // Mark as used in Otp collection
    if (otpDoc) {
      await Otp.updateOne(
        { _id: otpDoc._id },
        { $set: { isUsed: true, updatedAt: new Date() } }
      );
    }

    // Clear from user record and mark user verified if registration purpose
    if (db && userDoc) {
      const updateData: any = {
        updatedAt: new Date(),
      };
      if (purpose === "registration") {
        updateData.isVerified = true;
      }
      await db.collection("users").updateOne(
        { _id: userDoc._id },
        {
          $set: updateData,
          $unset: { otpCode: "", otpExpiresAt: "" },
        }
      );
    }

    return { isValid: true };
  },
};
