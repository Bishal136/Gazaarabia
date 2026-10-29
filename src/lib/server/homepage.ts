import { connectToDatabase, mongoose } from "@/lib/mongoose";

// In-memory cache for high-concurrency homepage traffic
let cachedHomepage: { data: any; expiry: number } | null = null;
const HOMEPAGE_CACHE_TTL_MS = 60 * 1000; // 60 seconds

export async function fetchHomepageData() {
  const now = Date.now();
  if (cachedHomepage && now < cachedHomepage.expiry) {
    return cachedHomepage.data;
  }

  await connectToDatabase();
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("Database not connected");
  }

  const settings = await db.collection("homepage_settings").findOne();

  if (!settings) {
    const empty = {
      heroSlides: [],
      shopByCategory: [],
      midBanner: null,
      signatureProducts: [],
      trendingProducts: [],
      bestSellerProducts: [],
      shopByColors: [],
      affiliateCommission: 0,
      reviews: [],
    };
    cachedHomepage = { data: empty, expiry: now + HOMEPAGE_CACHE_TTL_MS };
    return empty;
  }

  const catIds = (settings.shopByCategory || []).map(Number);
  const sigIds = (settings.signatureProducts || []).map(Number);
  const trendIds = (settings.trendingProducts || []).map(Number);
  const colorIds = (settings.shopByColors || []).map(Number);
  const bestSellerIds = (settings.bestSellerProducts || []).map(Number);

  // Determine exactly which product IDs are featured to avoid querying entire collections
  const neededProductIds = Array.from(new Set([
    ...sigIds,
    ...trendIds,
    ...bestSellerIds,
  ])).filter(Boolean);

  const [
    categories,
    sigProducts,
    reviews,
    trendProducts,
    bestSellerProducts,
    colors,
    allImages,
    allVariants,
  ] = await Promise.all([
    db
      .collection("categories")
      .find({ id: { $in: catIds } })
      .project({ id: 1, name: 1, slug: 1, image: 1 })
      .toArray(),
    db
      .collection("products")
      .find({ id: { $in: sigIds } })
      .project({ id: 1, title: 1, slug: 1, sellingPrice: 1, discountPrice: 1 })
      .toArray(),
    db
      .collection("review")
      .find()
      .project({ id: 1, rating: 1, comment: 1, userName: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray(),
    db
      .collection("products")
      .find(trendIds.length ? { id: { $in: trendIds } } : {})
      .project({ id: 1, title: 1, slug: 1, sellingPrice: 1, discountPrice: 1 })
      .limit(12)
      .toArray(),
    db
      .collection("products")
      .find(bestSellerIds.length ? { id: { $in: bestSellerIds } } : {})
      .project({ id: 1, title: 1, slug: 1, sellingPrice: 1, discountPrice: 1 })
      .limit(12)
      .toArray(),
    db
      .collection("colors")
      .find(colorIds.length ? { id: { $in: colorIds } } : {})
      .project({ id: 1, name: 1, hexCode: 1 })
      .limit(12)
      .toArray(),
    db
      .collection("productimage")
      .find(neededProductIds.length ? { productId: { $in: neededProductIds } } : {})
      .project({ productId: 1, url: 1 })
      .toArray(),
    db
      .collection("productvariant")
      .find(neededProductIds.length ? { productId: { $in: neededProductIds } } : {})
      .project({ id: 1, productId: 1, colorId: 1 })
      .toArray(),
  ]);

  const imagesByProduct = new Map<number, Array<{ url: string }>>();
  for (const img of allImages) {
    if (!imagesByProduct.has(img.productId)) {
      imagesByProduct.set(img.productId, []);
    }
    imagesByProduct.get(img.productId)?.push({ url: img.url });
  }

  const colorsById = new Map<number, any>(colors.map((c: any) => [c.id, c]));

  const variantsByProduct = new Map<number, any[]>();
  for (const v of allVariants) {
    if (!variantsByProduct.has(v.productId)) {
      variantsByProduct.set(v.productId, []);
    }
    const color = colorsById.get(v.colorId);
    variantsByProduct.get(v.productId)?.push({
      id: v.id,
      color: color
        ? { id: color.id, name: color.name, hexCode: color.hexCode }
        : null,
    });
  }

  const formatProduct = (p: any) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    sellingPrice: p.sellingPrice,
    discountPrice: p.discountPrice || null,
    productimage: (imagesByProduct.get(p.id) || []).slice(0, 2),
    productvariant: (variantsByProduct.get(p.id) || []).slice(0, 4),
  });

  const formattedSig = sigProducts.map(formatProduct);
  const formattedTrend = trendProducts.map(formatProduct);
  const formattedBest = (
    bestSellerProducts.length > 0 ? bestSellerProducts : trendProducts
  ).map(formatProduct);

  const formattedReviews = reviews.map((r: any) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
    user: { name: r.userName || "Customer" },
  }));

  const formattedColors = colors.map((c: any) => ({
    id: c.id,
    name: c.name,
    hexCode: c.hexCode,
    _count: { productvariant: 1 },
  }));

  const result = JSON.parse(
    JSON.stringify({
      affiliateCommission: settings.affiliateCommission || 0,
      heroSlides: settings.heroSlides || [],
      shopByCategory: categories,
      midBanner: settings.midBanner || null,
      signatureProducts: formattedSig,
      reviews: formattedReviews,
      trendingProducts: formattedTrend,
      bestSellerProducts: formattedBest,
      shopByColors: formattedColors,
    })
  );

  cachedHomepage = {
    data: result,
    expiry: Date.now() + HOMEPAGE_CACHE_TTL_MS,
  };

  return result;
}
