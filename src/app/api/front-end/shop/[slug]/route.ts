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

  const filters = {
    q: searchParams.get("q") || "",
    priceMin: Number(searchParams.get("priceMin")) || 0,
    priceMax: Number(searchParams.get("priceMax")) || 100000,
    rating: Number(searchParams.get("rating")) || 0,
    availability: searchParams.getAll("availability[]"),
    sizes: searchParams.getAll("sizes[]"),
    colors: searchParams.getAll("colors[]"),
    subcategories: searchParams.getAll("subcategories[]"),
    categories: searchParams.getAll("categories[]"),
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
