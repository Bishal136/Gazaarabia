import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = parseInt(id);
    if (isNaN(conversationId)) {
      return NextResponse.json({ message: "Invalid conversation ID" }, { status: 400 });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ message: "Database not connected" }, { status: 500 });
    }

    const conversation = await db.collection("conversations").findOne({ id: conversationId });
    if (!conversation) {
      return NextResponse.json({ message: "Conversation not found" }, { status: 404 });
    }

    const isCustomer = conversation.customerId === user.id;
    let isSeller = conversation.sellerUserId === user.id;

    if (!isSeller) {
      const sellerDoc = await db.collection("sellers").findOne({ userId: user.id });
      if (sellerDoc && sellerDoc.id === conversation.sellerId) {
        isSeller = true;
      }
    }

    if (!isCustomer && !isSeller) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await db.collection("messages").updateMany(
      {
        conversationId: conversationId,
        receiverId: user.id,
        isRead: false,
      },
      {
        $set: { isRead: true, readAt: new Date(), updatedAt: new Date() },
      }
    );

    if (isCustomer) {
      await db.collection("conversations").updateOne(
        { id: conversationId },
        { $set: { unreadCountCustomer: 0, updatedAt: new Date() } }
      );
    } else if (isSeller) {
      await db.collection("conversations").updateOne(
        { id: conversationId },
        { $set: { unreadCountSeller: 0, updatedAt: new Date() } }
      );
    }

    return NextResponse.json({ success: true, message: "Marked as read" });
  } catch (error: any) {
    console.error("MARK READ ERROR:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
