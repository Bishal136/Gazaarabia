import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!user.role || user.role.name.toLowerCase() !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ success: false, message: "Database not connected" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status");
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);
    const skip = (page - 1) * limit;

    const query: any = {};
    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { shopName: { $regex: search, $options: "i" } },
        { shopSlug: { $regex: search, $options: "i" } },
      ];
    }

    const [sellersRaw, total] = await Promise.all([
      db
        .collection("sellers")
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("sellers").countDocuments(query),
    ]);

    const userIds = sellersRaw.map((s: any) => s.userId).filter(Boolean);
    const sellerIds = sellersRaw.map((s: any) => s.id);

    const [users, products, orderItems] = await Promise.all([
      db.collection("users").find({ id: { $in: userIds } }).toArray(),
      db.collection("products").find({ sellerId: { $in: sellerIds }, isDeleted: { $ne: true } }).toArray(),
      db.collection("orders_item").find({ sellerId: { $in: sellerIds } }).toArray(),
    ]);

    const userMap = new Map(users.map((u: any) => [u.id, u]));

    const sellers = sellersRaw.map((seller: any) => {
      const u = userMap.get(seller.userId);
      const prodCount = products.filter((p: any) => p.sellerId === seller.id).length;
      const orderCount = orderItems.filter((i: any) => i.sellerId === seller.id).length;

      return {
        ...seller,
        user: u ? { id: u.id, name: u.name, email: u.email, phone: u.phone } : null,
        _count: {
          products: prodCount,
          orderItems: orderCount,
        },
      };
    });

    return NextResponse.json({
      success: true,
      message: "Sellers fetched successfully",
      data: sellers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("GET Sellers Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch sellers" },
      { status: 500 }
    );
  }
}
