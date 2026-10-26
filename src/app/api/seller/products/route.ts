import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const statusFilter = searchParams.get("status");
    const categoryId = searchParams.get("categoryId");
    const subcategoryId = searchParams.get("subcategoryId");
    const brandId = searchParams.get("brandId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const query: any = {
      sellerId: seller.id,
      isDeleted: { $ne: true },
    };

    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    if (statusFilter === "active") {
      query.active = true;
    } else if (statusFilter === "inactive") {
      query.active = false;
    }

    if (categoryId) {
      query.categoryId = parseInt(categoryId);
    }

    if (subcategoryId) {
      query.subcategoryId = parseInt(subcategoryId);
    }

    if (brandId) {
      query.brandId = parseInt(brandId);
    }

    const [totalCount, productsRaw] = await Promise.all([
      db.collection("products").countDocuments(query),
      db
        .collection("products")
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
    ]);

    const productIds = productsRaw.map((p: any) => p.id);

    // Fetch related data in bulk
    const [allVariants, allImages, brands, categories, subcategories, sellerOrderItems, sellerReviews] = await Promise.all([
      productIds.length > 0
        ? db.collection("productvariant").find({ productId: { $in: productIds } }).toArray()
        : [],
      productIds.length > 0
        ? db.collection("productimage").find({ productId: { $in: productIds } }).toArray()
        : [],
      db.collection("brand").find({}).toArray(),
      db.collection("categories").find({}).toArray(),
      db.collection("subcategories").find({}).toArray(),
      db.collection("orders_item").find({ sellerId: seller.id }).toArray(),
      productIds.length > 0
        ? db.collection("reviews").find({ productId: { $in: productIds } }).toArray()
        : [],
    ]);

    // Fast lookups
    const brandMap = new Map(brands.map((b: any) => [b.id, b]));
    const categoryMap = new Map(categories.map((c: any) => [c.id, c]));
    const subcategoryMap = new Map(subcategories.map((s: any) => [s.id, s]));

    // All seller products for global stats
    const allSellerProducts = await db
      .collection("products")
      .find({ sellerId: seller.id, isDeleted: { $ne: true } })
      .project({ id: 1 })
      .toArray();
    const allSellerProductIds = allSellerProducts.map((p: any) => p.id);

    const [allSellerVariants, allSellerReviews] = await Promise.all([
      allSellerProductIds.length > 0
        ? db.collection("productvariant").find({ productId: { $in: allSellerProductIds } }).toArray()
        : [],
      allSellerProductIds.length > 0
        ? db.collection("reviews").find({ productId: { $in: allSellerProductIds } }).toArray()
        : [],
    ]);

    const totalStock = allSellerVariants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
    const totalSold = sellerOrderItems.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0);
    const avgRating = allSellerReviews.length > 0
      ? allSellerReviews.reduce((sum: number, r: any) => sum + (Number(r.rating) || 0), 0) / allSellerReviews.length
      : 0;

    const globalStats = {
      totalStock,
      totalSold,
      averageRating: Number(avgRating.toFixed(1)),
      totalReviews: allSellerReviews.length,
    };

    // Build product objects
    const products = productsRaw.map((p: any) => {
      const pVariants = allVariants.filter((v: any) => v.productId === p.id);
      const pImages = allImages.filter((img: any) => img.productId === p.id);
      const pReviews = sellerReviews.filter((r: any) => r.productId === p.id);
      const pOrderItems = sellerOrderItems.filter((i: any) => i.productId === p.id);

      const pStock = pVariants.reduce((acc: number, v: any) => acc + (v.stock || 0), p.baseQty || 0);
      const pSold = pOrderItems.reduce((acc: number, i: any) => acc + (i.quantity || 0), p.soldCount || 0);

      const b = p.brandId ? brandMap.get(p.brandId) : null;
      const c = p.categoryId ? categoryMap.get(p.categoryId) : null;
      const sc = p.subcategoryId ? subcategoryMap.get(p.subcategoryId) : null;

      return {
        ...p,
        totalStock: pStock,
        totalSold: pSold,
        totalReviews: pReviews.length,
        averageRating: pReviews.length > 0
          ? Number((pReviews.reduce((s: number, r: any) => s + (Number(r.rating) || 0), 0) / pReviews.length).toFixed(1))
          : 0,
        brand: b ? { id: b.id, name: b.name } : null,
        category: c ? { id: c.id, name: c.name } : null,
        categories: c ? { id: c.id, name: c.name } : null,
        subcategories: sc ? { id: sc.id, name: sc.name } : null,
        productimage: pImages.length > 0 ? [{ url: pImages[0].url }] : [],
        productvariant: pVariants.map((v: any) => ({ stock: v.stock })),
      };
    });

    return NextResponse.json({
      success: true,
      total: totalCount,
      page,
      limit,
      stats: globalStats,
      data: products,
    });
  } catch (error: any) {
    console.error("GET Products Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// POST — Create products for seller
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
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
      return NextResponse.json({ error: "Seller profile not found" }, { status: 404 });
    }

    const body = await request.json();

    if (!body.title) {
      return NextResponse.json(
        { success: false, message: "Title is required." },
        { status: 400 }
      );
    }

    const slug = `${body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")}-${crypto.randomUUID().split("-")[0]}`;

    // Validate video url if present
    if (Array.isArray(body.variants)) {
      for (const v of body.variants) {
        if (v.videoUrl) {
          const lower = v.videoUrl.toLowerCase();
          if (!lower.endsWith(".mp4") && !lower.endsWith(".webm")) {
            return NextResponse.json(
              { success: false, message: "Only MP4 or WEBM videos are allowed for variants" },
              { status: 400 }
            );
          }
          if (v.videoSize && v.videoSize > 15 * 1024 * 1024) {
            return NextResponse.json(
              { success: false, message: "Variant video must be under 15MB" },
              { status: 400 }
            );
          }
        }
      }
    }

    // Determine next product ID
    const lastProduct = await db.collection("products").find().sort({ id: -1 }).limit(1).toArray();
    const nextProductId = (lastProduct[0]?.id || 0) + 1;

    const newProduct = {
      id: nextProductId,
      sellerId: seller.id,
      slug,
      title: body.title,
      shortDescription: body.shortDescription || "",
      description: body.description || "",
      fitType: body.fitType || null,
      materialCareId: body.materialCareId ? parseInt(body.materialCareId) : null,
      costPrice: parseFloat(body.costPrice || "0"),
      sellingPrice: parseFloat(body.sellingPrice || "0"),
      discountPrice: body.discountPrice ? parseFloat(body.discountPrice) : null,
      baseQty: parseInt(body.baseQty || "0"),
      barcode: body.barcode || null,
      active: body.active ?? true,
      brandId: body.brandId ? parseInt(body.brandId) : null,
      categoryId: body.categoryId ? parseInt(body.categoryId) : null,
      subcategoryId: body.subcategoryId ? parseInt(body.subcategoryId) : null,
      soldHighlightDuration: body.soldHighlightDuration ? parseInt(body.soldHighlightDuration) : null,
      soldCount: body.soldCount ? parseInt(body.soldCount) : 0,
      ambassadorId: body.ambassadorId ? parseInt(body.ambassadorId) : null,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("products").insertOne(newProduct);

    // Save product images
    if (Array.isArray(body.images) && body.images.length > 0) {
      const lastImage = await db.collection("productimage").find().sort({ id: -1 }).limit(1).toArray();
      let imgId = (lastImage[0]?.id || 0) + 1;
      const imageDocs = body.images.map((img: any) => ({
        id: imgId++,
        productId: nextProductId,
        url: img.url,
        alt: img.alt || "",
        colorId: img.colorId ? parseInt(img.colorId) : null,
        primary: img.primary ?? false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      await db.collection("productimage").insertMany(imageDocs);
    }

    // Save variants
    if (Array.isArray(body.variants) && body.variants.length > 0) {
      const lastVariant = await db.collection("productvariant").find().sort({ id: -1 }).limit(1).toArray();
      let varId = (lastVariant[0]?.id || 0) + 1;
      const variantDocs = body.variants.map((v: any) => ({
        id: varId++,
        productId: nextProductId,
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

    return NextResponse.json(
      {
        success: true,
        message: "Product created successfully",
        data: newProduct,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST products error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create product" },
      { status: 500 }
    );
  }
}

// PATCH — Bulk update products (active/inactive)
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
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
      return NextResponse.json({ message: "Seller not found" }, { status: 404 });
    }

    const body = await request.json();
    const { ids, active } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ message: "Invalid IDs provided" }, { status: 400 });
    }

    if (typeof active !== "boolean") {
      return NextResponse.json({ message: "Invalid active status" }, { status: 400 });
    }

    await db.collection("products").updateMany(
      {
        id: { $in: ids },
        sellerId: seller.id,
      },
      {
        $set: { active, updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      success: true,
      message: `Successfully ${active ? "activated" : "deactivated"} ${ids.length} products`,
    });
  } catch (error: any) {
    console.error("PATCH Products Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update products" },
      { status: 500 }
    );
  }
}
