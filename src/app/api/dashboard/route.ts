import { NextResponse } from "next/server";
import { connectToDatabase, mongoose } from "@/lib/mongoose";
import { getAuthenticatedUser } from "@/lib/authToken";

// GET Dashboard Counts
export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const roleName = (user.role?.name || "").toLowerCase();
    const allowedRoles = ["admin"];

    if (!allowedRoles.includes(roleName)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const db = mongoose.connection.db;

    if (!db) {
      return NextResponse.json({ message: "Database connection failed" }, { status: 500 });
    }

    const [
      blogs,
      blogCategories,
      brands,
      sizes,
      colors,
      categories,
      subcategories,
      deliveryOptions,
      materialCares,
      products,
      users,
      orders,
      sellers,
    ] = await Promise.all([
      db.collection("blogs").countDocuments(),
      db.collection("blog_categories").countDocuments()
        .then((c) => (c > 0 ? c : db.collection("blogcategories").countDocuments())),
      db.collection("brands").countDocuments()
        .then((c) => (c > 0 ? c : db.collection("brand").countDocuments())),
      db.collection("sizes").countDocuments(),
      db.collection("colors").countDocuments(),
      db.collection("categories").countDocuments(),
      db.collection("subcategories").countDocuments(),
      db.collection("deliveryoptions").countDocuments(),
      db.collection("material_care").countDocuments()
        .then((c) => (c > 0 ? c : db.collection("materialcares").countDocuments())),
      db.collection("products").countDocuments(),
      db.collection("users").countDocuments(),
      db.collection("orders").countDocuments(),
      db.collection("sellers").countDocuments(),
    ]);

    const recentBlogs = await db.collection("blogs")
      .find({}, { projection: { id: 1, title: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    /* ================= ORDERS OVER TIME & REVENUE OVER TIME ================= */
    const orderDocs = await db.collection("orders").find({}, {
      projection: { createdAt: 1, totalAmount: 1, status: 1 }
    }).sort({ createdAt: 1 }).toArray();

    const ordersOverTime: Record<string, number> = {};
    const revenueOverTime: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};

    for (const order of orderDocs) {
      if (order.createdAt) {
        const d = new Date(order.createdAt);
        const date = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : "unknown";
        ordersOverTime[date] = (ordersOverTime[date] || 0) + 1;
        revenueOverTime[date] = (revenueOverTime[date] || 0) + (Number(order.totalAmount) || 0);
      }
      if (order.status) {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      }
    }

    /* ================= ORDER STATUS ================= */
    const orderStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      _count: { id: count }
    }));

    return NextResponse.json({
      blogs,
      blogCategories,
      brands,
      sizes,
      colors,
      categories,
      subcategories,
      deliveryOptions,
      materialCares,
      products,
      users,
      orders,
      sellers,
      recentBlogs,
      charts: {
        ordersOverTime,
        revenueOverTime,
        orderStatus,
      },
    });
  } catch (error) {
    console.error("DASHBOARD API ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
