import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

export const dynamic = "force-dynamic";

async function getNextId(collection: any): Promise<number> {
  const last = await collection.find().sort({ id: -1 }).limit(1).toArray();
  return last.length > 0 && typeof last[0].id === "number" ? last[0].id + 1 : 1;
}

// Anti-scam / off-platform pattern detector
function detectScamPatterns(text: string): { isSuspicious: boolean; reason?: string } {
  if (!text) return { isSuspicious: false };

  // Check email
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  if (emailRegex.test(text)) {
    return { isSuspicious: true, reason: "Sharing external email address" };
  }

  // Check WhatsApp or social handle sharing
  const socialRegex = /\b(whatsapp|telegram|instagram|viber|signal|skype|fb\.com|t\.me)\b/i;
  if (socialRegex.test(text)) {
    return { isSuspicious: true, reason: "Soliciting contact via third-party chat (WhatsApp/Telegram)" };
  }

  // Check off-platform payment keywords
  const paymentRegex = /\b(paypal|bank\s*transfer|wire\s*transfer|pay\s*outside|cash\s*outside|direct\s*pay|send\s*to\s*my\s*card|cashapp|venmo|zelle|crypto|usdt|bitcoin)\b/i;
  if (paymentRegex.test(text)) {
    return { isSuspicious: true, reason: "Off-platform payment or direct transfer solicitation" };
  }

  // Check phone number sequence (7 or more digits with typical phone spacing)
  const phoneRegex = /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?0\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}/;
  const digitsOnly = text.replace(/\D/g, "");
  if (digitsOnly.length >= 10 && phoneRegex.test(text)) {
    return { isSuspicious: true, reason: "Sharing direct phone/mobile number" };
  }

  return { isSuspicious: false };
}

// --------------------------------------------------------------------------
// GET /api/chat/conversations/[id]/messages
// Fetch messages with strict RBAC:
// Admins see all (including internal notes).
// Customers/Sellers see only public messages (isInternalAdminNote != true).
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

    const roleName = user.role?.name?.toLowerCase() || "";
    const isAdmin = roleName === "admin" || roleName === "superadmin";

    const isCustomer = conversation.customerId === user.id;
    let isSeller = conversation.sellerUserId === user.id;

    if (!isSeller && !isAdmin) {
      const sellerDoc = await db.collection("sellers").findOne({ userId: user.id });
      if (sellerDoc && sellerDoc.id === conversation.sellerId) {
        isSeller = true;
      }
    }

    if (!isCustomer && !isSeller && !isAdmin) {
      return NextResponse.json(
        { message: "Forbidden: You are not a participant in this conversation" },
        { status: 403 }
      );
    }

    // Mark unread messages sent to this user as read
    if (!isAdmin) {
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

      // Reset conversation unread counter
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
    } else {
      // Admin viewed: reset admin unread count if > 0
      if (conversation.unreadCountAdmin > 0) {
        await db.collection("conversations").updateOne(
          { id: conversationId },
          { $set: { unreadCountAdmin: 0, updatedAt: new Date() } }
        );
      }
    }

    // Build query for messages: Non-admins NEVER see internal admin notes
    const messageQuery: any = { conversationId: conversationId };
    if (!isAdmin) {
      messageQuery.isInternalAdminNote = { $ne: true };
    }

    const messages = await db
      .collection("messages")
      .find(messageQuery)
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
// Send a message (text, media, video, product context, or admin intervention)
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

    const roleName = user.role?.name?.toLowerCase() || "";
    const isAdmin = roleName === "admin" || roleName === "superadmin";

    const isCustomer = conversation.customerId === user.id;
    let isSeller = conversation.sellerUserId === user.id;
    let sellerDoc: any = null;

    if (!isSeller && !isAdmin) {
      sellerDoc = await db.collection("sellers").findOne({ userId: user.id });
      if (sellerDoc && sellerDoc.id === conversation.sellerId) {
        isSeller = true;
      }
    }

    if (!isCustomer && !isSeller && !isAdmin) {
      return NextResponse.json(
        { message: "Forbidden: You are not a participant in this conversation" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const mediaUrls = Array.isArray(body.mediaUrls) ? body.mediaUrls.filter(Boolean) : [];
    const videoUrl = typeof body.videoUrl === "string" && body.videoUrl.trim() ? body.videoUrl.trim() : null;
    const productContext = body.productContext || null;
    const orderContext = body.orderContext || null;
    const isInternalAdminNote = isAdmin && Boolean(body.isInternalAdminNote);

    if (!text && mediaUrls.length === 0 && !videoUrl && !productContext && !orderContext) {
      return NextResponse.json(
        { message: "Message cannot be completely empty" },
        { status: 400 }
      );
    }

    // Role and recipient resolution
    let senderRole: "customer" | "seller" | "admin" = "customer";
    let receiverId: number = 0;

    if (isAdmin) {
      senderRole = "admin";
      // If seller-admin chat, receiver is seller; if customer-admin, customer; in customer-seller thread, it's an intervention
      receiverId = conversation.type === "seller_admin" ? (conversation.sellerUserId || 0) : (conversation.customerId || 0);
    } else if (isSeller) {
      senderRole = "seller";
      receiverId = conversation.type === "seller_admin" ? 0 : (conversation.customerId || 0);
    } else {
      senderRole = "customer";
      receiverId = conversation.sellerUserId || 0;
      if (!receiverId && conversation.sellerId) {
        if (!sellerDoc) {
          sellerDoc = await db.collection("sellers").findOne({ id: conversation.sellerId });
        }
        receiverId = sellerDoc?.userId || 0;
        if (receiverId) {
          await db.collection("conversations").updateOne(
            { id: conversationId },
            { $set: { sellerUserId: receiverId } }
          );
        }
      }
    }

    // Automated Anti-Scam / Fraud Detection (only for regular users, not admin)
    let scamCheck = { isSuspicious: false, reason: "" };
    if (!isAdmin) {
      scamCheck = detectScamPatterns(text);
    }

    // Determine media type
    let mediaType: "text" | "image" | "video" | "mixed" | "system_notice" = "text";
    if (isInternalAdminNote) {
      mediaType = "system_notice";
    } else if (videoUrl && mediaUrls.length > 0) {
      mediaType = "mixed";
    } else if (videoUrl) {
      mediaType = "video";
    } else if (mediaUrls.length > 0) {
      mediaType = "image";
    }

    const newId = await getNextId(db.collection("messages"));
    const messageDoc: any = {
      id: newId,
      conversationId: conversationId,
      senderId: user.id,
      receiverId: receiverId,
      senderRole: senderRole,
      isInternalAdminNote: isInternalAdminNote,
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
      orderContext: orderContext ? {
        id: orderContext.id,
        orderNumber: orderContext.orderNumber,
        totalAmount: Number(orderContext.totalAmount || 0),
        orderStatus: orderContext.orderStatus,
      } : null,
      metadata: isAdmin ? {
        isOfficialIntervention: !isInternalAdminNote,
        systemAction: body.metadata?.systemAction || null,
      } : null,
      isRead: false,
      readAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("messages").insertOne(messageDoc);

    // If scam pattern detected, auto-flag conversation
    const flagUpdate: any = {};
    if (scamCheck.isSuspicious && !conversation.isFlagged) {
      flagUpdate.isFlagged = true;
      flagUpdate.status = "flagged";
      flagUpdate.flagReason = scamCheck.reason;
      flagUpdate.flaggedAt = new Date();
      flagUpdate.flaggedBy = 0; // 0 indicates system auto-detection
    }

    // Update conversation metadata if not an internal note
    if (!isInternalAdminNote) {
      const previewSnippet = text || (mediaType === "video" ? "📹 Shared a video" : mediaUrls.length > 0 ? "📷 Shared photos" : "Product inquiry");
      const incUpdate: any = {};

      if (isCustomer) {
        if (conversation.type === "customer_admin") {
          incUpdate.unreadCountAdmin = 1;
        } else {
          incUpdate.unreadCountSeller = 1;
        }
      } else if (isSeller) {
        if (conversation.type === "seller_admin") {
          incUpdate.unreadCountAdmin = 1;
        } else {
          incUpdate.unreadCountCustomer = 1;
        }
      } else if (isAdmin) {
        // Official intervention message notifies both or the recipient
        if (conversation.type === "seller_admin") {
          incUpdate.unreadCountSeller = 1;
        } else {
          incUpdate.unreadCountCustomer = 1;
          incUpdate.unreadCountSeller = 1;
        }
      }

      await db.collection("conversations").updateOne(
        { id: conversationId },
        {
          $set: {
            lastMessageText: previewSnippet,
            lastMessageAt: new Date(),
            lastMessageSenderId: user.id,
            lastMessageSenderRole: senderRole,
            updatedAt: new Date(),
            ...(productContext && !conversation.productId ? { productId: productContext.id } : {}),
            ...flagUpdate,
          },
          ...(Object.keys(incUpdate).length > 0 ? { $inc: incUpdate } : {}),
        }
      );
    } else {
      // For internal notes, store in conversation.adminNotes list as well
      const adminNoteItem = {
        id: newId,
        adminId: user.id,
        adminName: user.name || "Platform Admin",
        note: text,
        createdAt: new Date(),
      };

      await db.collection("conversations").updateOne(
        { id: conversationId },
        {
          $push: { adminNotes: adminNoteItem as any },
          $set: { updatedAt: new Date(), ...flagUpdate },
        }
      );
    }

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
