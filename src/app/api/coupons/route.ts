import { NextResponse } from "next/server";
import { prisma as rawPrisma } from "@/lib/prisma";
import { connectToDatabase, mongoose } from "@/lib/mongoose";
import { getTokenFromHeader, getUserIdFromToken } from "@/lib/authToken";

const prisma: any = rawPrisma;

function getCreatorIdFromRequest(req: Request): number | null {
  const token = getTokenFromHeader(req);
  return token ? getUserIdFromToken(token) : null;
}

export async function POST(req: Request) {
  try {
    const creatorId = getCreatorIdFromRequest(req);
    if (!creatorId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const {
      code,
      discountType = "percentage",
      discountValue,
      affiliateId,
      maxUsage,
      perUserLimit,
      minOrderAmount,
      startDate,
      endDate,
      isActive = true,
    } = await req.json();

    if (!code || !discountValue) {
      return NextResponse.json(
        { message: "Coupon code and discount value are required." },
        { status: 400 }
      );
    }

    const numericCreatorId = Number(creatorId);
    const [existing, user, userAffiliate, targetAffiliate] = await Promise.all([
      prisma.coupon.findUnique({ where: { code } }),
      prisma.users.findUnique({
        where: { id: numericCreatorId },
        include: { role: true },
      }),
      prisma.affiliate.findUnique({
        where: { userId: numericCreatorId },
      }),
      affiliateId
        ? prisma.affiliate.findUnique({ where: { id: Number(affiliateId) } })
        : Promise.resolve(null),
    ]);

    if (existing) {
      return NextResponse.json(
        { message: "Coupon code already exists." },
        { status: 400 }
      );
    }

    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const roleName = user.role?.name?.toLowerCase();
    if (roleName !== "admin" && roleName !== "affiliate") {
      return NextResponse.json(
        { message: "You are not authorized to create coupons." },
        { status: 403 }
      );
    }

    let resolvedAffiliateId: number | null = null;

    if (roleName === "affiliate") {
      if (!userAffiliate || !userAffiliate.isActive) {
        return NextResponse.json(
          { message: "Affiliate account inactive or not found." },
          { status: 403 }
        );
      }
      resolvedAffiliateId = userAffiliate.id;

      const baseLimit = userAffiliate.baseCommission;
      const numericDiscount = Number(discountValue);

      if (
        numericDiscount > baseLimit &&
        (discountType === "percentage" || discountType === "fixed")
      ) {
        const message =
          discountType === "percentage"
            ? `You cannot create a coupon above your base commission limit (${baseLimit}%).`
            : `You cannot create a fixed discount coupon above your base commission (£${baseLimit.toFixed(
                2
              )}).`;
        return NextResponse.json({ message }, { status: 403 });
      }
    }

    if (roleName === "admin" && affiliateId) {
      if (!targetAffiliate) {
        return NextResponse.json(
          { message: "Invalid affiliate selected." },
          { status: 400 }
        );
      }
      resolvedAffiliateId = Number(affiliateId);
    }

    const coupon = await prisma.coupon.create({
      data: {
        code,
        discountType,
        discountValue: Number(discountValue),
        affiliateId: resolvedAffiliateId,
        creatorId: numericCreatorId,
        maxUsage: maxUsage ? Number(maxUsage) : null,
        perUserLimit: perUserLimit ? Number(perUserLimit) : 1,
        minOrderAmount: minOrderAmount ? Number(minOrderAmount) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isActive: Boolean(isActive),
      },
    });

    return NextResponse.json(
      { message: "Coupon created successfully", coupon },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Coupon creation error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const creatorId = getCreatorIdFromRequest(req);
    if (!creatorId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const numericCreatorId = Number(creatorId);
    const [user, userAffiliate, rawCoupons] = await Promise.all([
      prisma.users.findUnique({
        where: { id: numericCreatorId },
        include: { role: true },
      }),
      prisma.affiliate.findUnique({
        where: { userId: numericCreatorId },
      }),
      prisma.coupon.findMany({
        where: { creatorId: numericCreatorId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const roleName = user.role?.name?.toLowerCase();

    if (roleName !== "admin" && roleName !== "affiliate") {
      return NextResponse.json(
        { message: "You are not authorized to view coupons." },
        { status: 403 }
      );
    }

    if (roleName === "affiliate" && !userAffiliate?.isActive) {
      return NextResponse.json(
        { message: "Affiliate account is inactive." },
        { status: 403 }
      );
    }

    if (rawCoupons.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const creatorSummary = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role ?? null,
    };

    const affiliateMap = new Map<number, { id: number; user: { name: string; email: string } | null }>();
    if (userAffiliate) {
      affiliateMap.set(userAffiliate.id, {
        id: userAffiliate.id,
        user: { name: user.name, email: user.email },
      });
    }

    const missingAffiliateIds = Array.from(
      new Set(
        rawCoupons
          .map((c: any) => c.affiliateId)
          .filter((id: any) => id && !affiliateMap.has(id))
      )
    );

    if (missingAffiliateIds.length > 0) {
      await connectToDatabase();
      const db = mongoose.connection.db;
      if (db) {
        const extraAffiliates = await db
          .collection("affiliate")
          .find(
            { id: { $in: missingAffiliateIds } },
            { projection: { _id: 0, id: 1, userId: 1 } }
          )
          .toArray();

        const extraUserIds = Array.from(
          new Set(extraAffiliates.map((a: any) => a.userId).filter(Boolean))
        );
        const extraUsers =
          extraUserIds.length > 0
            ? await db
                .collection("users")
                .find(
                  { id: { $in: extraUserIds } },
                  { projection: { _id: 0, id: 1, name: 1, email: 1 } }
                )
                .toArray()
            : [];
        const extraUserMap = new Map<number, any>(extraUsers.map((u: any) => [u.id, u]));

        for (const aff of extraAffiliates) {
          const affUser = aff.userId ? extraUserMap.get(aff.userId) : null;
          affiliateMap.set(aff.id, {
            id: aff.id,
            user: affUser ? { name: affUser.name, email: affUser.email } : null,
          });
        }
      }
    }

    const coupons = rawCoupons.map((coupon: any) => ({
      ...coupon,
      affiliate: coupon.affiliateId ? affiliateMap.get(coupon.affiliateId) ?? null : null,
      creator: creatorSummary,
    }));

    return NextResponse.json({ data: coupons }, { status: 200 });
  } catch (err: any) {
    console.error("Coupon fetch error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
