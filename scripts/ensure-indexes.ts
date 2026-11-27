import "dotenv/config";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/gazaarabia";

async function run() {
  console.log("Connecting to MongoDB to ensure indexes...");
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) throw new Error("DB connection failed");

  console.log("Creating compound and query indexes...");
  await db.collection("productimage").createIndex({ productId: 1, primary: -1 }, { background: true });
  await db.collection("productvariant").createIndex({ productId: 1, colorId: 1, sizeId: 1 }, { background: true });
  await db.collection("productvariants").createIndex({ productId: 1 }, { background: true });
  await db.collection("products").createIndex({ status: 1, createdAt: -1 }, { background: true });
  await db.collection("products").createIndex({ status: 1, isTrending: 1 }, { background: true });
  await db.collection("products").createIndex({ status: 1, isFeatured: 1 }, { background: true });
  await db.collection("products").createIndex({ categoryId: 1, active: 1, isDeleted: 1 }, { background: true });
  await db.collection("products").createIndex({ subcategoryId: 1, active: 1, isDeleted: 1 }, { background: true });
  await db.collection("products").createIndex({ active: 1, isDeleted: 1, soldCount: -1 }, { background: true });
  await db.collection("products").createIndex({ active: 1, isDeleted: 1, sellingPrice: 1 }, { background: true });
  await db.collection("products").createIndex({ active: 1, isDeleted: 1, sellingPrice: -1 }, { background: true });
  await db.collection("products").createIndex({ active: 1, isDeleted: 1, createdAt: -1 }, { background: true });
  await db.collection("products").createIndex({ sellerId: 1, active: 1 }, { background: true });
  await db.collection("categories").createIndex({ status: 1, order: 1 }, { background: true });
  await db.collection("categories").createIndex({ submenuId: 1 }, { background: true });
  await db.collection("subcategories").createIndex({ slug: 1 }, { background: true });
  await db.collection("subcategories").createIndex({ categoryId: 1 }, { background: true });
  await db.collection("blogs").createIndex({ slug: 1 }, { background: true });
  await db.collection("blogs").createIndex({ categoryId: 1, createdAt: -1 }, { background: true });
  await db.collection("blog_categories").createIndex({ slug: 1 }, { background: true });
  await db.collection("review").createIndex({ orderItemId: 1 }, { background: true });
  await db.collection("review").createIndex({ productId: 1, status: 1 }, { background: true });
  await db.collection("orders").createIndex({ userId: 1, createdAt: -1 }, { background: true });
  await db.collection("orders").createIndex({ sellerId: 1, createdAt: -1 }, { background: true });
  await db.collection("orders").createIndex({ affiliateId: 1, createdAt: -1 }, { background: true });
  await db.collection("orders").createIndex({ status: 1, createdAt: -1 }, { background: true });
  await db.collection("orders_item").createIndex({ orderId: 1 }, { background: true });
  await db.collection("orders_item").createIndex({ productId: 1 }, { background: true });
  await db.collection("orders_item").createIndex({ ambassadorId: 1, createdAt: -1 }, { background: true });
  await db.collection("users").createIndex({ roleId: 1 }, { background: true });
  await db.collection("menus").createIndex({ position: 1 }, { background: true });
  await db.collection("submenus").createIndex({ menuId: 1, position: 1 }, { background: true });

  // Affiliate panel indexes
  await db.collection("affiliate").createIndex({ id: 1 }, { background: true });
  await db.collection("affiliate").createIndex({ userId: 1 }, { background: true });
  await db.collection("affiliate").createIndex({ referralCode: 1 }, { background: true });
  await db.collection("affiliate").createIndex({ type: 1, isActive: 1 }, { background: true });
  await db.collection("affiliate_bank_accounts").createIndex({ affiliateId: 1 }, { background: true });
  await db.collection("coupon").createIndex({ creatorId: 1, createdAt: -1 }, { background: true });
  await db.collection("coupon").createIndex({ affiliateId: 1, isActive: 1 }, { background: true });
  await db.collection("affiliate_invoice").createIndex({ affiliateId: 1, isPaid: 1, monthKey: 1, createdAt: -1 }, { background: true });
  await db.collection("ambassador_invoice").createIndex({ ambassadorId: 1, isPaid: 1, createdAt: -1 }, { background: true });

  console.log("✓ All performance indexes ensured successfully.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Index creation error:", err);
  process.exit(1);
});
