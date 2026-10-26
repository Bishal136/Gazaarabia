import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";
// @ts-ignore
import { sendVendorOnboardingEmail1 } from "@/lib/helpers/emailVendorOnboarding";

// APPROVE SELLER (Admin only)
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!user.role || user.role.name.toLowerCase() !== "admin") {
      return NextResponse.json({ message: "Forbidden: Admin only" }, { status: 403 });
    }

    const { sellerId, commission = 15 } = await req.json();
    if (!sellerId) {
      return NextResponse.json({ message: "sellerId required" }, { status: 400 });
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ message: "Database not connected" }, { status: 500 });
    }

    const seller = await db.collection("sellers").findOne({ id: Number(sellerId) });
    if (!seller) {
      return NextResponse.json({ message: "Seller not found" }, { status: 404 });
    }

    await db.collection("sellers").updateOne(
      { id: Number(sellerId) },
      {
        $set: {
          isActive: 1,
          status: "active",
          commissionValue: commission,
          updatedAt: new Date(),
        },
      }
    );

    const sellerUser = await db.collection("users").findOne({ id: seller.userId });

    if (sellerUser?.email) {
      try {
        await sendVendorOnboardingEmail1({
          to: sellerUser.email,
          vendorName: seller.shopName || sellerUser.name,
          commission: commission,
        });
      } catch (err) {
        console.error("Vendor onboarding email failed:", err);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Seller approved successfully",
    });
  } catch (error: any) {
    console.error("Approve seller error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
