// app/api/seller/store/status/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

export async function GET(req: NextRequest) {
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

    const seller = await db.collection("sellers").findOne({ userId: user.id });
    if (!seller) {
      return NextResponse.json({ error: "Seller profile not found" }, { status: 404 });
    }

    const origin = process.env.APP_URL ?? req.nextUrl.origin;
    const wooWebhookUrl = `${origin}/api/webhooks/woocommerce?sellerId=${seller.id}`;

    return NextResponse.json({
      id: seller.id,
      storeType: seller.storeType || null,
      wooSiteUrl: seller.wooSiteUrl || null,
      wooConsumerKey: seller.wooConsumerKey || null,
      wooConsumerSecret: seller.wooConsumerSecret || null,
      lastSyncedAt: seller.lastSyncedAt || null,
      wooWebhookUrl,
    });
  } catch (error: any) {
    console.error("GET Store Status Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
