/**
 * ==============================================================================
 * GAZAARABIA — SAFE NON-DESTRUCTIVE ADMIN SEED ENGINE
 * ==============================================================================
 * Creates or updates the Administrator account directly in the MongoDB database.
 * Strictly non-destructive: preserves all existing database collections and records.
 *
 * Usage:
 *   node scripts/seedAdmin.js
 *   node scripts/seedAdmin.js custom.admin@gazaarabia.com SecurePass123!
 *   npm run seed:admin
 * ==============================================================================
 */

const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

// 1. Manually parse .env file to ensure zero external dependency issues
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/gazaarabia";

// 2. Parse CLI Arguments or Environment Defaults
const args = process.argv.slice(2);
const cliEmail = args.find((a) => a.includes("@") && !a.startsWith("--"));
const cliPassword = args.find((a) => !a.includes("@") && !a.startsWith("--"));

const ADMIN_EMAIL = (
  cliEmail ||
  process.env.ADMIN_EMAIL ||
  "admin@gazaarabia.com"
).trim().toLowerCase();

const ADMIN_PASSWORD = (
  cliPassword ||
  process.env.SEED_ADMIN_PASSWORD ||
  "Admin123!"
).trim();

const ADMIN_NAME = "Super Admin";

async function seedAdmin() {
  console.log("====================================================");
  console.log("🛡️  GAZAARABIA NON-DESTRUCTIVE ADMIN SEEDER");
  console.log("====================================================");
  console.log(`Connecting to: ${MONGODB_URI.replace(/\/\/.*@/, "//***:***@")}`);

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();
    console.log("✅ Connected to MongoDB successfully.\n");

    // 1. Ensure 'roles' collection has the admin role (id: 1)
    let adminRole = await db.collection("roles").findOne({ name: "admin" });
    if (!adminRole) {
      console.log("Creating missing 'admin' role in database...");
      await db.collection("roles").insertOne({
        id: 1,
        name: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      adminRole = await db.collection("roles").findOne({ name: "admin" });
    }

    const adminRoleId = adminRole.id || 1;
    console.log(`Admin Role ID confirmed: ${adminRoleId}`);

    // 2. Hash Password
    console.log(`Hashing password with bcrypt (10 rounds)...`);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // 3. Check for existing admin user by email
    const existingUser = await db.collection("users").findOne({ email: ADMIN_EMAIL });

    if (existingUser) {
      console.log(`\nExisting user found with email: ${ADMIN_EMAIL}`);
      console.log(`Updating existing record to Admin role and synchronizing password...`);

      await db.collection("users").updateOne(
        { _id: existingUser._id },
        {
          $set: {
            roleId: adminRoleId,
            password: hashedPassword,
            isVerified: true,
            isGuest: false,
            updatedAt: new Date(),
          },
        }
      );

      console.log("----------------------------------------------------");
      console.log("🎉 SUCCESS: Admin account updated non-destructively!");
      console.log("----------------------------------------------------");
      console.log(`👤 Name:     ${existingUser.name || ADMIN_NAME}`);
      console.log(`📧 Email:    ${ADMIN_EMAIL}`);
      console.log(`🔑 Password: ${ADMIN_PASSWORD}`);
      console.log(`🛡️  Role:     admin (Role ID: ${adminRoleId})`);
      console.log(`✅ Verified: Yes`);
      console.log("----------------------------------------------------");
    } else {
      console.log(`\nNo existing user found with email: ${ADMIN_EMAIL}. Creating new admin account...`);

      // Determine next numeric ID
      const lastUser = await db.collection("users").find().sort({ id: -1 }).limit(1).toArray();
      const nextId = (lastUser[0]?.id || 0) + 1;

      const newAdminDoc = {
        id: nextId,
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: hashedPassword,
        roleId: adminRoleId,
        isGuest: false,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection("users").insertOne(newAdminDoc);

      console.log("----------------------------------------------------");
      console.log("🎉 SUCCESS: New Admin account created safely!");
      console.log("----------------------------------------------------");
      console.log(`👤 Name:     ${ADMIN_NAME}`);
      console.log(`📧 Email:    ${ADMIN_EMAIL}`);
      console.log(`🔑 Password: ${ADMIN_PASSWORD}`);
      console.log(`🛡️  Role:     admin (Role ID: ${adminRoleId})`);
      console.log(`🆔 User ID:  ${nextId}`);
      console.log(`✅ Verified: Yes`);
      console.log("----------------------------------------------------");
    }

    console.log("\n👉 You can now log into the Unified Portal at: http://localhost:3000/account/login");
    console.log("   The system will automatically detect the 'admin' role and route to /admin\n");
  } catch (error) {
    console.error("❌ Error running admin seed:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedAdmin();
