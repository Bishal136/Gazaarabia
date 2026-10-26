import { NextResponse } from "next/server";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

export async function GET() {
  try {
    await connectToDatabase();
    const db = mongoose.connection.db;

    if (!db) {
      return NextResponse.json(
        { success: false, message: "Database not connected" },
        { status: 500 }
      );
    }

    const settings = await db.collection("homepage_settings").findOne();

    if (!settings) {
      return NextResponse.json({
        success: true,
        data: {
          heroSlides: [],
          shopByCategory: [],
          midBanner: null,
          signatureProducts: [],
          trendingProducts: [],
          bestSellerProducts: [],
          shopByColors: [],
        },
      });
    }

    const catIds = (settings.shopByCategory || []).map(Number);
    const sigIds = (settings.signatureProducts || []).map(Number);
    const trendIds = (settings.trendingProducts || []).map(Number);
    const colorIds = (settings.shopByColors || []).map(Number);
    const bestSellerIds = (settings.bestSellerProducts || []).map(Number);

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
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray(),
      db
        .collection("products")
        .find(trendIds.length ? { id: { $in: trendIds } } : {})
        .limit(12)
        .toArray(),
      db
        .collection("products")
        .find(bestSellerIds.length ? { id: { $in: bestSellerIds } } : {})
        .limit(12)
        .toArray(),
      db
        .collection("colors")
        .find(colorIds.length ? { id: { $in: colorIds } } : {})
        .limit(12)
        .toArray(),
      db.collection("productimage").find().toArray(),
      db.collection("productvariant").find().toArray(),
    ]);

    // Map images by productId
    const imagesByProduct = new Map<number, Array<{ url: string }>>();
    for (const img of allImages) {
      if (!imagesByProduct.has(img.productId)) {
        imagesByProduct.set(img.productId, []);
      }
      imagesByProduct.get(img.productId)?.push({ url: img.url });
    }

    // Map colors by id
    const colorsById = new Map<number, any>(colors.map((c: any) => [c.id, c]));

    // Map variants by productId
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

    const response = NextResponse.json({
      success: true,
      data: {
        affiliateCommission: settings.affiliateCommission,
        heroSlides: settings.heroSlides || [],
        shopByCategory: categories,
        midBanner: settings.midBanner || null,
        signatureProducts: formattedSig,
        reviews: formattedReviews,
        trendingProducts: formattedTrend,
        bestSellerProducts: formattedBest,
        shopByColors: formattedColors,
      },
    });

    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300"
    );

    return response;
  } catch (error: any) {
    console.error("PUBLIC HOMEPAGE ERROR:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
