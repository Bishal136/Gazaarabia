import { connectToDatabase, mongoose } from "@/lib/mongoose";

/**
 * Get available (remaining) stock for multiple products in a single batch
 */
export async function getBulkProductAvailableStock(productIds: number[]) {
  if (productIds.length === 0) return new Map<number, number>();

  try {
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) return new Map<number, number>();

    const products = await db
      .collection("products")
      .find({ id: { $in: productIds } })
      .project({ id: 1, baseQty: 1 })
      .toArray();

    const sales = await db
      .collection("orders_item")
      .find({ productId: { $in: productIds } })
      .toArray();

    const salesMap = new Map<number, number>();
    sales.forEach((s: any) => {
      salesMap.set(s.productId, (salesMap.get(s.productId) || 0) + (s.quantity || 1));
    });

    const stockMap = new Map<number, number>();
    products.forEach((p: any) => {
      const sold = salesMap.get(p.id) || 0;
      const available = (p.baseQty || 0) - sold;
      stockMap.set(p.id, available > 0 ? available : 0);
    });

    return stockMap;
  } catch (error) {
    console.error("Error in getBulkProductAvailableStock:", error);
    return new Map<number, number>();
  }
}

/**
 * Get available (remaining) stock for a specific variant
 */
export async function getVariantAvailableQuantity(variantId: number): Promise<number> {
  try {
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) return 0;

    const variant = await db.collection("productvariant").findOne({ id: variantId });
    if (!variant || variant.isActive === false) return 0;

    const orderedItems = await db
      .collection("orders_item")
      .find({ variantId })
      .toArray();

    const orderedQty = orderedItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    const available = (variant.stock || 0) - orderedQty;

    return available > 0 ? available : 0;
  } catch (error) {
    console.error("Error in getVariantAvailableQuantity:", error);
    return 0;
  }
}

/**
 * Get available (remaining) stock for a product using products.baseQty
 */
export async function getProductAvailableQuantity(productId: number): Promise<number> {
  try {
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) return 0;

    const product = await db.collection("products").findOne({ id: productId });
    if (!product || product.baseQty == null || product.active === false) {
      return 0;
    }

    const orderedItems = await db
      .collection("orders_item")
      .find({ productId })
      .toArray();

    const orderedQty = orderedItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    const available = (product.baseQty || 0) - orderedQty;

    return available > 0 ? available : 0;
  } catch (error) {
    console.error("Error in getProductAvailableQuantity:", error);
    return 0;
  }
}

export async function getAvailableQuantity(params: {
  variantId?: number;
  productId?: number;
}): Promise<number> {
  const { variantId, productId } = params;
  if (variantId) return getVariantAvailableQuantity(variantId);
  if (productId) return getProductAvailableQuantity(productId);
  throw new Error("Please provide variantId or productId");
}

export async function validateStockInTransaction(
  orderItems: Array<{
    variantId: number;
    quantity: number;
  }>
): Promise<{ success: boolean }> {
  try {
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) return { success: false };

    for (const item of orderItems) {
      const variant = await db.collection("productvariant").findOne({ id: item.variantId });
      if (!variant) return { success: false };

      const orderedItems = await db
        .collection("orders_item")
        .find({ variantId: item.variantId })
        .toArray();

      const orderedQty = orderedItems.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0);
      const available = (variant.stock || 0) - orderedQty;

      if (available < item.quantity) {
        return { success: false };
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Stock validation error:", error);
    return { success: false };
  }
}
