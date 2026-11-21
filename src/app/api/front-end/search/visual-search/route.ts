import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, mongoose } from "@/lib/mongoose";
import { analyzeVisualSearch } from "@/lib/ai/visualSearchService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let base64Image = "";
    let mimeType = "image/jpeg";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("image") as File | null;
      if (!file) {
        return NextResponse.json({ success: false, message: "No image file provided" }, { status: 400 });
      }
      mimeType = file.type || "image/jpeg";
      const arrayBuffer = await file.arrayBuffer();
      base64Image = Buffer.from(arrayBuffer).toString("base64");
    } else {
      const body = await req.json();
      base64Image = body.imageBase64 || body.image || "";
      mimeType = body.mimeType || "image/jpeg";
    }

    if (!base64Image) {
      return NextResponse.json({ success: false, message: "Image payload is empty" }, { status: 400 });
    }

    // 1. Analyze Visual Attributes via Gemini Multimodal Vision
    const features = await analyzeVisualSearch(base64Image, mimeType);

    if (!features) {
      return NextResponse.json(
        { success: false, message: "Could not analyze the uploaded image" },
        { status: 422 }
      );
    }

    // 2. Connect to MongoDB Catalog
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection unavailable");
    }

    const productsCollection = db.collection("products");

    // 3. Construct Hybrid Search Query from Visual Features
    const searchConditions: any[] = [];

    // Category condition
    if (features.suggestedCategoryId) {
      searchConditions.push({ categoryId: features.suggestedCategoryId });
    }

    // Keyword conditions
    for (const kw of features.searchKeywords) {
      if (kw && kw.length > 2) {
        searchConditions.push({ title: { $regex: kw, $options: "i" } });
        searchConditions.push({ shortDescription: { $regex: kw, $options: "i" } });
      }
    }

    // Color and Item Type conditions
    if (features.primaryColor) {
      searchConditions.push({ title: { $regex: features.primaryColor, $options: "i" } });
    }
    if (features.itemType) {
      searchConditions.push({ title: { $regex: features.itemType, $options: "i" } });
    }

    const query: any = {
      isDeleted: { $ne: true },
      active: { $ne: false },
      $or: searchConditions.length > 0 ? searchConditions : [{ id: { $gt: 0 } }],
    };

    let matchedProducts = await productsCollection
      .find(query)
      .limit(16)
      .toArray();

    // Fallback: If 0 results, relax to category or latest modest products
    if (matchedProducts.length === 0) {
      const relaxedQuery: any = {
        isDeleted: { $ne: true },
        active: { $ne: false },
      };
      if (features.suggestedCategoryId) {
        relaxedQuery.categoryId = features.suggestedCategoryId;
      }
      matchedProducts = await productsCollection
        .find(relaxedQuery)
        .limit(12)
        .toArray();
    }

    // 4. Enrich Products with Primary Images
    const productIds = matchedProducts.map((p) => p.id);
    const images = await db
      .collection("productimage")
      .find({ productId: { $in: productIds } })
      .toArray();

    const imageMap = new Map<number, string>();
    for (const img of images) {
      if (!imageMap.has(img.productId) || img.primary) {
        imageMap.set(img.productId, img.url);
      }
    }

    const formatted = matchedProducts.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      sellingPrice: p.sellingPrice || 0,
      discountPrice: p.discountPrice || null,
      inStock: (p.baseQty ?? p.stock ?? 1) > 0,
      imageUrl: imageMap.get(p.id) || "/images/placeholder.png",
      matchScore: features.suggestedCategoryId === p.categoryId ? 0.95 : 0.8,
    }));

    return NextResponse.json({
      success: true,
      features: {
        itemType: features.itemType,
        primaryColor: features.primaryColor,
        secondaryColors: features.secondaryColors,
        pattern: features.pattern,
        fabric: features.fabric,
        suggestedCategorySlug: features.suggestedCategorySlug,
        confidence: features.confidence,
        description: features.description,
        tags: [
          features.itemType,
          features.primaryColor,
          features.pattern,
          features.fabric,
          ...(features.secondaryColors || []),
        ].filter(Boolean),
      },
      products: formatted,
      total: formatted.length,
    });
  } catch (error: any) {
    console.error("Visual Search API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to process visual search" },
      { status: 500 }
    );
  }
}
