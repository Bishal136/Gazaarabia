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

  const [hpSettings, altSettings] = await Promise.all([
    db.collection("homepage_settings").findOne(),
    db.collection("home-page-setting").findOne(),
  ]);

  if (!hpSettings && !altSettings) {
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

  const mergedSettings = {
    ...(altSettings || {}),
    ...(hpSettings || {}),
  };

  const trendIdsRaw =
    hpSettings?.trendingProducts && Array.isArray(hpSettings.trendingProducts) && hpSettings.trendingProducts.length > 0
      ? hpSettings.trendingProducts
      : altSettings?.trendingProducts || altSettings?.trendingNow || [];

  const bestSellerIdsRaw =
    hpSettings?.bestSellerProducts && Array.isArray(hpSettings.bestSellerProducts) && hpSettings.bestSellerProducts.length > 0
      ? hpSettings.bestSellerProducts
      : altSettings?.bestSellerProducts || altSettings?.bestSellers || [];

  const sigIdsRaw =
    hpSettings?.signatureProducts && Array.isArray(hpSettings.signatureProducts) && hpSettings.signatureProducts.length > 0
      ? hpSettings.signatureProducts
      : altSettings?.signatureProducts || [];

  const catIds = (mergedSettings.shopByCategory || []).map(Number).filter(Boolean);
  const sigIds = sigIdsRaw.map(Number).filter(Boolean);
  const trendIds = trendIdsRaw.map(Number).filter(Boolean);
  const bestSellerIds = bestSellerIdsRaw.map(Number).filter(Boolean);
  const colorIds = (mergedSettings.shopByColors || []).map(Number).filter(Boolean);

  const [
    categories,
    reviews,
    colors,
    sigProducts,
    trendProducts,
    bestSellerProducts,
  ] = await Promise.all([
    db
      .collection("categories")
      .find(catIds.length ? { id: { $in: catIds } } : {})
      .project({ id: 1, name: 1, slug: 1, image: 1 })
      .limit(10)
      .toArray(),
    db
      .collection("review")
      .find()
      .project({ id: 1, rating: 1, comment: 1, userName: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray(),
    db
      .collection("colors")
      .find(colorIds.length ? { id: { $in: colorIds } } : {})
      .project({ id: 1, name: 1, hexCode: 1 })
      .limit(12)
      .toArray(),
    db
      .collection("products")
      .find(sigIds.length ? { id: { $in: sigIds } } : {})
      .project({ id: 1, title: 1, slug: 1, sellingPrice: 1, discountPrice: 1, thumbnail: 1, image: 1, videoUrl: 1 })
      .limit(8)
      .toArray(),
    db
      .collection("products")
      .find(trendIds.length ? { id: { $in: trendIds } } : {})
      .project({ id: 1, title: 1, slug: 1, sellingPrice: 1, discountPrice: 1, thumbnail: 1, image: 1, videoUrl: 1 })
      .limit(12)
      .toArray(),
    db
      .collection("products")
      .find(bestSellerIds.length ? { id: { $in: bestSellerIds } } : {})
      .project({ id: 1, title: 1, slug: 1, sellingPrice: 1, discountPrice: 1, thumbnail: 1, image: 1, videoUrl: 1 })
      .limit(12)
      .toArray(),
  ]);

  // Collect the exact product IDs appearing on the homepage across all featured sections
  const allFeaturedProductIds = Array.from(
    new Set([
      ...sigProducts.map((p: any) => p.id),
      ...trendProducts.map((p: any) => p.id),
      ...bestSellerProducts.map((p: any) => p.id),
    ])
  ).filter(Boolean);

  // Fetch images and variants for ALL featured products
  const [allImages, allVariants] = await Promise.all([
    allFeaturedProductIds.length
      ? db
          .collection("productimage")
          .find({ productId: { $in: allFeaturedProductIds } })
          .project({ id: 1, productId: 1, url: 1, primary: 1 })
          .sort({ primary: -1, id: 1 })
          .toArray()
      : [],
    allFeaturedProductIds.length
      ? db
          .collection("productvariant")
          .find({ productId: { $in: allFeaturedProductIds } })
          .project({ id: 1, productId: 1, colorId: 1, videoUrl: 1 })
          .toArray()
      : [],
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
      videoUrl: v.videoUrl || null,
      color: color
        ? { id: color.id, name: color.name, hexCode: color.hexCode }
        : null,
    });
  }

  const formatProduct = (p: any) => {
    let images = imagesByProduct.get(p.id) || [];
    if (images.length === 0) {
      if (p.thumbnail) images = [{ url: p.thumbnail }];
      else if (p.image) images = [{ url: p.image }];
    }
    const variantVideo = variantsByProduct.get(p.id)?.find((v: any) => v.videoUrl)?.videoUrl;
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      sellingPrice: p.sellingPrice,
      discountPrice: p.discountPrice || null,
      videoUrl: p.videoUrl || variantVideo || null,
      productimage: images.slice(0, 2),
      productvariant: (variantsByProduct.get(p.id) || []).slice(0, 4),
    };
  };

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
      affiliateCommission: mergedSettings.affiliateCommission || 0,
      heroSlides: mergedSettings.heroSlides || [],
      shopByCategory: categories,
      midBanner: mergedSettings.midBanner || null,
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
