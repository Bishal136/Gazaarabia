import { prisma } from "@/lib/prisma";
import { isProductInWishlist, getWishlistProductIds } from "@/lib/helpers/wishlist";
import {
  getProductAvailableQuantity,
  getVariantAvailableQuantity,
} from "@/lib/helpers/stockHelper";
import { connectToDatabase } from "@/lib/mongoose";

// In-memory cache for fast product detail views (60s TTL)
const productCache = new Map<string, { data: any; expiry: number }>();
const PRODUCT_CACHE_TTL_MS = 60 * 1000;

export async function fetchProductBySlug(slug: string, userId: number | null = null) {
  if (!userId) {
    const cached = productCache.get(slug);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }
  }

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

  if (!product) return null;

  // Product-level available stock
  const productAvailableQty = await getProductAvailableQuantity(product.id);

  // Variant available stocks in parallel
  const variantsWithStock = await Promise.all(
    product.productvariant.map(async (variant: any) => {
      const availableQty = await getVariantAvailableQuantity(variant.id);
      return { ...variant, availableStock: availableQty };
    })
  );

  // Review aggregations
  const reviewStats = await prisma.review.aggregate({
    where: { productId: product.id },
    _avg: { rating: true },
    _count: { id: true },
  });

  const averageRating = reviewStats._avg.rating || 0;
  const totalReviews = reviewStats._count.id;

  // Wishlist state
  let wishlistProductIdsSet = new Set<number>();
  let isInWishlist = false;
  if (userId) {
    const ids = await getWishlistProductIds(userId);
    wishlistProductIdsSet = new Set(ids);
    isInWishlist = wishlistProductIdsSet.has(product.id);
  }

  // Recommendations / Wear with
  const wearWithRaw: any[] = Array.isArray(product.asParentRelations)
    ? product.asParentRelations.map((r: any) => r.child).filter(Boolean)
    : [];
  delete (product as any).asParentRelations;

  let youMayAlsoLike: any[] = [...wearWithRaw];
  const targetCount = 8;

  if (youMayAlsoLike.length < targetCount) {
    const needed = targetCount - youMayAlsoLike.length;
    const excludedIds = [product.id, ...youMayAlsoLike.map((p: any) => p.id)];

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

  youMayAlsoLike = youMayAlsoLike.map((p: any) => ({
    ...p,
    isInWishlist: wishlistProductIdsSet.has(p.id),
  }));

  const deliverySettings = await prisma.deliverySettings.findUnique({
    where: { id: 1 },
  });

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

  // Serialize to pure JSON to guarantee clean RSC boundary crossing
  const responseData = JSON.parse(
    JSON.stringify({
      ...product,
      seller: sellerInfo || product.seller || null,
      productvariant: variantsWithStock,
      availableStock: productAvailableQty,
      wearWith: youMayAlsoLike,
      youMayAlsoLike,
      reviewsData: {
        averageRating: Number(averageRating.toFixed(1)),
        totalReviews,
        list: product.reviews,
      },
      isInWishlist,
      deliverySettings,
    })
  );

  if (!userId) {
    if (productCache.size > 200) {
      const oldestKey = productCache.keys().next().value;
      if (oldestKey) productCache.delete(oldestKey);
    }
    productCache.set(slug, { data: responseData, expiry: Date.now() + PRODUCT_CACHE_TTL_MS });
  }

  return responseData;
}
