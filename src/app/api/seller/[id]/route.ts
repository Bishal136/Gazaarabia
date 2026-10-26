import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!user.role || user.role.name.toLowerCase() !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const sellerId = Number(id);
    if (!sellerId) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ success: false, message: "Database not connected" }, { status: 500 });
    }

    const seller = await db.collection("sellers").findOne({ id: sellerId });
    if (!seller) {
      return NextResponse.json({ success: false, message: "Seller not found" }, { status: 404 });
    }

    const [sellerUser, orderItems, products] = await Promise.all([
      db.collection("users").findOne({ id: seller.userId }),
      db.collection("orders_item").find({ sellerId }).toArray(),
      db.collection("products").find({ sellerId, isDeleted: { $ne: true } }).toArray(),
    ]);

    const totalOrders = new Set(orderItems.map((i: any) => i.orderId)).size;
    const totalRevenue = orderItems.reduce((sum: number, i: any) => sum + (i.price * (i.quantity || 1) || 0), 0);
    const totalEarning = orderItems.reduce((sum: number, i: any) => sum + (i.sellerEarning || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return NextResponse.json({
      success: true,
      data: {
        ...seller,
        user: sellerUser ? { id: sellerUser.id, name: sellerUser.name, email: sellerUser.email, phone: sellerUser.phone } : null,
        stats: {
          totalProducts: products.length,
          totalOrders,
          totalRevenue: Number(totalRevenue.toFixed(2)),
          totalEarning: Number(totalEarning.toFixed(2)),
          avgOrderValue: Number(avgOrderValue.toFixed(2)),
        },
      },
    });
  } catch (error: any) {
    console.error("GET Seller by ID Error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch seller" }, { status: 500 });
  }
}
