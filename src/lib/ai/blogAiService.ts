import path from "path";
import fs from "fs";
import crypto from "crypto";
import sharp from "sharp";
import {
  generateStructuredJson,
  analyzeImageWithGemini,
  isGeminiConfigured,
} from "./geminiClient";
import {
  BlogCategoryOption,
  GeneratedBlogArticle,
  GeneratedBlogImageResult,
  AiModelOption,
  AVAILABLE_AI_MODELS,
  BlogDraftResponse,
} from "./blogTypes";

export {
  AVAILABLE_AI_MODELS,
  type BlogCategoryOption,
  type GeneratedBlogArticle,
  type GeneratedBlogImageResult,
  type AiModelOption,
  type BlogDraftResponse,
};

const BLOG_EDITORIAL_SYSTEM_INSTRUCTION = `
You are Gazaarabia's Senior Editorial Copilot — an empathetic, authoritative fashion editor and cultural historian for a UK luxury modest fashion and Palestinian heritage platform.

CRITICAL EDITORIAL GUIDELINES (Inspired by "Modest Fashion UK" standard):
1. Tone: Warm, conversational in the chat message; sophisticated, poetic yet commercial in the article (comparable to Vogue Arabia, Harper's Bazaar Modest, or Business of Fashion).
2. Humanitarian & Heritage Compassion: When discussing Gaza, Palestine, Tatreez, or solidarity, maintain deep reverence, emotional resonance, and actionable support advice (e.g. verified charitable initiatives, artisan livelihoods, ethical purchases).
3. Modesty Invariants: Never suggest revealing fits or compromises on modesty. Highlight graceful silhouettes (A-Line, kimono sleeve, relaxed drape, layered elegance).
4. Formatting Standard for Content (Match "Modest Fashion UK" luxury structure):
   - Output clean semantic HTML using <h2>, <h3>, <p>, <blockquote>, <ul>, <li>.
   - Start with an evocative lead paragraph highlighting the significance of the topic.
   - Include a Gazaarabia Mission Callout Box:
     <div class="mission-callout"><p><strong>GAZAARABIA · MODEST FASHION WITH PURPOSE:</strong> Every piece funds verified humanitarian relief and cultural artisan preservation across Gaza and the Muslim Ummah 🇵🇸.</p></div>
   - Include an inspiring pull-quote using <blockquote class="pull-quote"><p>"..."</p></blockquote>.
   - Provide concrete, stylish tips or cultural historical context across 3 to 5 well-developed sub-sections.
   - Conclude with a strong, dignified reflection or call to purposeful action.
   - Do NOT wrap in markdown code blocks (\`\`\`html); return pure HTML string for the content.
5. Title Constraints:
   - 6 to 12 words, captivating, high-fashion editorial.
   - Clean kebab-case slug without stop words.
`;

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * 1. Generate Full Editorial Blog Draft (Conversational + Structured)
 */
export async function generateBlogDraft(input: {
  prompt?: string;
  currentTitle?: string;
  categoryOptions?: BlogCategoryOption[];
  generateImage?: boolean;
  model?: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<BlogDraftResponse | null> {
  if (!isGeminiConfigured()) return null;

  const categories = input.categoryOptions || [];
  const catListStr = categories.length > 0
    ? categories.map((c) => `- ID ${c.id}: ${c.name}`).join("\n")
    : "- ID 1: Islamic Fashion & Culture\n- ID 2: Modest Lifestyle & Trends\n- ID 3: Palestinian Heritage & Tatreez\n- ID 4: Community & Solidarity";

  const userGoal = input.prompt?.trim() || input.currentTitle?.trim() || "Modest fashion luxury styling and cultural elegance";
  
  const historySnippet = (input.conversationHistory || [])
    .slice(-4)
    .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`)
    .join("\n");

  const prompt = `
Task: Act as an intelligent conversational AI Copilot. Respond to the user's request and draft a complete, publish-ready blog article for Gazaarabia.
${historySnippet ? `Recent Conversation Context:\n${historySnippet}\n` : ""}
Latest User Message: "${userGoal}"

Available Blog Categories in Gazaarabia Database:
${catListStr}

JSON Output Schema:
{
  "botMessage": "Natural conversational response to the user explaining what you drafted, highlighting key sections or how it fulfills their request (2-4 sentences)",
  "title": "Editorial title, 6-12 words, engaging and refined",
  "slug": "url-friendly-kebab-case-slug",
  "categoryId": (number matching one of the available category IDs above),
  "categoryName": "name of matched category",
  "excerpt": "Compelling 1-2 sentence meta teaser summary (~150 chars)",
  "htmlContent": "Structured HTML with <h2>, <h3>, <p>, <blockquote>, <ul>, <li> tags covering the narrative, actionable guidance, and cultural depth.",
  "suggestedImagePrompt": "A detailed, cinematic, photorealistic prompt for generating a 16:9 high-fashion magazine cover photo matching this article",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}
`;

  const selectedModel = input.model || "gemini-4-hydrogen";

  const result = await generateStructuredJson<any>(
    prompt,
    BLOG_EDITORIAL_SYSTEM_INSTRUCTION,
    22000,
    selectedModel
  );

  if (!result || !result.title) return null;

  let generatedImageUrl: string | undefined = undefined;
  if (input.generateImage && result.suggestedImagePrompt) {
    try {
      const imgRes = await generateBlogCoverImage(result.suggestedImagePrompt, result.title);
      if (imgRes) generatedImageUrl = imgRes.imageUrl;
    } catch (e) {
      console.warn("[blogAiService] Auto-image generation error:", e);
    }
  }

  const article: GeneratedBlogArticle = {
    title: String(result.title).trim(),
    slug: generateSlug(result.slug || result.title),
    categoryId: result.categoryId ? Number(result.categoryId) : undefined,
    categoryName: result.categoryName,
    excerpt: result.excerpt || "",
    htmlContent: result.htmlContent || `<p>${result.title}</p>`,
    suggestedImagePrompt: result.suggestedImagePrompt || "",
    generatedImageUrl,
    tags: Array.isArray(result.tags) ? result.tags.slice(0, 6) : [],
  };

  const botMessage = result.botMessage || `I've prepared a complete editorial draft for "${article.title}". You can review the details below and apply them directly to your form with one click!`;

  return { article, botMessage };
}

/**
 * 2. Generate Photorealistic Editorial Cover Image via Google Gemini API
 */
export async function generateBlogCoverImage(
  imagePrompt: string,
  title?: string
): Promise<GeneratedBlogImageResult | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const refinedPrompt = `Editorial high-fashion 16:9 magazine cover photograph for Gazaarabia: ${imagePrompt}. Style: cinematic lighting, luxury modest fashion or authentic cultural heritage, soft architectural studio backdrop, photorealistic, 8k resolution, elegant, high detail, no text overlays, no watermarks.`;

  const modelsToTry = [
    "gemini-2.5-flash-image",
    "gemini-3.1-flash-image",
    "gemini-3-pro-image",
  ];

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: refinedPrompt }] }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn(`[generateBlogCoverImage] Model ${model} returned ${res.status}`);
        continue;
      }

      const data = await res.json();
      const inlinePart = data.candidates?.[0]?.content?.parts?.find(
        (p: any) => p.inlineData && p.inlineData.data
      );

      if (!inlinePart) {
        console.warn(`[generateBlogCoverImage] Model ${model} returned no inlineData`);
        continue;
      }

      const base64Data = inlinePart.inlineData.data;
      const rawBuffer = Buffer.from(base64Data, "base64");

      // Save to public/uploads/blogs
      const uploadDir = path.join(process.cwd(), "public/uploads/blogs");
      await fs.promises.mkdir(uploadDir, { recursive: true });

      const randomSuffix = crypto.randomBytes(4).toString("hex");
      const filename = `ai-blog-${Date.now()}-${randomSuffix}.webp`;
      const fullPath = path.join(uploadDir, filename);

      try {
        await sharp(rawBuffer)
          .webp({ quality: 85 })
          .toFile(fullPath);
      } catch {
        const pngFilename = `ai-blog-${Date.now()}-${randomSuffix}.png`;
        const pngPath = path.join(uploadDir, pngFilename);
        await fs.promises.writeFile(pngPath, rawBuffer);
        return {
          imageUrl: `/uploads/blogs/${pngFilename}`,
          altText: title ? `Editorial cover photo for ${title}` : "AI generated modest fashion blog cover",
          promptUsed: refinedPrompt,
        };
      }

      return {
        imageUrl: `/uploads/blogs/${filename}`,
        altText: title ? `Editorial cover photo for ${title}` : "AI generated modest fashion blog cover",
        promptUsed: refinedPrompt,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn(`[generateBlogCoverImage] Model ${model} error:`, err?.message || err);
    }
  }

  return null;
}

/**
 * 3. Multimodal Vision: Analyze Uploaded Image and Draft Matching Blog
 */
export async function analyzeImageAndDraftBlog(
  imageSource: string,
  categoryOptions?: BlogCategoryOption[],
  model?: string
): Promise<BlogDraftResponse | null> {
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

    const categories = categoryOptions || [];
    const catListStr = categories.length > 0
      ? categories.map((c) => `- ID ${c.id}: ${c.name}`).join("\n")
      : "- ID 1: Islamic Fashion & Culture\n- ID 2: Modest Lifestyle & Trends\n- ID 3: Palestinian Heritage & Tatreez";

    const prompt = `
Analyze this photograph for Gazaarabia (luxury UK modest fashion & Palestinian heritage platform).
Visually inspect the garment, fabric, embroidery motif, silhouette, and aesthetic setting.

Write an authoritative, engaging, high-fashion editorial blog post celebrating the subject of this image.

Available Blog Categories:
${catListStr}

JSON Output Schema:
{
  "botMessage": "Conversational reply explaining what you recognized in the image and how you shaped the editorial story around it",
  "title": "Captivating editorial title directly describing the subject of the photo, 6-12 words",
  "slug": "kebab-case-slug",
  "categoryId": (number matching one of the available category IDs above),
  "categoryName": "name of matched category",
  "excerpt": "Engaging 1-2 sentence meta teaser summary (~150 chars)",
  "htmlContent": "Rich HTML content (<h2>, <h3>, <p>, <blockquote>, <ul>, <li>) analyzing the visual craftsmanship, cultural meaning, and styling advice for this piece.",
  "suggestedImagePrompt": "Concise summary of the visual details in the photo",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}
`;

    const selectedModel = model || "gemini-4-hydrogen";

    const result = await analyzeImageWithGemini<any>(
      base64Data,
      mimeType,
      prompt,
      BLOG_EDITORIAL_SYSTEM_INSTRUCTION,
      22000,
      selectedModel
    );

    if (!result || !result.title) return null;

    const article: GeneratedBlogArticle = {
      title: String(result.title).trim(),
      slug: generateSlug(result.slug || result.title),
      categoryId: result.categoryId ? Number(result.categoryId) : undefined,
      categoryName: result.categoryName,
      excerpt: result.excerpt || "",
      htmlContent: result.htmlContent || `<p>${result.title}</p>`,
      suggestedImagePrompt: result.suggestedImagePrompt || "",
      generatedImageUrl: imageSource.startsWith("data:") ? undefined : imageSource,
      tags: Array.isArray(result.tags) ? result.tags.slice(0, 6) : [],
    };

    const botMessage = result.botMessage || `I've inspected the uploaded image and crafted a dedicated editorial draft around it. You can see the full story below and apply it to the form!`;

    return { article, botMessage };
  } catch (err) {
    console.warn("[analyzeImageAndDraftBlog] Vision error:", err);
    return null;
  }
}
