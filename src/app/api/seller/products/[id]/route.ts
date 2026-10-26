import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";
import crypto from "crypto";

type RouteContext = { params: Promise<{ id: string }> };

// GET product by ID for seller
export async function GET(req: NextRequest, context: RouteContext) {
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

    const { id } = await context.params;
    const productId = Number(id);
    if (!productId) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }

    const product = await db.collection("products").findOne({
      id: productId,
      sellerId: seller.id,
      isDeleted: { $ne: true },
    });

    if (!product) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    const [images, variants, brand, category, subcategory, materialCare, colors, sizes] = await Promise.all([
      db.collection("productimage").find({ productId }).toArray(),
      db.collection("productvariant").find({ productId }).toArray(),
      product.brandId ? db.collection("brand").findOne({ id: product.brandId }) : null,
      product.categoryId ? db.collection("categories").findOne({ id: product.categoryId }) : null,
      product.subcategoryId ? db.collection("subcategories").findOne({ id: product.subcategoryId }) : null,
      product.materialCareId ? db.collection("material_care").findOne({ id: product.materialCareId }) : null,
      db.collection("colors").find({}).toArray(),
      db.collection("sizes").find({}).toArray(),
    ]);

    const colorMap = new Map(colors.map((c: any) => [c.id, c]));
    const sizeMap = new Map(sizes.map((s: any) => [s.id, s]));

    const enrichedVariants = variants.map((v: any) => ({
      ...v,
      color: v.colorId ? colorMap.get(v.colorId) || null : null,
      size: v.sizeId ? sizeMap.get(v.sizeId) || null : null,
      variantImages: [],
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        brand,
        categories: category,
        subcategories: subcategory,
        productimage: images,
        productvariant: enrichedVariants,
        materialCare,
        wearWith: [],
      },
    });
  } catch (error: any) {
    console.error("GET Product Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch product" },
      { status: 500 }
    );
  }
}

// PUT — Update product for seller
export async function PUT(req: NextRequest, context: RouteContext) {
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

    const { id } = await context.params;
    const productId = Number(id);
    if (!productId) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }

    const existingProduct = await db.collection("products").findOne({
      id: productId,
      sellerId: seller.id,
    });
    if (!existingProduct) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    const body = await req.json();

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.title) {
      updateData.title = body.title;
      updateData.slug = `${body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")}-${crypto.randomUUID().split("-")[0]}`;
    }
    if (body.shortDescription !== undefined) updateData.shortDescription = body.shortDescription;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.fitType !== undefined) updateData.fitType = body.fitType;
    if (body.materialCareId !== undefined) updateData.materialCareId = body.materialCareId ? parseInt(body.materialCareId) : null;
    if (body.costPrice !== undefined) updateData.costPrice = parseFloat(body.costPrice || "0");
    if (body.sellingPrice !== undefined) updateData.sellingPrice = parseFloat(body.sellingPrice || "0");
    if (body.discountPrice !== undefined) updateData.discountPrice = body.discountPrice ? parseFloat(body.discountPrice) : null;
    if (body.baseQty !== undefined) updateData.baseQty = parseInt(body.baseQty || "0");
    if (body.barcode !== undefined) updateData.barcode = body.barcode;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.brandId !== undefined) updateData.brandId = body.brandId ? parseInt(body.brandId) : null;
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId ? parseInt(body.categoryId) : null;
    if (body.subcategoryId !== undefined) updateData.subcategoryId = body.subcategoryId ? parseInt(body.subcategoryId) : null;
    if (body.soldHighlightDuration !== undefined) updateData.soldHighlightDuration = body.soldHighlightDuration ? parseInt(body.soldHighlightDuration) : null;
    if (body.soldCount !== undefined) updateData.soldCount = body.soldCount ? parseInt(body.soldCount) : 0;
    if (body.ambassadorId !== undefined) updateData.ambassadorId = body.ambassadorId ? parseInt(body.ambassadorId) : null;

    await db.collection("products").updateOne({ id: productId }, { $set: updateData });

    // Update images if provided
    if (Array.isArray(body.images)) {
      await db.collection("productimage").deleteMany({ productId });
      if (body.images.length > 0) {
        const lastImage = await db.collection("productimage").find().sort({ id: -1 }).limit(1).toArray();
        let imgId = (lastImage[0]?.id || 0) + 1;
        const imageDocs = body.images.map((img: any) => ({
          id: imgId++,
          productId,
          url: img.url,
          alt: img.alt || "",
          colorId: img.colorId ? parseInt(img.colorId) : null,
          primary: img.primary ?? false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        await db.collection("productimage").insertMany(imageDocs);
      }
    }

    // Update variants if provided
    if (Array.isArray(body.variants)) {
      await db.collection("productvariant").deleteMany({ productId });
      if (body.variants.length > 0) {
        const lastVariant = await db.collection("productvariant").find().sort({ id: -1 }).limit(1).toArray();
        let varId = (lastVariant[0]?.id || 0) + 1;
        const variantDocs = body.variants.map((v: any) => ({
          id: varId++,
          productId,
          sku: v.sku || "",
          price: parseFloat(v.price || "0"),
          stock: parseInt(v.stock || "0"),
          isActive: v.isActive ?? true,
          colorId: v.colorId ? parseInt(v.colorId) : null,
          sizeId: v.sizeId ? parseInt(v.sizeId) : null,
          videoUrl: v.videoUrl || null,
          videoThumbnail: v.videoThumbnail || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        await db.collection("productvariant").insertMany(variantDocs);
      }
    }

    const updatedProduct = await db.collection("products").findOne({ id: productId });
    return NextResponse.json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error: any) {
    console.error("PUT Product Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE product for seller
export async function DELETE(req: NextRequest, context: RouteContext) {
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

    const { id } = await context.params;
    const productId = Number(id);
    if (!productId) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }

    const existingProduct = await db.collection("products").findOne({
      id: productId,
      sellerId: seller.id,
    });
    if (!existingProduct) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    const orderCount = await db.collection("orders_item").countDocuments({ productId });

    if (orderCount > 0) {
      // Soft delete if orders exist
      await db.collection("products").updateOne(
        { id: productId },
        { $set: { isDeleted: true, active: false, updatedAt: new Date() } }
      );
      return NextResponse.json({
        success: true,
        message: "Product soft deleted successfully and order history preserved",
      });
    } else {
      // Permanent delete
      await Promise.all([
        db.collection("products").deleteOne({ id: productId }),
        db.collection("productvariant").deleteMany({ productId }),
        db.collection("productimage").deleteMany({ productId }),
      ]);
      return NextResponse.json({
        success: true,
        message: "Product deleted successfully",
      });
    }
  } catch (error: any) {
    console.error("DELETE Product Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete product" },
      { status: 500 }
    );
  }
}
