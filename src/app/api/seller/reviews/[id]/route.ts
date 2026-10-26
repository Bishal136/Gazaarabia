import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reviewId = parseInt(id);
    if (isNaN(reviewId)) {
      return NextResponse.json({ message: "Invalid Review ID" }, { status: 400 });
    }

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

    const review = await db.collection("reviews").findOne({ id: reviewId });
    if (!review) {
      return NextResponse.json({ message: "Review not found" }, { status: 404 });
    }

    const product = await db.collection("products").findOne({ id: review.productId });
    if (!product || product.sellerId !== seller.id) {
      return NextResponse.json({ message: "Unauthorized to pin this review" }, { status: 403 });
    }

    const body = await req.json();
    const isPinned = body.isPinned ?? !review.isPinned;

    await db.collection("reviews").updateOne(
      { id: reviewId },
      { $set: { isPinned, updatedAt: new Date() } }
    );

    const updated = await db.collection("reviews").findOne({ id: reviewId });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PIN REVIEW ERROR:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
