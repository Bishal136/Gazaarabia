import { NextResponse } from "next/server";
import { fetchHeaderData } from "@/lib/server/header";

export async function GET() {
  try {
    const payload = await fetchHeaderData();

    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Database not connected" },
        { status: 500 }
      );
    }

    const res = NextResponse.json(payload);
    res.headers.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    return res;
  } catch (error: any) {
    console.error("Header API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load header data" },
      { status: 500 }
    );
  }
}
