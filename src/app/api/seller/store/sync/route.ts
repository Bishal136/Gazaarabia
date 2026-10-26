// app/api/seller/store/sync/route.ts

import { NextRequest, NextResponse } from "next/server";
import { syncSellerProducts } from "@/lib/syncEngine";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!user.role || user.role.name.toLowerCase() !== "seller") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ message: "Database not connected" }, { status: 500 });
    }

    const { sellerId }: { sellerId: number } = await req.json();

    const seller = await db.collection("sellers").findOne({ id: sellerId });
    if (!seller || seller.userId !== user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const result = await syncSellerProducts(sellerId, "manual");

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST Store Sync Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
