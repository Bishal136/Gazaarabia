import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/authToken";
import { connectToDatabase } from "@/lib/mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = await checkAuth(req);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const m = await connectToDatabase();
    const db = m.connection.db;
    const numericUserId = Number(userId);

    // 1. Fetch user's delivered/completed orders
    const deliveredOrders = await db
      .collection("orders")
      .find({
        userId: numericUserId,
        status: { $regex: /^(delivered|completed)$/i },
      })
      .toArray();

    const deliveredOrderIds = deliveredOrders.map((o) => o.id);
    const orderMap = new Map<number, any>();
    deliveredOrders.forEach((o) => orderMap.set(o.id, o));

    // 2. Fetch order items for delivered orders
    const orderItems =
      deliveredOrderIds.length > 0
        ? await db
            .collection("orders_item")
            .find({ orderId: { $in: deliveredOrderIds } })
            .toArray()
        : [];

    // 3. Fetch all reviews written by this customer
    const myReviews = await db
      .collection("review")
      .find({ userId: numericUserId })
      .sort({ createdAt: -1 })
      .toArray();

    const reviewedOrderItemIds = new Set<number>(
      myReviews.map((r) => Number(r.orderItemId)).filter(Boolean)
    );

    // 4. Filter unreviewed items
    const unreviewedItems = orderItems.filter(
      (item) => !item.reviewed && !reviewedOrderItemIds.has(Number(item.id))
    );

    // 5. Gather all relevant IDs for batch fetching
    const allProductIds = new Set<number>();
    const allVariantIds = new Set<number>();

    unreviewedItems.forEach((it) => {
      if (it.productId) allProductIds.add(Number(it.productId));
      if (it.variantId) allVariantIds.add(Number(it.variantId));
    });

    myReviews.forEach((rev) => {
      if (rev.productId) allProductIds.add(Number(rev.productId));
      if (rev.variantId) allVariantIds.add(Number(rev.variantId));
    });

    const productIdsArray = Array.from(allProductIds);
    const variantIdsArray = Array.from(allVariantIds);

    // Batch fetch products, images, variants, colors, sizes
    const [products, productImages, variants, colors, sizes] = await Promise.all([
      productIdsArray.length > 0
        ? db.collection("products").find({ id: { $in: productIdsArray } }).toArray()
        : [],
      productIdsArray.length > 0
        ? db.collection("productimage").find({ productId: { $in: productIdsArray } }).toArray()
        : [],
      variantIdsArray.length > 0
        ? db.collection("productvariant").find({ id: { $in: variantIdsArray } }).toArray()
        : [],
      db.collection("colors").find({}).toArray(),
      db.collection("sizes").find({}).toArray(),
    ]);

    const productMap = new Map<number, any>();
    products.forEach((p) => productMap.set(p.id, p));

    const imageMap = new Map<number, string>();
    productImages.forEach((img) => {
      // Prioritize primary image or keep first found
      if (!imageMap.has(img.productId) || img.primary) {
        imageMap.set(img.productId, img.url);
      }
    });

    const colorMap = new Map<number, any>();
    colors.forEach((c) => colorMap.set(c.id, c));

    const sizeMap = new Map<number, any>();
    sizes.forEach((s) => sizeMap.set(s.id, s));

    const variantMap = new Map<number, any>();
    variants.forEach((v) => variantMap.set(v.id, v));

    // Helper to format variant data
    const getVariantDetails = (variantId?: number) => {
      if (!variantId) return null;
      const v = variantMap.get(variantId);
      if (!v) return null;
      const color = v.colorId ? colorMap.get(v.colorId) : null;
      const size = v.sizeId ? sizeMap.get(v.sizeId) : null;
      return {
        id: v.id,
        sku: v.sku || null,
        colorName: color?.name || null,
        sizeName: size?.name || null,
        image: v.imageUrl || null,
      };
    };

    // 6. Format "To Be Reviewed" items
    const toBeReviewed = unreviewedItems.map((item) => {
      const order = orderMap.get(item.orderId);
      const product = productMap.get(item.productId);
      const coverImage =
        imageMap.get(item.productId) || product?.image || "/placeholder.png";

      return {
        id: item.id,
        orderId: item.orderId,
        orderNumber: order?.orderNumber || `#${item.orderId}`,
        orderDate: order?.createdAt || item.createdAt,
        orderStatus: order?.status || "delivered",
        productId: item.productId,
        variantId: item.variantId || null,
        price: item.price || 0,
        quantity: item.quantity || 1,
        product: {
          id: product?.id || item.productId,
          title: product?.title || "Product",
          slug: product?.slug || "",
          image: coverImage,
          sellingPrice: product?.sellingPrice || item.price || 0,
        },
        variant: getVariantDetails(item.variantId),
      };
    });

    // 7. Format "Review History" items
    const reviewHistory = myReviews.map((rev) => {
      const product = productMap.get(rev.productId);
      const coverImage =
        imageMap.get(rev.productId) || product?.image || "/placeholder.png";

      const images = Array.isArray(rev.images)
        ? rev.images
        : rev.image
        ? [rev.image]
        : [];

      return {
        id: rev.id,
        rating: Number(rev.rating) || 5,
        comment: rev.comment || "",
        images,
        image: rev.image || images[0] || null,
        video: rev.video || null,
        createdAt: rev.createdAt,
        updatedAt: rev.updatedAt,
        productId: rev.productId,
        variantId: rev.variantId || null,
        orderItemId: rev.orderItemId || null,
        sellerReply: rev.sellerReply || null,
        sellerRepliedAt: rev.sellerRepliedAt || null,
        sellerReplyShopName: rev.sellerReplyShopName || null,
        product: {
          id: product?.id || rev.productId,
          title: product?.title || "Product",
          slug: product?.slug || "",
          image: coverImage,
        },
        variant: getVariantDetails(rev.variantId),
      };
    });

    return NextResponse.json({
      success: true,
      toBeReviewed,
      reviewHistory,
      counts: {
        toBeReviewed: toBeReviewed.length,
        reviewHistory: reviewHistory.length,
      },
    });
  } catch (error: any) {
    console.error("My Reviews GET Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
