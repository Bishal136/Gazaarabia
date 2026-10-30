import { NextResponse } from "next/server";
import { getTokenFromHeader, getUserIdFromToken } from "@/lib/authToken";
import { fetchProductBySlug } from "@/lib/server/productDetails";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  const token = getTokenFromHeader(req);
  const userId = token ? getUserIdFromToken(token) : null;

  try {
    const data = await fetchProductBySlug(slug, userId);
    if (!data) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const res = NextResponse.json(data);
    if (!userId) {
      res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    } else {
      res.headers.set("Cache-Control", "private, no-cache");
    }

    return res;
  } catch (error: any) {
    console.error("Error fetching product by slug:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch product" },
      { status: 500 }
    );
  }
}
