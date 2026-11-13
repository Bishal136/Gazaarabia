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

    // 1. Live vs Draft Products count
    const [liveProductsCount, draftProductsCount, sellerProducts] = await Promise.all([
      db.collection("products").countDocuments({
        sellerId: seller.id,
        isDeleted: { $ne: true },
        active: true,
      }),
      db.collection("products").countDocuments({
        sellerId: seller.id,
        isDeleted: { $ne: true },
        active: false,
      }),
      db
        .collection("products")
        .find({ sellerId: seller.id, isDeleted: { $ne: true } })
        .limit(100)
        .toArray(),
    ]);

    const totalProductsCount = liveProductsCount + draftProductsCount;
    const sellerProductIds = sellerProducts.map((p: any) => p.id);

    // 2. Seller order items
    const sellerItems = await db
      .collection("orders_item")
      .find({ sellerId: seller.id })
      .toArray();

    const orderIds = Array.from(new Set(sellerItems.map((i: any) => i.orderId).filter(Boolean)));

    // 3. Orders fetch & breakdown
    const allOrders = orderIds.length > 0
      ? await db
          .collection("orders")
          .find({ id: { $in: orderIds } })
          .toArray()
      : [];

    const ordersCount = allOrders.length;
    const orderMap = new Map(allOrders.map((o: any) => [o.id, o]));

    // Paid statuses that count towards Net Sales
    const PAID_STATUSES = new Set(["paid", "succeeded", "processing", "confirmed", "shipped", "delivered"]);

    let netSales = 0;
    let paidOrdersCount = 0;
    let pendingPaymentCount = 0;

    const paidOrderIdsSet = new Set<number>();

    allOrders.forEach((o: any) => {
      const statusLower = (o.status || "").toLowerCase();
      if (PAID_STATUSES.has(statusLower)) {
        paidOrderIdsSet.add(o.id);
      }
      if (statusLower === "pending") {
        pendingPaymentCount++;
      }
    });

    paidOrdersCount = paidOrderIdsSet.size;

    sellerItems.forEach((item: any) => {
      if (item.returnStatus === "refunded" || item.returnStatus === "cancelled") {
        return;
      }
      if (paidOrderIdsSet.has(item.orderId)) {
        netSales += Number(item.sellerEarning || (item.price * (item.quantity || 1)) || 0);
      }
    });

    // 4. Low stock variants
    const lowStockCount = sellerProductIds.length > 0
      ? await db.collection("productvariant").countDocuments({
          productId: { $in: sellerProductIds },
          stock: { $lte: 5 },
          isActive: true,
        })
      : 0;

    // 5. Reviews
    const reviews = sellerProductIds.length > 0
      ? await db.collection("review").find({
          productId: { $in: sellerProductIds },
        }).toArray()
      : [];

    const reviewsCount = reviews.length;
    const avgRating = reviewsCount > 0
      ? reviews.reduce((sum: number, r: any) => sum + (Number(r.rating) || 0), 0) / reviewsCount
      : 0;

    // 6. Pending return requests
    const pendingReturnsCount = await db.collection("return_requests").countDocuments({
      sellerId: seller.id,
      status: "pending",
    });

    // 7. Store connection status
    const isConnected = !!seller.storeType && (
      seller.storeType === "woocommerce" ? !!seller.wooSiteUrl : true
    );

    // Items needing review (e.g. draft products or unmapped items)
    const itemsNeedingReviewCount = await db.collection("products").countDocuments({
      sellerId: seller.id,
      isDeleted: { $ne: true },
      $or: [{ active: false }, { syncIssue: { $exists: true, $ne: null } }],
    });

    // 8. Dynamic "Needs your attention" Tasks
    const attentionTasks: Array<{
      id: string;
      task: string;
      action: string;
      href: string;
    }> = [];

    if (pendingPaymentCount > 0) {
      attentionTasks.push({
        id: "pending-orders",
        task: `${pendingPaymentCount} ${pendingPaymentCount === 1 ? "order: payment pending" : "orders: payment pending"}`,
        action: "Review orders",
        href: "/seller/orders",
      });
    }

    if (draftProductsCount > 0) {
      attentionTasks.push({
        id: "draft-products",
        task: `${draftProductsCount} ${draftProductsCount === 1 ? "draft needs completing" : "drafts need completing"}`,
        action: "Continue editing",
        href: "/seller/products",
      });
    }

    if (lowStockCount > 0) {
      attentionTasks.push({
        id: "low-stock",
        task: `${lowStockCount} ${lowStockCount === 1 ? "variant running low" : "variants running low"}`,
        action: "Check stock",
        href: "/seller/products",
      });
    }

    if (pendingReturnsCount > 0) {
      attentionTasks.push({
        id: "pending-returns",
        task: `${pendingReturnsCount} ${pendingReturnsCount === 1 ? "return request pending" : "return requests pending"}`,
        action: "Review returns",
        href: "/seller/returns",
      });
    }

    // 9. Balances & Paid out calculation
    const availableBalance = Number(seller.availableBalance || 0);
    const pendingBalance = Number(seller.pendingBalance || 0);
    const totalEarned = Number(seller.totalEarned || 0);
    const paidOut = Math.max(0, totalEarned - availableBalance - pendingBalance);

    // 10. Orders & Revenue over last 30 days (for charts & legacy consumers)
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

    // 11. Recent orders preview
    const recentOrders = allOrders
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((order: any) => {
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

    const totalRevenue = sellerItems.reduce((sum: number, i: any) => sum + (i.sellerEarning || 0), 0);

    return NextResponse.json({
      // ── Core metrics matching new Dashboard UI ──
      netSales: Number(netSales.toFixed(2)),
      paidOrdersCount,
      orders: ordersCount,
      ordersPendingPayment: pendingPaymentCount,
      ordersSubtitle: pendingPaymentCount > 0 ? "Payment pending" : "All fulfilled",

      products: {
        total: totalProductsCount,
        live: liveProductsCount,
        drafts: draftProductsCount,
      },

      reviews: {
        count: reviewsCount,
        avgRating: Number(avgRating.toFixed(1)),
      },

      attentionTasks,

      balances: {
        available: Number(availableBalance.toFixed(2)),
        pending: Number(pendingBalance.toFixed(2)),
        paidOut: Number(paidOut.toFixed(2)),
        totalEarned: Number(totalEarned.toFixed(2)),
      },

      storeConnection: {
        connected: isConnected,
        storeType: seller.storeType || null,
        shopName: seller.shopName || (seller.storeType === "woocommerce" ? "WooCommerce" : seller.storeType === "shopify" ? "Shopify" : "Store"),
        lastSyncedAt: seller.lastSyncedAt || seller.updatedAt || null,
        itemsNeedingReview: itemsNeedingReviewCount,
      },

      // ── Backward-compatible legacy fields ──
      productsCount: totalProductsCount,
      revenue: Number(totalRevenue.toFixed(2)),
      avgRating: Number(avgRating.toFixed(1)),
      lowStock: lowStockCount,
      reviewsCount,
      recentOrders,
      charts: {
        ordersOverTime,
        revenueOverTime,
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
