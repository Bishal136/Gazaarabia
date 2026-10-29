import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getTokenFromHeader, getUserIdFromToken } from "@/lib/authToken";
import { isProductInWishlist, getWishlistProductIds } from "@/lib/helpers/wishlist";
import { getProductAvailableQuantity, getVariantAvailableQuantity } from "@/lib/helpers/stockHelper";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

const prisma: any = new PrismaClient();

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  //  Get userId if logged in
  const token = getTokenFromHeader(req);
  const userId = token ? getUserIdFromToken(token) : null;

  try {
    //  Get product details
    const product = await prisma.products.findUnique({
      where: { slug },
      include: {
        productimage: true,
        productvariant: {
          include: {
            color: true,
            size: true,
            variantImages: true,
          },
        },
        brand: true,
        categories: true,
        subcategories: true,
        materialCare: true,
        reviews: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
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

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    //  Get product-level available stock
    const productAvailableQty = await getProductAvailableQuantity(product.id);

    //  For each variant, fetch available stock in parallel
    const variantsWithStock = await Promise.all(
      product.productvariant.map(async (variant: any) => {
        const availableQty = await getVariantAvailableQuantity(variant.id);
        return { ...variant, availableStock: availableQty };
      })
    );

    // Aggregate review data
    const reviewStats = await prisma.review.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
      _count: { id: true },
    });

    const averageRating = reviewStats._avg.rating || 0;
    const totalReviews = reviewStats._count.id;

    //  Wishlist state resolution (O(1) batch lookup)
    let wishlistProductIdsSet = new Set<number>();
    let isInWishlist = false;
    if (userId) {
      const ids = await getWishlistProductIds(userId);
      wishlistProductIdsSet = new Set(ids);
      isInWishlist = wishlistProductIdsSet.has(product.id);
    }

    //  1. Extract explicit "wear_with" relations if configured
    const wearWithRaw: any[] = Array.isArray(product.asParentRelations)
      ? product.asParentRelations.map((r: any) => r.child).filter(Boolean)
      : [];
    delete product.asParentRelations;

    //  2. Recommendation Engine for "YOU MAY ALSO LIKE"
    // Fetch up to 8 recommended products: same subcategory -> same category -> storewide popular
    let youMayAlsoLike: any[] = [...wearWithRaw];
    const targetCount = 8;

    if (youMayAlsoLike.length < targetCount) {
      const needed = targetCount - youMayAlsoLike.length;
      const excludedIds = [product.id, ...youMayAlsoLike.map((p: any) => p.id)];

      // Tier 1: Same Subcategory (highest contextual relevance)
      let candidates: any[] = [];
      if (product.subcategoryId) {
        candidates = await prisma.products.findMany({
          where: {
            id: { notIn: excludedIds },
            subcategoryId: product.subcategoryId,
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
      }

      // Tier 2: Same Category fallback if subcategory matches were fewer than needed
      if (candidates.length < needed && product.categoryId) {
        const stillNeeded = needed - candidates.length;
        const currentExcluded = [...excludedIds, ...candidates.map((c: any) => c.id)];

        const categoryMatches = await prisma.products.findMany({
          where: {
            id: { notIn: currentExcluded },
            categoryId: product.categoryId,
            active: true,
            isDeleted: false,
          },
          take: stillNeeded,
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

        candidates = [...candidates, ...categoryMatches];
      }

      // Tier 3: Storewide popular products fallback (if category catalog is small)
      if (candidates.length < needed) {
        const stillNeeded = needed - candidates.length;
        const currentExcluded = [...excludedIds, ...candidates.map((c: any) => c.id)];

        const storewideMatches = await prisma.products.findMany({
          where: {
            id: { notIn: currentExcluded },
            active: true,
            isDeleted: false,
          },
          take: stillNeeded,
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

        candidates = [...candidates, ...storewideMatches];
      }

      youMayAlsoLike = [...youMayAlsoLike, ...candidates];
    }

    // Attach O(1) wishlist state to all recommendation cards
    youMayAlsoLike = youMayAlsoLike.map((p: any) => ({
      ...p,
      isInWishlist: wishlistProductIdsSet.has(p.id),
    }));

    // Fetch delivery settings (id = 1 always)
    const deliverySettings = await prisma.deliverySettings.findUnique({
      where: { id: 1 },
    });

    // Resolve seller store profile if available
    let sellerInfo: any = null;
    if (product?.sellerId) {
      try {
        const m = await connectToDatabase();
        const db = m.connection?.db;
        if (db) {
          const sellerDoc = await db.collection("sellers").findOne({ id: Number(product.sellerId) });
          if (sellerDoc) {
            sellerInfo = {
              id: sellerDoc.id,
              userId: sellerDoc.userId,
              storeName: sellerDoc.shopName,
              shopName: sellerDoc.shopName,
              shopSlug: sellerDoc.shopSlug,
              logo: sellerDoc.logo || null,
            };
          }
        }
      } catch (err) {
        console.error("Failed to resolve seller profile:", err);
      }
    }

    //  Return clean, structured response
    const res = NextResponse.json({
      ...product,
      seller: sellerInfo || product.seller || null,
      productvariant: variantsWithStock,      // include stock per variant
      availableStock: productAvailableQty,    // include total product-level stock
      wearWith: youMayAlsoLike,               // Backward compatibility with wearWith prop
      youMayAlsoLike,                         // Dedicated "You May Also Like" recommendation field
      reviewsData: {
        averageRating: Number(averageRating.toFixed(1)),
        totalReviews,
        list: product.reviews,
      },
      isInWishlist,
      deliverySettings,
    });

    if (!userId) {
      res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    } else {
      res.headers.set("Cache-Control", "private, no-cache");
    }

    return res;
  } catch (error: any) {
    console.error("Error fetching product by slug:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch product" },
      { status: 500 }
    );
  }
}
