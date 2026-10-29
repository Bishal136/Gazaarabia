import { NextResponse } from "next/server";
import { fetchHomepageData } from "@/lib/server/homepage";

export async function GET() {
  try {
    const data = await fetchHomepageData();

    const response = NextResponse.json({
      success: true,
      data,
    });

    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300"
    );

    return response;
  } catch (error: any) {
    console.error("PUBLIC HOMEPAGE ERROR:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
