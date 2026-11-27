import { NextResponse } from "next/server";
import { prisma as rawPrisma } from "@/lib/prisma";
import { getTokenFromHeader, getUserIdFromToken } from "@/lib/authToken";

const prisma: any = rawPrisma;

// NOTE: Prefer /api/affiliates/me/bank-details for new work. This route is kept
// for backwards compatibility and enforces the same affiliate-role check.
async function resolveAffiliateSession(req: Request) {
  const token = getTokenFromHeader(req);
  const userId = token ? getUserIdFromToken(token) : null;

  if (!userId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const numericUserId = Number(userId);
  const [user, affiliate] = await Promise.all([
    prisma.users.findUnique({
      where: { id: numericUserId },
      include: { role: true },
    }),
    prisma.affiliate.findUnique({
      where: { userId: numericUserId },
      select: { id: true },
    }),
  ]);

  if (!user || user.role?.name?.toLowerCase() !== "affiliate") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { affiliate };
}

export async function GET(req: Request) {
  try {
    const { affiliate, error } = await resolveAffiliateSession(req);
    if (error) return error;

    const bankAccount = affiliate
      ? await prisma.affiliateBankAccount.findFirst({
          where: { affiliateId: affiliate.id },
        })
      : null;

    return NextResponse.json({ success: true, data: bankAccount });
  } catch (error) {
    console.error("Bank account fetch error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { affiliate, error } = await resolveAffiliateSession(req);
    if (error) return error;

    if (!affiliate) {
      return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });
    }

    const body = await req.json();
    const { accountName, accountNumber, sortCode, iban, paypalEmail } = body;

    const bankAccount = await prisma.affiliateBankAccount.upsert({
      where: { affiliateId: affiliate.id },
      update: {
        accountName,
        accountNumber,
        sortCode,
        iban,
        paypalEmail,
      },
      create: {
        affiliateId: affiliate.id,
        accountName,
        accountNumber,
        sortCode,
        iban,
        paypalEmail,
      },
    });

    return NextResponse.json({ success: true, data: bankAccount });
  } catch (error) {
    console.error("Bank account save error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
