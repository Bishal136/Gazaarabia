import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

export const dynamic = "force-dynamic";

async function getNextId(collection: any): Promise<number> {
  const last = await collection.find().sort({ id: -1 }).limit(1).toArray();
  return last.length > 0 && typeof last[0].id === "number" ? last[0].id + 1 : 1;
}

export async function POST(req: NextRequest) {
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

    const body = await req.json().catch(() => ({}));
    const sellerId = parseInt(body.sellerId);
    if (isNaN(sellerId)) {
      return NextResponse.json({ message: "Invalid seller ID" }, { status: 400 });
    }

    const sellerDoc = await db.collection("sellers").findOne({ id: sellerId });
    if (!sellerDoc) {
      return NextResponse.json({ message: "Seller store not found" }, { status: 404 });
    }

    // Check if seller_admin thread already exists
    let conversation = await db.collection("conversations").findOne({
      type: "seller_admin",
      $or: [{ sellerId: sellerDoc.id }, { sellerUserId: sellerDoc.userId }],
    });

    if (!conversation) {
      const newId = await getNextId(db.collection("conversations"));
      conversation = {
        id: newId,
        type: "seller_admin",
        sellerId: sellerDoc.id,
        sellerUserId: sellerDoc.userId,
        adminId: user.id,
        status: "active",
        isFlagged: false,
        flagReason: null,
        adminNotes: [],
        lastMessageText: "Admin Support channel initialized",
        lastMessageAt: new Date(),
        lastMessageSenderId: user.id,
        lastMessageSenderRole: "admin",
        unreadCountCustomer: 0,
        unreadCountSeller: 0,
        unreadCountAdmin: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection("conversations").insertOne(conversation);
    }

    return NextResponse.json({
      success: true,
      data: conversation,
    });
  } catch (error: any) {
    console.error("ADMIN START SELLER CHAT ERROR:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
