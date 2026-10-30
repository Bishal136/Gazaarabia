import { prisma } from "@/lib/prisma";
import { getWishlistProductIds } from "@/lib/helpers/wishlist";
import { getBulkProductAvailableStock } from "@/lib/helpers/stockHelper";
import { getBulkProductRatingStats } from "@/lib/helpers/reviewHelper";

export async function fetchShopData(
  slug: string,
  page = 1,
  limit = 16,
  filters: any = {},
  userId: number | null = null
) {
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

  const productWhere: any = {
    active: true,
    isDeleted: false,
    sellingPrice: {
      gte: priceMin,
      lte: priceMax,
    },
  };

  if (q) {
    const term = q.toLowerCase();
    productWhere.OR = [
      { title: { contains: term } },
      { slug: { contains: term } },
      { shortDescription: { contains: term } },
    ];
  }

  if (ratingMin > 0) {
    productWhere.reviews = {
      some: {
        rating: { gte: ratingMin },
      },
    };
  }

  if (hasInStock && !hasOutOfStock) {
    productWhere.baseQty = { gt: 0 };
  }
  if (hasOutOfStock && !hasInStock) {
    productWhere.baseQty = { lte: 0 };
  }

  if (subcategoriesFilter.length > 0) {
    productWhere.subcategoryId = { in: subcategoriesFilter };
  }

  if (categoriesFilter.length > 0) {
    productWhere.categoryId = { in: categoriesFilter };
  }

  if (sizes.length > 0 || colors.length > 0) {
    productWhere.productvariant = {
      some: {
        isActive: true,
        ...(sizes.length > 0 && { sizeId: { in: sizes } }),
        ...(colors.length > 0 && { colorId: { in: colors } }),
      },
    };
  }

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
      isInWishlist,
      availableStock,
      rating: Number(stats.averageRating.toFixed(1)),
      reviewsCount: stats.totalReviews,
    };
  });

  return JSON.parse(
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
}
