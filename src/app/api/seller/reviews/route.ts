import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!user.role || user.role.name.toLowerCase() !== "seller") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ message: "Database not connected" }, { status: 500 });
    }

    const seller = await db.collection("sellers").findOne({ userId: user.id });
    if (!seller) {
      return NextResponse.json({ message: "Seller profile not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const sellerProducts = await db
      .collection("products")
      .find({ sellerId: seller.id })
      .project({ id: 1, title: 1, slug: 1, image: 1 })
      .toArray();

    const productIds = sellerProducts.map((p: any) => p.id);
    const productMap = new Map(sellerProducts.map((p: any) => [p.id, p]));

    // Query product images to provide primary product photo
    const productImages = productIds.length > 0
      ? await db.collection("productimage").find({ productId: { $in: productIds } }).toArray()
      : [];
    const imageMap = new Map<number, string>();
    productImages.forEach((img: any) => {
      if (!imageMap.has(img.productId) || img.primary) {
        imageMap.set(img.productId, img.url);
      }
    });

    // NOTE: MongoDB review collection name is "review" (singular)
    const [total, reviewsRaw] = await Promise.all([
      productIds.length > 0
        ? db.collection("review").countDocuments({ productId: { $in: productIds } })
        : 0,
      productIds.length > 0
        ? db
            .collection("review")
            .find({ productId: { $in: productIds } })
            .sort({ isPinned: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray()
        : [],
    ]);

    const userIds = Array.from(new Set(reviewsRaw.map((r: any) => r.userId).filter(Boolean)));
    const users = userIds.length > 0
      ? await db
          .collection("users")
          .find({ id: { $in: userIds } })
          .project({ id: 1, name: 1, email: 1 })
          .toArray()
      : [];
    const userMap = new Map(users.map((u: any) => [u.id, u]));

    const formattedReviews = reviewsRaw.map((review: any) => {
      const prod = productMap.get(review.productId);
      const usr = userMap.get(review.userId);
      const displayName = usr?.name || "Customer";
      const nameParts = displayName.trim().split(" ");
      const firstName = nameParts[0] || "Customer";
      const lastName = nameParts.slice(1).join(" ") || "";

      const images = Array.isArray(review.images)
        ? review.images
        : review.image
        ? [review.image]
        : [];

      return {
        id: review.id,
        rating: Number(review.rating) || 5,
        comment: review.comment || "",
        image: review.image || images[0] || "",
        images,
        video: review.video || "",
        isPinned: Boolean(review.isPinned),
        sellerReply: review.sellerReply || null,
        sellerRepliedAt: review.sellerRepliedAt || null,
        sellerReplyShopName: review.sellerReplyShopName || seller.shopName || "Seller",
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        userId: review.userId,
        productId: review.productId,
        orderItemId: review.orderItemId || null,
        product: {
          id: prod?.id,
          title: prod?.title || "Product",
          slug: prod?.slug || "",
          primaryImage: imageMap.get(review.productId) || prod?.image || "/placeholder.png",
        },
        user: {
          id: usr?.id,
          name: displayName,
          firstName,
          lastName,
          email: usr?.email || "",
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedReviews,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    console.error("SELLER REVIEWS GET ERROR:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
