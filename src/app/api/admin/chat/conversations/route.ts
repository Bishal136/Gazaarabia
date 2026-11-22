import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const roleName = user.role?.name?.toLowerCase() || "";
    if (roleName !== "admin" && roleName !== "superadmin") {
      return NextResponse.json({ message: "Forbidden: Admin access required" }, { status: 403 });
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ message: "Database not connected" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "all" | "customer_seller" | "seller_admin" | "customer_admin"
    const status = searchParams.get("status"); // "all" | "active" | "flagged" | "resolved"
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "30")));
    const skip = (page - 1) * limit;

    // Build Mongo match filters
    const matchFilter: any = {};

    if (type && type !== "all") {
      if (type === "customer_seller") {
        matchFilter.$or = [
          { type: "customer_seller" },
          { type: { $exists: false } }, // Legacy chats
        ];
      } else {
        matchFilter.type = type;
      }
    }

    if (status && status !== "all") {
      if (status === "flagged") {
        matchFilter.isFlagged = true;
      } else {
        matchFilter.status = status;
      }
    }

    // Pipeline to enrich conversations with customer & seller details
    const pipeline: any[] = [
      { $match: matchFilter },
      { $sort: { updatedAt: -1, lastMessageAt: -1 } },
      // Lookup customer
      {
        $lookup: {
          from: "users",
          localField: "customerId",
          foreignField: "id",
          as: "customerInfo",
        },
      },
      // Lookup seller
      {
        $lookup: {
          from: "sellers",
          localField: "sellerId",
          foreignField: "id",
          as: "sellerInfo",
        },
      },
      // Lookup product context if available
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "id",
          as: "productInfo",
        },
      },
    ];

    // If search keyword provided, filter after lookup or by message snippet
    if (search) {
      const searchRegex = new RegExp(search, "i");
      pipeline.push({
        $match: {
          $or: [
            { lastMessageText: { $regex: searchRegex } },
            { "customerInfo.name": { $regex: searchRegex } },
            { "customerInfo.email": { $regex: searchRegex } },
            { "sellerInfo.name": { $regex: searchRegex } },
            { "sellerInfo.shopName": { $regex: searchRegex } },
          ],
        },
      });
    }

    // Count facets & stats
    const [rawResults, statsData] = await Promise.all([
      db.collection("conversations").aggregate([
        ...pipeline,
        {
          $facet: {
            metadata: [{ $count: "total" }],
            data: [{ $skip: skip }, { $limit: limit }],
          },
        },
      ]).toArray(),
      db.collection("conversations").aggregate([
        {
          $group: {
            _id: null,
            totalAll: { $sum: 1 },
            totalFlagged: { $sum: { $cond: [{ $eq: ["$isFlagged", true] }, 1, 0] } },
            totalSellerAdmin: { $sum: { $cond: [{ $eq: ["$type", "seller_admin"] }, 1, 0] } },
            totalCustomerSeller: {
              $sum: {
                $cond: [
                  { $or: [{ $eq: ["$type", "customer_seller"] }, { $eq: [{ $ifNull: ["$type", null] }, null] }] },
                  1,
                  0,
                ],
              },
            },
            totalUnreadAdmin: { $sum: { $ifNull: ["$unreadCountAdmin", 0] } },
          },
        },
      ]).toArray(),
    ]);

    const total = rawResults[0]?.metadata[0]?.total || 0;
    const rawConversations = rawResults[0]?.data || [];

    const stats = statsData[0] || {
      totalAll: 0,
      totalFlagged: 0,
      totalSellerAdmin: 0,
      totalCustomerSeller: 0,
      totalUnreadAdmin: 0,
    };

    // Format output
    const enriched = rawConversations.map((c: any) => {
      const customer = c.customerInfo?.[0];
      const seller = c.sellerInfo?.[0];
      const product = c.productInfo?.[0];

      return {
        id: c.id,
        type: c.type || "customer_seller",
        customerId: c.customerId,
        sellerId: c.sellerId,
        sellerUserId: c.sellerUserId,
        adminId: c.adminId,
        productId: c.productId,
        orderId: c.orderId,
        status: c.status || (c.isFlagged ? "flagged" : "active"),
        isFlagged: Boolean(c.isFlagged),
        flagReason: c.flagReason || null,
        flaggedAt: c.flaggedAt || null,
        adminNotes: c.adminNotes || [],
        lastMessageText: c.lastMessageText || "",
        lastMessageAt: c.lastMessageAt || c.updatedAt,
        lastMessageSenderId: c.lastMessageSenderId,
        lastMessageSenderRole: c.lastMessageSenderRole || "customer",
        unreadCount: c.unreadCountAdmin || 0,
        unreadCountCustomer: c.unreadCountCustomer || 0,
        unreadCountSeller: c.unreadCountSeller || 0,
        unreadCountAdmin: c.unreadCountAdmin || 0,
        customer: customer ? {
          id: customer.id,
          name: customer.name || "Customer",
          email: customer.email || "",
          image: customer.image || null,
          phone: customer.phone || null,
        } : null,
        seller: seller ? {
          id: seller.id,
          shopName: seller.name || seller.shopName || "Seller Store",
          storeName: seller.name || seller.shopName || "Seller Store",
          shopSlug: seller.slug || "",
          logo: seller.logo || null,
          rating: seller.rating || 5.0,
          sellerStatus: seller.status || "active",
        } : null,
        product: product ? {
          id: product.id,
          title: product.title,
          slug: product.slug,
          image: product.thumbnailImage || product.images?.[0] || "",
          price: product.price || 0,
        } : null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: enriched,
      total,
      page,
      limit,
      stats: {
        totalAll: stats.totalAll || 0,
        totalFlagged: stats.totalFlagged || 0,
        totalSellerAdmin: stats.totalSellerAdmin || 0,
        totalCustomerSeller: stats.totalCustomerSeller || 0,
        totalUnreadAdmin: stats.totalUnreadAdmin || 0,
      },
    });
  } catch (error: any) {
    console.error("ADMIN GET CONVERSATIONS ERROR:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
