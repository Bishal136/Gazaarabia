import { prisma } from "@/lib/prisma";
import { getWishlistProductIds } from "@/lib/helpers/wishlist";
import { getBulkProductAvailableStock } from "@/lib/helpers/stockHelper";
import { getBulkProductRatingStats } from "@/lib/helpers/reviewHelper";

// In-memory cache for fast SSR category and shop pages (60s TTL)
const shopCache = new Map<string, { data: any; expiry: number }>();
const SHOP_CACHE_TTL_MS = 60 * 1000;

export async function fetchShopData(
  slug: string,
  page = 1,
  limit = 16,
  filters: any = {},
  userId: number | null = null
) {
  const cacheKey = `${slug}:${page}:${limit}:${JSON.stringify(filters)}`;
  if (!userId) {
    const cached = shopCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }
  }

  const skip = (page - 1) * limit;

  const q = (filters.q || "").trim();
  const priceMin = Number(filters.priceMin) || 0;
  const priceMax = Number(filters.priceMax) || 100000;
  const ratingMin = Number(filters.rating) || 0;

  const availability = Array.isArray(filters.availability) ? filters.availability : [];
  const sizes = (filters.sizes || []).map(Number).filter(Boolean);
  const colors = (filters.colors || []).map(Number).filter(Boolean);
  const subcategoriesFilter = (filters.subcategories || []).map(Number).filter(Boolean);
  const categoriesFilter = (filters.categories || []).map(Number).filter(Boolean);

  const sort = filters.sort || "new";

  const hasInStock = availability.includes("In stock");
  const hasOutOfStock = availability.includes("Out of stock");

  const andConditions: any[] = [
    { active: { not: false } },
    { isDeleted: { not: true } },
  ];

  // 1. Price Range condition (handles both regular sellingPrice and discountPrice if product is on sale)
  andConditions.push({
    OR: [
      {
        discountPrice: { not: null, gt: 0, gte: priceMin, lte: priceMax },
      },
      {
        AND: [
          {
            OR: [
              { discountPrice: null },
              { discountPrice: { lte: 0 } },
            ],
          },
          {
            sellingPrice: { gte: priceMin, lte: priceMax },
          },
        ],
      },
    ],
  });

  // 2. Search query q
  if (q) {
    andConditions.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { shortDescription: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  // 3. Stock availability
  if (hasInStock && !hasOutOfStock) {
    andConditions.push({ baseQty: { gt: 0 } });
  }
  if (hasOutOfStock && !hasInStock) {
    andConditions.push({ baseQty: { lte: 0 } });
  }

  // 4. Subcategories filter
  if (subcategoriesFilter.length > 0) {
    andConditions.push({ subcategoryId: { in: subcategoriesFilter } });
  }

  // 5. Categories filter
  if (categoriesFilter.length > 0) {
    andConditions.push({ categoryId: { in: categoriesFilter } });
  }

  // 6. Rating filter (resolve through review aggregation because Prisma MongoDB relations on integer IDs don't count properly in relational some)
  let ratingProductIds: number[] | null = null;
  if (ratingMin > 0) {
    try {
      const stats = await prisma.review.groupBy({
        by: ["productId"],
        _avg: { rating: true },
        having: {
          rating: {
            _avg: { gte: ratingMin },
          },
        },
      });
      ratingProductIds = stats.map((s: any) => s.productId);
    } catch {
      const matchingReviews = await prisma.review.findMany({
        where: { rating: { gte: ratingMin } },
        select: { productId: true },
        distinct: ["productId"],
      });
      ratingProductIds = matchingReviews.map((r: any) => r.productId);
    }
  }

  // 7. Variants filter (sizes & colors)
  // Resolve through productvariant because Prisma MongoDB count() on relational { productvariant: { some: ... } } returns 0
  let variantProductIds: number[] | null = null;
  if (sizes.length > 0 || colors.length > 0) {
    const matchingVariants = await prisma.productvariant.findMany({
      where: {
        isActive: { notIn: [false, 0] },
        ...(sizes.length > 0 && { sizeId: { in: sizes } }),
        ...(colors.length > 0 && { colorId: { in: colors } }),
      },
      select: { productId: true },
      distinct: ["productId"],
    });
    variantProductIds = matchingVariants.map((v) => v.productId);
  }

  // Intersect rating & variant product IDs if either or both are active
  let targetProductIds: number[] | null = null;
  if (ratingProductIds !== null && variantProductIds !== null) {
    const variantSet = new Set(variantProductIds);
    targetProductIds = ratingProductIds.filter((id) => variantSet.has(id));
  } else if (ratingProductIds !== null) {
    targetProductIds = ratingProductIds;
  } else if (variantProductIds !== null) {
    targetProductIds = variantProductIds;
  }

  if (targetProductIds !== null) {
    if (targetProductIds.length === 0) {
      // Immediate return when no products match the combined variant/rating filter
      return {
        products: [],
        total: 0,
        page,
        limit,
        totalPages: 1,
        parentCategory: null,
        subcategories: [],
      };
    }
    andConditions.push({ id: { in: targetProductIds } });
  }

  const productWhere: any = { AND: andConditions };

  let orderBy: any = { createdAt: "desc" };
  if (sort === "price_asc") orderBy = { sellingPrice: "asc" };
  if (sort === "price_desc") orderBy = { sellingPrice: "desc" };
  if (sort === "bestseller") orderBy = { soldCount: "desc" };

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
        color: { select: { name: true, hexCode: true } },
        size: { select: { name: true } },
      },
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
      prisma.products.count({ where: productWhere }),
      prisma.subcategory.findMany({
        take: 12,
        orderBy: { name: "asc" },
      }),
    ]);
    parentCategory = { id: 0, name: "All Products", slug: "all" };
  } else {
    const menu = await prisma.menus.findFirst({ where: { slug } });
    if (menu) {
      const menuSubmenus = await prisma.submenus.findMany({
        where: { menuId: menu.id },
        select: { id: true },
      });
      const subIds = menuSubmenus.map((s: any) => s.id);
      const categoriesInMenu = await prisma.categories.findMany({
        where: { submenuId: { in: subIds } },
        select: { id: true, name: true, slug: true },
      });
      const catIds = categoriesInMenu.map((c: any) => c.id);

      [products, total, subcategories] = await Promise.all([
        prisma.products.findMany({
          where: { categoryId: { in: catIds }, ...productWhere },
          select: PRODUCT_SELECT,
          skip,
          take: limit,
          orderBy,
        }),
        prisma.products.count({
          where: { categoryId: { in: catIds }, ...productWhere },
        }),
        prisma.subcategory.findMany({
          where: { categoryId: { in: catIds } },
          orderBy: { name: "asc" },
        }),
      ]);

      const displayName =
        menu.name.toUpperCase() === "WOMEN"
          ? "Women's Collection"
          : menu.name.toUpperCase() === "MEN"
          ? "Men's Collection"
          : menu.name;
      parentCategory = { id: menu.id, name: displayName, slug: menu.slug };
    } else {
      const submenu = await prisma.submenus.findFirst({ where: { slug } });
      if (submenu) {
        const categoriesInSubmenu = await prisma.categories.findMany({
          where: { submenuId: submenu.id },
          select: { id: true },
        });
        const catIds = categoriesInSubmenu.map((c: any) => c.id);

        [products, total, subcategories] = await Promise.all([
          prisma.products.findMany({
            where: { categoryId: { in: catIds }, ...productWhere },
            select: PRODUCT_SELECT,
            skip,
            take: limit,
            orderBy,
          }),
          prisma.products.count({
            where: { categoryId: { in: catIds }, ...productWhere },
          }),
          prisma.subcategory.findMany({
            where: { categoryId: { in: catIds } },
            orderBy: { name: "asc" },
          }),
        ]);
        parentCategory = { id: submenu.id, name: submenu.name, slug: submenu.slug };
      } else {
        const category = await prisma.categories.findUnique({
          where: { slug },
          select: { id: true, name: true, slug: true },
        });

        if (category) {
          [products, total, subcategories] = await Promise.all([
            prisma.products.findMany({
              where: { categoryId: category.id, ...productWhere },
              select: PRODUCT_SELECT,
              skip,
              take: limit,
              orderBy,
            }),
            prisma.products.count({
              where: { categoryId: category.id, ...productWhere },
            }),
            prisma.subcategory.findMany({
              where: { categoryId: category.id },
              orderBy: { name: "asc" },
            }),
          ]);
          parentCategory = category;
        } else {
          const subcategory = await prisma.subcategory.findUnique({
            where: { slug },
            select: { id: true, categoryId: true, name: true, slug: true },
          });

          if (!subcategory) {
            return null;
          }

          [products, total, subcategories] = await Promise.all([
            prisma.products.findMany({
              where: { subcategoryId: subcategory.id, ...productWhere },
              select: PRODUCT_SELECT,
              skip,
              take: limit,
              orderBy,
            }),
            prisma.products.count({
              where: { subcategoryId: subcategory.id, ...productWhere },
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

  let wishlistIdsSet = new Set<number>();
  if (userId) {
    const wishlistIds = await getWishlistProductIds(userId);
    wishlistIdsSet = new Set(wishlistIds);
  }

  const productIds = products.map((p) => p.id);
  const [stockMap, ratingsMap] = await Promise.all([
    getBulkProductAvailableStock(productIds),
    getBulkProductRatingStats(productIds),
  ]);

  const enrichedProducts = products.map((product) => {
    const isInWishlist = wishlistIdsSet.has(product.id);
    const availableStock = stockMap.get(product.id) || 0;
    const stats = ratingsMap.get(product.id) || {
      averageRating: 0,
      totalReviews: 0,
    };

    return {
      id: product.id,
      slug: product.slug,
      title: product.title,
      sellingPrice: product.sellingPrice,
      discountPrice: product.discountPrice,
      brand: product.brand,
      category: product.categories,
      productimage: product.productimage,
      productvariant: product.productvariant,
      soldCount: product.soldCount || 0,
      soldHighlightDuration: product.soldHighlightDuration || null,
      isInWishlist,
      availableStock,
      rating: Number(stats.averageRating.toFixed(1)),
      reviewsCount: stats.totalReviews,
    };
  });

  const responseData = JSON.parse(
    JSON.stringify({
      products: enrichedProducts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      parentCategory,
      subcategories,
    })
  );

  if (!userId) {
    if (shopCache.size > 200) {
      const oldestKey = shopCache.keys().next().value;
      if (oldestKey) shopCache.delete(oldestKey);
    }
    shopCache.set(cacheKey, { data: responseData, expiry: Date.now() + SHOP_CACHE_TTL_MS });
  }

  return responseData;
}
