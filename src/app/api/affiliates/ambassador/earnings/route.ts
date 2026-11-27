import { NextRequest, NextResponse } from "next/server";
import { prisma as rawPrisma } from "@/lib/prisma";
import { getTokenFromHeader, getUserIdFromToken } from "@/lib/authToken";

const prisma: any = rawPrisma;

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req);
    const userId = token ? getUserIdFromToken(token) : null;

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const ambassador = await prisma.affiliate.findUnique({
      where: { userId: Number(userId) },
      select: { id: true, type: true },
    });

    if (!ambassador || ambassador.type !== "ambassador") {
      return NextResponse.json({ message: "Not an ambassador" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const month = searchParams.get("month");

    const filters: Record<string, any> = { ambassadorId: ambassador.id };

    if (status === "paid") filters.isPaid = true;
    if (status === "pending") filters.isPaid = false;
    if (month && month !== "all") filters.monthLabel = month;

    const invoices = await prisma.ambassadorInvoice.findMany({
      where: filters,
      orderBy: { createdAt: "desc" },
    });

    let totalEarned = 0;
    let totalPaid = 0;
    for (const inv of invoices) {
      const amount = Number(inv.totalAmount) || 0;
      totalEarned += amount;
      if (inv.isPaid) {
        totalPaid += amount;
      }
    }
    const totalPending = totalEarned - totalPaid;

    return NextResponse.json({
      success: true,
      data: {
        invoices,
        summary: {
          totalEarned,
          totalPaid,
          totalPending,
        },
      },
    });
  } catch (err) {
    console.error("Ambassador Earnings Error:", err);
    return NextResponse.json(
      { message: "Failed to fetch ambassador earnings" },
      { status: 500 }
    );
  }
}
