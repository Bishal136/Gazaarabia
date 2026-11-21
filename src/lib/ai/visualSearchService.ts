import crypto from "crypto";
import {
  analyzeImageWithGemini,
  visualSearchCache,
  isGeminiConfigured,
} from "./geminiClient";

export interface VisualSearchFeatures {
  itemType: string;
  primaryColor: string;
  secondaryColors: string[];
  pattern: string;
  fabric: string;
  searchKeywords: string[];
  suggestedCategorySlug: string;
  suggestedCategoryId: number | null;
  confidence: number;
  description: string;
}

const CATEGORY_SLUG_TO_ID: Record<string, number> = {
  abayas: 10,
  kaftans: 11,
  hijab: 12,
  djellabas: 13,
  "modest-activewear": 14,
  "modest-dresses": 15,
  "kimonos-co-ords": 16,
  "prayer-dresses": 17,
  accessories: 18,
  "palestine-collection": 19,
};

const SYSTEM_PROMPT = `
You are the visual search AI for "Gazaarabia", a luxury modest fashion e-commerce marketplace.
Analyze the user-uploaded photograph or screenshot of a garment and extract structured search parameters to query the product database.

Known Marketplace Categories:
- "abayas" (Open front, closed, embroidered, batwing, butterfly, bisht, Dubai style abayas)
- "kaftans" (Moroccan kaftans, Takchita, embellished evening kaftans, linen)
- "hijab" (Chiffon, modal, jersey, silk, square scarves, instant hijabs)
- "djellabas" (Moroccan hooded djellabas with randa or sfifa embroidery)
- "modest-activewear" (Burkinis, swimwear, athletic tunics)
- "modest-dresses" (Maxi modest dresses, tiered, pleated)
- "kimonos-co-ords" (2-piece sets, open kimono cardigans)
- "prayer-dresses" (Cotton prayer gowns)
- "palestine-collection" (Traditional Tatreez cross-stitch embroidery, Keffiyeh pattern items)

Return strictly a JSON object with this schema:
{
  "itemType": string,
  "primaryColor": string,
  "secondaryColors": string[],
  "pattern": string,
  "fabric": string,
  "searchKeywords": string[],
  "suggestedCategorySlug": string,
  "confidence": number,
  "description": string
}
`;

/**
 * Multimodal visual fashion search using Gemini Vision API
 */
export async function analyzeVisualSearch(
  imageBase64: string,
  mimeType = "image/jpeg"
): Promise<VisualSearchFeatures | null> {
  // 1. Calculate cache key from image data
  const hash = crypto.createHash("md5").update(imageBase64.slice(0, 10000)).digest("hex");
  const cached = visualSearchCache.get(hash);
  if (cached) {
    return cached;
  }

  // 2. If Gemini is not configured, return a basic fallback
  if (!isGeminiConfigured()) {
    const fallback: VisualSearchFeatures = {
      itemType: "Modest Fashion",
      primaryColor: "Black",
      secondaryColors: [],
      pattern: "Plain",
      fabric: "Fabric",
      searchKeywords: ["abaya", "modest dress", "kaftan"],
      suggestedCategorySlug: "abayas",
      suggestedCategoryId: 10,
      confidence: 0.5,
      description: "Visual search photo analyzed",
    };
    return fallback;
  }

  // 3. Multimodal Inference
  const prompt = `Analyze this modest wear clothing item. Extract specific style, colors, patterns, and search keywords for our store catalog.`;
  const result = await analyzeImageWithGemini<any>(
    imageBase64,
    mimeType,
    prompt,
    SYSTEM_PROMPT,
    7000
  );

  if (!result) {
    return null;
  }

  const slug = (result.suggestedCategorySlug || "abayas").toLowerCase().replace(/[^a-z-]/g, "");
  const catId = CATEGORY_SLUG_TO_ID[slug] || CATEGORY_SLUG_TO_ID.abayas;

  const features: VisualSearchFeatures = {
    itemType: result.itemType || "Abaya",
    primaryColor: result.primaryColor || "Black",
    secondaryColors: Array.isArray(result.secondaryColors) ? result.secondaryColors : [],
    pattern: result.pattern || "Embroidered",
    fabric: result.fabric || "Nida",
    searchKeywords: Array.isArray(result.searchKeywords) && result.searchKeywords.length > 0
      ? result.searchKeywords
      : [result.itemType, result.primaryColor].filter(Boolean),
    suggestedCategorySlug: slug,
    suggestedCategoryId: catId,
    confidence: typeof result.confidence === "number" ? result.confidence : 0.85,
    description: result.description || `Search for ${result.primaryColor || ""} ${result.itemType || "garment"}`,
  };

  visualSearchCache.set(hash, features);
  return features;
}
