import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

let cachedOptions: { data: any; expiry: number } | null = null;
const OPTIONS_CACHE_TTL_MS = 120 * 1000; // 2 minutes

export async function GET() {
  const now = Date.now();
  if (cachedOptions && now < cachedOptions.expiry) {
    const res = NextResponse.json(cachedOptions.data);
    res.headers.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=600");
    return res;
  }

  try {
    const [colors, sizes, categories, subcategories] = await Promise.all([
      prisma.colors.findMany({
        select: { id: true, name: true, hexCode: true },
        orderBy: { name: "asc" },
      }),
      prisma.sizes.findMany({
        select: { id: true, name: true, value: true },
        orderBy: { name: "asc" },
      }),
      prisma.categories.findMany({
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      }),
      prisma.subcategory.findMany({
        select: { id: true, name: true, slug: true, categoryId: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const payload = {
      success: true,
      data: {
        colors,
        sizes,
        categories,
        subcategories,
      },
    };

    cachedOptions = {
      data: payload,
      expiry: Date.now() + OPTIONS_CACHE_TTL_MS,
    };

    const res = NextResponse.json(payload);
    res.headers.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=600");
    return res;
  } catch (error) {
    console.error("Product meta fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch product options" },
      { status: 500 }
    );
  }
}
