import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    // If query is empty or 1 char, return popular categories & trending items
    if (!q || q.length < 2) {
      // Find active products to identify collections and styles with actual inventory
      const activeProducts = await prisma.products.findMany({
        where: { active: true, isDeleted: false },
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

      return NextResponse.json({
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
      });
    }

    const searchTerm = q.toLowerCase();

    // Parallel lookup across Products, Categories, and Subcategories
    const [matchedProducts, matchedCategories, matchedSubcategories] = await Promise.all([
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

    return NextResponse.json({
      success: true,
      data: {
        products: formattedProducts,
        categories: matchedCategories,
        subcategories: matchedSubcategories,
        totalMatches: formattedProducts.length,
        query: q,
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
