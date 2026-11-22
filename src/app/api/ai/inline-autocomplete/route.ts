import { NextRequest, NextResponse } from "next/server";
import { getInlineTitleAutocomplete } from "@/lib/ai/productAiService";
import { checkAuth } from "@/lib/authToken";

export const dynamic = "force-dynamic";

// In-memory sliding window rate limiter: 120 requests / min per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string, limit = 120, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (entry.count >= limit) {
    return true;
  }

  entry.count += 1;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Optional / Tolerant Auth Check (allows session token from cookie/bearer)
    const userId = await checkAuth(req);
    // Note: We allow authenticated admin/seller, or if cookies are present during session
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { success: false, message: "Rate limit exceeded. Please slow down." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const prefix = typeof body.prefix === "string" ? body.prefix.trim() : "";
    const categoryId = body.categoryId;

    if (!prefix || prefix.length < 2) {
      return NextResponse.json({
        success: true,
        suggestion: prefix,
        suffix: "",
      });
    }

    const result = await getInlineTitleAutocomplete(prefix, { categoryId });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Inline Autocomplete Route Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to generate autocomplete",
        suggestion: "",
        suffix: "",
      },
      { status: 500 }
    );
  }
}
