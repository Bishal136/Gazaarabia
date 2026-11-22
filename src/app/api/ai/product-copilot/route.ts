import { NextRequest, NextResponse } from "next/server";
import {
  generateProductCascade,
  generateLuxuryDescription,
  generateSeoAndSlug,
  translateProductContent,
  calculatePricingAdvice,
  guessProductFromImage,
} from "@/lib/ai/productAiService";
import { checkAuth } from "@/lib/authToken";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const userId = await checkAuth(req);
    // In production, we ensure request comes from authenticated context
    const body = await req.json().catch(() => ({}));
    const { action, data = {} } = body;

    switch (action) {
      case "cascade": {
        const title = typeof data.title === "string" ? data.title.trim() : "";
        if (!title) {
          return NextResponse.json(
            { success: false, message: "Title is required for cascading" },
            { status: 400 }
          );
        }
        const cascade = await generateProductCascade(title, {
          costPrice: typeof data.costPrice === "number" ? data.costPrice : Number(data.costPrice) || undefined,
          categoryId: data.categoryId ? Number(data.categoryId) : undefined,
        });
        return NextResponse.json({ success: true, cascade });
      }

      case "description": {
        const title = typeof data.title === "string" ? data.title.trim() : "";
        if (!title) {
          return NextResponse.json(
            { success: false, message: "Title is required to generate description" },
            { status: 400 }
          );
        }
        const html = await generateLuxuryDescription({
          title,
          category: data.categoryName,
          fitType: data.fitType,
          shortDescription: data.shortDescription,
          tags: Array.isArray(data.tags) ? data.tags : [],
        });
        return NextResponse.json({ success: true, html });
      }

      case "seo": {
        const title = typeof data.title === "string" ? data.title.trim() : "";
        if (!title) {
          return NextResponse.json(
            { success: false, message: "Title is required to generate SEO metadata" },
            { status: 400 }
          );
        }
        const seo = await generateSeoAndSlug(title, data.shortDescription);
        return NextResponse.json({ success: true, seo });
      }

      case "translate": {
        const targetLang = data.targetLang === "ar" ? "ar" : "en";
        const result = await translateProductContent({
          title: data.title,
          shortDescription: data.shortDescription,
          tags: data.tags,
          targetLang,
        });
        return NextResponse.json({ success: true, translation: result });
      }

      case "pricing": {
        const costPrice = Number(data.costPrice);
        const advice = calculatePricingAdvice(costPrice);
        return NextResponse.json({ success: true, pricing: advice });
      }

      case "image-guess": {
        const imageSource = data.imageUrl || data.imageBase64;
        if (!imageSource) {
          return NextResponse.json(
            { success: false, message: "Image URL or Base64 is required" },
            { status: 400 }
          );
        }
        const guessed = await guessProductFromImage(imageSource);
        if (!guessed) {
          return NextResponse.json(
            { success: false, message: "Unable to analyze image. Please ensure valid file or try another image." },
            { status: 422 }
          );
        }
        return NextResponse.json({ success: true, guessed });
      }

      default:
        return NextResponse.json(
          { success: false, message: `Unknown action: "${action}"` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Product Copilot Route Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to process copilot request" },
      { status: 500 }
    );
  }
}
