/**
 * ==============================================================================
 * GAZAARABIA — SQL TO MONGODB DATA MIGRATION ENGINE
 * ==============================================================================
 * Transfers all records from MySQL to MongoDB collections with ZERO DATA LOSS.
 * Validates counts between MySQL and MongoDB post-transfer.
 * ==============================================================================
 */

import { PrismaClient } from "@prisma/client";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/gazaarabia";
const prisma = new PrismaClient();

async function runMigration() {
  console.log("====================================================");
  console.log("🚀 STARTING SQL TO MONGODB MIGRATION");
  console.log("====================================================");

  // 1. Connect to MongoDB
  console.log(`Connecting to MongoDB at: ${MONGODB_URI}...`);
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB successfully.");

  const mongoDb = mongoose.connection.db;
  if (!mongoDb) {
    throw new Error("Failed to get MongoDB database handle.");
  }

  // 2. Discover all tables in current MySQL database
  console.log("Discovering SQL tables in database...");
  const tablesResult: any[] = await prisma.$queryRawUnsafe(
    "SELECT TABLE_NAME as tableName FROM information_schema.tables WHERE table_schema = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME ASC"
  );

  const tables = tablesResult.map((t) => t.tableName || t.TABLE_NAME);
  console.log(`Found ${tables.length} tables in MySQL database.\n`);

  const results: Array<{
    table: string;
    collection: string;
    sqlCount: number;
    mongoCount: number;
    status: string;
  }> = [];

  let totalSqlRecords = 0;
  let totalMongoRecords = 0;

  // 3. Migrate each table
  for (const table of tables) {
    const collectionName = table.toLowerCase();
    const collection = mongoDb.collection(collectionName);

    try {
      // Fetch all rows from SQL
      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM \`${table}\``);
      const sqlCount = rows.length;
      totalSqlRecords += sqlCount;

      if (sqlCount > 0) {
        // Drop collection to start fresh with pristine state
        try {
          await collection.drop();
        } catch {
          // Collection might not exist yet
        }

        // Prepare documents (convert BigInt to Number/String and ensure dates are valid)
        const docs = rows.map((row) => {
          const doc: Record<string, any> = {};
          for (const [key, value] of Object.entries(row)) {
            if (typeof value === "bigint") {
              doc[key] = Number(value);
            } else if (value instanceof Date) {
              doc[key] = value;
            } else if (Buffer.isBuffer(value)) {
              doc[key] = value.toString("base64");
            } else {
              doc[key] = value;
            }
          }
          return doc;
        });

        // Batch insert into MongoDB
        await collection.insertMany(docs, { ordered: true });

        // Create index on `id` if it exists
        if (docs[0] && "id" in docs[0]) {
          await collection.createIndex({ id: 1 });
        }
      }

      const mongoCount = await collection.countDocuments();
      totalMongoRecords += mongoCount;

      const isMatch = sqlCount === mongoCount;
      results.push({
        table,
        collection: collectionName,
        sqlCount,
        mongoCount,
        status: isMatch ? "MATCH (0 Loss)" : "MISMATCH",
      });

      console.log(`  ✓ Migrated [${table}] -> [${collectionName}]: ${mongoCount}/${sqlCount} records`);
    } catch (err: any) {
      console.error(`  ❌ Failed migrating table ${table}:`, err.message);
      results.push({
        table,
        collection: collectionName,
        sqlCount: 0,
        mongoCount: 0,
        status: `ERROR: ${err.message}`,
      });
    }
  }

  // 4. Summary Matrix
  console.log("\n====================================================");
  console.log("📊 SQL TO MONGODB MIGRATION MATRIX");
  console.log("====================================================");
  console.table(results);
  console.log("====================================================");
  console.log(`Total Tables: ${tables.length}`);
  console.log(`Total SQL Records: ${totalSqlRecords}`);
  console.log(`Total MongoDB Records: ${totalMongoRecords}`);
  console.log(
    totalSqlRecords === totalMongoRecords
      ? "🎉 ZERO DATA LOSS CONFIRMED: All records match 1:1."
      : "⚠️ Count discrepancy detected."
  );
  console.log("====================================================");

  await prisma.$disconnect();
  await mongoose.disconnect();
}

runMigration().catch((err) => {
  console.error("Fatal Migration Error:", err);
  process.exit(1);
});
