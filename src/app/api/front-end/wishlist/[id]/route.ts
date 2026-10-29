import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/authToken";

type RouteContext = { params: Promise<{ id: string }> };

//  DELETE product from wishlist
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const productId = Number(id);

    const userId = await checkAuth(req);

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await prisma.wishlist.delete({
      where: {
        userId_productId: { userId: Number(userId), productId: Number(productId) },
      },
    });

    return NextResponse.json({ success: true, message: "Product removed from wishlist" });
  } catch (error: any) {
    console.error(" DELETE wishlist error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to remove product from wishlist" },
      { status: 500 }
    );
  }
}
