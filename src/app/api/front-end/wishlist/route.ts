import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/authToken";

//  GET - Fetch user's wishlist
export async function GET(req: Request) {
  try {
    const userId = await checkAuth(req as any);

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get pagination params
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 12;
    const skip = (page - 1) * limit;

    //  Get wishlist items with pagination
    const [wishlist, total] = await Promise.all([
      prisma.wishlist.findMany({
        where: { userId: Number(userId) },
        include: {
          product: {
            include: {
              productimage: true,
              brand: true,
              categories: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.wishlist.count({
        where: { userId: Number(userId) },
      }),
    ]);

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      wishlist,
      total,
      totalPages,
      page,
    });
  } catch (error: any) {
    console.error("Wishlist error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to load wishlist" },
      { status: 500 }
    );
  }
}

// POST - Add product to wishlist
export async function POST(req: Request) {
  const userId = await checkAuth(req as any);

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { productId } = body;

  if (!productId) {
    return NextResponse.json({ message: "Product ID is required" }, { status: 400 });
  }

  const wishlistItem = await prisma.wishlist.upsert({
    where: {
      userId_productId: { userId: Number(userId), productId: Number(productId) },
    },
    update: {},
    create: { userId: Number(userId), productId: Number(productId) },
  });

  return NextResponse.json(wishlistItem);
}
