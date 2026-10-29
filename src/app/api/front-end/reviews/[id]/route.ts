import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/authToken";
import { connectToDatabase } from "@/lib/mongoose";
import { syncProductReviewStats } from "../route";

// GET a specific review by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reviewId = Number(id);

    if (isNaN(reviewId)) {
      return NextResponse.json({ message: "Invalid review ID" }, { status: 400 });
    }

    const m = await connectToDatabase();
    const db = m.connection.db;

    const review = await db.collection("review").findOne({ id: reviewId });
    if (!review) {
      return NextResponse.json({ message: "Review not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: review });
  } catch (error: any) {
    console.error("Review GET [id] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch review" },
      { status: 500 }
    );
  }
}

// UPDATE (PATCH) an existing review
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await checkAuth(req);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const reviewId = Number(id);

    if (isNaN(reviewId)) {
      return NextResponse.json({ message: "Invalid review ID" }, { status: 400 });
    }

    const m = await connectToDatabase();
    const db = m.connection.db;

    const review = await db.collection("review").findOne({ id: reviewId });
    if (!review) {
      return NextResponse.json({ message: "Review not found" }, { status: 404 });
    }

    // Verify ownership
    if (Number(review.userId) !== Number(userId)) {
      return NextResponse.json(
        { message: "You are not authorized to edit this review" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (body.rating !== undefined) {
      const rating = Number(body.rating);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        return NextResponse.json(
          { message: "Rating must be between 1 and 5" },
          { status: 400 }
        );
      }
      updateData.rating = rating;
    }

    if (body.comment !== undefined) {
      updateData.comment = String(body.comment || "").trim();
    }

    if (body.images !== undefined) {
      const imageList: string[] = Array.isArray(body.images)
        ? body.images.filter((img: any) => typeof img === "string" && img.trim().length > 0)
        : typeof body.images === "string" && body.images.trim().length > 0
        ? [body.images.trim()]
        : [];
      updateData.images = imageList;
      updateData.image = imageList.length > 0 ? imageList[0] : null;
    }

    if (body.video !== undefined) {
      updateData.video =
        typeof body.video === "string" && body.video.trim().length > 0
          ? body.video.trim()
          : null;
    }

    await db.collection("review").updateOne(
      { id: reviewId },
      { $set: updateData }
    );

    // Recalculate product review stats
    if (review.productId) {
      await syncProductReviewStats(Number(review.productId));
    }

    const updated = await db.collection("review").findOne({ id: reviewId });
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Review PATCH [id] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to update review" },
      { status: 500 }
    );
  }
}

// DELETE a review
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await checkAuth(req);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const reviewId = Number(id);

    if (isNaN(reviewId)) {
      return NextResponse.json({ message: "Invalid review ID" }, { status: 400 });
    }

    const m = await connectToDatabase();
    const db = m.connection.db;

    const review = await db.collection("review").findOne({ id: reviewId });
    if (!review) {
      return NextResponse.json({ message: "Review not found" }, { status: 404 });
    }

    // Verify ownership
    if (Number(review.userId) !== Number(userId)) {
      return NextResponse.json(
        { message: "You are not authorized to delete this review" },
        { status: 403 }
      );
    }

    // Delete review
    await db.collection("review").deleteOne({ id: reviewId });

    // Reset order item reviewed flag if linked
    if (review.orderItemId) {
      await db.collection("orders_item").updateOne(
        { id: Number(review.orderItemId) },
        { $set: { reviewed: false, updatedAt: new Date() } }
      );
    }

    // Recalculate product review stats
    if (review.productId) {
      await syncProductReviewStats(Number(review.productId));
    }

    return NextResponse.json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error: any) {
    console.error("Review DELETE [id] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to delete review" },
      { status: 500 }
    );
  }
}
