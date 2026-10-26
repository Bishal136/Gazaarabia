import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

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

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const sellerItems = await db
      .collection("orders_item")
      .find({ sellerId: seller.id })
      .toArray();

    const orderIds = Array.from(new Set(sellerItems.map((i: any) => i.orderId)));

    const [total, orders] = await Promise.all([
      db.collection("orders").countDocuments({ id: { $in: orderIds } }),
      db
        .collection("orders")
        .find({ id: { $in: orderIds } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
    ]);

    const formattedOrders = orders.map((order: any) => ({
      ...order,
      orderItems: sellerItems
        .filter((i: any) => i.orderId === order.id)
        .map((item: any) => ({
          ...item,
          product: { title: item.productTitle || "Product" },
          variant: { sku: item.sku || "" },
          review: null,
        })),
    }));

    return NextResponse.json({
      success: true,
      total,
      page,
      limit,
      data: formattedOrders,
    });
  } catch (error: any) {
    console.error("Orders GET Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
