import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";
import crypto from "crypto";

// GET — Fetch seller profile
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!user.role || user.role.name.toLowerCase() !== "seller") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ message: "Database not connected" }, { status: 500 });
    }

    const seller = await db.collection("sellers").findOne({ userId: user.id });
    if (!seller) {
      return NextResponse.json({ message: "Seller profile not found" }, { status: 404 });
    }

    const [totalProducts, sellerItems, sellerProducts] = await Promise.all([
      db.collection("products").countDocuments({ sellerId: seller.id, isDeleted: { $ne: true } }),
      db.collection("orders_item").find({ sellerId: seller.id }).toArray(),
      db.collection("products").find({ sellerId: seller.id }).project({ id: 1 }).toArray(),
    ]);

    const sellerProductIds = sellerProducts.map((p: any) => p.id);
    const reviews = sellerProductIds.length > 0
      ? await db.collection("review").find({ productId: { $in: sellerProductIds } }).toArray()
      : [];

    const totalOrders = new Set(sellerItems.map((i: any) => i.orderId)).size;
    const totalEarned = sellerItems.reduce((sum: number, i: any) => sum + (i.sellerEarning || 0), 0);
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum: number, r: any) => sum + (Number(r.rating) || 0), 0) / reviews.length
      : 0;

    return NextResponse.json({
      seller: {
        id: seller.id,
        shopName: seller.shopName,
        shopSlug: seller.shopSlug,
        logo: seller.logo,
        banner: seller.banner,
        isActive: Boolean(seller.isActive),
        status: seller.status || "active",
        commissionValue: seller.commissionValue ?? 5,
        payoutDays: seller.payoutDays ?? 30,
        minimumPayout: seller.minimumPayout ?? 50,
        availableBalance: seller.availableBalance ?? 0,
        pendingBalance: seller.pendingBalance ?? 0,
        totalEarned: seller.totalEarned ?? 0,
        createdAt: seller.createdAt,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || null,
        },
      },
      stats: {
        totalProducts,
        totalOrders,
        totalEarned: Number(totalEarned.toFixed(2)),
        totalReviews: reviews.length,
        averageRating: Number(avgRating.toFixed(1)),
      },
    });
  } catch (error: any) {
    console.error("SELLER PROFILE GET ERROR:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

// PATCH — Update seller profile
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!user.role || user.role.name.toLowerCase() !== "seller") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ message: "Database not connected" }, { status: 500 });
    }

    const seller = await db.collection("sellers").findOne({ userId: user.id });
    if (!seller) {
      return NextResponse.json({ message: "Seller profile not found" }, { status: 404 });
    }

    const body = await req.json();
    const { shopName, logo, banner, name, phone } = body;

    const updateSellerData: any = { updatedAt: new Date() };
    if (shopName !== undefined) {
      updateSellerData.shopName = shopName;
      updateSellerData.shopSlug = `${shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")}-${crypto.randomUUID().split("-")[0]}`;
    }
    if (logo !== undefined) updateSellerData.logo = logo;
    if (banner !== undefined) updateSellerData.banner = banner;

    const updateUserData: any = { updatedAt: new Date() };
    if (name !== undefined) updateUserData.name = name;
    if (phone !== undefined) updateUserData.phone = phone;

    await Promise.all([
      db.collection("sellers").updateOne({ id: seller.id }, { $set: updateSellerData }),
      db.collection("users").updateOne({ id: user.id }, { $set: updateUserData }),
    ]);

    return NextResponse.json({ message: "Profile updated successfully" });
  } catch (error: any) {
    console.error("SELLER PROFILE PATCH ERROR:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
