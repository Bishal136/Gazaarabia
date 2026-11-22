import { NextRequest, NextResponse } from "next/server";
import {
  generateBlogDraft,
  generateBlogCoverImage,
  analyzeImageAndDraftBlog,
  AVAILABLE_AI_MODELS,
} from "@/lib/ai/blogAiService";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/authToken";

export const dynamic = "force-dynamic";

// In-Memory sliding window rate limiter: 60 requests / minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string, limit = 60, windowMs = 60 * 1000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (!checkRateLimit(`blog_copilot_${ip}`, 60, 60 * 1000)) {
      return NextResponse.json(
        { success: false, message: "Too many AI requests. Please slow down." },
        { status: 429 }
      );
    }

    const userId = await checkAuth(req);
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    const allowedRoles = ["admin", "content_manager"];
    if (!user || !allowedRoles.includes(user.role.name.toLowerCase())) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, data = {} } = body;

    // Load available categories if needed
    let categoryOptions = data.categoryOptions;
    if (!categoryOptions || !Array.isArray(categoryOptions) || categoryOptions.length === 0) {
      try {
        const dbCats = await prisma.blogCategories.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        });
        categoryOptions = dbCats;
      } catch {
        categoryOptions = [];
      }
    }

    switch (action) {
      case "generate-article": {
        const prompt = typeof data.prompt === "string" ? data.prompt.trim() : "";
        const currentTitle = typeof data.currentTitle === "string" ? data.currentTitle.trim() : "";
        const generateImage = Boolean(data.generateImage);
        const model = typeof data.model === "string" ? data.model : undefined;
        const conversationHistory = Array.isArray(data.conversationHistory) ? data.conversationHistory : undefined;

        if (!prompt && !currentTitle) {
          return NextResponse.json(
            { success: false, message: "Prompt or current title is required." },
            { status: 400 }
          );
        }

        const draftResult = await generateBlogDraft({
          prompt,
          currentTitle,
          categoryOptions,
          generateImage,
          model,
          conversationHistory,
        });

        if (!draftResult) {
          return NextResponse.json(
            { success: false, message: "Unable to generate article draft. Please try again." },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          article: draftResult.article,
          botMessage: draftResult.botMessage,
        });
      }

      case "generate-image": {
        const prompt = typeof data.prompt === "string" ? data.prompt.trim() : "";
        const title = typeof data.title === "string" ? data.title.trim() : "";

        if (!prompt && !title) {
          return NextResponse.json(
            { success: false, message: "Image prompt or blog title is required." },
            { status: 400 }
          );
        }

        const effectivePrompt = prompt || `Photorealistic modest fashion editorial cover image for blog titled: "${title}"`;
        const result = await generateBlogCoverImage(effectivePrompt, title);

        if (!result) {
          return NextResponse.json(
            { success: false, message: "Image generation failed. Please try a different prompt or upload a photo." },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, ...result });
      }

      case "image-to-blog": {
        const imageUrl = typeof data.imageUrl === "string" ? data.imageUrl.trim() : "";
        const model = typeof data.model === "string" ? data.model : undefined;

        if (!imageUrl) {
          return NextResponse.json(
            { success: false, message: "Image URL or data is required for vision inspection." },
            { status: 400 }
          );
        }

        const draftResult = await analyzeImageAndDraftBlog(imageUrl, categoryOptions, model);
        if (!draftResult) {
          return NextResponse.json(
            { success: false, message: "Vision analysis failed to extract garment details." },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          article: draftResult.article,
          botMessage: draftResult.botMessage,
        });
      }

      case "get-models": {
        return NextResponse.json({ success: true, models: AVAILABLE_AI_MODELS });
      }

      case "optimize-seo": {
        const title = typeof data.title === "string" ? data.title.trim() : "";
        if (!title) {
          return NextResponse.json(
            { success: false, message: "Title is required for SEO slug optimization." },
            { status: 400 }
          );
        }

        const cleanSlug = title
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\b(a|an|the|in|on|at|of|for|to|with|and|or|by)\b/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");

        return NextResponse.json({ success: true, slug: cleanSlug });
      }

      default:
        return NextResponse.json(
          { success: false, message: `Unsupported action '${action}'` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error("[blog-copilot route error]:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
