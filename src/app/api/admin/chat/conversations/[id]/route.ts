import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

export const dynamic = "force-dynamic";

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

    // Reset admin unread count if positive
    if (conversation.unreadCountAdmin > 0) {
      await db.collection("conversations").updateOne(
        { id: conversationId },
        { $set: { unreadCountAdmin: 0, updatedAt: new Date() } }
      );
    }

    // Fetch all messages (admins see EVERYTHING including internal notes)
    const messages = await db
      .collection("messages")
      .find({ conversationId })
      .sort({ createdAt: 1 })
      .toArray();

    // Fetch enriched participant dossiers
    const [customerUser, sellerDoc, productDoc] = await Promise.all([
      conversation.customerId ? db.collection("users").findOne({ id: conversation.customerId }) : null,
      conversation.sellerId ? db.collection("sellers").findOne({ id: conversation.sellerId }) : null,
      conversation.productId ? db.collection("products").findOne({ id: conversation.productId }) : null,
    ]);

    // Calculate customer metrics if customer exists
    let customerMetrics = { ordersCount: 0, totalSpent: 0 };
    if (customerUser) {
      const orders = await db
        .collection("orders")
        .find({ userId: customerUser.id })
        .project({ totalPrice: 1, grandTotal: 1, status: 1 })
        .toArray();

      customerMetrics.ordersCount = orders.length;
      customerMetrics.totalSpent = orders.reduce((sum: number, o: any) => sum + (o.grandTotal || o.totalPrice || 0), 0);
    }

    // Calculate seller metrics
    let sellerMetrics = { totalProducts: 0 };
    if (sellerDoc) {
      sellerMetrics.totalProducts = await db.collection("products").countDocuments({ sellerId: sellerDoc.id });
    }

    return NextResponse.json({
      success: true,
      data: {
        conversation: {
          id: conversation.id,
          type: conversation.type || "customer_seller",
          customerId: conversation.customerId,
          sellerId: conversation.sellerId,
          sellerUserId: conversation.sellerUserId,
          adminId: conversation.adminId,
          productId: conversation.productId,
          orderId: conversation.orderId,
          status: conversation.status || (conversation.isFlagged ? "flagged" : "active"),
          isFlagged: Boolean(conversation.isFlagged),
          flagReason: conversation.flagReason || null,
          flaggedAt: conversation.flaggedAt || null,
          adminNotes: conversation.adminNotes || [],
          lastMessageText: conversation.lastMessageText || "",
          lastMessageAt: conversation.lastMessageAt,
          unreadCountAdmin: 0,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
        messages,
        customer: customerUser ? {
          id: customerUser.id,
          name: customerUser.name || "Customer",
          email: customerUser.email,
          phone: customerUser.phone || null,
          image: customerUser.image || null,
          createdAt: customerUser.createdAt,
          ordersCount: customerMetrics.ordersCount,
          totalSpent: customerMetrics.totalSpent,
        } : null,
        seller: sellerDoc ? {
          id: sellerDoc.id,
          shopName: sellerDoc.name || sellerDoc.shopName || "Seller Store",
          storeName: sellerDoc.name || sellerDoc.shopName || "Seller Store",
          shopSlug: sellerDoc.slug || "",
          logo: sellerDoc.logo || null,
          rating: sellerDoc.rating || 5.0,
          sellerStatus: sellerDoc.status || "active",
          createdAt: sellerDoc.createdAt,
          totalProducts: sellerMetrics.totalProducts,
        } : null,
        product: productDoc ? {
          id: productDoc.id,
          title: productDoc.title,
          slug: productDoc.slug,
          image: productDoc.thumbnailImage || productDoc.images?.[0] || "",
          price: productDoc.price || 0,
        } : null,
      },
    });
  } catch (error: any) {
    console.error("ADMIN GET CONVERSATION DETAILS ERROR:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
