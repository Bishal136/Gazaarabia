import { NextRequest, NextResponse } from "next/server";
import { prisma as rawPrisma } from "@/lib/prisma";
import { connectToDatabase, mongoose } from "@/lib/mongoose";
import { getTokenFromHeader, getUserIdFromToken } from "@/lib/authToken";

const prisma: any = rawPrisma;

type MongoDb = NonNullable<typeof mongoose.connection.db>;

async function hydrateDashboardData(
  db: MongoDb,
  affiliateUser: Record<string, any> | null,
  recentOrderDocs: any[],
  recentAmbassadorDocs: any[]
) {
  if (recentOrderDocs.length === 0 && recentAmbassadorDocs.length === 0) {
    return { recentOrders: [], recentAmbassadorItems: [] };
  }

  const recentOrderIds = recentOrderDocs.map((o) => o.id).filter(Boolean);
  const orderUserIds = Array.from(
    new Set(recentOrderDocs.map((o) => o.userId).filter(Boolean))
  );
  const couponIds = Array.from(
    new Set(recentOrderDocs.map((o) => o.couponId).filter(Boolean))
  );

  // Fetch order items, order customers, and coupons concurrently
  const [recentOrderItems, orderUsers, coupons] =
    recentOrderDocs.length > 0
      ? await Promise.all([
          db
            .collection("orders_item")
            .find(
              { orderId: { $in: recentOrderIds } },
              {
                projection: {
                  _id: 0,
                  id: 1,
                  orderId: 1,
                  quantity: 1,
                  price: 1,
                  productId: 1,
                  variantId: 1,
                  reviewed: 1,
                },
              }
            )
            .toArray(),
          orderUserIds.length > 0
            ? db
                .collection("users")
                .find(
                  { id: { $in: orderUserIds } },
                  { projection: { _id: 0, id: 1, name: 1, email: 1 } }
                )
                .toArray()
            : Promise.resolve([]),
          couponIds.length > 0
            ? db
                .collection("coupon")
                .find(
                  { id: { $in: couponIds } },
                  {
                    projection: {
                      _id: 0,
                      id: 1,
                      code: 1,
                      discountType: 1,
                      discountValue: 1,
                      affiliateId: 1,
                    },
                  }
                )
                .toArray()
            : Promise.resolve([]),
        ])
      : [[], [], []];

  const userMap = new Map<number, any>(orderUsers.map((u: any) => [u.id, u]));
  const couponMap = new Map<number, any>(coupons.map((c: any) => [c.id, c]));

  const orderItemIds = recentOrderItems.map((it: any) => it.id).filter(Boolean);
  const productIds = Array.from(
    new Set([
      ...recentOrderItems.map((it: any) => it.productId).filter(Boolean),
      ...recentAmbassadorDocs.map((it: any) => it.productId).filter(Boolean),
    ])
  );
  const variantIds = Array.from(
    new Set([
      ...recentOrderItems.map((it: any) => it.variantId).filter(Boolean),
      ...recentAmbassadorDocs.map((it: any) => it.variantId).filter(Boolean),
    ])
  );

  // Batch-fetch reviews for all orderItem IDs in ONE query alongside products & variants
  const [reviews, products, variants] = await Promise.all([
    orderItemIds.length > 0
      ? db.collection("review").find({ orderItemId: { $in: orderItemIds } }).toArray()
      : Promise.resolve([]),
    productIds.length > 0
      ? db
          .collection("products")
          .find(
            { id: { $in: productIds } },
            { projection: { _id: 0, id: 1, title: 1 } }
          )
          .toArray()
      : Promise.resolve([]),
    variantIds.length > 0
      ? db
          .collection("productvariant")
          .find(
            { id: { $in: variantIds } },
            { projection: { _id: 0, id: 1, sku: 1, colorId: 1, sizeId: 1 } }
          )
          .toArray()
      : Promise.resolve([]),
  ]);

  const productMap = new Map<number, any>(products.map((p: any) => [p.id, p]));
  const variantMap = new Map<number, any>(variants.map((v: any) => [v.id, v]));

  // Fetch any review-specific users/products/variants + review product images
  const missingReviewUserIds = Array.from(
    new Set(
      reviews
        .map((r: any) => r.userId)
        .filter((id: any) => id && !userMap.has(id))
    )
  );
  const missingReviewProductIds = Array.from(
    new Set(
      reviews
        .map((r: any) => r.productId)
        .filter((id: any) => id && !productMap.has(id))
    )
  );
  const missingReviewVariantIds = Array.from(
    new Set(
      reviews
        .map((r: any) => r.variantId)
        .filter((id: any) => id && !variantMap.has(id))
    )
  );
  const reviewProductIds = Array.from(
    new Set(reviews.map((r: any) => r.productId).filter(Boolean))
  );

  const [extraUsers, extraProducts, extraVariants, reviewProductImages] =
    await Promise.all([
      missingReviewUserIds.length > 0
        ? db
            .collection("users")
            .find(
              { id: { $in: missingReviewUserIds } },
              { projection: { _id: 0, id: 1, name: 1, email: 1 } }
            )
            .toArray()
        : Promise.resolve([]),
      missingReviewProductIds.length > 0
        ? db
            .collection("products")
            .find(
              { id: { $in: missingReviewProductIds } },
              { projection: { _id: 0, id: 1, title: 1 } }
            )
            .toArray()
        : Promise.resolve([]),
      missingReviewVariantIds.length > 0
        ? db
            .collection("productvariant")
            .find(
              { id: { $in: missingReviewVariantIds } },
              { projection: { _id: 0, id: 1, sku: 1, colorId: 1, sizeId: 1 } }
            )
            .toArray()
        : Promise.resolve([]),
      reviewProductIds.length > 0
        ? db
            .collection("productimage")
            .find(
              { productId: { $in: reviewProductIds } },
              { projection: { _id: 0, productId: 1, url: 1 } }
            )
            .toArray()
        : Promise.resolve([]),
    ]);

  for (const u of extraUsers) userMap.set(u.id, u);
  for (const p of extraProducts) productMap.set(p.id, p);
  for (const v of extraVariants) variantMap.set(v.id, v);

  const productImageMap = new Map<number, { url: string }[]>();
  for (const img of reviewProductImages) {
    const list = productImageMap.get(img.productId);
    if (!list) {
      productImageMap.set(img.productId, [{ url: img.url }]);
    }
  }

  // Fetch color & size lookups for all variants concurrently
  const allVariants = Array.from(variantMap.values());
  const colorIds = Array.from(new Set(allVariants.map((v) => v.colorId).filter(Boolean)));
  const sizeIds = Array.from(new Set(allVariants.map((v) => v.sizeId).filter(Boolean)));

  const [colors, sizes] = await Promise.all([
    colorIds.length > 0
      ? db
          .collection("colors")
          .find({ id: { $in: colorIds } }, { projection: { _id: 0, id: 1, name: 1 } })
          .toArray()
      : Promise.resolve([]),
    sizeIds.length > 0
      ? db
          .collection("sizes")
          .find({ id: { $in: sizeIds } }, { projection: { _id: 0, id: 1, name: 1 } })
          .toArray()
      : Promise.resolve([]),
  ]);

  const colorMap = new Map<number, any>(colors.map((c: any) => [c.id, c]));
  const sizeMap = new Map<number, any>(sizes.map((s: any) => [s.id, s]));

  const buildVariant = (variantId: number | null | undefined, includeId: boolean) => {
    if (!variantId) return null;
    const v = variantMap.get(variantId);
    if (!v) return null;
    const base: Record<string, any> = {
      sku: v.sku,
      color: v.colorId && colorMap.has(v.colorId) ? { name: colorMap.get(v.colorId).name } : null,
      size: v.sizeId && sizeMap.has(v.sizeId) ? { name: sizeMap.get(v.sizeId).name } : null,
    };
    if (includeId) base.id = v.id;
    return base;
  };

  // Build review lookup keyed by orderItemId (first review wins, matching findFirst)
  const reviewMap = new Map<number, any>();
  for (const rev of reviews) {
    if (!rev.orderItemId || reviewMap.has(rev.orderItemId)) continue;
    const revUser = rev.userId ? userMap.get(rev.userId) : null;
    const revProduct = rev.productId ? productMap.get(rev.productId) : null;
    reviewMap.set(rev.orderItemId, {
      id: rev.id,
      rating: rev.rating,
      comment: rev.comment,
      createdAt: rev.createdAt,
      updatedAt: rev.updatedAt,
      user: revUser ? { id: revUser.id, name: revUser.name, email: revUser.email } : null,
      product: revProduct
        ? {
            id: revProduct.id,
            title: revProduct.title,
            productimage: productImageMap.get(revProduct.id) || [],
          }
        : null,
      variant: buildVariant(rev.variantId, true),
      reviewed: true,
    });
  }

  // Group order items by orderId
  const orderItemsByOrderId = new Map<number, any[]>();
  for (const item of recentOrderItems) {
    const list = orderItemsByOrderId.get(item.orderId) || [];
    const prod = item.productId ? productMap.get(item.productId) : null;
    list.push({
      id: item.id,
      quantity: item.quantity,
      price: item.price,
      product: prod ? { title: prod.title } : null,
      variant: buildVariant(item.variantId, false),
      reviewed: item.reviewed,
      review: reviewMap.get(item.id) ?? null,
    });
    orderItemsByOrderId.set(item.orderId, list);
  }

  const formattedAffiliate = affiliateUser
    ? {
        user: {
          name: affiliateUser.name,
          email: affiliateUser.email,
        },
      }
    : null;

  const recentOrders = recentOrderDocs.map((order: any) => {
    const customer = order.userId ? userMap.get(order.userId) : null;
    const coupon = order.couponId ? couponMap.get(order.couponId) : null;
    return {
      ...order,
      user: customer
        ? { id: customer.id, name: customer.name, email: customer.email }
        : null,
      affiliate: formattedAffiliate,
      coupon: coupon
        ? {
            id: coupon.id,
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            affiliateId: coupon.affiliateId,
          }
        : null,
      orderId: `ORD-${order.id}`,
      amount: order.totalAmount,
      date: order.createdAt,
      orderItems: orderItemsByOrderId.get(order.id) || [],
    };
  });

  const recentAmbassadorItems = recentAmbassadorDocs.map((it: any) => ({
    itemId: it.id,
    orderId: `ORD-${it.orderId}`,
    date: it.createdAt,
    productTitle: (it.productId ? productMap.get(it.productId)?.title : null) ?? "Product",
    sku: (it.variantId ? variantMap.get(it.variantId)?.sku : null) ?? null,
    qty: it.quantity ?? 1,
    price: it.price ?? 0,
    commissionRate: it.ambassadorCommission ?? 0,
    earned: it.ambassadorEarning ?? 0,
    paid: !!it.ambassadorPaid,
  }));

  return { recentOrders, recentAmbassadorItems };
}

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req);
    const userId = token ? getUserIdFromToken(token) : null;

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ message: "Database connection failed" }, { status: 500 });
    }

    const numericUserId = Number(userId);
    const [affiliate, affiliateUser] = await Promise.all([
      prisma.affiliate.findUnique({
        where: { userId: numericUserId },
      }),
      db
        .collection("users")
        .findOne(
          { id: numericUserId },
          { projection: { _id: 0, name: 1, email: 1 } }
        ),
    ]);

    if (!affiliate) {
      return NextResponse.json({ message: "Affiliate account not found" }, { status: 404 });
    }

    const affiliateId = affiliate.id;

    // Fetch all independent dashboard metrics and recent slices concurrently
    const [
      invoices,
      orderStatsAgg,
      activeCoupons,
      recentOrderDocs,
      ambassadorAgg,
      recentAmbassadorDocs,
    ] = await Promise.all([
      prisma.affiliateInvoice.findMany({
        where: { affiliateId },
        select: { totalAmount: true, isPaid: true },
      }),
      db
        .collection("orders")
        .aggregate([
          { $match: { affiliateId } },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              distinctUserIds: { $addToSet: "$userId" },
            },
          },
        ])
        .toArray(),
      prisma.coupon.count({
        where: { affiliateId, isActive: true },
      }),
      db
        .collection("orders")
        .find({ affiliateId })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),
      db
        .collection("orders_item")
        .aggregate([
          { $match: { ambassadorId: affiliateId } },
          {
            $group: {
              _id: null,
              totalAmbassadorEarnings: { $sum: { $ifNull: ["$ambassadorEarning", 0] } },
              pendingAmbassadorPayouts: {
                $sum: {
                  $cond: [
                    { $in: ["$ambassadorPaid", [true, 1]] },
                    0,
                    { $ifNull: ["$ambassadorEarning", 0] },
                  ],
                },
              },
              totalAmbassadorItems: { $sum: 1 },
            },
          },
        ])
        .toArray(),
      db
        .collection("orders_item")
        .find(
          { ambassadorId: affiliateId },
          {
            projection: {
              _id: 0,
              id: 1,
              orderId: 1,
              createdAt: 1,
              quantity: 1,
              price: 1,
              ambassadorCommission: 1,
              ambassadorEarning: 1,
              ambassadorPaid: 1,
              productId: 1,
              variantId: 1,
            },
          }
        )
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),
    ]);

    let totalAffiliateEarnings = 0;
    let pendingAffiliatePayouts = 0;
    for (const inv of invoices) {
      const amount = Number(inv.totalAmount) || 0;
      totalAffiliateEarnings += amount;
      if (!inv.isPaid) {
        pendingAffiliatePayouts += amount;
      }
    }

    const totalOrders = orderStatsAgg[0]?.totalOrders ?? 0;
    const referredCustomers = orderStatsAgg[0]?.distinctUserIds?.length ?? 0;
    const conversionRate =
      referredCustomers > 0
        ? `${((totalOrders / referredCustomers) * 100).toFixed(1)}%`
        : "0%";

    const totalAmbassadorEarnings = ambassadorAgg[0]?.totalAmbassadorEarnings ?? 0;
    const pendingAmbassadorPayouts = ambassadorAgg[0]?.pendingAmbassadorPayouts ?? 0;
    const totalAmbassadorItems = ambassadorAgg[0]?.totalAmbassadorItems ?? 0;

    const { recentOrders, recentAmbassadorItems } = await hydrateDashboardData(
      db,
      affiliateUser,
      recentOrderDocs,
      recentAmbassadorDocs
    );

    const totalCombinedEarnings = totalAffiliateEarnings + totalAmbassadorEarnings;
    const pendingCombinedPayouts = pendingAffiliatePayouts + pendingAmbassadorPayouts;

    return NextResponse.json({
      success: true,
      data: {
        // affiliate (existing)
        totalAffiliateEarnings,
        pendingAffiliatePayouts,
        totalOrders,
        activeCoupons,
        referredCustomers,
        conversionRate,
        recentOrders,

        // ambassador (new)
        totalAmbassadorEarnings,
        pendingAmbassadorPayouts,
        totalAmbassadorItems,
        recentAmbassadorItems,

        // combined
        totalCombinedEarnings,
        pendingCombinedPayouts,
      },
    });
  } catch (error: any) {
    console.error("Affiliate Dashboard Error:", error);
    return NextResponse.json(
      { message: "Server error", error: error?.message },
      { status: 500 }
    );
  }
}
