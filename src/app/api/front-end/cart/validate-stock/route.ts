import { NextResponse } from "next/server";
import { checkAuth } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";
import { getAvailableQuantity } from "@/lib/helpers/stockHelper";

export async function GET(req: Request) {
  try {
    const userId = await checkAuth(req as any);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: "Database not connected" }, { status: 500 });
    }

    const cartItems = await db.collection("carts").find({ userId }).toArray();
    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json(
        { success: false, message: "Cart is empty", unavailableItems: [] },
        { status: 400 }
      );
    }

    const productIds = Array.from(new Set(cartItems.map((i: any) => i.productId).filter(Boolean)));
    const variantIds = Array.from(new Set(cartItems.map((i: any) => i.variantId).filter(Boolean)));

    const [products, variants] = await Promise.all([
      productIds.length > 0 ? db.collection("products").find({ id: { $in: productIds } }).toArray() : [],
      variantIds.length > 0 ? db.collection("productvariant").find({ id: { $in: variantIds } }).toArray() : [],
    ]);

    const productMap = new Map(products.map((p: any) => [p.id, p]));
    const variantMap = new Map(variants.map((v: any) => [v.id, v]));

    const validationResults = await Promise.all(
      cartItems.map(async (item: any) => {
        const issues: string[] = [];
        let availableStock = 0;

        const product = productMap.get(item.productId);
        if (!product) {
          issues.push("Product no longer exists.");
        } else if (product.active === false) {
          issues.push("Product is inactive.");
        }

        let variant = null;
        if (item.variantId) {
          variant = variantMap.get(item.variantId);
          if (!variant) {
            issues.push("Variant no longer exists.");
          } else if (variant.isActive === false) {
            issues.push("Variant is inactive.");
          }
        }

        if (issues.length === 0) {
          availableStock = await getAvailableQuantity({
            variantId: item.variantId,
            productId: item.productId,
          });

          if (availableStock < item.quantity) {
            issues.push(`Only ${availableStock} item(s) available in stock.`);
          }
        }

        if (issues.length > 0) {
          return {
            productId: item.productId,
            variantId: item.variantId,
            name: product?.title || "Unknown Product",
            availableStock,
            requestedQuantity: item.quantity,
            issues,
          };
        }

        return null;
      })
    );

    const unavailableItems = validationResults.filter((i) => i !== null);

    if (unavailableItems.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Some items are invalid, inactive, or have insufficient stock.",
          unavailableItems,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error validating cart stock:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
