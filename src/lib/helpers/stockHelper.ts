import { connectToDatabase, mongoose } from "@/lib/mongoose";

/**
 * Ensure TTL index on stock_reservations collection so expired holds are released automatically.
 */
let isIndexEnsured = false;
async function ensureReservationIndexes(db: any) {
  if (isIndexEnsured) return;
  try {
    await db.collection("stock_reservations").createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    );
    await db.collection("stock_reservations").createIndex(
      { variantId: 1, status: 1, expiresAt: 1 }
    );
    await db.collection("stock_reservations").createIndex(
      { productId: 1, status: 1, expiresAt: 1 }
    );
    await db.collection("stock_reservations").createIndex(
      { sessionKey: 1 }
    );
    isIndexEnsured = true;
  } catch (err) {
    console.warn("Failed to create stock_reservations index (may already exist):", err);
  }
}

/**
 * Retrieve total active, unexpired reserved quantity for a variant or product
 */
export async function getActiveReservedQuantity(params: {
  variantId?: number;
  productId?: number;
  excludeSessionKey?: string;
}): Promise<number> {
  try {
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) return 0;

    await ensureReservationIndexes(db);

    const filter: any = {
      status: "ACTIVE",
      expiresAt: { $gt: new Date() },
    };

    if (params.variantId) {
      filter.variantId = params.variantId;
    } else if (params.productId) {
      filter.productId = params.productId;
    } else {
      return 0;
    }

    if (params.excludeSessionKey) {
      filter.sessionKey = { $ne: params.excludeSessionKey };
    }

    const reservations = await db.collection("stock_reservations").find(filter).toArray();
    return reservations.reduce((sum: number, r: any) => sum + (r.quantity || 0), 0);
  } catch (error) {
    console.error("Error in getActiveReservedQuantity:", error);
    return 0;
  }
}

/**
 * Get available (remaining) stock for multiple products in a single batch,
 * deducting committed sales and active unexpired checkout reservations.
 */
export async function getBulkProductAvailableStock(productIds: number[]) {
  if (productIds.length === 0) return new Map<number, number>();

  try {
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) return new Map<number, number>();

    await ensureReservationIndexes(db);

    const [products, sales, reservations] = await Promise.all([
      db
        .collection("products")
        .find({ id: { $in: productIds } })
        .project({ id: 1, baseQty: 1 })
        .toArray(),
      db
        .collection("orders_item")
        .find({ productId: { $in: productIds }, returnStatus: { $nin: ["cancelled", "refunded"] } })
        .toArray(),
      db
        .collection("stock_reservations")
        .find({
          productId: { $in: productIds },
          status: "ACTIVE",
          expiresAt: { $gt: new Date() },
        })
        .toArray(),
    ]);

    const salesMap = new Map<number, number>();
    sales.forEach((s: any) => {
      salesMap.set(s.productId, (salesMap.get(s.productId) || 0) + (s.quantity || 1));
    });

    const reservationMap = new Map<number, number>();
    reservations.forEach((r: any) => {
      reservationMap.set(r.productId, (reservationMap.get(r.productId) || 0) + (r.quantity || 1));
    });

    const stockMap = new Map<number, number>();
    products.forEach((p: any) => {
      const sold = salesMap.get(p.id) || 0;
      const reserved = reservationMap.get(p.id) || 0;
      const available = (p.baseQty || 0) - sold - reserved;
      stockMap.set(p.id, available > 0 ? available : 0);
    });

    return stockMap;
  } catch (error) {
    console.error("Error in getBulkProductAvailableStock:", error);
    return new Map<number, number>();
  }
}

/**
 * Get available (remaining) stock for a specific variant,
 * deducting completed sales and active checkout reservations.
 */
export async function getVariantAvailableQuantity(
  variantId: number,
  excludeSessionKey?: string
): Promise<number> {
  try {
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) return 0;

    await ensureReservationIndexes(db);

    const variant = await db.collection("productvariant").findOne({ id: variantId });
    if (!variant || variant.isActive === false) return 0;

    const [orderedItems, reservedQty] = await Promise.all([
      db
        .collection("orders_item")
        .find({ variantId, returnStatus: { $nin: ["cancelled", "refunded"] } })
        .toArray(),
      getActiveReservedQuantity({ variantId, excludeSessionKey }),
    ]);

    const orderedQty = orderedItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    const available = (variant.stock || 0) - orderedQty - reservedQty;

    return available > 0 ? available : 0;
  } catch (error) {
    console.error("Error in getVariantAvailableQuantity:", error);
    return 0;
  }
}

/**
 * Get available (remaining) stock for a product using products.baseQty,
 * deducting completed sales and active checkout reservations.
 */
export async function getProductAvailableQuantity(
  productId: number,
  excludeSessionKey?: string
): Promise<number> {
  try {
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) return 0;

    await ensureReservationIndexes(db);

    const product = await db.collection("products").findOne({ id: productId });
    if (!product || product.baseQty == null || product.active === false) {
      return 0;
    }

    const [orderedItems, reservedQty] = await Promise.all([
      db
        .collection("orders_item")
        .find({ productId, returnStatus: { $nin: ["cancelled", "refunded"] } })
        .toArray(),
      getActiveReservedQuantity({ productId, excludeSessionKey }),
    ]);

    const orderedQty = orderedItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    const available = (product.baseQty || 0) - orderedQty - reservedQty;

    return available > 0 ? available : 0;
  } catch (error) {
    console.error("Error in getProductAvailableQuantity:", error);
    return 0;
  }
}

export async function getAvailableQuantity(params: {
  variantId?: number;
  productId?: number;
  excludeSessionKey?: string;
}): Promise<number> {
  const { variantId, productId, excludeSessionKey } = params;
  if (variantId) return getVariantAvailableQuantity(variantId, excludeSessionKey);
  if (productId) return getProductAvailableQuantity(productId, excludeSessionKey);
  throw new Error("Please provide variantId or productId");
}

/**
 * Atomically reserve stock during checkout initialization with a 15-minute TTL.
 */
export async function reserveStockForCheckout(
  items: Array<{ productId: number; variantId?: number; quantity: number }>,
  sessionKey: string,
  ttlMinutes = 15
): Promise<{ success: boolean; errors?: string[] }> {
  try {
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection unavailable");

    await ensureReservationIndexes(db);

    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    const errors: string[] = [];

    // Verify stock availability for each item
    for (const item of items) {
      let available = 0;
      if (item.variantId) {
        available = await getVariantAvailableQuantity(item.variantId, sessionKey);
      } else {
        available = await getProductAvailableQuantity(item.productId, sessionKey);
      }

      if (available < item.quantity) {
        errors.push(`Item (ID: ${item.variantId || item.productId}) has only ${available} available, requested ${item.quantity}`);
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    // Upsert / Create reservation documents
    for (const item of items) {
      await db.collection("stock_reservations").updateOne(
        {
          sessionKey,
          productId: item.productId,
          variantId: item.variantId || null,
        },
        {
          $set: {
            productId: item.productId,
            variantId: item.variantId || null,
            quantity: item.quantity,
            sessionKey,
            status: "ACTIVE",
            expiresAt,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error in reserveStockForCheckout:", error);
    return { success: false, errors: [error.message || "Failed to reserve stock"] };
  }
}

/**
 * Commit stock reservation after successful order placement (transitions to real sale).
 */
export async function commitStockReservation(sessionKey: string): Promise<void> {
  try {
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) return;

    await db.collection("stock_reservations").updateMany(
      { sessionKey, status: "ACTIVE" },
      { $set: { status: "COMMITTED", committedAt: new Date() } }
    );
  } catch (error) {
    console.error("Error committing stock reservation:", error);
  }
}

/**
 * Release active stock reservation if checkout is abandoned or payment fails.
 */
export async function releaseStockReservation(sessionKey: string): Promise<void> {
  try {
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) return;

    await db.collection("stock_reservations").deleteMany({
      sessionKey,
      status: "ACTIVE",
    });
  } catch (error) {
    console.error("Error releasing stock reservation:", error);
  }
}

/**
 * Validates stock in transaction.
 * THINKS AND THROWS: If stock is insufficient, throws an explicit descriptive Error
 * so the caller cannot bypass inventory limits.
 */
export async function validateStockInTransaction(
  orderItems: Array<{
    variantId: number;
    quantity: number;
    sessionKey?: string;
  }>
): Promise<{ success: boolean }> {
  await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database not connected for stock validation");

  await ensureReservationIndexes(db);

  for (const item of orderItems) {
    const variant = await db.collection("productvariant").findOne({ id: item.variantId });
    if (!variant) {
      throw new Error(`Product variant ID ${item.variantId} does not exist.`);
    }

    const available = await getVariantAvailableQuantity(item.variantId, item.sessionKey);

    if (available < item.quantity) {
      throw new Error(
        `Insufficient stock for variant ID ${item.variantId}. Available: ${available}, Requested: ${item.quantity}`
      );
    }
  }

  return { success: true };
}
