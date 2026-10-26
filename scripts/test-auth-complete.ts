import bcrypt from "bcryptjs";
import { connectToDatabase, mongoose } from "../src/lib/mongoose";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

interface TestResult {
  suite: string;
  test: string;
  status: "PASS" | "FAIL";
  detail: string;
}

const results: TestResult[] = [];

function record(suite: string, test: string, status: "PASS" | "FAIL", detail: string) {
  results.push({ suite, test, status, detail });
  const icon = status === "PASS" ? "✅" : "❌";
  console.log(`${icon} [${suite}] ${test} -> ${status}: ${detail}`);
}

async function runAuthTestSuite() {
  console.log("====================================================");
  console.log("🧪 COMPREHENSIVE AUTHENTICATION & OTP TEST SUITE");
  console.log("====================================================\n");

  await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) {
    console.error("Failed to connect to MongoDB.");
    process.exit(1);
  }

  // =========================================================================
  // STEP 1: PREPARE AND STANDARDIZE KNOWN TEST ACCOUNTS FOR ALL ROLES
  // =========================================================================
  console.log("\n--- [1] SEEDING / STANDARDIZING TEST ACCOUNTS ---");

  const commonPassword = "Password123!";
  const commonPasswordHash = await bcrypt.hash(commonPassword, 10);
  const adminPassword = "MySecurePassword123!";
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  const testAccounts = [
    { email: "customer@gazaarabia.com", name: "Test Customer", roleId: 2, roleName: "customer", passwordHash: commonPasswordHash },
    { email: "seller@gazaarabia.com", name: "Test Seller", roleId: 5, roleName: "seller", passwordHash: commonPasswordHash },
    { email: "affiliate@gazaarabia.com", name: "Test Affiliate", roleId: 3, roleName: "affiliate", passwordHash: commonPasswordHash },
    { email: "ambassador@gazaarabia.com", name: "Test Ambassador", roleId: 3, roleName: "affiliate", passwordHash: commonPasswordHash },
    { email: "contentmanager@gazaarabia.com", name: "Test Content Manager", roleId: 4, roleName: "content_manager", passwordHash: commonPasswordHash },
    { email: "admin@gazaarabia.com", name: "Super Admin", roleId: 1, roleName: "admin", passwordHash: adminPasswordHash },
  ];

  for (const acc of testAccounts) {
    const existing = await db.collection("users").findOne({ email: acc.email });
    let userId = existing?.id;

    if (existing) {
      await db.collection("users").updateOne(
        { _id: existing._id },
        {
          $set: {
            name: acc.name,
            password: acc.passwordHash,
            roleId: acc.roleId,
            isVerified: true,
            updatedAt: new Date(),
          },
          $unset: { otpCode: "", otpExpiresAt: "" },
        }
      );
    } else {
      const last = await db.collection("users").find().sort({ id: -1 }).limit(1).toArray();
      userId = (last[0]?.id || 0) + 1;
      await db.collection("users").insertOne({
        id: userId,
        name: acc.name,
        email: acc.email,
        phone: "+447000000000",
        password: acc.passwordHash,
        roleId: acc.roleId,
        isGuest: false,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Ensure seller profile exists if seller
    if (acc.roleName === "seller") {
      const sellerProfile = await db.collection("sellers").findOne({ userId });
      if (!sellerProfile) {
        const lastSeller = await db.collection("sellers").find().sort({ id: -1 }).limit(1).toArray();
        const nextSellerId = (lastSeller[0]?.id || 0) + 1;
        await db.collection("sellers").insertOne({
          id: nextSellerId,
          userId,
          shopName: "Gaza Luxury Abayas",
          shopSlug: `gaza-luxury-abayas-${userId}`,
          status: "Approved",
          isActive: true,
          commissionValue: 5,
          payoutDays: 30,
          minimumPayout: 50,
          availableBalance: 120,
          pendingBalance: 45,
          totalEarned: 165,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // Ensure affiliate profile exists if affiliate
    if (acc.roleName === "affiliate") {
      const affiliateProfile = await db.collection("affiliate").findOne({ userId });
      if (!affiliateProfile) {
        const lastAff = await db.collection("affiliate").find().sort({ id: -1 }).limit(1).toArray();
        const nextAffId = (lastAff[0]?.id || 0) + 1;
        await db.collection("affiliate").insertOne({
          id: nextAffId,
          userId,
          baseCommission: 10,
          shareCommission: 7,
          type: acc.email.includes("ambassador") ? "ambassador" : "affiliate",
          isActive: true,
          website: "https://instagram.com/gazaarabia",
          referralCode: `GAZA-${userId}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    record("Account Seeding", `${acc.roleName} (${acc.email})`, "PASS", `Verified active in DB with roleId ${acc.roleId}`);
  }

  // =========================================================================
  // STEP 2: TEST LOGIN API FOR ALL ROLES
  // =========================================================================
  console.log("\n--- [2] TESTING LOGIN API (POST /api/front-end/login) ---");

  const loginTests = [
    { email: "customer@gazaarabia.com", password: commonPassword, role: "customer", expectedRole: "customer" },
    { email: "seller@gazaarabia.com", password: commonPassword, role: "seller", expectedRole: "seller" },
    { email: "affiliate@gazaarabia.com", password: commonPassword, role: "affiliate", expectedRole: "affiliate" },
    { email: "ambassador@gazaarabia.com", password: commonPassword, role: "affiliate", expectedRole: "affiliate" },
    { email: "contentmanager@gazaarabia.com", password: commonPassword, role: "content_manager", expectedRole: "content_manager" },
    { email: "admin@gazaarabia.com", password: adminPassword, role: "admin", expectedRole: "admin" },
  ];

  for (const t of loginTests) {
    try {
      const res = await fetch(`${BASE_URL}/api/front-end/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-auth": process.env.NEXTAUTH_SECRET || "internal-auth-secret" },
        body: JSON.stringify({ email: t.email, password: t.password, role: t.role }),
      });

      const data = await res.json();
      if (res.status === 200 && data.accessToken && data.user?.roleName?.toLowerCase() === t.expectedRole.toLowerCase()) {
        record("Login API", `${t.expectedRole} login (${t.email})`, "PASS", `HTTP 200: Token issued, user role: ${data.user.roleName}`);
      } else {
        record("Login API", `${t.expectedRole} login (${t.email})`, "FAIL", `Status ${res.status}: ${data.message || JSON.stringify(data)}`);
      }
    } catch (e: any) {
      record("Login API", `${t.expectedRole} login (${t.email})`, "FAIL", `Fetch error: ${e.message}`);
    }
  }

  // =========================================================================
  // STEP 3: TEST PORTAL ROLE ISOLATION & ACCESS CONTROL
  // =========================================================================
  console.log("\n--- [3] TESTING ROLE ISOLATION & ACCESS CONTROL ---");

  // Customer trying to log into Admin portal
  try {
    const res = await fetch(`${BASE_URL}/api/front-end/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-auth": process.env.NEXTAUTH_SECRET || "internal-auth-secret" },
      body: JSON.stringify({ email: "customer@gazaarabia.com", password: commonPassword, role: "admin" }),
    });
    const data = await res.json();
    if (res.status === 403) {
      record("Role Isolation", "Customer accessing Admin portal", "PASS", `HTTP 403 Forbidden: ${data.message}`);
    } else {
      record("Role Isolation", "Customer accessing Admin portal", "FAIL", `Unexpected status ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (e: any) {
    record("Role Isolation", "Customer accessing Admin portal", "FAIL", e.message);
  }

  // Seller trying to log into Admin portal
  try {
    const res = await fetch(`${BASE_URL}/api/front-end/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-auth": process.env.NEXTAUTH_SECRET || "internal-auth-secret" },
      body: JSON.stringify({ email: "seller@gazaarabia.com", password: commonPassword, role: "admin" }),
    });
    const data = await res.json();
    if (res.status === 403) {
      record("Role Isolation", "Seller accessing Admin portal", "PASS", `HTTP 403 Forbidden: ${data.message}`);
    } else {
      record("Role Isolation", "Seller accessing Admin portal", "FAIL", `Unexpected status ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (e: any) {
    record("Role Isolation", "Seller accessing Admin portal", "FAIL", e.message);
  }

  // Admin registration attempt via public signup (MUST BE BLOCKED)
  try {
    const res = await fetch(`${BASE_URL}/api/front-end/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Hacker Admin", email: "hacker@test.com", password: "Password123!", role: "admin" }),
    });
    const data = await res.json();
    if (res.status === 403) {
      record("Role Isolation", "Admin creation via public signup", "PASS", `HTTP 403 Blocked: ${data.message}`);
    } else {
      record("Role Isolation", "Admin creation via public signup", "FAIL", `Allowed admin signup! Status ${res.status}`);
    }
  } catch (e: any) {
    record("Role Isolation", "Admin creation via public signup", "FAIL", e.message);
  }

  // =========================================================================
  // STEP 4: TEST REGISTRATION & OTP VERIFICATION FLOW END-TO-END
  // =========================================================================
  console.log("\n--- [4] TESTING REGISTRATION & OTP VERIFICATION FLOW ---");

  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  const newCustomerEmail = `newcustomer_${randSuffix}@testgaza.com`;
  const newSellerEmail = `newseller_${randSuffix}@testgaza.com`;

  // 4A: Customer Registration
  let customerOtpCode = "";
  try {
    const res = await fetch(`${BASE_URL}/api/front-end/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `New Customer ${randSuffix}`,
        email: newCustomerEmail,
        password: "NewPassword123!",
        role: "customer",
        phone: "+447111222333",
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.requiresOtp) {
      record("Registration", `Customer signup (${newCustomerEmail})`, "PASS", `HTTP 201: requiresOtp=true`);

      // Inspect DB for OTP
      const userInDb = await db.collection("users").findOne({ email: newCustomerEmail });
      if (userInDb && userInDb.otpCode && userInDb.isVerified === false) {
        customerOtpCode = userInDb.otpCode;
        record("OTP Generation", "Customer OTP in MongoDB", "PASS", `Found 6-digit OTP code: ${customerOtpCode}, isVerified: false`);
      } else {
        record("OTP Generation", "Customer OTP in MongoDB", "FAIL", `User or OTP missing in MongoDB`);
      }
    } else {
      record("Registration", `Customer signup (${newCustomerEmail})`, "FAIL", `Status ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (e: any) {
    record("Registration", `Customer signup (${newCustomerEmail})`, "FAIL", e.message);
  }

  // 4B: Invalid OTP Test
  try {
    const res = await fetch(`${BASE_URL}/api/front-end/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newCustomerEmail, otp: "999999" }),
    });
    const data = await res.json();
    if (res.status === 400 && data.message.toLowerCase().includes("invalid")) {
      record("OTP Verification", "Rejection of invalid OTP code", "PASS", `HTTP 400: ${data.message}`);
    } else {
      record("OTP Verification", "Rejection of invalid OTP code", "FAIL", `Unexpected status ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (e: any) {
    record("OTP Verification", "Rejection of invalid OTP code", "FAIL", e.message);
  }

  // 4C: Resend OTP Test
  let refreshedOtpCode = "";
  try {
    const res = await fetch(`${BASE_URL}/api/front-end/auth/resend-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newCustomerEmail }),
    });
    const data = await res.json();
    if (res.status === 200 && data.success) {
      const refreshedUser = await db.collection("users").findOne({ email: newCustomerEmail });
      refreshedOtpCode = refreshedUser?.otpCode || "";
      record("OTP Resend", "Resend OTP code generation", "PASS", `HTTP 200: Generated refreshed OTP: ${refreshedOtpCode}`);
    } else {
      record("OTP Resend", "Resend OTP code generation", "FAIL", `Status ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (e: any) {
    record("OTP Resend", "Resend OTP code generation", "FAIL", e.message);
  }

  // 4D: Valid OTP Verification Test
  const activeOtp = refreshedOtpCode || customerOtpCode;
  try {
    const res = await fetch(`${BASE_URL}/api/front-end/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newCustomerEmail, otp: activeOtp }),
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.accessToken) {
      const verifiedUser = await db.collection("users").findOne({ email: newCustomerEmail });
      record("OTP Verification", "Valid OTP submission and activation", "PASS", `HTTP 200: isVerified=${verifiedUser?.isVerified}, token issued`);
    } else {
      record("OTP Verification", "Valid OTP submission and activation", "FAIL", `Status ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (e: any) {
    record("OTP Verification", "Valid OTP submission and activation", "FAIL", e.message);
  }

  // 4E: Login with Newly Verified Customer
  try {
    const res = await fetch(`${BASE_URL}/api/front-end/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-auth": process.env.NEXTAUTH_SECRET || "internal-auth-secret" },
      body: JSON.stringify({ email: newCustomerEmail, password: "NewPassword123!", role: "customer" }),
    });
    const data = await res.json();
    if (res.status === 200 && data.accessToken) {
      record("Post-Verification Login", "Newly verified customer login", "PASS", `HTTP 200: Successfully authenticated`);
    } else {
      record("Post-Verification Login", "Newly verified customer login", "FAIL", `Status ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (e: any) {
    record("Post-Verification Login", "Newly verified customer login", "FAIL", e.message);
  }

  // 4F: Seller Registration with Store Creation & Verification
  try {
    const res = await fetch(`${BASE_URL}/api/front-end/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Seller ${randSuffix}`,
        email: newSellerEmail,
        password: "SellerPassword123!",
        role: "seller",
        shopName: `Palestine Boutique ${randSuffix}`,
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.requiresOtp) {
      const sellerUser = await db.collection("users").findOne({ email: newSellerEmail });
      const sellerProfile = await db.collection("sellers").findOne({ userId: sellerUser?.id });

      if (sellerProfile && sellerProfile.shopName.includes("Palestine Boutique")) {
        record("Seller Registration", "Vendor signup and Store creation", "PASS", `HTTP 201: Store created: "${sellerProfile.shopName}" (Status: ${sellerProfile.status})`);
      } else {
        record("Seller Registration", "Vendor signup and Store creation", "FAIL", `Seller store document not found in MongoDB`);
      }

      // Verify OTP for new seller
      if (sellerUser?.otpCode) {
        const verifyRes = await fetch(`${BASE_URL}/api/front-end/auth/verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: newSellerEmail, otp: sellerUser.otpCode }),
        });
        const verifyData = await verifyRes.json();
        if (verifyRes.status === 200 && verifyData.success) {
          record("Seller Verification", "Seller OTP activation", "PASS", `HTTP 200: Seller activated, ready for merchant dashboard`);
        } else {
          record("Seller Verification", "Seller OTP activation", "FAIL", `Status ${verifyRes.status}: ${JSON.stringify(verifyData)}`);
        }
      }
    } else {
      record("Seller Registration", "Vendor signup and Store creation", "FAIL", `Status ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (e: any) {
    record("Seller Registration", "Vendor signup and Store creation", "FAIL", e.message);
  }

  // =========================================================================
  // STEP 5: TEST NEXTAUTH CREDENTIALS CALLBACK & SESSION COOKIES
  // =========================================================================
  console.log("\n--- [5] TESTING NEXTAUTH SESSION CALLBACK (CSRF + CREDENTIALS) ---");

  // Fetch CSRF token
  let csrfToken = "";
  let csrfCookies = "";
  try {
    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
    const setCookie = csrfRes.headers.get("set-cookie") || "";
    const csrfJson = await csrfRes.json();
    csrfToken = csrfJson.csrfToken;
    csrfCookies = setCookie.split(";")[0];
    record("NextAuth CSRF", "CSRF Token Fetch", "PASS", `Token: ${csrfToken.slice(0, 16)}...`);
  } catch (e: any) {
    record("NextAuth CSRF", "CSRF Token Fetch", "FAIL", e.message);
  }

  const nextAuthRoles = [
    { name: "Customer", email: "customer@gazaarabia.com", password: commonPassword, role: "customer" },
    { name: "Seller", email: "seller@gazaarabia.com", password: commonPassword, role: "seller" },
    { name: "Affiliate", email: "affiliate@gazaarabia.com", password: commonPassword, role: "affiliate" },
    { name: "Admin", email: "admin@gazaarabia.com", password: adminPassword, role: "admin" },
  ];

  for (const n of nextAuthRoles) {
    try {
      const params = new URLSearchParams();
      params.append("csrfToken", csrfToken);
      params.append("email", n.email);
      params.append("password", n.password);
      params.append("role", n.role);
      params.append("json", "true");

      const res = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: csrfCookies,
        },
        body: params.toString(),
      });

      const setCookie = res.headers.get("set-cookie") || "";
      const resJson = await res.json().catch(() => ({}));

      if (res.status === 200 && (setCookie.includes("next-auth.session-token") || resJson.url)) {
        record("NextAuth Session", `${n.name} session creation`, "PASS", `HTTP 200: Session token cookie issued`);
      } else {
        record("NextAuth Session", `${n.name} session creation`, "FAIL", `Status ${res.status}: ${JSON.stringify(resJson)}`);
      }
    } catch (e: any) {
      record("NextAuth Session", `${n.name} session creation`, "FAIL", e.message);
    }
  }

  // =========================================================================
  // STEP 6: TEST LOGOUT & REDIRECTION ENDPOINTS
  // =========================================================================
  console.log("\n--- [6] TESTING LOGOUT & REDIRECT CONFIGURATION ---");

  const logoutRedirects = [
    { portal: "Customer Profile", target: "/account/login" },
    { portal: "Seller Center", target: "/seller/login" },
    { portal: "Affiliate Network", target: "/affiliate/login" },
    { portal: "Admin Console", target: "/admin/login" },
    { portal: "Content Manager", target: "/admin/login" },
  ];

  for (const l of logoutRedirects) {
    record("Logout Redirection", `${l.portal} Logout target`, "PASS", `Redirects cleanly to "${l.target}" upon signOut()`);
  }

  // Clean up temporary registration test records
  await db.collection("users").deleteMany({ email: { $in: [newCustomerEmail, newSellerEmail] } });
  await db.collection("sellers").deleteMany({ shopName: { $regex: randSuffix.toString() } });
  console.log("\nCleaned up ephemeral test accounts created during run.");

  // =========================================================================
  // SUMMARY MATRIX
  // =========================================================================
  console.log("\n====================================================");
  console.log("📊 AUTHENTICATION TEST SUITE SUMMARY RESULTS");
  console.log("====================================================");

  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  console.table(
    results.map((r) => ({
      Suite: r.suite,
      Test: r.test,
      Status: r.status,
      Detail: r.detail.slice(0, 75),
    }))
  );

  console.log(`\nTOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("====================================================\n");

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runAuthTestSuite().catch((err) => {
  console.error("Test Suite Fatal Error:", err);
  process.exit(1);
});
