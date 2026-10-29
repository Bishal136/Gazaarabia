import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const categories = await prisma.blogCategories.findMany({
            orderBy: { createdAt: "desc" },
        });

        const res = NextResponse.json({ success: true, data: categories });
        res.headers.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=600");
        return res;
    } catch (error) {
        console.error("GET Categories Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch categories." },
            { status: 500 }
        );
    }
}
