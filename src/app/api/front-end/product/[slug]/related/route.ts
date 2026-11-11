import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromHeader, getUserIdFromToken } from "@/lib/authToken";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    const token = getTokenFromHeader(req);
    const userId = token ? getUserIdFromToken(token) : null;

    // 1. Fetch current active product to identify category and subcategory
    const activeProduct = await prisma.products.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        categoryId: true,
        subcategoryId: true,
        asParentRelations: {
          where: { relationType: "wear_with" },
          include: {
            child: {
              include: {
                productimage: true,
                brand: true,
                productvariant: {
                  include: {
                    color: true,
                    size: true,
                    variantImages: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!activeProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const targetCount = 10;
    const wearWithList = Array.isArray(activeProduct.asParentRelations)
      ? activeProduct.asParentRelations.map((r: any) => r.child).filter(Boolean)
      : [];

    let relatedProducts: any[] = [...wearWithList];
    const excludedIds = [activeProduct.id, ...relatedProducts.map((p) => p.id)];

    // 2. Fetch peer products in same subcategory
    if (relatedProducts.length < targetCount && activeProduct.subcategoryId) {
      const needed = targetCount - relatedProducts.length;
      const subcategoryPeers = await prisma.products.findMany({
        where: {
          id: { notIn: excludedIds },
          subcategoryId: activeProduct.subcategoryId,
          active: true,
          isDeleted: false,
        },
        take: needed,
        include: {
          productimage: true,
          brand: true,
          productvariant: {
            include: {
              color: true,
              size: true,
              variantImages: true,
            },
          },
        },
        orderBy: { soldCount: "desc" },
      });

      relatedProducts = [...relatedProducts, ...subcategoryPeers];
    }

    // 3. Fallback: products in same category
    if (relatedProducts.length < targetCount && activeProduct.categoryId) {
      const needed = targetCount - relatedProducts.length;
      const currentExcluded = [activeProduct.id, ...relatedProducts.map((p) => p.id)];

      const categoryPeers = await prisma.products.findMany({
        where: {
          id: { notIn: currentExcluded },
          categoryId: activeProduct.categoryId,
          active: true,
          isDeleted: false,
        },
        take: needed,
        include: {
          productimage: true,
          brand: true,
          productvariant: {
            include: {
              color: true,
              size: true,
              variantImages: true,
            },
          },
        },
        orderBy: { soldCount: "desc" },
      });

      relatedProducts = [...relatedProducts, ...categoryPeers];
    }

    // 4. Keyword / Department fallback
    if (relatedProducts.length < targetCount) {
      const needed = targetCount - relatedProducts.length;
      const currentExcluded = [activeProduct.id, ...relatedProducts.map((p) => p.id)];

      const storewidePeers = await prisma.products.findMany({
        where: {
          id: { notIn: currentExcluded },
          active: true,
          isDeleted: false,
        },
        take: needed,
        include: {
          productimage: true,
          brand: true,
          productvariant: {
            include: {
              color: true,
              size: true,
              variantImages: true,
            },
          },
        },
        orderBy: { soldCount: "desc" },
      });

      relatedProducts = [...relatedProducts, ...storewidePeers];
    }

    // 5. Wishlist status if user is logged in
    let wishlistProductIdsSet = new Set<number>();
    if (userId) {
      const userWishlist = await prisma.wishlist.findMany({
        where: { userId: Number(userId) },
        select: { productId: true },
      });
      wishlistProductIdsSet = new Set(userWishlist.map((w: any) => w.productId));
    }

    const formatted = relatedProducts.map((p) => ({
      ...p,
      isInWishlist: wishlistProductIdsSet.has(p.id),
    }));

    return NextResponse.json({
      success: true,
      total: formatted.length,
      data: formatted,
    });
  } catch (error: any) {
    console.error("Error fetching related products:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch related products" },
      { status: 500 }
    );
  }
}
