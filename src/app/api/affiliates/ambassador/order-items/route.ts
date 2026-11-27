import { NextRequest, NextResponse } from "next/server";
import { prisma as rawPrisma } from "@/lib/prisma";
import { connectToDatabase, mongoose } from "@/lib/mongoose";
import { checkAuth } from "@/lib/authToken";

const prisma: any = rawPrisma;

export async function GET(req: NextRequest) {
  try {
    const userId = await checkAuth(req);
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const numericUserId = Number(userId);
    const [user, affiliate] = await Promise.all([
      prisma.users.findUnique({
        where: { id: numericUserId },
        select: { id: true },
      }),
      prisma.affiliate.findUnique({
        where: { userId: numericUserId },
        select: { id: true, type: true },
      }),
    ]);

    if (!user || !affiliate) {
      return NextResponse.json(
        { success: false, message: "Affiliate profile not found" },
        { status: 403 }
      );
    }

    if (affiliate.type !== "ambassador") {
      return NextResponse.json(
        { success: false, message: "Only ambassadors can access this section" },
        { status: 403 }
      );
    }

    const rawItems = await prisma.orderItem.findMany({
      where: { ambassadorId: affiliate.id },
      orderBy: { createdAt: "desc" },
    });

    if (rawItems.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json(
        { success: false, message: "Database connection failed" },
        { status: 500 }
      );
    }

    const productIds = Array.from(new Set(rawItems.map((i: any) => i.productId).filter(Boolean)));
    const variantIds = Array.from(new Set(rawItems.map((i: any) => i.variantId).filter(Boolean)));
    const orderIds = Array.from(new Set(rawItems.map((i: any) => i.orderId).filter(Boolean)));

    const [products, productImages, variants, orders] = await Promise.all([
      productIds.length > 0
        ? db
            .collection("products")
            .find({ id: { $in: productIds } }, { projection: { _id: 0, id: 1, title: 1 } })
            .toArray()
        : Promise.resolve([]),
      productIds.length > 0
        ? db
            .collection("productimage")
            .find(
              { productId: { $in: productIds } },
              { projection: { _id: 0, productId: 1, url: 1 } }
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
      orderIds.length > 0
        ? db
            .collection("orders")
            .find(
              { id: { $in: orderIds } },
              { projection: { _id: 0, id: 1, createdAt: 1, status: 1 } }
            )
            .toArray()
        : Promise.resolve([]),
    ]);

    const colorIds = Array.from(new Set(variants.map((v: any) => v.colorId).filter(Boolean)));
    const sizeIds = Array.from(new Set(variants.map((v: any) => v.sizeId).filter(Boolean)));

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

    const productImageMap = new Map<number, { url: string }[]>();
    for (const img of productImages) {
      if (!productImageMap.has(img.productId)) {
        productImageMap.set(img.productId, [{ url: img.url }]);
      }
    }

    const productMap = new Map<number, any>(products.map((p: any) => [p.id, p]));
    const variantMap = new Map<number, any>(variants.map((v: any) => [v.id, v]));
    const orderMap = new Map<number, any>(orders.map((o: any) => [o.id, o]));
    const colorMap = new Map<number, any>(colors.map((c: any) => [c.id, c]));
    const sizeMap = new Map<number, any>(sizes.map((s: any) => [s.id, s]));

    const orderItems = rawItems.map((item: any) => {
      const prod = item.productId ? productMap.get(item.productId) : null;
      const varDoc = item.variantId ? variantMap.get(item.variantId) : null;
      const ord = item.orderId ? orderMap.get(item.orderId) : null;

      return {
        ...item,
        product: prod
          ? {
              title: prod.title,
              productimage: productImageMap.get(prod.id) || [],
            }
          : null,
        variant: varDoc
          ? {
              sku: varDoc.sku,
              color:
                varDoc.colorId && colorMap.has(varDoc.colorId)
                  ? { name: colorMap.get(varDoc.colorId).name }
                  : null,
              size:
                varDoc.sizeId && sizeMap.has(varDoc.sizeId)
                  ? { name: sizeMap.get(varDoc.sizeId).name }
                  : null,
            }
          : null,
        order: ord
          ? {
              id: ord.id,
              createdAt: ord.createdAt,
              status: ord.status,
            }
          : null,
      };
    });

    return NextResponse.json({ success: true, data: orderItems });
  } catch (error) {
    console.error("Ambassador Order Items Error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
