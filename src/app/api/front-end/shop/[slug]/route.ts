import { NextResponse } from "next/server";
import { getTokenFromHeader, getUserIdFromToken } from "@/lib/authToken";
import { fetchShopData } from "@/lib/server/shopData";

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const { searchParams } = new URL(req.url);

  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 12;

  const getArrayParam = (key: string): string[] => {
    const raw = [
      ...searchParams.getAll(`${key}[]`),
      ...searchParams.getAll(key),
    ];
    return Array.from(
      new Set(
        raw
          .flatMap((v) => v.split(","))
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );
  };

  const filters = {
    q: searchParams.get("q") || "",
    priceMin: Number(searchParams.get("priceMin")) || 0,
    priceMax: Number(searchParams.get("priceMax")) || 100000,
    rating: Number(searchParams.get("rating")) || 0,
    availability: getArrayParam("availability"),
    sizes: getArrayParam("sizes"),
    colors: getArrayParam("colors"),
    subcategories: getArrayParam("subcategories"),
    categories: getArrayParam("categories"),
    sort: searchParams.get("sort") || "new",
  };

  const token = getTokenFromHeader(req);
  const userId = token ? getUserIdFromToken(token) : null;

  try {
    const data = await fetchShopData(slug, page, limit, filters, userId);
    if (!data) {
      return NextResponse.json(
        { error: "Invalid category or subcategory slug" },
        { status: 404 }
      );
    }

    const res = NextResponse.json(data);
    if (!userId) {
      res.headers.set(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=300"
      );
    } else {
      res.headers.set("Cache-Control", "private, no-cache");
    }

    return res;
  } catch (error: any) {
    console.error("Error in shop API route:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop data" },
      { status: 500 }
    );
  }
}
