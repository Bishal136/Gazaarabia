import { NextRequest, NextResponse } from "next/server";
import { prisma as rawPrisma } from "@/lib/prisma";
import { connectToDatabase, mongoose } from "@/lib/mongoose";
import { checkAuth } from "@/lib/authToken";

const prisma: any = rawPrisma;

type MongoDb = NonNullable<typeof mongoose.connection.db>;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function hydrateOrdersWithReviews(db: MongoDb, orders: any[]) {
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id).filter(Boolean);
  const orderUserIds = Array.from(new Set(orders.map((o) => o.userId).filter(Boolean)));
  const affiliateIds = Array.from(new Set(orders.map((o) => o.affiliateId).filter(Boolean)));
  const couponIds = Array.from(new Set(orders.map((o) => o.couponId).filter(Boolean)));

  const [orderItems, affiliates, coupons] = await Promise.all([
    db
      .collection("orders_item")
      .find(
        { orderId: { $in: orderIds } },
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
    affiliateIds.length > 0
      ? db
          .collection("affiliate")
          .find(
            { id: { $in: affiliateIds } },
            { projection: { _id: 0, id: 1, userId: 1 } }
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
  ]);

  const affiliateMap = new Map<number, any>(affiliates.map((a: any) => [a.id, a]));
  const couponMap = new Map<number, any>(coupons.map((c: any) => [c.id, c]));

  const orderItemIds = orderItems.map((it: any) => it.id).filter(Boolean);
  const initialUserIds = Array.from(
    new Set([
      ...orderUserIds,
      ...affiliates.map((a: any) => a.userId).filter(Boolean),
    ])
  );
  const itemProductIds = Array.from(
    new Set(orderItems.map((it: any) => it.productId).filter(Boolean))
  );
  const itemVariantIds = Array.from(
    new Set(orderItems.map((it: any) => it.variantId).filter(Boolean))
  );

  // Batch-fetch ALL reviews for all orderItem IDs in ONE query alongside users, products, variants
  const [reviews, initialUsers, initialProducts, initialVariants] = await Promise.all([
    orderItemIds.length > 0
      ? db.collection("review").find({ orderItemId: { $in: orderItemIds } }).toArray()
      : Promise.resolve([]),
    initialUserIds.length > 0
      ? db
          .collection("users")
          .find(
            { id: { $in: initialUserIds } },
            { projection: { _id: 0, id: 1, name: 1, email: 1 } }
          )
          .toArray()
      : Promise.resolve([]),
    itemProductIds.length > 0
      ? db
          .collection("products")
          .find(
            { id: { $in: itemProductIds } },
            { projection: { _id: 0, id: 1, title: 1 } }
          )
          .toArray()
      : Promise.resolve([]),
    itemVariantIds.length > 0
      ? db
          .collection("productvariant")
          .find(
            { id: { $in: itemVariantIds } },
            { projection: { _id: 0, id: 1, sku: 1, colorId: 1, sizeId: 1 } }
          )
          .toArray()
      : Promise.resolve([]),
  ]);

  const userMap = new Map<number, any>(initialUsers.map((u: any) => [u.id, u]));
  const productMap = new Map<number, any>(initialProducts.map((p: any) => [p.id, p]));
  const variantMap = new Map<number, any>(initialVariants.map((v: any) => [v.id, v]));

  // Resolve any additional users/products/variants/images referenced on reviews
  const missingReviewUserIds = Array.from(
    new Set(reviews.map((r: any) => r.userId).filter((id: any) => id && !userMap.has(id)))
  );
  const missingReviewProductIds = Array.from(
    new Set(reviews.map((r: any) => r.productId).filter((id: any) => id && !productMap.has(id)))
  );
  const missingReviewVariantIds = Array.from(
    new Set(reviews.map((r: any) => r.variantId).filter((id: any) => id && !variantMap.has(id)))
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
    if (!productImageMap.has(img.productId)) {
      productImageMap.set(img.productId, [{ url: img.url }]);
    }
  }

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
    const result: Record<string, any> = {
      sku: v.sku,
      color: v.colorId && colorMap.has(v.colorId) ? { name: colorMap.get(v.colorId).name } : null,
      size: v.sizeId && sizeMap.has(v.sizeId) ? { name: sizeMap.get(v.sizeId).name } : null,
    };
    if (includeId) result.id = v.id;
    return result;
  };

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

  const orderItemsByOrderId = new Map<number, any[]>();
  for (const item of orderItems) {
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

  return orders.map((order: any) => {
    const customer = order.userId ? userMap.get(order.userId) : null;
    const aff = order.affiliateId ? affiliateMap.get(order.affiliateId) : null;
    const affUser = aff?.userId ? userMap.get(aff.userId) : null;
    const coupon = order.couponId ? couponMap.get(order.couponId) : null;

    return {
      ...order,
      user: customer
        ? { id: customer.id, name: customer.name, email: customer.email }
        : null,
      affiliate: aff
        ? {
            id: aff.id,
            user: affUser
              ? { id: affUser.id, name: affUser.name, email: affUser.email }
              : null,
          }
        : null,
      coupon: coupon
        ? {
            id: coupon.id,
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            affiliateId: coupon.affiliateId,
          }
        : null,
      orderItems: orderItemsByOrderId.get(order.id) || [],
    };
  });
}

export async function GET(req: NextRequest) {
  try {
    const userId = await checkAuth(req);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json(
        { success: false, message: "Database connection failed" },
        { status: 500 }
      );
    }

    const numericUserId = Number(userId);
    const [me, affiliate, matchingSearchUsers] = await Promise.all([
      prisma.users.findUnique({
        where: { id: numericUserId },
        include: { role: true },
      }),
      prisma.affiliate.findUnique({
        where: { userId: numericUserId },
        select: { id: true },
      }),
      search
        ? db
            .collection("users")
            .find(
              { name: { $regex: escapeRegex(search), $options: "i" } },
              { projection: { _id: 0, id: 1 } }
            )
            .toArray()
        : Promise.resolve([]),
    ]);

    if (!me || !me.role?.name) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const role = me.role.name.toLowerCase();
    const isAdmin = role === "admin";
    const isAffiliate = role === "affiliate";

    if (!isAdmin && !isAffiliate) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (isAffiliate && !affiliate?.id) {
      return NextResponse.json(
        { message: "Affiliate profile not found" },
        { status: 403 }
      );
    }

    const mongoFilter: Record<string, any> = {};
    if (isAffiliate) {
      mongoFilter.affiliateId = affiliate!.id;
    }

    if (search) {
      const regexCondition = { $regex: escapeRegex(search), $options: "i" };
      const orConditions: any[] = [
        { transactionId: regexCondition },
        { status: regexCondition },
        { paymentMethod: regexCondition },
      ];
      const numericSearch = Number(search);
      if (!isNaN(numericSearch)) {
        orConditions.push({ id: numericSearch });
      }
      const matchingUserIds = matchingSearchUsers.map((u: any) => u.id).filter(Boolean);
      if (matchingUserIds.length > 0) {
        orConditions.push({ userId: { $in: matchingUserIds } });
      }
      mongoFilter.$or = orConditions;
    }

    const orders = await db
      .collection("orders")
      .find(mongoFilter)
      .sort({ createdAt: -1 })
      .toArray();

    const formattedOrders = await hydrateOrdersWithReviews(db, orders);

    return NextResponse.json({ success: true, data: formattedOrders });
  } catch (error) {
    console.error("Orders GET Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
