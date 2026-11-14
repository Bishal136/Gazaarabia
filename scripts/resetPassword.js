/**
 * Utility script to reset user passwords or list accounts in MongoDB
 * Usage:
 *   node scripts/resetPassword.js list
 *   node scripts/resetPassword.js reset <email> <newPassword>
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gazaarabia';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'list';

  console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const roles = await db.collection('roles').find({}).toArray();
  const roleMap = new Map(roles.map(r => [r.id, r.name]));

  if (command === 'list') {
    const users = await db.collection('users').find({}, {
      projection: { id: 1, email: 1, name: 1, roleId: 1, isVerified: 1 }
    }).toArray();

    console.log(`\nFound ${users.length} registered users in MongoDB:`);
    console.table(users.map(u => ({
      ID: u.id,
      Name: u.name,
      Email: u.email,
      Role: roleMap.get(u.roleId) || `ID ${u.roleId}`,
      Verified: u.isVerified !== false ? 'Yes' : 'No'
    })));
  } else if (command === 'reset') {
    const email = (args[1] || '').trim().toLowerCase();
    const newPassword = (args[2] || '').trim();

    if (!email || !newPassword) {
      console.error('Usage: node scripts/resetPassword.js reset <email> <newPassword>');
      process.exit(1);
    }

    const user = await db.collection('users').findOne({
      $or: [
        { email },
        { email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
      ]
    });

    if (!user) {
      console.error(`User with email "${email}" not found in MongoDB.`);
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword, isVerified: true, updatedAt: new Date() } }
    );

    console.log(`\nPassword for "${user.email}" (Role: ${roleMap.get(user.roleId)}) has been successfully updated to: "${newPassword}".`);
  } else {
    console.log('Available commands:');
    console.log('  node scripts/resetPassword.js list');
    console.log('  node scripts/resetPassword.js reset <email> <newPassword>');
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
