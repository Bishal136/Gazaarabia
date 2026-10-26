import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

/**
 * @route DELETE /api/front-end/cart/clear
 * @desc Clear all items from the logged-in user's cart
 * @access Protected
 */
export async function DELETE(req: NextRequest) {
  try {
    const userId = await checkAuth(req);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ success: false, message: "Database not connected" }, { status: 500 });
    }

    await db.collection("carts").deleteMany({ userId });

    return NextResponse.json({
      success: true,
      message: "Cart cleared successfully.",
    });
  } catch (error) {
    console.error("Error clearing cart:", error);
    return NextResponse.json(
      { success: false, message: "Failed to clear cart." },
      { status: 500 }
    );
  }
}
