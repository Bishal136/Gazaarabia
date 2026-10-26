// app/api/seller/store/connect/route.ts

import { NextRequest, NextResponse } from "next/server";
import type { StoreType } from "@/types/store";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

interface ConnectBody {
  sellerId: number;
  storeType: StoreType;
  credentials: {
    domain?: string;
    accessToken?: string;
    siteUrl?: string;
    consumerKey?: string;
    consumerSecret?: string;
  };
}

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

    const body: ConnectBody = await req.json();
    const { sellerId, storeType, credentials } = body;

    const seller = await db.collection("sellers").findOne({ id: sellerId });
    if (!seller || seller.userId !== user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (storeType === "shopify") {
      return NextResponse.json(
        { error: "Shopify must be connected via the Shopify App install flow." },
        { status: 400 }
      );
    }

    if (storeType === "woocommerce") {
      const { siteUrl, consumerKey, consumerSecret } = credentials;
      if (!siteUrl || !consumerKey || !consumerSecret) {
        return NextResponse.json(
          { error: "siteUrl, consumerKey, and consumerSecret are required for WooCommerce." },
          { status: 400 }
        );
      }

      await db.collection("sellers").updateOne(
        { id: sellerId },
        {
          $set: {
            storeType: "woocommerce",
            wooSiteUrl: siteUrl.replace(/\/+$/, ""),
            wooConsumerKey: consumerKey.trim(),
            wooConsumerSecret: consumerSecret.trim(),
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.json({ success: true, message: "WooCommerce credentials saved." });
    }

    return NextResponse.json({ error: `Unsupported store type: ${storeType}` }, { status: 400 });
  } catch (error: any) {
    console.error("POST Store Connect Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
