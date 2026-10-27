import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase, mongoose } from "@/lib/mongoose";
import { sendOtpEmail } from "@/lib/helpers/emailHelper";
import { generateReferralCode } from "@/lib/helpers/generateReferralCodeHelper";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { logSignupAttempt, logRateLimited } from "@/lib/authLogging";
import { validatePassword } from "@/lib/passwordValidator";
import { otpService } from "@/lib/services/otpService";

export async function POST(req: Request) {
  try {
    // Rate limit: 10 signup attempts per hour per IP
    const rateLimitResult = await rateLimit(req, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 10,
      keyGenerator: (r) => `signup:${getClientIp(r)}`,
    });

    if (!rateLimitResult.allowed) {
      const { email } = await req.json().catch(() => ({ email: "unknown" }));
      logRateLimited(req, "signup", email);
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    const { name, email, password, role = "customer", phone, shopName, website } = await req.json();

    const normalizedEmail = (email || "").trim().toLowerCase();
    const normalizedName = (name || "").trim();
    const requestedRole = (role || "customer").toString().trim().toLowerCase();

    if (!normalizedName || !normalizedEmail || !password) {
      logSignupAttempt(req, normalizedEmail || "unknown", false, "Missing required fields");
      return NextResponse.json({ message: "Name, email, and password are required" }, { status: 400 });
    }

    // SECURITY: Strictly forbid admin or content_manager creation from public registration
    if (requestedRole === "admin" || requestedRole === "content_manager" || requestedRole.includes("admin")) {
      logSignupAttempt(req, normalizedEmail, false, `Security alert: attempt to register protected role: ${requestedRole}`);
      return NextResponse.json(
        {
          message: "Creating an Administrator account from the public registration interface is strictly forbidden.",
        },
        { status: 403 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      logSignupAttempt(req, normalizedEmail, false, `Weak password: ${passwordValidation.errors.join(", ")}`);
      return NextResponse.json(
        {
          message: passwordValidation.errors[0] || "Password does not meet requirements",
          errors: passwordValidation.errors,
        },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ message: "Database connection failed" }, { status: 500 });
    }

    // Determine target role mapping
    const isAmbassador = requestedRole === "ambassador";
    const isAffiliate = requestedRole === "affiliate";
    const isPartner = isAmbassador || isAffiliate;
    const userRoleName = isPartner ? "affiliate" : requestedRole;

    const selectedRole = await db.collection("roles").findOne({ name: userRoleName });
    if (!selectedRole) {
      return NextResponse.json({ message: `Invalid registration role: ${userRoleName}` }, { status: 400 });
    }

    const existingUser = await db.collection("users").findOne({ email: normalizedEmail });

    // Generate 6-digit OTP code (10 minutes validity)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const hashedPassword = await bcrypt.hash(password, 10);

    // If an account already exists and is already verified
    if (existingUser && existingUser.isVerified !== false) {
      logSignupAttempt(req, normalizedEmail, false, "Email already exists");
      return NextResponse.json(
        { message: "An account with this email address already exists. Please log in." },
        { status: 400 }
      );
    }

    // If an unverified account already exists, update credentials and re-issue OTP
    if (existingUser && existingUser.isVerified === false) {
      await db.collection("users").updateOne(
        { _id: existingUser._id },
        {
          $set: {
            name: normalizedName,
            phone: phone || existingUser.phone || "",
            password: hashedPassword,
            roleId: selectedRole.id,
            updatedAt: new Date(),
          },
        }
      );

      // Save in dedicated Otp schema in MongoDB
      const { otp: refreshedOtp } = await otpService.createOtp({
        email: normalizedEmail,
        purpose: "registration",
        validityMinutes: 10,
      });

      // Send fresh OTP email
      const emailResult = await sendOtpEmail({
        to: normalizedEmail,
        name: normalizedName,
        otp: refreshedOtp,
      });

      logSignupAttempt(req, normalizedEmail, true, "Existing unverified user refreshed OTP");

      return NextResponse.json(
        {
          success: true,
          requiresOtp: true,
          email: normalizedEmail,
          message: "A new 6-digit verification code has been sent to your email address.",
        },
        { status: 200 }
      );
    }

    // Create new user in MongoDB
    const lastUser = await db.collection("users").find().sort({ id: -1 }).limit(1).toArray();
    const nextUserId = (lastUser[0]?.id || 0) + 1;

    const newUserDoc = {
      id: nextUserId,
      name: normalizedName,
      email: normalizedEmail,
      phone: phone || "",
      password: hashedPassword,
      roleId: selectedRole.id,
      isGuest: false,
      isVerified: false,
      otpCode,
      otpExpiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("users").insertOne(newUserDoc);

    // Save in dedicated Otp schema in MongoDB
    await otpService.createOtp({
      email: normalizedEmail,
      purpose: "registration",
      validityMinutes: 10,
    });

    // If seller role, create seller profile entry
    if (requestedRole === "seller") {
      const lastSeller = await db.collection("sellers").find().sort({ id: -1 }).limit(1).toArray();
      const nextSellerId = (lastSeller[0]?.id || 0) + 1;
      const cleanShopName = shopName || `${normalizedName}'s Store`;
      const shopSlug = cleanShopName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") + `-${nextUserId}`;

      await db.collection("sellers").insertOne({
        id: nextSellerId,
        userId: nextUserId,
        shopName: cleanShopName,
        shopSlug,
        status: "Pending",
        isActive: true,
        commissionValue: 5,
        payoutDays: 30,
        minimumPayout: 50,
        availableBalance: 0,
        pendingBalance: 0,
        totalEarned: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else if (isPartner) {
      // Create affiliate entry
      const lastAffiliate = await db.collection("affiliate").find().sort({ id: -1 }).limit(1).toArray();
      const nextAffiliateId = (lastAffiliate[0]?.id || 0) + 1;

      let referralCode = generateReferralCode();
      let codeExists = await db.collection("affiliate").findOne({ referralCode });
      while (codeExists) {
        referralCode = generateReferralCode();
        codeExists = await db.collection("affiliate").findOne({ referralCode });
      }

      await db.collection("affiliate").insertOne({
        id: nextAffiliateId,
        userId: nextUserId,
        baseCommission: 10,
        shareCommission: 7,
        type: isAmbassador ? "ambassador" : "affiliate",
        isActive: true,
        website: website || "",
        referralCode,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Send OTP verification email
    const emailResult = await sendOtpEmail({
      to: normalizedEmail,
      name: normalizedName,
      otp: otpCode,
    });

    logSignupAttempt(req, normalizedEmail, true, "New user registered, OTP dispatched");

    return NextResponse.json(
      {
        success: true,
        requiresOtp: true,
        email: normalizedEmail,
        message: "Account created! A 6-digit verification code has been sent to your email.",
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Signup error:", err);
    return NextResponse.json({ message: "Server error during registration" }, { status: 500 });
  }
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
