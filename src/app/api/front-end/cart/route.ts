import { NextResponse } from "next/server";
import { checkAuth } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";
import { getProductAvailableQuantity, getVariantAvailableQuantity } from "@/lib/helpers/stockHelper";

// Helper to calculate subtotal
async function calculateSubtotal(userId: number) {
  await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) return 0;

  const items = await db.collection("carts").find({ userId }).toArray();
  if (items.length === 0) return 0;

  const productIds = items.map((i: any) => i.productId).filter(Boolean);
  const variantIds = items.map((i: any) => i.variantId).filter(Boolean);

  const [products, variants] = await Promise.all([
    productIds.length > 0 ? db.collection("products").find({ id: { $in: productIds } }).toArray() : [],
    variantIds.length > 0 ? db.collection("productvariant").find({ id: { $in: variantIds } }).toArray() : [],
  ]);

  const productMap = new Map(products.map((p: any) => [p.id, p]));
  const variantMap = new Map(variants.map((v: any) => [v.id, v]));

  const subtotal = items.reduce((sum: number, item: any) => {
    const v = item.variantId ? variantMap.get(item.variantId) : null;
    const p = item.productId ? productMap.get(item.productId) : null;
    const price = v?.price ?? p?.sellingPrice ?? 0;
    return sum + price * (item.quantity || 1);
  }, 0);

  return subtotal;
}

// Helper to get the updated cart data
async function getUpdatedCartData(userId: number) {
  await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) return [];

  const items = await db
    .collection("carts")
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();

  if (items.length === 0) return [];

  const productIds = Array.from(new Set(items.map((i: any) => i.productId).filter(Boolean)));
  const variantIds = Array.from(new Set(items.map((i: any) => i.variantId).filter(Boolean)));

  const [products, allVariants, allImages, colors, sizes] = await Promise.all([
    productIds.length > 0 ? db.collection("products").find({ id: { $in: productIds } }).toArray() : [],
    productIds.length > 0 ? db.collection("productvariant").find({ productId: { $in: productIds } }).toArray() : [],
    productIds.length > 0 ? db.collection("productimage").find({ productId: { $in: productIds } }).toArray() : [],
    db.collection("colors").find({}).toArray(),
    db.collection("sizes").find({}).toArray(),
  ]);

  const productMap = new Map(products.map((p: any) => [p.id, p]));
  const colorMap = new Map(colors.map((c: any) => [c.id, c]));
  const sizeMap = new Map(sizes.map((s: any) => [s.id, s]));

  const enrichedItems = await Promise.all(
    items.map(async (item: any) => {
      const product = productMap.get(item.productId);
      if (!product) return null;

      const pVariants = allVariants.filter((v: any) => v.productId === product.id);
      const pImages = allImages.filter((img: any) => img.productId === product.id);

      const productAvailableStock = await getProductAvailableQuantity(product.id);

      const variantsWithStock = await Promise.all(
        pVariants.map(async (variant: any) => {
          const availableStock = await getVariantAvailableQuantity(variant.id);
          const col = variant.colorId ? colorMap.get(variant.colorId) : null;
          const sz = variant.sizeId ? sizeMap.get(variant.sizeId) : null;
          return {
            ...variant,
            availableStock,
            color: col || null,
            size: sz || null,
            variantImages: [],
          };
        })
      );

      const selectedVariant = variantsWithStock.find((v: any) => v.id === item.variantId);
      const selectedVariantData = selectedVariant
        ? {
            id: selectedVariant.id,
            sizeId: selectedVariant.sizeId,
            colorId: selectedVariant.colorId,
            sizeName: selectedVariant.size?.name || null,
            colorName: selectedVariant.color?.name || null,
            hexCode: selectedVariant.color?.hexCode || null,
            price: selectedVariant.price,
            availableStock: selectedVariant.availableStock,
            variantImages: [],
          }
        : null;

      const itemAvailableStock = selectedVariant
        ? selectedVariant.availableStock
        : productAvailableStock;

      return {
        ...item,
        selectedVariantData,
        availableStock: itemAvailableStock,
        product: {
          ...product,
          productimage: pImages,
          availableStock: productAvailableStock,
          productvariant: variantsWithStock,
        },
      };
    })
  );

  return enrichedItems.filter(Boolean);
}

// GET — Get user's cart
export async function GET(req: Request) {
  try {
    const userId = await checkAuth(req as any);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updatedCartData = await getUpdatedCartData(userId);
    const subtotal = await calculateSubtotal(userId);

    return NextResponse.json({ cart: updatedCartData, subtotal });
  } catch (error: any) {
    console.error("Get cart error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — Add item to cart
export async function POST(req: Request) {
  try {
    const userId = await checkAuth(req as any);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { productId, quantity = 1, variantId, colorId, sizeId } = body;

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: "Database not connected" }, { status: 500 });
    }

    const existing = variantId
      ? await db.collection("carts").findOne({ userId, variantId })
      : await db.collection("carts").findOne({ userId, productId });

    const totalRequestedQty = existing ? existing.quantity + quantity : quantity;

    if (existing) {
      await db.collection("carts").updateOne(
        { _id: existing._id },
        { $set: { quantity: totalRequestedQty, updatedAt: new Date() } }
      );
    } else {
      const lastCart = await db.collection("carts").find().sort({ id: -1 }).limit(1).toArray();
      const nextId = (lastCart[0]?.id || 0) + 1;

      await db.collection("carts").insertOne({
        id: nextId,
        userId,
        productId,
        variantId: variantId || null,
        colorId: colorId || null,
        sizeId: sizeId || null,
        quantity,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const subtotal = await calculateSubtotal(userId);
    return NextResponse.json({
      message: "Item added to cart successfully",
      subtotal,
    });
  } catch (error: any) {
    console.error("Add to cart error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT — Update quantity
export async function PUT(req: Request) {
  try {
    const userId = await checkAuth(req as any);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId, variantId, quantity } = await req.json();
    if ((!variantId && !productId) || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "Invalid quantity or missing product/variant" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: "Database not connected" }, { status: 500 });
    }

    const cartItem = variantId
      ? await db.collection("carts").findOne({ userId, variantId })
      : await db.collection("carts").findOne({ userId, productId });

    if (!cartItem) {
      return NextResponse.json({ error: "Cart item not found" }, { status: 404 });
    }

    await db.collection("carts").updateOne(
      { _id: cartItem._id },
      { $set: { quantity, updatedAt: new Date() } }
    );

    const updatedCartData = await getUpdatedCartData(userId);
    const subtotal = await calculateSubtotal(userId);

    return NextResponse.json({
      message: "Quantity updated successfully",
      subtotal,
      cart: updatedCartData,
    });
  } catch (error: any) {
    console.error("PUT /cart error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — Remove product from cart
export async function DELETE(req: Request) {
  try {
    const userId = await checkAuth(req as any);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { variantId, productId } = await req.json();
    if (!variantId && !productId) {
      return NextResponse.json({ error: "Variant ID or Product ID is required" }, { status: 400 });
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: "Database not connected" }, { status: 500 });
    }

    if (variantId) {
      await db.collection("carts").deleteOne({ userId, variantId });
    } else {
      await db.collection("carts").deleteOne({ userId, productId });
    }

    const updatedCartData = await getUpdatedCartData(userId);
    const subtotal = await calculateSubtotal(userId);

    return NextResponse.json({
      message: "Product removed from cart",
      cart: updatedCartData,
      subtotal,
    });
  } catch (error: any) {
    console.error("Remove from cart error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
