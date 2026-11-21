import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, mongoose } from "@/lib/mongoose";
import { parseSearchIntent } from "@/lib/ai/searchIntentParser";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q) {
      return NextResponse.json({
        success: true,
        intent: null,
        products: [],
        total: 0,
      });
    }

    // 1. AI Intent Analysis via Gemini Flash Engine
    const intent = await parseSearchIntent(q);

    // 2. Connect to MongoDB
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection unavailable");
    }

    const productsCollection = db.collection("products");

    // 3. Construct Intelligent Hybrid Search Query
    const baseFilter: any = {
      isDeleted: { $ne: true },
      active: { $ne: false },
    };

    // Keyword conditions
    const searchTerms = [
      intent.cleanQuery,
      ...(intent.semanticKeywords || []),
      intent.correctedQuery,
    ]
      .filter((t): t is string => !!t && t.length > 1)
      .map((t) => t.trim());

    const regexQueries = searchTerms.map((term) => ({
      $or: [
        { title: { $regex: term, $options: "i" } },
        { slug: { $regex: term.replace(/\s+/g, "-"), $options: "i" } },
        { shortDescription: { $regex: term, $options: "i" } },
        { description: { $regex: term, $options: "i" } },
      ],
    }));

    const query: any = { ...baseFilter };

    if (regexQueries.length > 0) {
      query.$or = regexQueries.flatMap((rq) => rq.$or);
    }

    // Strict Category filter if detected
    if (intent.categoryId) {
      query.categoryId = intent.categoryId;
    }

    // Price filters
    if (intent.maxPrice && intent.maxPrice > 0) {
      query.sellingPrice = { ...(query.sellingPrice || {}), $lte: intent.maxPrice };
    }
    if (intent.minPrice && intent.minPrice > 0) {
      query.sellingPrice = { ...(query.sellingPrice || {}), $gte: intent.minPrice };
    }

    // 4. Execute Primary Query
    let rawProducts = await productsCollection
      .find(query)
      .limit(20)
      .toArray();

    // 5. Zero-Result Fallback & Semantic Relaxation:
    // If strict filters returned 0 results, relax price and color filters to ensure customers never hit a dead end
    if (rawProducts.length === 0 && (intent.maxPrice || intent.categoryId)) {
      const relaxedQuery: any = { ...baseFilter };
      if (intent.categoryId) {
        relaxedQuery.categoryId = intent.categoryId;
      } else if (regexQueries.length > 0) {
        relaxedQuery.$or = regexQueries.flatMap((rq) => rq.$or);
      }

      rawProducts = await productsCollection
        .find(relaxedQuery)
        .limit(12)
        .toArray();
    }

    // If still 0 results and correctedQuery exists (e.g. user made typo like "wedin abya")
    if (rawProducts.length === 0 && intent.correctedQuery) {
      const typoQuery: any = {
        ...baseFilter,
        $or: [
          { title: { $regex: intent.correctedQuery, $options: "i" } },
          { shortDescription: { $regex: intent.correctedQuery, $options: "i" } },
        ],
      };
      rawProducts = await productsCollection.find(typoQuery).limit(12).toArray();
    }

    // 6. Enrich with Product Images & Category Information
    const productIds = rawProducts.map((p) => p.id);
    const categoryIds = [...new Set(rawProducts.map((p) => p.categoryId).filter(Boolean))];

    const [images, categories] = await Promise.all([
      db.collection("productimage").find({ productId: { $in: productIds } }).toArray(),
      db.collection("categories").find({ id: { $in: categoryIds } }).toArray(),
    ]);

    const imagesByProdId = new Map<number, string>();
    for (const img of images) {
      if (!imagesByProdId.has(img.productId) || img.primary) {
        imagesByProdId.set(img.productId, img.url);
      }
    }

    const categoriesById = new Map<number, { name: string; slug: string }>();
    for (const cat of categories) {
      categoriesById.set(cat.id, { name: cat.name, slug: cat.slug });
    }

    const formatted = rawProducts.map((p) => {
      const catInfo = categoriesById.get(p.categoryId);
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        sellingPrice: p.sellingPrice || 0,
        discountPrice: p.discountPrice || null,
        basePrice: p.basePrice || p.sellingPrice || 0,
        inStock: (p.baseQty ?? p.stock ?? 1) > 0,
        imageUrl: imagesByProdId.get(p.id) || "/images/placeholder.png",
        categoryName: catInfo?.name || "",
        categorySlug: catInfo?.slug || "",
      };
    });

    return NextResponse.json({
      success: true,
      intent: {
        cleanQuery: intent.cleanQuery,
        correctedQuery: intent.correctedQuery,
        color: intent.color,
        maxPrice: intent.maxPrice,
        minPrice: intent.minPrice,
        categoryName: intent.categoryName,
        categorySlug: intent.categorySlug,
        tags: intent.tags,
        intentSummary: intent.intentSummary,
      },
      products: formatted,
      total: formatted.length,
    });
  } catch (error: any) {
    console.error("AI Search Query API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to process AI search" },
      { status: 500 }
    );
  }
}
