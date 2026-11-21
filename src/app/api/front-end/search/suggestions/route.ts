import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseSearchIntent } from "@/lib/ai/searchIntentParser";

// In-memory cache for default search discovery (empty query)
let cachedDiscovery: { data: any; expiry: number } | null = null;
const DISCOVERY_CACHE_TTL_MS = 60 * 1000;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    // If query is empty or 1 char, return popular categories & trending items
    if (!q || q.length < 2) {
      const now = Date.now();
      if (cachedDiscovery && now < cachedDiscovery.expiry) {
        const res = NextResponse.json(cachedDiscovery.data);
        res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
        return res;
      }

      // Find top active products with limit to avoid full collection scans
      const activeProducts = await prisma.products.findMany({
        where: { active: true, isDeleted: false },
        take: 24,
        select: {
          id: true,
          title: true,
          slug: true,
          sellingPrice: true,
          discountPrice: true,
          baseQty: true,
          soldCount: true,
          categoryId: true,
          subcategoryId: true,
          productimage: {
            select: { url: true, alt: true, primary: true },
            take: 1,
          },
          categories: { select: { name: true, slug: true } },
        },
        orderBy: { soldCount: "desc" },
      });

      const activeCatIds = [
        ...new Set(activeProducts.map((p: any) => p.categoryId).filter(Boolean)),
      ];
      const activeSubCatIds = [
        ...new Set(activeProducts.map((p: any) => p.subcategoryId).filter(Boolean)),
      ];

      const [topCategories, topSubcategories] = await Promise.all([
        prisma.categories.findMany({
          where: activeCatIds.length > 0 ? { id: { in: activeCatIds } } : undefined,
          take: 8,
          select: { id: true, name: true, slug: true },
          orderBy: { name: "asc" },
        }),
        prisma.subcategories.findMany({
          where: activeSubCatIds.length > 0 ? { id: { in: activeSubCatIds } } : undefined,
          take: 8,
          select: { id: true, name: true, slug: true },
          orderBy: { name: "asc" },
        }),
      ]);

      const trendingProducts = activeProducts.slice(0, 4);

      const payload = {
        success: true,
        data: {
          products: trendingProducts.map((p: any) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            sellingPrice: p.sellingPrice,
            discountPrice: p.discountPrice,
            inStock: (p.baseQty || 0) > 0,
            imageUrl: p.productimage?.[0]?.url || "/images/placeholder.png",
            categoryName: p.categories?.name || "",
            categorySlug: p.categories?.slug || "",
          })),
          categories: topCategories,
          popularStyles: topSubcategories,
          popularTags: topSubcategories.map((s: any) => s.name),
          query: q,
        },
      };

      cachedDiscovery = {
        data: payload,
        expiry: Date.now() + DISCOVERY_CACHE_TTL_MS,
      };

      const res = NextResponse.json(payload);
      res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
      return res;
    }

    const searchTerm = q.toLowerCase();

    // Parallel lookup across Products, Categories, Subcategories, and AI Intent
    const [matchedProducts, matchedCategories, matchedSubcategories, aiIntent] = await Promise.all([
      prisma.products.findMany({
        where: {
          active: true,
          isDeleted: false,
          OR: [
            { title: { contains: searchTerm } },
            { slug: { contains: searchTerm } },
            { shortDescription: { contains: searchTerm } },
          ],
        },
        take: 6,
        select: {
          id: true,
          title: true,
          slug: true,
          sellingPrice: true,
          discountPrice: true,
          baseQty: true,
          productimage: {
            select: { url: true, alt: true, primary: true },
            take: 1,
          },
          categories: { select: { name: true, slug: true } },
          subcategories: { select: { name: true, slug: true } },
        },
        orderBy: { soldCount: "desc" },
      }),
      prisma.categories.findMany({
        where: {
          name: { contains: searchTerm },
        },
        take: 4,
        select: { id: true, name: true, slug: true },
      }),
      prisma.subcategory.findMany({
        where: {
          name: { contains: searchTerm },
        },
        take: 4,
        select: { id: true, name: true, slug: true, categoryId: true },
      }),
      parseSearchIntent(q).catch(() => null),
    ]);

    const formattedProducts = matchedProducts.map((p: any) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      sellingPrice: p.sellingPrice,
      discountPrice: p.discountPrice,
      inStock: (p.baseQty || 0) > 0,
      imageUrl: p.productimage?.[0]?.url || "/images/placeholder.png",
      categoryName: p.categories?.name || p.subcategories?.name || "",
      categorySlug: p.categories?.slug || p.subcategories?.slug || "",
    }));

    // Generate intelligent AI filter pills
    const aiPills: Array<{ label: string; url: string; type: string }> = [];
    if (aiIntent?.categoryName && aiIntent.categorySlug) {
      aiPills.push({
        label: `Category: ${aiIntent.categoryName}`,
        url: `/shop?category=${aiIntent.categorySlug}`,
        type: "category",
      });
    }
    if (aiIntent?.color) {
      aiPills.push({
        label: `Color: ${aiIntent.color}`,
        url: `/shop?color=${encodeURIComponent(aiIntent.color)}`,
        type: "color",
      });
    }
    if (aiIntent?.maxPrice) {
      aiPills.push({
        label: `Under £${aiIntent.maxPrice}`,
        url: `/shop?maxPrice=${aiIntent.maxPrice}`,
        type: "price",
      });
    }
    for (const tag of (aiIntent?.tags || []).slice(0, 3)) {
      if (!aiPills.some((p) => p.label.toLowerCase().includes(tag.toLowerCase()))) {
        aiPills.push({
          label: tag,
          url: `/search?q=${encodeURIComponent(tag)}`,
          type: "tag",
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        products: formattedProducts,
        categories: matchedCategories,
        subcategories: matchedSubcategories,
        totalMatches: formattedProducts.length,
        query: q,
        didYouMean: aiIntent?.correctedQuery || null,
        aiPills,
        aiIntent: aiIntent
          ? {
              cleanQuery: aiIntent.cleanQuery,
              color: aiIntent.color,
              maxPrice: aiIntent.maxPrice,
              categoryName: aiIntent.categoryName,
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error("Search suggestions API error:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching suggestions", data: { products: [], categories: [] } },
      { status: 500 }
    );
  }
}
