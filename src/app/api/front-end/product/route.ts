import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const preview = searchParams.get("preview") === "true";

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.max(1, Number(searchParams.get("limit")) || 12);
    const skip = (page - 1) * limit;

    /* ---------------- Multi-criteria Filters ---------------- */
    const priceMin = Number(searchParams.get("priceMin")) || 0;
    const priceMax = Number(searchParams.get("priceMax")) || 100000;
    const ratingMin = Number(searchParams.get("rating")) || 0;

    const availability = searchParams.getAll("availability[]");
    const sizes = searchParams.getAll("sizes[]").map(Number).filter(Boolean);
    const colors = searchParams.getAll("colors[]").map(Number).filter(Boolean);
    const categoriesFilter = searchParams.getAll("categories[]").map(Number).filter(Boolean);
    const subcategoriesFilter = searchParams.getAll("subcategories[]").map(Number).filter(Boolean);
    const sort = searchParams.get("sort") || "new";

    const where: any = {
      isDeleted: false,
      active: true,
      sellingPrice: {
        gte: priceMin,
        lte: priceMax,
      },
    };

    // Keyword Search across title, slug, description, and related category/subcategory names
    if (q) {
      const term = q.trim();
      const lowerTerm = term.toLowerCase();
      const slugTerm = lowerTerm.replace(/[^a-z0-9]+/g, "-");
      const words = term.split(/\s+/).filter((w) => w.length > 1);

      // Pre-lookup matching category and subcategory IDs from MongoDB
      const [matchedCats, matchedSubs] = await Promise.all([
        prisma.categories.findMany({
          where: {
            OR: [
              { name: { contains: term } },
              { slug: { contains: slugTerm } },
            ],
          },
          select: { id: true },
        }),
        prisma.subcategories.findMany({
          where: {
            OR: [
              { name: { contains: term } },
              { slug: { contains: slugTerm } },
            ],
          },
          select: { id: true },
        }),
      ]);

      const catIds = matchedCats.map((c: any) => c.id).filter(Boolean);
      const subCatIds = matchedSubs.map((s: any) => s.id).filter(Boolean);

      const orConditions: any[] = [
        { title: { contains: term } },
        { slug: { contains: slugTerm } },
        { shortDescription: { contains: term } },
      ];

      // Match individual keywords for multi-word style phrases like "Embroidered Abayas"
      if (words.length > 1) {
        words.forEach((w) => {
          orConditions.push({ title: { contains: w } });
        });
      }

      if (catIds.length > 0) {
        orConditions.push({ categoryId: { in: catIds } });
      }

      if (subCatIds.length > 0) {
        orConditions.push({ subcategoryId: { in: subCatIds } });
      }

      where.OR = orConditions;
    }

    // Availability Filter
    const hasInStock = availability.includes("In stock");
    const hasOutOfStock = availability.includes("Out of stock");
    if (hasInStock && !hasOutOfStock) {
      where.baseQty = { gt: 0 };
    }
    if (hasOutOfStock && !hasInStock) {
      where.baseQty = { lte: 0 };
    }

    // Category / Subcategory
    if (categoriesFilter.length > 0) {
      where.categoryId = { in: categoriesFilter };
    }
    if (subcategoriesFilter.length > 0) {
      where.subcategoryId = { in: subcategoriesFilter };
    }

    // Sizes and Colors
    if (sizes.length > 0 || colors.length > 0) {
      where.productvariant = {
        some: {
          isActive: true,
          ...(sizes.length > 0 && { sizeId: { in: sizes } }),
          ...(colors.length > 0 && { colorId: { in: colors } }),
        },
      };
    }

    // Rating
    if (ratingMin > 0) {
      where.reviews = {
        some: {
          rating: { gte: ratingMin },
        },
      };
    }

    // Sorting
    let orderBy: any = { createdAt: "desc" };
    if (sort === "price_asc") {
      orderBy = { sellingPrice: "asc" };
    } else if (sort === "price_desc") {
      orderBy = { sellingPrice: "desc" };
    } else if (sort === "bestseller") {
      orderBy = { soldCount: "desc" };
    } else if (sort === "title_asc") {
      orderBy = { title: "asc" };
    }

    const query: Prisma.productsFindManyArgs = {
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        sellingPrice: true,
        discountPrice: true,
        baseQty: true,
        soldCount: true,
        soldHighlightDuration: true,
        productimage: {
          select: { url: true, alt: true, primary: true },
        },
        productvariant: {
          select: {
            id: true,
            price: true,
            stock: true,
            color: { select: { id: true, name: true, hexCode: true } },
            size: { select: { id: true, name: true } },
          },
        },
        brand: { select: { name: true } },
        categories: { select: { id: true, name: true, slug: true } },
        subcategories: { select: { id: true, name: true, slug: true } },
        reviews: { select: { rating: true } },
      },
      orderBy,
    };

    if (preview) {
      query.take = 5;
    } else {
      query.skip = skip;
      query.take = limit;
    }

    const [products, total] = await Promise.all([
      prisma.products.findMany(query),
      prisma.products.count({ where }),
    ]);

    // Calculate rating stats for each product
    const formattedProducts = products.map((p: any) => {
      const ratings = p.reviews?.map((r: any) => r.rating) || [];
      const avgRating = ratings.length > 0
        ? Number((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(1))
        : 5.0;

      return {
        ...p,
        averageRating: avgRating,
        totalReviews: ratings.length,
      };
    });

    const res = NextResponse.json({
      success: true,
      products: formattedProducts,
      total,
      totalPages: Math.ceil(total / limit),
      page,
    });
    res.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
    return res;
  } catch (error: any) {
    console.error("Products search API error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch products", products: [], total: 0 },
      { status: 500 }
    );
  }
}
