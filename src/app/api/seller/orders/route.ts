import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

export async function GET(req: NextRequest) {
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

    const seller = await db.collection("sellers").findOne({ userId: user.id });
    if (!seller) {
      return NextResponse.json({ message: "Seller profile not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const sellerItems = await db
      .collection("orders_item")
      .find({ sellerId: seller.id })
      .toArray();

    const orderIds = Array.from(new Set(sellerItems.map((i: any) => i.orderId)));

    const [total, orders] = await Promise.all([
      db.collection("orders").countDocuments({ id: { $in: orderIds } }),
      db
        .collection("orders")
        .find({ id: { $in: orderIds } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
    ]);

    const userIds = Array.from(new Set(orders.map((o: any) => o.userId).filter(Boolean)));
    const productIds = Array.from(new Set(sellerItems.map((i: any) => i.productId).filter(Boolean)));
    const variantIds = Array.from(new Set(sellerItems.map((i: any) => i.variantId).filter(Boolean)));
    const colorIds = Array.from(new Set(sellerItems.map((i: any) => i.colorId).filter(Boolean)));
    const sizeIds = Array.from(new Set(sellerItems.map((i: any) => i.sizeId).filter(Boolean)));

    const [users, products, productImages, variants, colors, sizes] = await Promise.all([
      userIds.length > 0
        ? db.collection("users").find({ id: { $in: userIds } }).toArray()
        : [],
      productIds.length > 0
        ? db.collection("products").find({ id: { $in: productIds } }).toArray()
        : [],
      productIds.length > 0
        ? db.collection("productimage").find({ productId: { $in: productIds } }).toArray()
        : [],
      variantIds.length > 0
        ? db.collection("productvariant").find({ id: { $in: variantIds } }).toArray()
        : [],
      colorIds.length > 0
        ? db.collection("colors").find({ id: { $in: colorIds } }).toArray()
        : [],
      sizeIds.length > 0
        ? db.collection("sizes").find({ id: { $in: sizeIds } }).toArray()
        : [],
    ]);

    const formattedOrders = orders.map((order: any) => {
      const matchedUser = users.find((u: any) => u.id === order.userId);
      const customerName =
        matchedUser?.name ||
        [order.firstName, order.lastName].filter(Boolean).join(" ").trim() ||
        "Customer";
      const customerEmail = matchedUser?.email || order.email || "";

      return {
        ...order,
        user: {
          id: order.userId,
          name: customerName,
          email: customerEmail,
        },
        orderItems: sellerItems
          .filter((i: any) => i.orderId === order.id)
          .map((item: any) => {
            const matchedProduct = products.find((p: any) => p.id === item.productId);
            const matchedImages = productImages.filter((img: any) => img.productId === item.productId);
            const matchedVariant = variants.find((v: any) => v.id === item.variantId);
            const matchedColor = colors.find((c: any) => c.id === (item.colorId || matchedVariant?.colorId));
            const matchedSize = sizes.find((s: any) => s.id === (item.sizeId || matchedVariant?.sizeId));

            const imageUrl =
              matchedVariant?.imageUrl ||
              (matchedImages.length > 0 ? matchedImages[0].url : null);

            return {
              ...item,
              product: {
                title: matchedProduct?.title || item.productTitle || item.title || "Product",
                productimage: matchedImages.map((img: any) => ({ url: img.url })),
              },
              variant: {
                sku: matchedVariant?.sku || item.sku || "",
                imageUrl,
                color: matchedColor ? { name: matchedColor.name, hexCode: matchedColor.hexCode } : undefined,
                size: matchedSize ? { name: matchedSize.name } : undefined,
              },
              review: null,
            };
          }),
      };
    });

    return NextResponse.json({
      success: true,
      total,
      page,
      limit,
      data: formattedOrders,
    });
  } catch (error: any) {
    console.error("Orders GET Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
