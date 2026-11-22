/**
 * ==============================================================================
 * GAZAARABIA AI PRODUCT INTELLIGENCE SERVICE
 * ==============================================================================
 * Real-time inline next-word autocomplete, background field auto-cascading,
 * luxury description generation, SEO optimization, and pricing recommendation.
 * ==============================================================================
 */

import fs from "fs";
import path from "path";
import {
  generateStructuredJson,
  analyzeImageWithGemini,
  productAutocompleteCache,
  productCascadeCache,
  isGeminiConfigured,
} from "./geminiClient";

export interface ProductCascadeData {
  categoryId: number;
  categoryName: string;
  subcategoryId: number;
  subcategoryName: string;
  fitType: string;
  shortDescription: string;
  tags: string[];
  careAdvice: string;
  slug: string;
  pricing?: {
    recommendedSellingPrice: number;
    recommendedDiscountPrice: number;
    grossMarginPercent: number;
    insight: string;
  };
}

export interface AutocompleteResult {
  suggestion: string;
  suffix: string;
  cascade?: Partial<ProductCascadeData>;
}

export interface SeoOptimizationResult {
  slug: string;
  metaTitle: string;
  metaDescription: string;
}

export interface TranslationResult {
  title?: string;
  shortDescription?: string;
  tags?: string[];
  language: "ar" | "en";
}

// Canonical marketplace categories and subcategories
export const MARKETPLACE_CATEGORIES = [
  {
    id: 10,
    name: "ABAYAS",
    slug: "abayas",
    subcategories: [
      { id: 101, name: "Open Front Abayas" },
      { id: 102, name: "Embroidered Abayas" },
      { id: 103, name: "Occasion & Luxury Abayas" },
      { id: 104, name: "Everyday Modest Abayas" },
    ],
  },
  {
    id: 11,
    name: "KAFTANS",
    slug: "kaftans",
    subcategories: [
      { id: 105, name: "Moroccan Kaftans" },
      { id: 106, name: "Embroidered Kaftans" },
      { id: 107, name: "Occasion Kaftans" },
    ],
  },
  {
    id: 12,
    name: "HIJABS & SCARVES",
    slug: "hijab",
    subcategories: [
      { id: 108, name: "Premium Modal Hijabs" },
      { id: 109, name: "Chiffon Silk Wraps" },
      { id: 110, name: "Everyday Jersey Scarves" },
    ],
  },
  {
    id: 13,
    name: "DJELLABAS",
    slug: "djellabas",
    subcategories: [
      { id: 111, name: "Hooded Djellabas" },
      { id: 112, name: "Casual Modest Djellabas" },
    ],
  },
  {
    id: 14,
    name: "MODEST ACTIVEWEAR",
    slug: "modest-activewear",
    subcategories: [
      { id: 113, name: "Performance Active Sets" },
      { id: 114, name: "Modest Swimwear" },
    ],
  },
  {
    id: 15,
    name: "HOODIES & SWEATSHIRTS",
    slug: "hoodies-sweatshirts",
    subcategories: [
      { id: 115, name: "Oversized Streetwear Hoodies" },
      { id: 116, name: "Solidarity Calligraphy Sweats" },
    ],
  },
  {
    id: 16,
    name: "MEN'S THOBES",
    slug: "thobes",
    subcategories: [
      { id: 117, name: "Classic White Thobes" },
      { id: 118, name: "Slim Fit Tailored Thobes" },
      { id: 119, name: "Emirati & Omani Thobes" },
    ],
  },
  {
    id: 17,
    name: "JELLABAS & JUBBAS",
    slug: "jellabas-jubbas",
    subcategories: [
      { id: 120, name: "Moroccan Men's Jellabas" },
      { id: 121, name: "Modern Streetwear Jubbahs" },
    ],
  },
  {
    id: 18,
    name: "MEN'S ACTIVEWEAR & JERSEYS",
    slug: "modest-activewear-m",
    subcategories: [
      { id: 122, name: "Palestine Football Jerseys" },
      { id: 123, name: "Solidarity Athletic Wear" },
    ],
  },
  {
    id: 19,
    name: "GIFTS & HERITAGE",
    slug: "gifts",
    subcategories: [
      { id: 124, name: "Palestinian Tatreez Gifts" },
      { id: 125, name: "Olive Wood Tasbih & Beads" },
    ],
  },
];

// Common modest fashion phrase completions for offline fallback
const FALLBACK_CATALOG = [
  {
    prefix: "black nidh",
    title: "Black Nidha Embroidered Open Front Abaya",
    categoryId: 10,
    subcategoryId: 102,
    fitType: "Modest / Loose Fit",
    shortDescription: "An elegant black abaya crafted from luxurious Korean Nidha fabric with subtle cuff embroidery.",
    tags: ["black abaya", "nidha fabric", "open front", "modest fashion", "everyday luxury"],
    careAdvice: "Dry Clean Only",
  },
  {
    prefix: "royal purple",
    title: "Royal Purple Velvet Luxury Occasion Abaya",
    categoryId: 10,
    subcategoryId: 103,
    fitType: "A-Line Silhouette",
    shortDescription: "A show-stopping royal purple velvet abaya with shimmering artisanal detailing for Eid and weddings.",
    tags: ["purple abaya", "velvet abaya", "luxury wear", "eid collection", "wedding abaya"],
    careAdvice: "Dry Clean Only",
  },
  {
    prefix: "moroccan",
    title: "Moroccan Royal Embroidered Silk Kaftan",
    categoryId: 11,
    subcategoryId: 105,
    fitType: "Loose / Flared",
    shortDescription: "Authentic Moroccan handmade royal kaftan featuring traditional gold sfifa braiding and crystal accents.",
    tags: ["moroccan kaftan", "silk kaftan", "gold sfifa", "modest luxury", "wedding attire"],
    careAdvice: "Dry Clean Only",
  },
  {
    prefix: "chiffon",
    title: "Chiffon Silk Maxi Wrap Scarf with Pearl Pins",
    categoryId: 12,
    subcategoryId: 109,
    fitType: "Regular Fit",
    shortDescription: "Featherlight breathable chiffon silk hijab wrap designed for non-slip coverage and effortless drapes.",
    tags: ["chiffon hijab", "silk wrap", "breathable", "hijab fashion", "everyday scarf"],
    careAdvice: "Gentle Hand Wash",
  },
  {
    prefix: "palestine",
    title: "Palestine Solidarity Tatreez Heritage Hoodie",
    categoryId: 15,
    subcategoryId: 116,
    fitType: "Oversized Fit",
    shortDescription: "Heavyweight 420gsm organic cotton hoodie embroidered with authentic Palestinian Tatreez motifs.",
    tags: ["palestine", "tatreez embroidery", "solidarity hoodie", "streetwear", "heritage"],
    careAdvice: "Machine Wash Cold inside out",
  },
  {
    prefix: "white thobe",
    title: "Classic Emirati Tailored White Thobe",
    categoryId: 16,
    subcategoryId: 117,
    fitType: "Tailored Fit",
    shortDescription: "Crisp wrinkle-resistant white thobe with authentic Emirati tassel and structured collar.",
    tags: ["white thobe", "emirati thobe", "men modest", "islamic menswear", "jummah wear"],
    careAdvice: "Machine Wash Warm",
  },
  {
    prefix: "tatreez",
    title: "Handmade Palestinian Tatreez Clutch & Scarf Gift Set",
    categoryId: 19,
    subcategoryId: 124,
    fitType: "One Size",
    shortDescription: "Artisanal Palestinian heirloom gift set featuring cross-stitch Tatreez embroidery on natural linen.",
    tags: ["tatreez", "palestinian heritage", "gift set", "handmade", "ethical fashion"],
    careAdvice: "Spot Clean Only",
  },
];

/**
 * Generate clean URL slug from text
 */
export function generateSlug(text: string): string {
  const stopWords = new Set(["a", "an", "the", "and", "or", "for", "with", "of", "in", "to", "at"]);
  const clean = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/\s+/)
    .filter((w) => !stopWords.has(w) || w.length > 3)
    .join("-");
  return clean.replace(/-+/g, "-");
}

/**
 * Compute ghost text suffix
 */
function extractSuffix(prefix: string, fullText: string): string {
  if (!fullText) return "";
  const pLower = prefix.toLowerCase();
  const fLower = fullText.toLowerCase();

  if (fLower.startsWith(pLower)) {
    return fullText.slice(prefix.length);
  }

  // If match starts after leading spaces or partial word match
  const idx = fLower.indexOf(pLower);
  if (idx !== -1) {
    return fullText.slice(idx + prefix.length);
  }

  return "";
}

/**
 * Intelligent Heuristic Fallback for Title Completion & Auto-Cascade
 */
export function getHeuristicAutocomplete(prefix: string): AutocompleteResult {
  const p = prefix.trim().toLowerCase();

  // 1. Direct prefix match in fallback catalog
  const match = FALLBACK_CATALOG.find(
    (item) => item.prefix.startsWith(p) || item.title.toLowerCase().startsWith(p) || p.startsWith(item.prefix)
  );

  if (match) {
    const suffix = extractSuffix(prefix, match.title);
    return {
      suggestion: match.title,
      suffix,
      cascade: {
        categoryId: match.categoryId,
        categoryName: MARKETPLACE_CATEGORIES.find((c) => c.id === match.categoryId)?.name || "ABAYAS",
        subcategoryId: match.subcategoryId,
        subcategoryName:
          MARKETPLACE_CATEGORIES.flatMap((c) => c.subcategories).find((s) => s.id === match.subcategoryId)?.name ||
          "Embroidered Abayas",
        fitType: match.fitType,
        shortDescription: match.shortDescription,
        tags: match.tags,
        careAdvice: match.careAdvice,
        slug: generateSlug(match.title),
      },
    };
  }

  // 2. Keyword heuristic generator
  let title = prefix;
  let categoryId = 10;
  let subcategoryId = 101;
  let fitType = "Modest / Loose Fit";
  let tags = ["modest fashion", "luxury modest", "ethical wear", "gazaarabia"];
  let careAdvice = "Dry Clean Recommended";

  if (p.includes("abaya")) {
    categoryId = 10;
    subcategoryId = p.includes("open") ? 101 : p.includes("embroider") ? 102 : 103;
    fitType = "Loose / Flared";
    tags = ["abaya", "modest luxury", "everyday abaya", "dubai style", "hijab friendly"];
  } else if (p.includes("kaftan")) {
    categoryId = 11;
    subcategoryId = 105;
    fitType = "Loose / Flared";
    tags = ["kaftan", "moroccan style", "evening wear", "hand embroidered", "luxury"];
  } else if (p.includes("hijab") || p.includes("scarf")) {
    categoryId = 12;
    subcategoryId = 108;
    fitType = "Regular Fit";
    tags = ["hijab", "modal hijab", "breathable", "muslimah fashion", "modest wrap"];
    careAdvice = "Gentle Hand Wash";
  } else if (p.includes("djellaba")) {
    categoryId = 13;
    subcategoryId = 111;
    fitType = "Loose / Flared";
    tags = ["djellaba", "traditional moroccan", "hooded djellaba", "modest wear"];
  } else if (p.includes("active") || p.includes("swim") || p.includes("burkini")) {
    categoryId = 14;
    subcategoryId = 113;
    fitType = "Active Fit";
    tags = ["modest activewear", "quick dry", "burkini", "breathable", "performance"];
  } else if (p.includes("hoodie") || p.includes("sweat")) {
    categoryId = 15;
    subcategoryId = 115;
    fitType = "Oversized Fit";
    tags = ["oversized hoodie", "streetwear", "heavyweight cotton", "solidarity", "unisex"];
    careAdvice = "Machine Wash Cold";
  } else if (p.includes("thobe") || p.includes("dishdasha")) {
    categoryId = 16;
    subcategoryId = 117;
    fitType = "Tailored Fit";
    tags = ["thobe", "men thobe", "white thobe", "emirati", "islamic clothing"];
    careAdvice = "Machine Wash Warm";
  } else if (p.includes("tatreez") || p.includes("palestine")) {
    categoryId = 19;
    subcategoryId = 124;
    fitType = "Standard";
    tags = ["palestine", "tatreez", "hand embroidered", "heritage", "ethical gift"];
  }

  // Synthesize a natural completion if prefix is short
  if (!p.includes("abaya") && !p.includes("kaftan") && !p.includes("hijab") && !p.includes("thobe") && !p.includes("hoodie")) {
    title = `${prefix.trim()} Luxury Modest Abaya`;
  } else {
    // If user already typed "Black Nidha", append descriptive suffix
    const suffixCandidate = p.endsWith(" ") ? "Luxury Embroidered Collection" : " - Luxury Edition";
    title = `${prefix}${suffixCandidate}`;
  }

  const suffix = extractSuffix(prefix, title);
  const catObj = MARKETPLACE_CATEGORIES.find((c) => c.id === categoryId);
  const subObj = catObj?.subcategories.find((s) => s.id === subcategoryId);

  return {
    suggestion: title,
    suffix,
    cascade: {
      categoryId,
      categoryName: catObj?.name || "ABAYAS",
      subcategoryId,
      subcategoryName: subObj?.name || "Open Front Abayas",
      fitType,
      shortDescription: `Premium ${title.toLowerCase()} tailored with fine attention to modest drape and everyday luxury.`,
      tags,
      careAdvice,
      slug: generateSlug(title),
    },
  };
}

/**
 * 1. Real-Time Inline Title Autocomplete (Gemini 3.8 / 3.5 Flash with LRU Cache & Fallback)
 */
export async function getInlineTitleAutocomplete(
  prefix: string,
  context?: { categoryId?: string | number }
): Promise<AutocompleteResult> {
  const cleanPrefix = prefix.trim();
  if (cleanPrefix.length < 2) {
    return { suggestion: prefix, suffix: "" };
  }

  const cacheKey = `ac_${cleanPrefix.toLowerCase()}_${context?.categoryId || "all"}`;
  const cached = productAutocompleteCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Check if Gemini is configured
  if (!isGeminiConfigured()) {
    const fallback = getHeuristicAutocomplete(cleanPrefix);
    productAutocompleteCache.set(cacheKey, fallback);
    return fallback;
  }

  const prompt = `
Context: E-commerce marketplace "Gazaarabia" (UK modest luxury fashion & heritage).
The seller/admin is typing a product name: "${cleanPrefix}".

Task:
1. Complete this product title into a professional, commercially attractive luxury fashion title.
2. The completion MUST start with the exact typed characters "${cleanPrefix}".
3. CRITICAL INVARIANT: The title MUST be between 10 and 38 characters (strictly under 40 characters).
4. Match it to one of the following category IDs:
   10: ABAYAS (Subcategories: 101 Open Front, 102 Embroidered, 103 Occasion & Luxury, 104 Everyday Modest)
   11: KAFTANS (Subcategories: 105 Moroccan Kaftans, 106 Embroidered, 107 Occasion)
   12: HIJABS & SCARVES (Subcategories: 108 Premium Modal, 109 Chiffon Silk, 110 Everyday Jersey)
   13: DJELLABAS (Subcategories: 111 Hooded, 112 Casual Modest)
   14: MODEST ACTIVEWEAR (Subcategories: 113 Performance Active Sets, 114 Modest Swimwear)
   15: HOODIES & SWEATSHIRTS (Subcategories: 115 Oversized Streetwear, 116 Solidarity Calligraphy)
   16: MEN'S THOBES (Subcategories: 117 Classic White, 118 Slim Fit, 119 Emirati & Omani)
   17: JELLABAS & JUBBAS (Subcategories: 120 Moroccan Men's, 121 Modern Streetwear)
   18: MEN'S ACTIVEWEAR & JERSEYS (Subcategories: 122 Palestine Football Jerseys, 123 Solidarity Athletic)
   19: GIFTS & HERITAGE (Subcategories: 124 Palestinian Tatreez Gifts, 125 Olive Wood Tasbih)
4. Choose appropriate fitType ("Modest / Loose Fit", "A-Line Silhouette", "Tailored Fit", "Oversized Fit", "Regular Fit").
5. Draft a 1-sentence high-converting shortDescription.
6. Generate 5 relevant search tags.

Respond ONLY with valid JSON:
{
  "fullTitle": string,
  "categoryId": number,
  "categoryName": string,
  "subcategoryId": number,
  "subcategoryName": string,
  "fitType": string,
  "shortDescription": string,
  "tags": string[],
  "careAdvice": string
}
`;

  try {
    const response = await generateStructuredJson<{
      fullTitle: string;
      categoryId: number;
      categoryName: string;
      subcategoryId: number;
      subcategoryName: string;
      fitType: string;
      shortDescription: string;
      tags: string[];
      careAdvice?: string;
    }>(prompt, "You are Gazaarabia Product Smart Compose. Fast, concise JSON generator.", 2500);

    if (response && response.fullTitle) {
      let suggestion = response.fullTitle.trim();

      // Ensure title starts with prefix (or prepend prefix if Gemini adjusted casing)
      if (!suggestion.toLowerCase().startsWith(cleanPrefix.toLowerCase())) {
        suggestion = `${cleanPrefix} ${suggestion}`;
      }
      if (suggestion.length > 40) {
        suggestion = suggestion.slice(0, 40).trim();
      }

      const suffix = extractSuffix(cleanPrefix, suggestion);

      const result: AutocompleteResult = {
        suggestion,
        suffix,
        cascade: {
          categoryId: response.categoryId || 10,
          categoryName: response.categoryName || "ABAYAS",
          subcategoryId: response.subcategoryId || 101,
          subcategoryName: response.subcategoryName || "Open Front Abayas",
          fitType: response.fitType || "Modest / Loose Fit",
          shortDescription: response.shortDescription || "",
          tags: Array.isArray(response.tags) ? response.tags.slice(0, 5) : [],
          careAdvice: response.careAdvice || "Dry Clean Recommended",
          slug: generateSlug(suggestion),
        },
      };

      productAutocompleteCache.set(cacheKey, result);
      return result;
    }
  } catch (err) {
    console.warn("[Product AI] Autocomplete inference error, using heuristic:", err);
  }

  // Graceful fallback
  const fallback = getHeuristicAutocomplete(cleanPrefix);
  productAutocompleteCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * 2. Background Field Auto-Cascading Engine
 */
export async function generateProductCascade(
  title: string,
  options?: { costPrice?: number; categoryId?: number }
): Promise<ProductCascadeData> {
  const cleanTitle = title.trim();
  const cacheKey = `cascade_${cleanTitle.toLowerCase()}_${options?.costPrice || 0}`;
  const cached = productCascadeCache.get(cacheKey);
  if (cached) return cached;

  // Fallback baseline
  const heuristic = getHeuristicAutocomplete(cleanTitle);
  let baseCascade: ProductCascadeData = {
    categoryId: heuristic.cascade?.categoryId || 10,
    categoryName: heuristic.cascade?.categoryName || "ABAYAS",
    subcategoryId: heuristic.cascade?.subcategoryId || 101,
    subcategoryName: heuristic.cascade?.subcategoryName || "Open Front Abayas",
    fitType: heuristic.cascade?.fitType || "Modest / Loose Fit",
    shortDescription: heuristic.cascade?.shortDescription || `Luxury ${cleanTitle} designed for modest elegance.`,
    tags: heuristic.cascade?.tags || ["modest fashion", "gazaarabia", "luxury wear"],
    careAdvice: heuristic.cascade?.careAdvice || "Dry Clean Only",
    slug: generateSlug(cleanTitle),
  };

  if (isGeminiConfigured()) {
    const prompt = `
Analyze this completed e-commerce product title for Gazaarabia marketplace:
Title: "${cleanTitle}"
${options?.costPrice ? `Cost Price: £${options.costPrice}` : ""}

Categories & Subcategories:
10 ABAYAS (101 Open Front, 102 Embroidered, 103 Occasion & Luxury, 104 Everyday Modest)
11 KAFTANS (105 Moroccan Kaftans, 106 Embroidered, 107 Occasion)
12 HIJABS & SCARVES (108 Premium Modal, 109 Chiffon Silk, 110 Everyday Jersey)
13 DJELLABAS (111 Hooded, 112 Casual Modest)
14 MODEST ACTIVEWEAR (113 Performance Active Sets, 114 Modest Swimwear)
15 HOODIES & SWEATSHIRTS (115 Oversized Streetwear, 116 Solidarity Calligraphy)
16 MEN'S THOBES (117 Classic White, 118 Slim Fit, 119 Emirati & Omani)
17 JELLABAS & JUBBAS (120 Moroccan Men's, 121 Modern Streetwear)
18 MEN'S ACTIVEWEAR & JERSEYS (122 Palestine Football, 123 Solidarity Athletic)
19 GIFTS & HERITAGE (124 Palestinian Tatreez, 125 Olive Wood Tasbih)

Output JSON:
{
  "categoryId": number,
  "categoryName": string,
  "subcategoryId": number,
  "subcategoryName": string,
  "fitType": "Modest / Loose Fit" | "A-Line Silhouette" | "Tailored Fit" | "Oversized Fit" | "Regular Fit",
  "shortDescription": string (1-2 sentences high converting teaser),
  "tags": string[] (5 exact high-intent search tags),
  "careAdvice": string,
  "recommendedSellingPrice": number (if costPrice provided, calculate ~55-65% gross margin, e.g. cost £30 -> selling £75),
  "recommendedDiscountPrice": number (promotional price e.g. £65),
  "pricingInsight": string
}
`;

    try {
      const aiData = await generateStructuredJson<any>(prompt, "You are Gazaarabia Category & Merchandising Engine.", 3500);
      if (aiData && aiData.categoryId) {
        baseCascade = {
          categoryId: aiData.categoryId,
          categoryName: aiData.categoryName || "ABAYAS",
          subcategoryId: aiData.subcategoryId || 101,
          subcategoryName: aiData.subcategoryName || "Open Front Abayas",
          fitType: aiData.fitType || "Modest / Loose Fit",
          shortDescription: aiData.shortDescription || baseCascade.shortDescription,
          tags: Array.isArray(aiData.tags) && aiData.tags.length > 0 ? aiData.tags.slice(0, 5) : baseCascade.tags,
          careAdvice: aiData.careAdvice || baseCascade.careAdvice,
          slug: generateSlug(cleanTitle),
        };

        if (options?.costPrice && options.costPrice > 0) {
          const recSelling = aiData.recommendedSellingPrice || Math.round(options.costPrice * 2.4);
          const recDiscount = aiData.recommendedDiscountPrice || Math.round(recSelling * 0.88);
          baseCascade.pricing = {
            recommendedSellingPrice: recSelling,
            recommendedDiscountPrice: recDiscount,
            grossMarginPercent: Math.round(((recSelling - options.costPrice) / recSelling) * 100),
            insight: aiData.pricingInsight || `Recommended 55-65% margin based on premium modest apparel standards.`,
          };
        }
      }
    } catch (err) {
      console.warn("[Product AI] Cascade generation error:", err);
    }
  }

  // If cost price provided and no pricing yet, apply standard formula
  if (options?.costPrice && options.costPrice > 0 && !baseCascade.pricing) {
    const cost = options.costPrice;
    const recSelling = Math.round(cost * 2.4);
    const recDiscount = Math.round(recSelling * 0.88);
    baseCascade.pricing = {
      recommendedSellingPrice: recSelling,
      recommendedDiscountPrice: recDiscount,
      grossMarginPercent: Math.round(((recSelling - cost) / recSelling) * 100),
      insight: `Recommended selling price provides a healthy 58% gross margin for marketplace sustainability.`,
    };
  }

  productCascadeCache.set(cacheKey, baseCascade);
  return baseCascade;
}

/**
 * 3. Luxury Fashion Description Drafter (for RichTextEditor / TinyMCE)
 */
export async function generateLuxuryDescription(params: {
  title: string;
  category?: string;
  fitType?: string;
  shortDescription?: string;
  tags?: string[];
}): Promise<string> {
  const { title, category = "Modest Apparel", fitType = "Loose / Modest Fit" } = params;

  if (isGeminiConfigured()) {
    const prompt = `
Create a captivating, high-converting luxury modest fashion product description in clean HTML format.
Product Title: "${title}"
Category: "${category}"
Fit Type: "${fitType}"
Short Description: "${params.shortDescription || ""}"
Keywords: ${params.tags?.join(", ") || "modest luxury, elegant drape, premium"}

Requirements:
- Written with an editorial luxury tone (like Harrods, Ounass, or Net-a-Porter modest edit).
- Structure with clear HTML tags: <h3>, <p>, <ul>, <li>.
- Sections:
  1. <h3>The Design Narrative</h3>: 1-2 evocative paragraphs describing the silhouette, movement, occasion, and elegance.
  2. <h3>Fabric & Craftsmanship</h3>: Details on premium fabric feel, breathability, and bespoke tailoring.
  3. <h3>Modesty & Invariants</h3>: Full opacity, generous sleeve coverage, and relaxed chest silhouette.
  4. <h3>Styling Advice</h3>: How to pair with hijabs, footwear, and jewelry.

Respond ONLY with valid JSON:
{
  "html": string
}
`;

    try {
      const result = await generateStructuredJson<{ html: string }>(
        prompt,
        "You are Gazaarabia's Senior Fashion Editor.",
        4500
      );
      if (result && result.html) {
        return result.html;
      }
    } catch (err) {
      console.warn("[Product AI] Luxury description generation error:", err);
    }
  }

  // Graceful HTML Fallback
  return `
<h3>The Design Narrative</h3>
<p>The <strong>${title}</strong> captures the essence of contemporary modest luxury. Crafted with an uncompromising dedication to graceful drapery and fluid silhouettes, this piece effortlessly transitions from dignified daily engagements to celebratory evening gatherings.</p>

<h3>Fabric & Craftsmanship</h3>
<p>Constructed from select premium-grade textiles known for featherlight breathability, rich color retention, and exquisite hand-feel. Each hem and seam is reinforced by master artisans to ensure longevity and timeless appeal.</p>

<h3>Modesty Invariants</h3>
<ul>
  <li><strong>Complete Opacity:</strong> Zero transparency, eliminating the necessity for heavy layering.</li>
  <li><strong>Generous Coverage:</strong> Tailored according to ${fitType} specifications for confident, relaxed movement.</li>
  <li><strong>Dignified Neckline & Sleeves:</strong> Extended sleeve drape providing seamless wrist and collarbone coverage.</li>
</ul>

<h3>Styling Advice</h3>
<p>Pair with a tonal modal or chiffon wrap and minimalist metallic accents for an effortlessly refined presence.</p>
`.trim();
}

/**
 * 4. Automated SEO & URL Slug Optimization
 */
export async function generateSeoAndSlug(
  title: string,
  shortDescription?: string
): Promise<SeoOptimizationResult> {
  const cleanTitle = title.trim();
  const slug = generateSlug(cleanTitle);

  if (isGeminiConfigured()) {
    const prompt = `
Generate Google SERP optimized SEO metadata for product: "${cleanTitle}".
Short Description context: "${shortDescription || ""}"

Requirements:
1. metaTitle: Under 60 characters, includes brand "Gazaarabia", high CTR.
2. metaDescription: Under 155 characters, includes compelling call to action and keywords (e.g. "UK Fast Delivery", "Ethical Modest Luxury").
3. slug: URL-friendly kebab-case slug without stop words.

Respond ONLY with valid JSON:
{
  "slug": string,
  "metaTitle": string,
  "metaDescription": string
}
`;

    try {
      const seoData = await generateStructuredJson<SeoOptimizationResult>(
        prompt,
        "You are Gazaarabia E-commerce Technical SEO Specialist.",
        3000
      );
      if (seoData && seoData.metaTitle) {
        return {
          slug: seoData.slug || slug,
          metaTitle: seoData.metaTitle.slice(0, 60),
          metaDescription: seoData.metaDescription.slice(0, 155),
        };
      }
    } catch (err) {
      console.warn("[Product AI] SEO generation error:", err);
    }
  }

  return {
    slug,
    metaTitle: `${cleanTitle} | Gazaarabia Luxury Modest Wear`.slice(0, 60),
    metaDescription: `${shortDescription || `Shop the ${cleanTitle} at Gazaarabia. Premium ethical modest fashion with fast UK and international delivery.`}`.slice(0, 155),
  };
}

/**
 * 5. Multi-Lingual Translation (English <-> Arabic)
 */
export async function translateProductContent(params: {
  title?: string;
  shortDescription?: string;
  tags?: string[];
  targetLang: "ar" | "en";
}): Promise<TranslationResult> {
  const { title, shortDescription, tags, targetLang } = params;

  if (isGeminiConfigured()) {
    const prompt = `
Translate the following modest fashion product content into ${targetLang === "ar" ? "fluent, authentic Arabic (Saudi/Gulf & Levantine luxury fashion vocabulary)" : "elegant English"}:
Title: "${title || ""}"
Short Description: "${shortDescription || ""}"
Tags: ${JSON.stringify(tags || [])}

Respond ONLY with valid JSON:
{
  "title": string,
  "shortDescription": string,
  "tags": string[],
  "language": "${targetLang}"
}
`;

    try {
      const res = await generateStructuredJson<TranslationResult>(
        prompt,
        "You are Gazaarabia's Bilingual English/Arabic Fashion Translator.",
        3500
      );
      if (res && (res.title || res.shortDescription)) {
        return res;
      }
    } catch (err) {
      console.warn("[Product AI] Translation error:", err);
    }
  }

  // Heuristic mock translation if offline
  return {
    title: targetLang === "ar" ? `عباية فاخرة - ${title}` : `Luxury Modest - ${title}`,
    shortDescription: shortDescription || "",
    tags: tags || [],
    language: targetLang,
  };
}

/**
 * 6. Smart Pricing & Profit Margin Advisor
 */
export function calculatePricingAdvice(costPrice: number) {
  if (!costPrice || costPrice <= 0) {
    return {
      recommendedSellingPrice: 0,
      recommendedDiscountPrice: 0,
      grossMarginPercent: 0,
      insight: "Please enter a valid cost price to see profit margin recommendations.",
    };
  }

  // 58% - 62% typical luxury margin
  const sellingPrice = Math.round(costPrice * 2.4);
  const discountPrice = Math.round(sellingPrice * 0.88);
  const margin = Math.round(((sellingPrice - costPrice) / sellingPrice) * 100);

  return {
    recommendedSellingPrice: sellingPrice,
    recommendedDiscountPrice: discountPrice,
    grossMarginPercent: margin,
    insight: `Setting selling price to £${sellingPrice} delivers a ${margin}% gross margin (£${sellingPrice - costPrice} profit/unit), providing room for promotional campaigns at £${discountPrice}.`,
  };
}

export interface GuessedProductData {
  title: string;
  categoryId: number;
  categoryName: string;
  subcategoryId: number;
  subcategoryName: string;
  fitType: string;
  shortDescription: string;
  description: string;
  tags: string[];
  primaryColor?: string;
  slug: string;
  careAdvice?: string;
}

/**
 * 7. AI Vision Guess from Product Photograph
 */
export async function guessProductFromImage(
  imageSource: string
): Promise<GuessedProductData | null> {
  try {
    let base64Data = "";
    let mimeType = "image/jpeg";

    if (imageSource.startsWith("data:image/")) {
      const match = imageSource.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      } else {
        base64Data = imageSource.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
      }
    } else if (imageSource.startsWith("/uploads/") || imageSource.startsWith("uploads/")) {
      const cleanPath = imageSource.startsWith("/") ? imageSource.slice(1) : imageSource;
      const fullPath = path.join(process.cwd(), cleanPath);
      const buffer = await fs.promises.readFile(fullPath);
      mimeType = imageSource.endsWith(".png")
        ? "image/png"
        : imageSource.endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";
      base64Data = buffer.toString("base64");
    } else if (imageSource.startsWith("http://") || imageSource.startsWith("https://")) {
      const res = await fetch(imageSource);
      if (!res.ok) return null;
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.startsWith("image/")) {
        mimeType = contentType;
      }
      base64Data = buffer.toString("base64");
    }

    if (!base64Data) return null;

    const prompt = `
Analyze this product photograph for Gazaarabia (luxury UK modest fashion & Palestinian heritage marketplace).
Task: Accurately guess and extract complete product catalog information based on visual appearance.

Match to one of Gazaarabia's exact database categories:
- ID 10: ABAYAS (Subcategories: 101 Open Front Abayas, 102 Embroidered Abayas, 103 Occasion & Luxury Abayas, 104 Everyday Modest Abayas)
- ID 11: KAFTANS (Subcategories: 105 Moroccan Kaftans, 106 Embroidered Kaftans, 107 Occasion Kaftans)
- ID 12: HIJABS & SCARVES (Subcategories: 108 Premium Modal Hijabs, 109 Chiffon Silk Wraps, 110 Everyday Jersey Scarves)
- ID 13: DJELLABAS (Subcategories: 111 Hooded Djellabas, 112 Casual Modest Djellabas)
- ID 14: MODEST ACTIVEWEAR (Subcategories: 113 Performance Active Sets, 114 Modest Swimwear)
- ID 15: HOODIES & SWEATSHIRTS (Subcategories: 115 Oversized Streetwear Hoodies, 116 Solidarity Calligraphy Sweats)
- ID 16: MEN'S THOBES (Subcategories: 117 Classic White Thobes, 118 Slim Fit Tailored Thobes, 119 Emirati & Omani Thobes)
- ID 17: JELLABAS & JUBBAS (Subcategories: 120 Moroccan Men's Jellabas, 121 Modern Streetwear Jubbahs)
- ID 18: MEN'S ACTIVEWEAR & JERSEYS (Subcategories: 122 Palestine Football Jerseys, 123 Solidarity Athletic Wear)
- ID 19: GIFTS & HERITAGE (Subcategories: 124 Palestinian Tatreez Gifts, 125 Olive Wood Tasbih & Beads)

Output Requirements:
1. title: Commercially attractive title, 5 to 7 words, strictly 15 to 38 characters.
2. categoryId: exact ID from list above (10 to 19).
3. categoryName: exact category name.
4. subcategoryId: exact subcategory ID from list above.
5. subcategoryName: exact subcategory name.
6. fitType: "Modest / Loose Fit" | "A-Line Silhouette" | "Tailored Fit" | "Oversized Fit" | "Regular Fit".
7. shortDescription: 1-2 sentences high converting summary.
8. description: HTML formatted luxury description (The Design Narrative, Fabric & Craftsmanship, Modesty Invariants, Styling Advice).
9. tags: array of 5 exact search tags.
10. primaryColor: detected main color (e.g. Black, Navy, Dusty Blue, Emerald, Burgundy, White, Cream).
11. careAdvice: e.g. "Dry Clean Only" or "Gentle Hand Wash".

Respond ONLY with valid JSON:
{
  "title": string,
  "categoryId": number,
  "categoryName": string,
  "subcategoryId": number,
  "subcategoryName": string,
  "fitType": string,
  "shortDescription": string,
  "description": string,
  "tags": string[],
  "primaryColor": string,
  "careAdvice": string
}
`;

    const result = await analyzeImageWithGemini<any>(
      base64Data,
      mimeType,
      prompt,
      "You are Gazaarabia Senior Product Merchandiser and Vision AI Specialist.",
      14000
    );

    if (result && result.title) {
      let title = result.title.trim();
      if (title.length > 38) {
        title = title.slice(0, 38).trim();
      }

      const categoryId = result.categoryId || 10;
      const catObj = MARKETPLACE_CATEGORIES.find((c) => c.id === categoryId);
      const subcategoryId = result.subcategoryId || catObj?.subcategories[0]?.id || 101;
      const subObj = catObj?.subcategories.find((s) => s.id === subcategoryId);

      return {
        title,
        categoryId,
        categoryName: catObj?.name || result.categoryName || "ABAYAS",
        subcategoryId,
        subcategoryName: subObj?.name || result.subcategoryName || "Open Front Abayas",
        fitType: result.fitType || "Modest / Loose Fit",
        shortDescription: result.shortDescription || `Luxury ${title} designed for modest elegance and graceful comfort.`,
        description: result.description || `<h3>The Design Narrative</h3><p>The <strong>${title}</strong> captures the essence of contemporary modest luxury.</p>`,
        tags: Array.isArray(result.tags) && result.tags.length > 0 ? result.tags.slice(0, 5) : ["modest fashion", "gazaarabia"],
        primaryColor: result.primaryColor || "Black",
        slug: generateSlug(title),
        careAdvice: result.careAdvice || "Dry Clean Only",
      };
    }
  } catch (err) {
    console.warn("[guessProductFromImage] Vision analysis error:", err);
  }

  return null;
}
