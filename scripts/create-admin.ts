import fs from "fs";
import path from "path";
import readline from "readline";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { connectToDatabase, mongoose } from "../src/lib/mongoose";

// Load .env if not loaded
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
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

function generateSecurePassword(length = 16): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
  let password = "";
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  return password;
}

function promptQuestion(rl: readline.Interface, question: string, defaultValue = ""): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

function parseArgs(): { email?: string; password?: string; name?: string; phone?: string } {
  const args = process.argv.slice(2);
  const result: { email?: string; password?: string; name?: string; phone?: string } = {};

  for (const arg of args) {
    if (arg.startsWith("--email=")) {
      result.email = arg.split("=")[1]?.trim();
    } else if (arg.startsWith("--password=")) {
      result.password = arg.split("=")[1]?.trim();
    } else if (arg.startsWith("--name=")) {
      result.name = arg.split("=")[1]?.trim();
    } else if (arg.startsWith("--phone=")) {
      result.phone = arg.split("=")[1]?.trim();
    }
  }

  // Positional fallback: [email] [password] [name]
  const positionals = args.filter((a) => !a.startsWith("--"));
  if (positionals[0] && !result.email) result.email = positionals[0];
  if (positionals[1] && !result.password) result.password = positionals[1];
  if (positionals[2] && !result.name) result.name = positionals[2];

  return result;
}

async function main() {
  console.log("====================================================");
  console.log("🛡️  GAZAARABIA ADMIN USER CREATION SCRIPT");
  console.log("====================================================\n");

  const parsed = parseArgs();
  let email = parsed.email || "";
  let password = parsed.password || "";
  let name = parsed.name || "";
  let phone = parsed.phone || "";

  // Interactive prompts if email or password missing
  if (!email || !password) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      if (!email) {
        email = await promptQuestion(rl, "Enter Admin Email: ");
        while (!email || !email.includes("@")) {
          console.log("❌ Please enter a valid email address.");
          email = await promptQuestion(rl, "Enter Admin Email: ");
        }
      }

      if (!password) {
        const generated = generateSecurePassword();
        const inputPassword = await promptQuestion(
          rl,
          `Enter Admin Password (press Enter to auto-generate secure password): `
        );
        password = inputPassword || generated;
      }

      if (!name) {
        name = await promptQuestion(rl, "Enter Admin Name [Super Admin]: ", "Super Admin");
      }
    } finally {
      rl.close();
    }
  }

  if (!name) name = "Super Admin";

  email = email.toLowerCase().trim();

  console.log("\nConnecting to MongoDB...");
  await connectToDatabase();
  const db = mongoose.connection.db;

  if (!db) {
    console.error("❌ Failed to connect to MongoDB.");
    process.exit(1);
  }

  // 1. Ensure Admin Role exists (id: 1)
  let adminRole = await db.collection("roles").findOne({ id: 1 });
  if (!adminRole) {
    adminRole = await db.collection("roles").findOne({ name: "admin" });
  }

  if (!adminRole) {
    console.log("ℹ️ Admin role not found. Creating admin role (id: 1)...");
    await db.collection("roles").insertOne({
      id: 1,
      name: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // 2. Hash Password
  console.log("🔒 Hashing password with bcrypt...");
  const hashedPassword = await bcrypt.hash(password, 10);

  // 3. Check if user already exists
  const existingUser = await db.collection("users").findOne({ email });

  let userId: number;

  if (existingUser) {
    userId = existingUser.id;
    console.log(`\n⚠️  User with email '${email}' already exists (User ID: ${userId}).`);
    console.log("Updating password, ensuring role is 'admin' (roleId: 1)...");

    await db.collection("users").updateOne(
      { _id: existingUser._id },
      {
        $set: {
          name: name || existingUser.name || "Super Admin",
          password: hashedPassword,
          roleId: 1,
          updatedAt: new Date(),
        },
      }
    );
    console.log("✅ User successfully updated and granted Admin role!");
  } else {
    // Determine next sequential integer ID
    const lastUser = await db
      .collection("users")
      .find({}, { projection: { id: 1 } })
      .sort({ id: -1 })
      .limit(1)
      .toArray();

    userId = lastUser.length > 0 && typeof lastUser[0].id === "number" ? lastUser[0].id + 1 : 1;

    console.log(`\nCreating new Admin user (Assigned User ID: ${userId})...`);
    await db.collection("users").insertOne({
      id: userId,
      name,
      email,
      phone: phone || null,
      password: hashedPassword,
      roleId: 1,
      isGuest: false,
      stripeCustomerId: null,
      resetToken: null,
      resetTokenExpiry: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      googleId: null,
    });
    console.log("✅ Admin user created successfully!");
  }

  // 4. Verify Credentials
  const verifiedUser = await db.collection("users").findOne({ email });
  const isPasswordValid = verifiedUser ? bcrypt.compareSync(password, verifiedUser.password) : false;

  console.log("\n====================================================");
  console.log("🎉 ADMIN ACCOUNT READY FOR LOGIN");
  console.log("====================================================");
  console.log(`• Login URL : ${process.env.NEXTAUTH_URL || "http://localhost:3000"}/admin/login`);
  console.log(`• Name      : ${verifiedUser?.name}`);
  console.log(`• Email     : ${email}`);
  console.log(`• Password  : ${password}`);
  console.log(`• Role ID   : ${verifiedUser?.roleId} (admin)`);
  console.log(`• Password Verification: ${isPasswordValid ? "PASS (Valid)" : "FAIL"}`);
  console.log("====================================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ An error occurred:", err);
  process.exit(1);
});
