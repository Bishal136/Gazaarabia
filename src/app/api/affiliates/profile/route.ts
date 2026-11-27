import { NextRequest, NextResponse } from "next/server";
import { prisma as rawPrisma } from "@/lib/prisma";
import { getTokenFromHeader, getUserIdFromToken } from "@/lib/authToken";
import { MAX_COMMISSION } from "@/lib/validation/commission";

const prisma: any = rawPrisma;

function getAuthenticatedUserId(req: NextRequest): number | null {
  const token = getTokenFromHeader(req);
  return token ? getUserIdFromToken(token) : null;
}

export async function GET(req: NextRequest) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const numericUserId = Number(userId);
    const [user, affiliate] = await Promise.all([
      prisma.users.findUnique({
        where: { id: numericUserId },
        select: { name: true, email: true },
      }),
      prisma.affiliate.findUnique({
        where: { userId: numericUserId },
      }),
    ]);

    if (!affiliate) {
      return NextResponse.json({ message: "Affiliate account not found" }, { status: 404 });
    }

    // Calculate earnings summary
    const invoices = await prisma.affiliateInvoice.findMany({
      where: { affiliateId: affiliate.id },
      select: { totalAmount: true, isPaid: true },
    });

    let totalEarned = 0;
    let pending = 0;
    for (const inv of invoices) {
      const amount = Number(inv.totalAmount) || 0;
      totalEarned += amount;
      if (!inv.isPaid) {
        pending += amount;
      }
    }
    const paid = totalEarned - pending;

    return NextResponse.json({
      success: true,
      data: {
        name: user?.name ?? "",
        email: user?.email ?? "",
        baseCommission: affiliate.baseCommission,
        shareCommission: affiliate.shareCommission,
        referralCode: affiliate.referralCode,
        totalEarned,
        paid,
        pending,
        joinedAt: affiliate.createdAt,
      },
    });
  } catch (err) {
    console.error("Affiliate Profile Error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId: Number(userId) },
    });

    if (!affiliate) {
      return NextResponse.json(
        { message: "Only affiliates can update settings" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const shareCommissionRaw = body.shareCommission;

    if (shareCommissionRaw === undefined || shareCommissionRaw === null) {
      return NextResponse.json(
        { message: "shareCommission is required" },
        { status: 400 }
      );
    }

    const shareCommission = Number(shareCommissionRaw);
    if (Number.isNaN(shareCommission)) {
      return NextResponse.json(
        { message: "shareCommission must be a valid number" },
        { status: 400 }
      );
    }

    // Global bound (0..MAX_COMMISSION)
    if (shareCommission < 0 || shareCommission > MAX_COMMISSION) {
      return NextResponse.json(
        { message: `shareCommission must be between 0 and ${MAX_COMMISSION}%` },
        { status: 400 }
      );
    }

    // Cannot exceed baseCommission
    const baseCommission = Number(affiliate.baseCommission ?? 0);
    if (shareCommission > baseCommission) {
      return NextResponse.json(
        { message: `shareCommission cannot be greater than your baseCommission (${baseCommission}%)` },
        { status: 400 }
      );
    }

    const updated = await prisma.affiliate.update({
      where: { id: affiliate.id },
      data: { shareCommission: Number(shareCommission) },
      select: {
        id: true,
        shareCommission: true,
        baseCommission: true,
        userId: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Share commission updated successfully",
      data: updated,
    });
  } catch (err: any) {
    console.error("Affiliate Update Error:", err);
    return NextResponse.json(
      { message: "Server error", error: err?.message || err },
      { status: 500 }
    );
  }
}
