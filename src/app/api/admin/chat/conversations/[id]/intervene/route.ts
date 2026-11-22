import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

export const dynamic = "force-dynamic";

async function getNextId(collection: any): Promise<number> {
  const last = await collection.find().sort({ id: -1 }).limit(1).toArray();
  return last.length > 0 && typeof last[0].id === "number" ? last[0].id + 1 : 1;
}

export async function POST(
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

    const roleName = user.role?.name?.toLowerCase() || "";
    if (roleName !== "admin" && roleName !== "superadmin") {
      return NextResponse.json({ message: "Forbidden: Admin access required" }, { status: 403 });
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

    const body = await req.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      return NextResponse.json({ message: "Intervention message text is required" }, { status: 400 });
    }

    const newId = await getNextId(db.collection("messages"));
    const messageDoc = {
      id: newId,
      conversationId: conversationId,
      senderId: user.id,
      receiverId: conversation.type === "seller_admin" ? (conversation.sellerUserId || 0) : (conversation.customerId || 0),
      senderRole: "admin",
      isInternalAdminNote: false,
      text: text,
      mediaType: "text",
      mediaUrls: [],
      metadata: {
        isOfficialIntervention: true,
        adminName: user.name || "Platform Moderator",
      },
      isRead: false,
      readAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("messages").insertOne(messageDoc);

    // Notify participants by incrementing unread counters
    const incUpdate: any = {};
    if (conversation.type === "seller_admin") {
      incUpdate.unreadCountSeller = 1;
    } else {
      incUpdate.unreadCountCustomer = 1;
      incUpdate.unreadCountSeller = 1;
    }

    await db.collection("conversations").updateOne(
      { id: conversationId },
      {
        $set: {
          lastMessageText: `🛡️ Moderator: ${text}`,
          lastMessageAt: new Date(),
          lastMessageSenderId: user.id,
          lastMessageSenderRole: "admin",
          updatedAt: new Date(),
        },
        $inc: incUpdate,
      }
    );

    return NextResponse.json({
      success: true,
      data: messageDoc,
    });
  } catch (error: any) {
    console.error("ADMIN INTERVENTION ERROR:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
