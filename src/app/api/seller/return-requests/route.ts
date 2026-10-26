import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ success: false, message: "Database not connected" }, { status: 500 });
    }

    const seller = await db.collection("sellers").findOne({ userId: user.id });
    if (!seller) {
      return NextResponse.json({ success: false, message: "Seller profile not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      db
        .collection("return_requests")
        .find({ sellerId: seller.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("return_requests").countDocuments({ sellerId: seller.id }),
    ]);

    return NextResponse.json({
      success: true,
      data: requests,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    console.error("GET Return Requests Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch return requests" },
      { status: 500 }
    );
  }
}
