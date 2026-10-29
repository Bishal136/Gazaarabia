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

    // NOTE: collection is "review" (singular)
    const review = await db.collection("review").findOne({ id: reviewId });
    if (!review) {
      return NextResponse.json({ message: "Review not found" }, { status: 404 });
    }

    const product = await db.collection("products").findOne({ id: review.productId });
    if (!product || product.sellerId !== seller.id) {
      return NextResponse.json(
        { message: "Unauthorized: this product does not belong to your store" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const updateData: Record<string, any> = { updatedAt: new Date() };

    // Toggle pin if provided
    if (body.isPinned !== undefined) {
      updateData.isPinned = Boolean(body.isPinned);
    }

    // Save or update seller reply if provided
    if (body.sellerReply !== undefined) {
      const replyText = typeof body.sellerReply === "string" ? body.sellerReply.trim() : "";
      updateData.sellerReply = replyText || null;
      updateData.sellerRepliedAt = replyText ? new Date() : null;
      updateData.sellerReplyShopName = seller.shopName || "Seller";
    }

    await db.collection("review").updateOne(
      { id: reviewId },
      { $set: updateData }
    );

    const updated = await db.collection("review").findOne({ id: reviewId });
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("SELLER REVIEW PATCH ERROR:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
