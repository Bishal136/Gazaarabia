import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

export const dynamic = "force-dynamic";

// Helper for atomic sequence IDs
async function getNextId(collection: any): Promise<number> {
  const last = await collection.find().sort({ id: -1 }).limit(1).toArray();
  return last.length > 0 && typeof last[0].id === "number" ? last[0].id + 1 : 1;
}

// --------------------------------------------------------------------------
// GET /api/chat/conversations
// Returns conversations for Customer or Seller, filterable by type
// --------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ message: "Database not connected" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const requestedType = searchParams.get("type"); // "customer_seller" | "seller_admin" | "all"

    const isSeller = user.role?.name?.toLowerCase() === "seller";
    let sellerDoc: any = null;
    let query: any = {};

    if (isSeller) {
      sellerDoc = await db.collection("sellers").findOne({ userId: user.id });
      if (!sellerDoc) {
        return NextResponse.json({ success: true, data: [] });
      }

      if (requestedType === "seller_admin") {
        query = {
          type: "seller_admin",
          $or: [{ sellerId: sellerDoc.id }, { sellerUserId: user.id }],
        };
      } else if (requestedType === "customer_seller") {
        query = {
          $or: [
            { type: "customer_seller", sellerId: sellerDoc.id },
            { type: "customer_seller", sellerUserId: user.id },
            // Legacy backwards-compatibility for existing docs without explicit type
            { type: { $exists: false }, sellerId: sellerDoc.id },
            { type: { $exists: false }, sellerUserId: user.id },
          ],
        };
      } else {
        query = {
          $or: [{ sellerId: sellerDoc.id }, { sellerUserId: user.id }],
        };
      }
    } else {
      // Customer
      query = { customerId: user.id };
    }

    const conversations = await db
      .collection("conversations")
      .find(query)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .toArray();

    if (conversations.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Collect IDs for batch hydration
    const customerUserIds = Array.from(new Set(conversations.map((c: any) => c.customerId).filter(Boolean)));
    const sellerIds = Array.from(new Set(conversations.map((c: any) => c.sellerId).filter(Boolean)));
    const productIds = Array.from(new Set(conversations.map((c: any) => c.productId).filter(Boolean)));

    const [customerUsers, sellers, products, productImages] = await Promise.all([
      customerUserIds.length > 0
        ? db.collection("users").find({ id: { $in: customerUserIds } }).project({ id: 1, name: 1, email: 1 }).toArray()
        : [],
      sellerIds.length > 0
        ? db.collection("sellers").find({ id: { $in: sellerIds } }).toArray()
        : [],
      productIds.length > 0
        ? db.collection("products").find({ id: { $in: productIds } }).project({ id: 1, title: 1, slug: 1, sellingPrice: 1, image: 1 }).toArray()
        : [],
      productIds.length > 0
        ? db.collection("productimage").find({ productId: { $in: productIds } }).toArray()
        : [],
    ]);

    const customerMap = new Map(customerUsers.map((u: any) => [u.id, u]));
    const sellerMap = new Map(sellers.map((s: any) => [s.id, s]));
    const productMap = new Map(products.map((p: any) => [p.id, p]));

    const imageMap = new Map<number, string>();
    productImages.forEach((img: any) => {
      if (!imageMap.has(img.productId) || img.primary) {
        imageMap.set(img.productId, img.url);
      }
    });

    const enriched = conversations.map((conv: any) => {
      const cust = customerMap.get(conv.customerId);
      const sll = sellerMap.get(conv.sellerId);
      const prod = conv.productId ? productMap.get(conv.productId) : null;
      const prodImage = conv.productId ? (imageMap.get(conv.productId) || prod?.image || "/placeholder.png") : null;

      const convType = conv.type || (conv.customerId ? "customer_seller" : "seller_admin");

      return {
        id: conv.id,
        type: convType,
        customerId: conv.customerId,
        sellerId: conv.sellerId,
        sellerUserId: conv.sellerUserId || sll?.userId,
        productId: conv.productId || null,
        lastMessageText: conv.lastMessageText || "",
        lastMessageAt: conv.lastMessageAt || conv.updatedAt,
        lastMessageSenderId: conv.lastMessageSenderId || null,
        lastMessageSenderRole: conv.lastMessageSenderRole || "customer",
        unreadCount: isSeller ? (conv.unreadCountSeller || 0) : (conv.unreadCountCustomer || 0),
        unreadCountCustomer: conv.unreadCountCustomer || 0,
        unreadCountSeller: conv.unreadCountSeller || 0,
        unreadCountAdmin: conv.unreadCountAdmin || 0,
        status: conv.status || (conv.isFlagged ? "flagged" : "active"),
        isFlagged: Boolean(conv.isFlagged),
        flagReason: conv.flagReason || null,
        customer: {
          id: cust?.id || conv.customerId,
          name: cust?.name || (convType === "seller_admin" ? "Platform Admin" : "Customer"),
          email: cust?.email || "",
        },
        seller: {
          id: sll?.id || conv.sellerId,
          shopName: sll?.shopName || "GAZAARABIA Verified Store",
          storeName: sll?.shopName || "GAZAARABIA Verified Store",
          shopSlug: sll?.shopSlug || "",
          logo: sll?.logo || null,
        },
        product: prod ? {
          id: prod.id,
          title: prod.title,
          slug: prod.slug,
          price: Number(prod.sellingPrice || 0),
          image: prodImage,
        } : null,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: any) {
    console.error("GET CONVERSATIONS ERROR:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

// --------------------------------------------------------------------------
// POST /api/chat/conversations
// 1) Customer initiates or retrieves Customer ↔ Seller chat
// 2) Seller initiates or retrieves Seller ↔ Admin chat
// --------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized. Please log in to chat." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const convType = body.type || (body.sellerId ? "customer_seller" : "seller_admin");

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ message: "Database not connected" }, { status: 500 });
    }

    // -----------------------------------------------------------------------
    // FLOW A: Seller ↔ Admin Chat
    // -----------------------------------------------------------------------
    if (convType === "seller_admin") {
      const isSeller = user.role?.name?.toLowerCase() === "seller";
      if (!isSeller) {
        return NextResponse.json({ message: "Only registered sellers can contact Platform Admin Support" }, { status: 403 });
      }

      const sellerDoc = await db.collection("sellers").findOne({ userId: user.id });
      if (!sellerDoc) {
        return NextResponse.json({ message: "Seller profile not found" }, { status: 404 });
      }

      let conversation = await db.collection("conversations").findOne({
        type: "seller_admin",
        $or: [{ sellerId: sellerDoc.id }, { sellerUserId: user.id }],
      });

      if (!conversation) {
        const newId = await getNextId(db.collection("conversations"));
        const newDoc = {
          id: newId,
          type: "seller_admin",
          sellerId: sellerDoc.id,
          sellerUserId: user.id,
          adminId: null,
          lastMessageText: "Conversation opened with GAZAARABIA Admin Support",
          lastMessageAt: new Date(),
          lastMessageSenderId: user.id,
          lastMessageSenderRole: "seller",
          unreadCountCustomer: 0,
          unreadCountSeller: 0,
          unreadCountAdmin: 0,
          status: "active",
          isFlagged: false,
          isArchived: false,
          isMonitored: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.collection("conversations").insertOne(newDoc);
        conversation = newDoc;
      }

      return NextResponse.json({
        success: true,
        data: {
          ...conversation,
          seller: {
            id: sellerDoc.id,
            shopName: sellerDoc.shopName || "Your Store",
            storeName: sellerDoc.shopName || "Your Store",
            logo: sellerDoc.logo || null,
          },
          admin: {
            name: "GAZAARABIA Platform Support",
            badge: "Official Support Team",
          },
        },
      });
    }

    // -----------------------------------------------------------------------
    // FLOW B: Customer ↔ Seller Chat
    // -----------------------------------------------------------------------
    const customerId = Number(user.id);
    const sellerId = Number(body.sellerId);
    const productId = body.productId ? Number(body.productId) : null;

    if (!sellerId || isNaN(sellerId)) {
      return NextResponse.json({ message: "Valid sellerId is required" }, { status: 400 });
    }

    const seller = await db.collection("sellers").findOne({ id: sellerId });
    const sellerUserId = seller?.userId || null;
    const shopName = seller?.shopName || "GAZAARABIA Verified Store";

    let conversation = await db.collection("conversations").findOne({
      customerId: customerId,
      sellerId: sellerId,
    });

    if (conversation) {
      if (productId && conversation.productId !== productId) {
        await db.collection("conversations").updateOne(
          { id: conversation.id },
          { $set: { productId: productId, updatedAt: new Date() } }
        );
        conversation.productId = productId;
      }
    } else {
      const newId = await getNextId(db.collection("conversations"));
      const newDoc = {
        id: newId,
        type: "customer_seller",
        customerId: user.id,
        sellerId: sellerId,
        sellerUserId: sellerUserId,
        productId: productId || null,
        lastMessageText: "",
        lastMessageAt: new Date(),
        lastMessageSenderId: user.id,
        lastMessageSenderRole: "customer",
        unreadCountCustomer: 0,
        unreadCountSeller: 0,
        unreadCountAdmin: 0,
        status: "active",
        isFlagged: false,
        isArchived: false,
        isMonitored: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection("conversations").insertOne(newDoc);
      conversation = newDoc;
    }

    let productData: any = null;
    if (conversation.productId) {
      const prod = await db.collection("products").findOne(
        { id: conversation.productId },
        { projection: { id: 1, title: 1, slug: 1, sellingPrice: 1, image: 1 } }
      );
      if (prod) {
        const prodImg = await db.collection("productimage").findOne({ productId: prod.id });
        productData = {
          id: prod.id,
          title: prod.title,
          slug: prod.slug,
          price: Number(prod.sellingPrice || 0),
          image: prodImg?.url || prod.image || "/placeholder.png",
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...conversation,
        seller: {
          id: sellerId,
          shopName: shopName,
          storeName: shopName,
          userId: sellerUserId,
          logo: seller?.logo || null,
        },
        product: productData,
      },
    });
  } catch (error: any) {
    console.error("POST CONVERSATION ERROR:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
