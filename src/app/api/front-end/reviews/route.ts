import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { checkAuth } from "@/lib/authToken";
import { connectToDatabase } from "@/lib/mongoose";

const prisma: any = new PrismaClient();

// Helper to recalculate and persist average rating and review count for a product
export async function syncProductReviewStats(productId: number) {
  try {
    const m = await connectToDatabase();
    const db = m.connection.db;
    const allReviews = await db.collection("review").find({ productId: Number(productId) }).toArray();
    const totalReviews = allReviews.length;
    const averageRating = totalReviews > 0
      ? Math.round((allReviews.reduce((sum: number, r: any) => sum + Number(r.rating || 0), 0) / totalReviews) * 10) / 10
      : 0;

    await db.collection("products").updateOne(
      { id: Number(productId) },
      { $set: { averageRating, reviewCount: totalReviews, totalReviews } }
    );

    return { averageRating, totalReviews };
  } catch (error) {
    console.error("Failed to sync product review stats:", error);
    return null;
  }
}

// CREATE a new review
export async function POST(req: NextRequest) {
  try {
    const userId = await checkAuth(req);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { orderItemId, productId, variantId, rating, comment, images, video } = await req.json();

    if (!orderItemId || !productId || !rating) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return NextResponse.json({ message: "Rating must be between 1 and 5" }, { status: 400 });
    }

    // Process images array
    const imageList: string[] = Array.isArray(images)
      ? images.filter((img) => typeof img === "string" && img.trim().length > 0)
      : typeof images === "string" && images.trim().length > 0
      ? [images.trim()]
      : [];

    const primaryImage = imageList.length > 0 ? imageList[0] : null;
    const videoUrl = typeof video === "string" && video.trim().length > 0 ? video.trim() : null;

    // Check if review already exists for this order item
    const existing = await prisma.review.findFirst({
      where: {
        userId: Number(userId),
        orderItemId: Number(orderItemId),
      },
    });

    const m = await connectToDatabase();
    const db = m.connection.db;

    if (existing) {
      // Graceful Upsert: Update existing review instead of failing with 400 error
      await db.collection("review").updateOne(
        { id: existing.id },
        {
          $set: {
            rating: numericRating,
            comment: (comment || "").trim(),
            image: primaryImage,
            images: imageList,
            video: videoUrl,
            variantId: variantId ? Number(variantId) : existing.variantId || null,
            updatedAt: new Date(),
          },
        }
      );

      // Ensure the order item is flagged as reviewed
      await db.collection("orders_item").updateOne(
        { id: Number(orderItemId) },
        { $set: { reviewed: true, updatedAt: new Date() } }
      );

      // Recalculate average rating & review count for the product
      await syncProductReviewStats(Number(productId));

      const updated = await db.collection("review").findOne({ id: existing.id });
      return NextResponse.json({
        success: true,
        data: updated,
        message: "Review updated successfully.",
      });
    }

    const review = await prisma.review.create({
      data: {
        orderItemId: Number(orderItemId),
        productId: Number(productId),
        variantId: variantId ? Number(variantId) : null,
        rating: numericRating,
        comment: (comment || "").trim(),
        image: primaryImage,
        images: imageList,
        video: videoUrl,
        userId: Number(userId),
      },
    });

    // Update the reviewed flag on the specific order item in database
    await db.collection("orders_item").updateOne(
      { id: Number(orderItemId) },
      { $set: { reviewed: true, updatedAt: new Date() } }
    );

    // Recalculate average rating & review count for the product
    await syncProductReviewStats(Number(productId));

    return NextResponse.json({ success: true, data: review });
  } catch (error) {
    console.error(" Review POST Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create review" },
      { status: 500 }
    );
  }
}

//  GET all reviews (admin or listing purpose)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const variantId = searchParams.get("variantId");

    const where: any = {};
    if (productId) where.productId = Number(productId);
    if (variantId) where.variantId = Number(variantId);

    const reviews = await prisma.review.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        product: { select: { id: true, title: true } },
        variant: {
          select: {
            id: true,
            sku: true,
            color: { select: { name: true } },
            size: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: reviews });
  } catch (error) {
    console.error("Review GET Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
