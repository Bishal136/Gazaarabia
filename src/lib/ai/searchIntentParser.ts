import {
  generateStructuredJson,
  searchIntentCache,
  isGeminiConfigured,
} from "./geminiClient";

export interface ParsedSearchIntent {
  cleanQuery: string;
  correctedQuery: string | null;
  categoryId: number | null;
  categorySlug: string | null;
  categoryName: string | null;
  subcategoryId: number | null;
  subcategoryName: string | null;
  color: string | null;
  maxPrice: number | null;
  minPrice: number | null;
  occasion: string | null;
  tags: string[];
  semanticKeywords: string[];
  intentSummary: string;
}

const CATEGORY_MAP: Record<string, { id: number; slug: string; name: string }> = {
  abaya: { id: 10, slug: "abayas", name: "ABAYAS" },
  abayas: { id: 10, slug: "abayas", name: "ABAYAS" },
  kaftan: { id: 11, slug: "kaftans", name: "KAFTANS" },
  kaftans: { id: 11, slug: "kaftans", name: "KAFTANS" },
  hijab: { id: 12, slug: "hijab", name: "HIJABS & SCARVES" },
  hijabs: { id: 12, slug: "hijab", name: "HIJABS & SCARVES" },
  scarf: { id: 12, slug: "hijab", name: "HIJABS & SCARVES" },
  scarves: { id: 12, slug: "hijab", name: "HIJABS & SCARVES" },
  djellaba: { id: 13, slug: "djellabas", name: "DJELLABAS" },
  djellabas: { id: 13, slug: "djellabas", name: "DJELLABAS" },
  activewear: { id: 14, slug: "modest-activewear", name: "MODEST ACTIVEWEAR" },
  burkini: { id: 14, slug: "modest-activewear", name: "MODEST ACTIVEWEAR" },
  dress: { id: 15, slug: "modest-dresses", name: "MODEST DRESSES" },
  dresses: { id: 15, slug: "modest-dresses", name: "MODEST DRESSES" },
  kimono: { id: 16, slug: "kimonos-co-ords", name: "KIMONOS & CO-ORDS" },
  "co-ord": { id: 16, slug: "kimonos-co-ords", name: "KIMONOS & CO-ORDS" },
  prayer: { id: 17, slug: "prayer-dresses", name: "PRAYER DRESSES" },
  accessory: { id: 18, slug: "accessories", name: "ACCESSORIES" },
  accessories: { id: 18, slug: "accessories", name: "ACCESSORIES" },
  palestine: { id: 19, slug: "palestine-collection", name: "THE PALESTINE COLLECTION" },
  tatreez: { id: 19, slug: "palestine-collection", name: "THE PALESTINE COLLECTION" },
  keffiyeh: { id: 19, slug: "palestine-collection", name: "THE PALESTINE COLLECTION" },
};

const SYSTEM_PROMPT = `
You are the e-commerce search intelligence parser for "Gazaarabia", the UK's leading modest luxury fashion marketplace.
Your goal is to parse unstructured search queries into structured JSON for MongoDB product filtering.

Marketplace Product Categories:
1. ABAYAS (ID: 10, slug: "abayas") - Open front, embroidered, luxury, everyday, classic black.
2. KAFTANS (ID: 11, slug: "kaftans") - Moroccan, embellished evening, linen, silk.
3. HIJABS & SCARVES (ID: 12, slug: "hijab") - Chiffon, modal, jersey, silk, instant.
4. DJELLABAS (ID: 13, slug: "djellabas") - Moroccan hooded, embroidered.
5. MODEST ACTIVEWEAR (ID: 14, slug: "modest-activewear") - Burkinis, sports hijabs, workout sets.
6. MODEST DRESSES (ID: 15, slug: "modest-dresses") - Maxi evening dresses, pleated, linen.
7. KIMONOS & CO-ORDS (ID: 16, slug: "kimonos-co-ords") - 2-piece sets, luxury kimonos.
8. PRAYER DRESSES (ID: 17, slug: "prayer-dresses") - 1-piece cotton prayer garments.
9. ACCESSORIES (ID: 18, slug: "accessories") - Magnetic pins, caps, belts.
10. THE PALESTINE COLLECTION (ID: 19, slug: "palestine-collection") - Tatreez embroidery, keffiyeh scarves.

Parsing Rules:
1. Typo correction: If the user misspells terms (e.g. "wedin abya" -> "wedding abaya", "shifon hejab" -> "chiffon hijab"), set "correctedQuery" to the properly spelled term. If no typo, "correctedQuery" must be null.
2. Extract numeric budget constraints (e.g., "under £50" -> maxPrice: 50, "between 30 and 60" -> minPrice: 30, maxPrice: 60).
3. Identify color names (e.g., Black, Teal, White, Pink, Green, Gold, Pastel).
4. Identify occasions (e.g., Wedding, Eid, Formal, Everyday, Umrah, Prayer).
5. Generate 2-4 semantic search keywords suitable for MongoDB $regex or full-text index.
6. "cleanQuery" should be the core descriptive product phrase without the pricing or stop words.

You must respond strictly with valid JSON conforming to this schema:
{
  "cleanQuery": string,
  "correctedQuery": string or null,
  "categoryName": string or null,
  "color": string or null,
  "maxPrice": number or null,
  "minPrice": number or null,
  "occasion": string or null,
  "tags": string[],
  "semanticKeywords": string[],
  "intentSummary": string
}
`;

/**
 * Parse natural language search queries using Gemini Flash with caching & fallback
 */
export async function parseSearchIntent(query: string): Promise<ParsedSearchIntent> {
  const normalized = query.trim().toLowerCase();

  // 1. Check in-memory cache
  const cached = searchIntentCache.get(normalized);
  if (cached) {
    return cached;
  }

  // 2. Fallback heuristic parser (works even if Gemini API key is missing or offline)
  const fallback = buildHeuristicIntent(query);

  if (!isGeminiConfigured() || normalized.length < 3) {
    searchIntentCache.set(normalized, fallback);
    return fallback;
  }

  // 3. Gemini Structured Intent Inference
  const prompt = `Parse this user search query: "${query}"`;
  const geminiResult = await generateStructuredJson<any>(prompt, SYSTEM_PROMPT, 3500);

  if (!geminiResult) {
    searchIntentCache.set(normalized, fallback);
    return fallback;
  }

  // Map identified category to known database category
  let categoryId: number | null = null;
  let categorySlug: string | null = null;
  let categoryName: string | null = geminiResult.categoryName || null;

  if (categoryName) {
    const key = categoryName.toLowerCase().replace(/[^a-z]/g, "");
    for (const [mapKey, meta] of Object.entries(CATEGORY_MAP)) {
      if (key.includes(mapKey) || mapKey.includes(key)) {
        categoryId = meta.id;
        categorySlug = meta.slug;
        categoryName = meta.name;
        break;
      }
    }
  }

  // Fallback category detection if Gemini didn't map it explicitly
  if (!categoryId) {
    for (const [term, meta] of Object.entries(CATEGORY_MAP)) {
      if (normalized.includes(term)) {
        categoryId = meta.id;
        categorySlug = meta.slug;
        categoryName = meta.name;
        break;
      }
    }
  }

  const result: ParsedSearchIntent = {
    cleanQuery: geminiResult.cleanQuery || query.trim(),
    correctedQuery: geminiResult.correctedQuery || null,
    categoryId,
    categorySlug,
    categoryName,
    subcategoryId: null,
    subcategoryName: null,
    color: geminiResult.color || null,
    maxPrice: typeof geminiResult.maxPrice === "number" ? geminiResult.maxPrice : null,
    minPrice: typeof geminiResult.minPrice === "number" ? geminiResult.minPrice : null,
    occasion: geminiResult.occasion || null,
    tags: Array.isArray(geminiResult.tags) ? geminiResult.tags : [],
    semanticKeywords: Array.isArray(geminiResult.semanticKeywords)
      ? geminiResult.semanticKeywords
      : [geminiResult.cleanQuery || query],
    intentSummary: geminiResult.intentSummary || `Search for ${query}`,
  };

  searchIntentCache.set(normalized, result);
  return result;
}

/**
 * Deterministic Regex/Rule-based Fallback Parser
 */
function buildHeuristicIntent(query: string): ParsedSearchIntent {
  const lower = query.toLowerCase();

  // Price extraction: "under 50", "under £60", "< 40"
  let maxPrice: number | null = null;
  const priceMatch = lower.match(/(?:under|below|<|less than)\s*(?:£|\$|gbp)?\s*(\d+(?:\.\d+)?)/);
  if (priceMatch) {
    maxPrice = parseFloat(priceMatch[1]);
  }

  // Common colors
  const colors = ["black", "white", "teal", "blue", "green", "pink", "yellow", "purple", "gold", "beige", "navy", "grey", "pastel"];
  let detectedColor: string | null = null;
  for (const c of colors) {
    if (new RegExp(`\\b${c}\\b`).test(lower)) {
      detectedColor = c.charAt(0).toUpperCase() + c.slice(1);
      break;
    }
  }

  // Category identification
  let categoryId: number | null = null;
  let categorySlug: string | null = null;
  let categoryName: string | null = null;

  for (const [term, meta] of Object.entries(CATEGORY_MAP)) {
    if (new RegExp(`\\b${term}\\b`).test(lower)) {
      categoryId = meta.id;
      categorySlug = meta.slug;
      categoryName = meta.name;
      break;
    }
  }

  // Clean query by removing price stopwords
  const clean = query
    .replace(/(?:under|below|<|less than)\s*(?:£|\$|gbp)?\s*\d+(?:\.\d+)?/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    cleanQuery: clean || query.trim(),
    correctedQuery: null,
    categoryId,
    categorySlug,
    categoryName,
    subcategoryId: null,
    subcategoryName: null,
    color: detectedColor,
    maxPrice,
    minPrice: null,
    occasion: null,
    tags: detectedColor ? [detectedColor] : [],
    semanticKeywords: clean ? [clean] : [query],
    intentSummary: `Search for ${query}`,
  };
}
