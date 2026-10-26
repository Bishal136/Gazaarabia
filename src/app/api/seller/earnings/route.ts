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

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [sellerItems, products, orders] = await Promise.all([
      db
        .collection("orders_item")
        .find({ sellerId: seller.id })
        .sort({ createdAt: -1 })
        .toArray(),
      db.collection("products").find({ sellerId: seller.id }).toArray(),
      db.collection("orders").find({}).toArray(),
    ]);

    const productMap = new Map(products.map((p: any) => [p.id, p]));
    const orderMap = new Map(orders.map((o: any) => [o.id, o]));

    const recentEarnings = sellerItems.slice(0, 20).map((item: any) => {
      const prod = productMap.get(item.productId);
      const ord = orderMap.get(item.orderId);
      return {
        id: item.id,
        orderId: item.orderId,
        productTitle: prod?.title || item.productTitle || "Product",
        amount: item.sellerEarning || 0,
        createdAt: ord?.createdAt || item.createdAt || new Date(),
      };
    });

    const chartDataMap: Record<string, number> = {};
    sellerItems.forEach((item: any) => {
      const dateObj = item.createdAt ? new Date(item.createdAt) : null;
      if (dateObj && dateObj >= thirtyDaysAgo) {
        const date = dateObj.toISOString().split("T")[0];
        chartDataMap[date] = (chartDataMap[date] || 0) + (item.sellerEarning || 0);
      }
    });

    const chartData = Object.entries(chartDataMap)
      .map(([date, amount]) => ({
        date,
        amount: Number(amount.toFixed(2)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      balances: {
        available: seller.availableBalance || 0,
        pending: seller.pendingBalance || 0,
        totalEarned: seller.totalEarned || 0,
      },
      recentEarnings,
      chartData,
    });
  } catch (error: any) {
    console.error("SELLER EARNINGS API ERROR:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
