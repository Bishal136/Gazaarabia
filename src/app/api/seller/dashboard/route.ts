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

    // 1. Products count
    const productsCount = await db.collection("products").countDocuments({
      sellerId: seller.id,
      isDeleted: { $ne: true },
    });

    // 2. Seller order items
    const sellerItems = await db
      .collection("orders_item")
      .find({ sellerId: seller.id })
      .toArray();

    const orderIds = Array.from(new Set(sellerItems.map((i: any) => i.orderId).filter(Boolean)));

    // 3. Orders count
    const ordersCount = orderIds.length > 0
      ? await db.collection("orders").countDocuments({ id: { $in: orderIds } })
      : 0;

    // 4. Recent orders (top 5)
    const recentOrdersRaw = orderIds.length > 0
      ? await db
          .collection("orders")
          .find({ id: { $in: orderIds } })
          .sort({ createdAt: -1 })
          .limit(5)
          .toArray()
      : [];

    const recentOrders = recentOrdersRaw.map((order: any) => {
      const items = sellerItems.filter((i: any) => i.orderId === order.id);
      return {
        id: order.id,
        total: items.reduce((sum: number, item: any) => sum + (item.sellerEarning || item.price || 0), 0),
        status: order.status || "pending",
        createdAt: order.createdAt,
        customer: `${order.firstName || ""} ${order.lastName || ""}`.trim() || order.customerEmail || "Customer",
        itemsCount: items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0),
      };
    });

    // 5. Seller products
    const sellerProducts = await db
      .collection("products")
      .find({ sellerId: seller.id, isDeleted: { $ne: true } })
      .limit(50)
      .toArray();

    const sellerProductIds = sellerProducts.map((p: any) => p.id);

    // Top products by sales
    const productSalesMap: Record<number, number> = {};
    sellerItems.forEach((item: any) => {
      if (item.productId) {
        productSalesMap[item.productId] = (productSalesMap[item.productId] || 0) + (item.quantity || 1);
      }
    });

    const topProducts = sellerProducts
      .map((p: any) => ({
        id: p.id,
        title: p.title,
        price: p.sellingPrice || 0,
        salesCount: productSalesMap[p.id] || 0,
      }))
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 5);

    // 6. Low stock variants
    const lowStockCount = sellerProductIds.length > 0
      ? await db.collection("productvariant").countDocuments({
          productId: { $in: sellerProductIds },
          stock: { $lte: 5 },
        })
      : 0;

    // 7. Reviews
    const reviews = sellerProductIds.length > 0
      ? await db.collection("reviews").find({
          productId: { $in: sellerProductIds },
        }).toArray()
      : [];

    const reviewsCount = reviews.length;
    const avgRating = reviewsCount > 0
      ? reviews.reduce((sum: number, r: any) => sum + (Number(r.rating) || 0), 0) / reviewsCount
      : 0;

    // 8. Orders & Revenue over last 30 days
    const recentSellerItems = sellerItems.filter((i: any) => {
      const itemDate = i.createdAt ? new Date(i.createdAt) : null;
      return itemDate && itemDate >= thirtyDaysAgo;
    });

    const ordersOverTime: Record<string, number> = {};
    const revenueOverTime: Record<string, number> = {};

    recentSellerItems.forEach((item: any) => {
      const date = item.createdAt ? new Date(item.createdAt).toISOString().split("T")[0] : "unknown";
      ordersOverTime[date] = (ordersOverTime[date] || 0) + 1;
      revenueOverTime[date] = (revenueOverTime[date] || 0) + (item.sellerEarning || 0);
    });

    // 9. Order status breakdown
    const orderStatusMap: Record<string, number> = {};
    if (orderIds.length > 0) {
      const allOrders = await db
        .collection("orders")
        .find({ id: { $in: orderIds } })
        .project({ status: 1 })
        .toArray();

      allOrders.forEach((o: any) => {
        const s = o.status || "pending";
        orderStatusMap[s] = (orderStatusMap[s] || 0) + 1;
      });
    }

    const orderStatus = Object.entries(orderStatusMap).map(([status, count]) => ({
      status,
      _count: { id: count },
    }));

    // 10. Total revenue
    const totalRevenue = sellerItems.reduce((sum: number, i: any) => sum + (i.sellerEarning || 0), 0);

    return NextResponse.json({
      products: productsCount,
      orders: ordersCount,
      revenue: Number(totalRevenue.toFixed(2)),
      avgRating: Number(avgRating.toFixed(1)),
      lowStock: lowStockCount,
      reviews: reviewsCount,
      recentOrders,
      topProducts,
      balances: {
        available: seller.availableBalance || 0,
        pending: seller.pendingBalance || 0,
        totalEarned: seller.totalEarned || 0,
      },
      charts: {
        ordersOverTime,
        revenueOverTime,
        orderStatus,
      },
    });
  } catch (error: any) {
    console.error("DASHBOARD API ERROR:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
