import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

export const dynamic = "force-dynamic";

async function getNextId(collection: any): Promise<number> {
  const last = await collection.find().sort({ id: -1 }).limit(1).toArray();
  return last.length > 0 && typeof last[0].id === "number" ? last[0].id + 1 : 1;
}

// --------------------------------------------------------------------------
// GET /api/chat/conversations/[id]/messages
// Fetch all messages in a conversation & mark incoming messages as read
// --------------------------------------------------------------------------
export async function GET(
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
      return NextResponse.json(
        { message: "Forbidden: You are not a participant in this conversation" },
        { status: 403 }
      );
    }

    // Mark unread messages sent by the other party as read
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

    // Reset unread count on conversation
    if (isCustomer && conversation.unreadCountCustomer > 0) {
      await db.collection("conversations").updateOne(
        { id: conversationId },
        { $set: { unreadCountCustomer: 0, updatedAt: new Date() } }
      );
    } else if (isSeller && conversation.unreadCountSeller > 0) {
      await db.collection("conversations").updateOne(
        { id: conversationId },
        { $set: { unreadCountSeller: 0, updatedAt: new Date() } }
      );
    }

    const messages = await db
      .collection("messages")
      .find({ conversationId: conversationId })
      .sort({ createdAt: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (error: any) {
    console.error("GET MESSAGES ERROR:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

// --------------------------------------------------------------------------
// POST /api/chat/conversations/[id]/messages
// Send a message (text, multiple photos, video, attached product card)
// --------------------------------------------------------------------------
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
    let sellerDoc: any = null;

    if (!isSeller) {
      sellerDoc = await db.collection("sellers").findOne({ userId: user.id });
      if (sellerDoc && sellerDoc.id === conversation.sellerId) {
        isSeller = true;
      }
    }

    if (!isCustomer && !isSeller) {
      return NextResponse.json(
        { message: "Forbidden: You are not a participant in this conversation" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const mediaUrls = Array.isArray(body.mediaUrls) ? body.mediaUrls.filter(Boolean) : [];
    const videoUrl = typeof body.videoUrl === "string" && body.videoUrl.trim() ? body.videoUrl.trim() : null;
    const productContext = body.productContext || null;

    if (!text && mediaUrls.length === 0 && !videoUrl && !productContext) {
      return NextResponse.json(
        { message: "Message cannot be completely empty" },
        { status: 400 }
      );
    }

    const senderRole = isCustomer ? "customer" : "seller";
    let receiverId = isCustomer ? conversation.sellerUserId : conversation.customerId;

    // Fallback if sellerUserId wasn't populated on conversation
    if (!receiverId && isCustomer) {
      if (!sellerDoc) {
        sellerDoc = await db.collection("sellers").findOne({ id: conversation.sellerId });
      }
      receiverId = sellerDoc?.userId;
      if (receiverId) {
        await db.collection("conversations").updateOne(
          { id: conversationId },
          { $set: { sellerUserId: receiverId } }
        );
      }
    }

    // Determine media type
    let mediaType: "text" | "image" | "video" | "mixed" = "text";
    if (videoUrl && mediaUrls.length > 0) {
      mediaType = "mixed";
    } else if (videoUrl) {
      mediaType = "video";
    } else if (mediaUrls.length > 0) {
      mediaType = "image";
    }

    const newId = await getNextId(db.collection("messages"));
    const messageDoc = {
      id: newId,
      conversationId: conversationId,
      senderId: user.id,
      receiverId: receiverId || 0,
      senderRole: senderRole,
      text: text,
      mediaUrls: mediaUrls,
      mediaType: mediaType,
      videoUrl: videoUrl,
      productContext: productContext ? {
        id: productContext.id,
        title: productContext.title,
        slug: productContext.slug,
        image: productContext.image,
        price: Number(productContext.price || 0),
      } : null,
      isRead: false,
      readAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("messages").insertOne(messageDoc);

    // Update conversation snippet and increment receiver unread counter
    const previewSnippet = text || (mediaType === "video" ? "📹 Shared a video" : mediaUrls.length > 0 ? "📷 Shared photos" : "Product inquiry");
    const convUpdate: any = {
      lastMessageText: previewSnippet,
      lastMessageAt: new Date(),
      lastMessageSenderId: user.id,
      updatedAt: new Date(),
    };

    if (productContext && !conversation.productId) {
      convUpdate.productId = productContext.id;
    }

    if (isCustomer) {
      convUpdate.$inc = { unreadCountSeller: 1 };
    } else {
      convUpdate.$inc = { unreadCountCustomer: 1 };
    }

    await db.collection("conversations").updateOne(
      { id: conversationId },
      {
        $set: {
          lastMessageText: convUpdate.lastMessageText,
          lastMessageAt: convUpdate.lastMessageAt,
          lastMessageSenderId: convUpdate.lastMessageSenderId,
          updatedAt: convUpdate.updatedAt,
          ...(convUpdate.productId ? { productId: convUpdate.productId } : {}),
        },
        ...(convUpdate.$inc ? { $inc: convUpdate.$inc } : {}),
      }
    );

    return NextResponse.json({
      success: true,
      data: messageDoc,
    });
  } catch (error: any) {
    console.error("POST MESSAGE ERROR:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
