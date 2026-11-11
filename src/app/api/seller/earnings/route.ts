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

    const now = new Date();
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

    // Dynamic Balance Taxonomy
    let calculatedAvailable = 0;
    let calculatedCooling = 0;
    let calculatedOnHold = 0;
    let calculatedTotalEarned = 0;
    let missingCostCount = 0;

    const upcomingReleases: Array<{
      orderItemId: number;
      orderId: number;
      productTitle: string;
      amount: number;
      releaseDate: string;
    }> = [];

    sellerItems.forEach((item: any) => {
      const isRefunded = item.returnStatus === "refunded";
      const isDisputed = item.returnStatus === "pending" || item.returnStatus === "disputed";
      const isPaidOut = item.isPaidOut === true;
      const earning = item.sellerEarning || 0;
      const prod = productMap.get(item.productId);

      if (!prod?.costPrice || prod.costPrice <= 0) {
        missingCostCount++;
      }

      if (isRefunded) {
        // Excluded from balances
        return;
      }

      calculatedTotalEarned += earning;

      if (isPaidOut) {
        // Already disbursed
        return;
      }

      if (isDisputed) {
        calculatedOnHold += earning;
      } else {
        const eligibleAt = item.payoutEligibleAt ? new Date(item.payoutEligibleAt) : null;
        if (eligibleAt && eligibleAt <= now) {
          calculatedAvailable += earning;
        } else {
          calculatedCooling += earning;
          if (eligibleAt) {
            upcomingReleases.push({
              orderItemId: item.id,
              orderId: item.orderId,
              productTitle: prod?.title || item.productTitle || "Product",
              amount: Number(earning.toFixed(2)),
              releaseDate: eligibleAt.toISOString().split("T")[0],
            });
          }
        }
      }
    });

    // Sort upcoming releases by earliest date
    upcomingReleases.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));

    const recentEarnings = sellerItems.slice(0, 20).map((item: any) => {
      const prod: any = productMap.get(item.productId);
      const ord: any = orderMap.get(item.orderId);
      return {
        id: item.id,
        orderId: item.orderId,
        productTitle: prod?.title || item.productTitle || "Product",
        amount: item.sellerEarning || 0,
        returnStatus: item.returnStatus || null,
        payoutEligibleAt: item.payoutEligibleAt || null,
        createdAt: ord?.createdAt || item.createdAt || new Date(),
      };
    });

    const chartDataMap: Record<string, number> = {};
    sellerItems.forEach((item: any) => {
      if (item.returnStatus === "refunded") return;
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

    // Fallback to stored balances if calculated is 0 and stored exists
    const availableFinal = calculatedAvailable > 0 ? calculatedAvailable : (seller.availableBalance || 0);
    const pendingFinal = calculatedCooling > 0 ? calculatedCooling : (seller.pendingBalance || 0);
    const totalEarnedFinal = calculatedTotalEarned > 0 ? calculatedTotalEarned : (seller.totalEarned || 0);

    return NextResponse.json({
      balances: {
        available: Number(availableFinal.toFixed(2)),
        pending: Number(pendingFinal.toFixed(2)), // in 30-day cooling escrow
        onHold: Number(calculatedOnHold.toFixed(2)), // dispute / return hold
        totalEarned: Number(totalEarnedFinal.toFixed(2)),
      },
      upcomingReleases: upcomingReleases.slice(0, 10),
      analyticsGuards: {
        hasCompleteCostData: missingCostCount === 0,
        missingCostItemsCount: missingCostCount,
        note: missingCostCount > 0 ? `${missingCostCount} items lack cost price; profit analytics require cost data.` : "All products have valid cost data.",
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
