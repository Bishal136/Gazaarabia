import { NextRequest, NextResponse } from "next/server";
import { prisma as rawPrisma } from "@/lib/prisma";
import { getTokenFromHeader, getUserIdFromToken } from "@/lib/authToken";

const prisma: any = rawPrisma;

async function resolveAffiliateContext(req: NextRequest) {
  const token = getTokenFromHeader(req);
  if (!token) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  const userId = getUserIdFromToken(token);
  if (!userId) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
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
    return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }

  if (!affiliate) {
    return {
      error: NextResponse.json(
        { message: "Affiliate profile not found" },
        { status: 404 }
      ),
    };
  }

  return { affiliate };
}

export async function GET(req: NextRequest) {
  try {
    const { affiliate, error } = await resolveAffiliateContext(req);
    if (error) return error;

    const bankAccount = await prisma.affiliateBankAccount.findFirst({
      where: { affiliateId: affiliate!.id },
      select: {
        accountName: true,
        accountNumber: true,
        sortCode: true,
        iban: true,
        paypalEmail: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: affiliate!.id,
        bankAccount: bankAccount || null,
      },
    });
  } catch (error) {
    console.error("GET BANK DETAILS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch bank details" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { affiliate, error } = await resolveAffiliateContext(req);
    if (error) return error;

    const { accountName, accountNumber, sortCode, iban, paypalEmail } =
      await req.json();

    const bankAccount = await prisma.affiliateBankAccount.upsert({
      where: { affiliateId: affiliate!.id },
      update: {
        accountName,
        accountNumber,
        sortCode,
        iban,
        paypalEmail,
      },
      create: {
        affiliateId: affiliate!.id,
        accountName,
        accountNumber,
        sortCode: sortCode || undefined,
        iban: iban || undefined,
        paypalEmail: paypalEmail || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Bank details updated successfully",
      data: bankAccount,
    });
  } catch (error) {
    console.error("UPDATE BANK DETAILS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update bank details" },
      { status: 500 }
    );
  }
}
