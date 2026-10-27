import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromHeader, getUserIdFromToken } from "@/lib/authToken";
import { getWishlistProductIds } from "@/lib/helpers/wishlist";
import {
  getProductAvailableQuantity,
  getVariantAvailableQuantity,
} from "@/lib/helpers/stockHelper";
import { getProductRatingStats } from "@/lib/helpers/reviewHelper";

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const { searchParams } = new URL(req.url);

  /* ---------------- Pagination ---------------- */
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 12;
  const skip = (page - 1) * limit;

  /* ---------------- Filters ---------------- */
  const q = (searchParams.get("q") || "").trim();
  const priceMin = Number(searchParams.get("priceMin")) || 0;
  const priceMax = Number(searchParams.get("priceMax")) || 100000;
  const ratingMin = Number(searchParams.get("rating")) || 0;

  const availability = searchParams.getAll("availability[]"); // ["In stock"]
  const sizes = searchParams.getAll("sizes[]").map(Number);
  const colors = searchParams.getAll("colors[]").map(Number);
  const subcategoriesFilter = searchParams
    .getAll("subcategories[]")
    .map(Number);

  const sort = searchParams.get("sort") || "new";

  /* ---------------- Auth ---------------- */
  const token = getTokenFromHeader(req);
  const userId = token ? getUserIdFromToken(token) : null;

  try {
    /* ---------------- Availability (baseQty) ---------------- */
    const hasInStock = availability.includes("In stock");
    const hasOutOfStock = availability.includes("Out of stock");

    /* ---------------- Build WHERE ---------------- */
    const productWhere: any = {
      active: true,
      isDeleted: false,
      sellingPrice: {
        gte: priceMin,
        lte: priceMax,
      },
    };

    // Real-time search keyword within category
    if (q) {
      const term = q.toLowerCase();
      productWhere.OR = [
        { title: { contains: term } },
        { slug: { contains: term } },
        { shortDescription: { contains: term } },
      ];
    }

    // Rating filter (minimum rating stars)
    if (ratingMin > 0) {
      productWhere.reviews = {
        some: {
          rating: { gte: ratingMin },
        },
      };
    }

    // baseQty stock filter
    if (hasInStock && !hasOutOfStock) {
      productWhere.baseQty = { gt: 0 };
    }

    if (hasOutOfStock && !hasInStock) {
      productWhere.baseQty = { lte: 0 };
    }

    // Subcategory filter (from filter panel)
    if (subcategoriesFilter.length > 0) {
      productWhere.subcategoryId = { in: subcategoriesFilter };
    }

    // Size / Color (variant based)
    if (sizes.length > 0 || colors.length > 0) {
      productWhere.productvariant = {
        some: {
          isActive: true,
          ...(sizes.length > 0 && { sizeId: { in: sizes } }),
          ...(colors.length > 0 && { colorId: { in: colors } }),
        },
      };
    }


    /* ---------------- Sorting ---------------- */
    let orderBy: any = { createdAt: "desc" }; // default = New arrivals

    if (sort === "price_asc") {
      orderBy = { sellingPrice: "asc" };
    }

    if (sort === "price_desc") {
      orderBy = { sellingPrice: "desc" };
    }

    if (sort === "bestseller") {
      orderBy = { soldCount: "desc" }; // uses products.soldCount
    }

    /* ---------------- Category / Subcategory / Menu Routing ---------------- */
    let products: any[] = [];
    let total = 0;
    let subcategories: any[] = [];
    let parentCategory: any = null;

    const PRODUCT_SELECT = {
      id: true,
      slug: true,
      title: true,
      sellingPrice: true,
      discountPrice: true,
      baseQty: true,
      productimage: {
        select: { url: true, alt: true, primary: true }
      },
      productvariant: {
        select: {
          id: true,
          price: true,
          stock: true,
          color: { select: { name: true, hexCode: true } },
          size: { select: { name: true } }
        }
      },
      brand: { select: { name: true } },
      categories: { select: { id: true, name: true, slug: true } },
      reviews: { select: { rating: true } },
    };

    if (slug === "all") {
      [products, total, subcategories] = await Promise.all([
        prisma.products.findMany({
          where: productWhere,
          select: PRODUCT_SELECT,
          skip,
          take: limit,
          orderBy,
        }),
        prisma.products.count({
          where: productWhere,
        }),
        prisma.subcategory.findMany({
          take: 12,
          orderBy: { name: "asc" },
        }),
      ]);

      parentCategory = { id: 0, name: "All Products", slug: "all" };
    } else {
      // 1. Check if slug matches a Top-Level Menu (e.g. "women", "men")
      const menu = await prisma.menus.findFirst({
        where: { slug },
      });

      if (menu) {
        const menuSubmenus = await prisma.submenus.findMany({
          where: { menuId: menu.id },
          select: { id: true }
        });
        const subIds = menuSubmenus.map((s: any) => s.id);
        const categoriesInMenu = await prisma.categories.findMany({
          where: { submenuId: { in: subIds } },
          select: { id: true, name: true, slug: true }
        });
        const catIds = categoriesInMenu.map((c: any) => c.id);

        [products, total, subcategories] = await Promise.all([
          prisma.products.findMany({
            where: {
              categoryId: { in: catIds },
              ...productWhere,
            },
            select: PRODUCT_SELECT,
            skip,
            take: limit,
            orderBy,
          }),
          prisma.products.count({
            where: {
              categoryId: { in: catIds },
              ...productWhere,
            },
          }),
          prisma.subcategory.findMany({
            where: { categoryId: { in: catIds } },
            orderBy: { name: "asc" },
          }),
        ]);

        const displayName = menu.name.toUpperCase() === "WOMEN" ? "Women's Collection" : menu.name.toUpperCase() === "MEN" ? "Men's Collection" : menu.name;
        parentCategory = { id: menu.id, name: displayName, slug: menu.slug };
      } else {
        // 2. Check if slug matches a Submenu (e.g. "clothing", "clothing-m", "new-in", "accessories")
        const submenu = await prisma.submenus.findFirst({
          where: { slug },
        });

        if (submenu) {
          const categoriesInSubmenu = await prisma.categories.findMany({
            where: { submenuId: submenu.id },
            select: { id: true }
          });
          const catIds = categoriesInSubmenu.map((c: any) => c.id);

          [products, total, subcategories] = await Promise.all([
            prisma.products.findMany({
              where: {
                categoryId: { in: catIds },
                ...productWhere,
              },
              select: PRODUCT_SELECT,
              skip,
              take: limit,
              orderBy,
            }),
            prisma.products.count({
              where: {
                categoryId: { in: catIds },
                ...productWhere,
              },
            }),
            prisma.subcategory.findMany({
              where: { categoryId: { in: catIds } },
              orderBy: { name: "asc" },
            }),
          ]);

          parentCategory = { id: submenu.id, name: submenu.name, slug: submenu.slug };
        } else {
          // 3. Check if slug matches a Category
          const category = await prisma.categories.findUnique({
            where: { slug },
            select: { id: true, name: true, slug: true },
          });

          if (category) {
            [products, total, subcategories] = await Promise.all([
              prisma.products.findMany({
                where: {
                  categoryId: category.id,
                  ...productWhere,
                },
                select: PRODUCT_SELECT,
                skip,
                take: limit,
                orderBy,
              }),
              prisma.products.count({
                where: {
                  categoryId: category.id,
                  ...productWhere,
                },
              }),
              prisma.subcategory.findMany({
                where: { categoryId: category.id },
                orderBy: { name: "asc" },
              }),
            ]);

            parentCategory = category;
          } else {
            // 4. Check if slug matches a Subcategory
            const subcategory = await prisma.subcategory.findUnique({
              where: { slug },
              select: { id: true, categoryId: true, name: true, slug: true },
            });

            if (!subcategory) {
              return NextResponse.json(
                { error: "Invalid category or subcategory slug" },
                { status: 404 }
              );
            }

            [products, total, subcategories] = await Promise.all([
              prisma.products.findMany({
                where: {
                  subcategoryId: subcategory.id,
                  ...productWhere,
                },
                select: PRODUCT_SELECT,
                skip,
                take: limit,
                orderBy,
              }),
              prisma.products.count({
                where: {
                  subcategoryId: subcategory.id,
                  ...productWhere,
                },
              }),
              prisma.subcategory.findMany({
                where: { categoryId: subcategory.categoryId },
                orderBy: { name: "asc" },
              }),
            ]);

            parentCategory = await prisma.categories.findUnique({
              where: { id: subcategory.categoryId },
              select: { id: true, name: true, slug: true },
            });
          }
        }
      }
    }

    /* ---------------- Wishlist ---------------- */
    let wishlistIdsSet = new Set<number>();
    if (userId) {
      const wishlistIds = await getWishlistProductIds(userId);
      wishlistIdsSet = new Set(wishlistIds);
    }

    /* ---------------- Bulk Fetching (Fixing N+1) ---------------- */
    const productIds = products.map((p) => p.id);
    const [stockMap, ratingsMap] = await Promise.all([
      import("@/lib/helpers/stockHelper").then((m) =>
        m.getBulkProductAvailableStock(productIds)
      ),
      import("@/lib/helpers/reviewHelper").then((m) =>
        m.getBulkProductRatingStats(productIds)
      ),
    ]);

    /* ---------------- Enrich products (Phase 1 & 6) ---------------- */
    const enrichedProducts = products.map((product) => {
      const isInWishlist = wishlistIdsSet.has(product.id);
      const availableStock = stockMap.get(product.id) || 0;
      const stats = ratingsMap.get(product.id) || {
        averageRating: 0,
        totalReviews: 0,
      };

      // Lightweight variant mapping for listing view
      const variants = product.productvariant.map((v: any) => ({
        id: v.id,
        price: v.price,
        stock: v.stock,
        color: v.color?.name,
        hexCode: v.color?.hexCode,
        size: v.size?.name,
      }));

      return {
        ...product,
        isInWishlist,
        availableStock,
        productvariant: variants,
        rating: stats.averageRating,
        reviewsCount: stats.totalReviews,
      };
    });

    /* ---------------- Response ---------------- */
    return NextResponse.json({
      userId,
      products: enrichedProducts,
      total,
      totalPages: Math.ceil(total / limit),
      subcategories,
      parentCategory,
      page,
    });
  } catch (error: any) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch products" },
      { status: 500 }
    );
  }
}
