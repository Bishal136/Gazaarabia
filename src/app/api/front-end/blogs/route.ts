import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

//  GET - Protected (List all blogs with optional filters)
export async function GET(request: NextRequest) {

  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");

    const where: any = {};

    if (categoryId && categoryId !== "all") {
      where.categoryId = Number(categoryId);
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    const blogs = await prisma.blogs.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });

    const res = NextResponse.json({ success: true, data: blogs });
    res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res;
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return NextResponse.json({ error: "Failed to fetch blogs" }, { status: 500 });
  }
}


