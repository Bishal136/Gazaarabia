#!/usr/bin/env node
/**
 * ==============================================================================
 * GAZAARABIA — AUTOMATED BACKUP MEDIA RESTORE & CATALOG SEED ENGINE
 * ==============================================================================
 * 1. Strictly protects Backup/uploads as read-only.
 * 2. Restores media files from Backup/uploads into clean active uploads/ directory.
 * 3. Normalizes unrotated raw assets (products_* and variants_*).
 * 4. Connects to MongoDB and idempotently seeds Categories & Subcategories.
 * 5. Idempotently seeds Products, Variants, Product Images, and Variant Images.
 * 6. Configures homepage showcase settings (Shop By Category, Trending, Best Sellers).
 *
 * Usage:
 *   node scripts/seedFromBackup.js
 * ==============================================================================
 */

const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

// ------------------------------------------------------------------------------
// 1. MANUALLY PARSE .ENV FOR DATABASE CONNECTION
// ------------------------------------------------------------------------------
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/gazaarabia";
const ROOT_DIR = path.resolve(__dirname, "..");
const BACKUP_DIR = path.join(ROOT_DIR, "Backup", "uploads");
const ACTIVE_UPLOADS_DIR = path.join(ROOT_DIR, "uploads");

// ------------------------------------------------------------------------------
// 2. HELPER: COPY DIRECTORY RECURSIVELY (READ-ONLY SOURCE)
// ------------------------------------------------------------------------------
function copyDirectorySync(srcDir, destDir, stats = { copied: 0, skipped: 0 }) {
  if (!fs.existsSync(srcDir)) return stats;
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true, mode: 0o775 });
  }

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectorySync(srcPath, destPath, stats);
    } else if (entry.isFile()) {
      try {
        if (fs.existsSync(destPath)) {
          // If already exists with matching size, skip re-copying for speed
          const srcStat = fs.statSync(srcPath);
          const destStat = fs.statSync(destPath);
          if (srcStat.size === destStat.size) {
            stats.skipped++;
            continue;
          }
          try {
            fs.unlinkSync(destPath);
          } catch (_) {}
        }
        fs.copyFileSync(srcPath, destPath);
        try {
          fs.chmodSync(destPath, 0o664);
        } catch (_) {}
        stats.copied++;
      } catch (err) {
        console.warn(`Warning: Could not copy ${srcPath} -> ${destPath}:`, err.message);
        stats.skipped++;
      }
    }
  }
  return stats;
}

// ------------------------------------------------------------------------------
// 3. SCAN ACTIVE UPLOADS & RESOLVE IMAGE ASSETS
// ------------------------------------------------------------------------------
function scanUploadsDirectory(dir, validExts = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"])) {
  const fileList = [];
  const byBasename = new Map();

  function traverse(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (validExts.has(ext)) {
          const relPath = "/" + path.relative(ROOT_DIR, fullPath).replace(/\\/g, "/");
          fileList.push(relPath);
          byBasename.set(entry.name.toLowerCase(), relPath);
          const parsed = path.parse(entry.name);
          if (!byBasename.has(parsed.name.toLowerCase())) {
            byBasename.set(parsed.name.toLowerCase(), relPath);
          }
        }
      }
    }
  }

  traverse(dir);
  return { fileList, byBasename };
}

function resolveImage(rawPath, byBasename, availableImages) {
  if (!rawPath) return null;
  const clean = rawPath.startsWith("/") ? rawPath.slice(1) : rawPath;
  const diskPath = path.resolve(ROOT_DIR, clean);

  // 1. Direct match on disk
  if (fs.existsSync(diskPath)) {
    return "/" + clean.replace(/\\/g, "/");
  }

  // 2. Check alternative extensions (.webp, .jpg, .png, .jpeg)
  const parsed = path.parse(diskPath);
  for (const ext of [".webp", ".jpg", ".png", ".jpeg"]) {
    const candidate = path.join(parsed.dir, parsed.name + ext);
    if (fs.existsSync(candidate)) {
      return "/" + path.relative(ROOT_DIR, candidate).replace(/\\/g, "/");
    }
  }

  // 3. Check by filename across all uploads
  const byName = byBasename.get(parsed.base.toLowerCase()) || byBasename.get(parsed.name.toLowerCase());
  if (byName) {
    return byName;
  }

  return null;
}

// ------------------------------------------------------------------------------
// 4. MAIN SEED PROCESS
// ------------------------------------------------------------------------------
async function runSeed() {
  console.log("==================================================================");
  console.log("🚀 GAZAARABIA MEDIA RESTORE & CATALOG SEED ENGINE");
  console.log("==================================================================");

  // Step 1 & 2: Check Backup Source & Restore Media Files
  console.log(`\n[1/5] 🛡️  Checking Backup Source: ${BACKUP_DIR}...`);
  const hasBackup = fs.existsSync(BACKUP_DIR) && fs.existsSync(path.join(BACKUP_DIR, "categories"));
  const mediaStats = { copied: 0, skipped: 0 };

  if (hasBackup) {
    console.log("✅ Backup directory verified as strictly read-only source.");
    console.log(`\n[2/5] 📦 Restoring Media Files into Active Directory: ${ACTIVE_UPLOADS_DIR}...`);
    if (!fs.existsSync(ACTIVE_UPLOADS_DIR)) {
      fs.mkdirSync(ACTIVE_UPLOADS_DIR, { recursive: true, mode: 0o775 });
    }

    // Copy all subfolders from Backup/uploads
    const backupFolders = fs.readdirSync(BACKUP_DIR, { withFileTypes: true });
    for (const folder of backupFolders) {
      if (folder.isDirectory()) {
        const srcSub = path.join(BACKUP_DIR, folder.name);
        const destSub = path.join(ACTIVE_UPLOADS_DIR, folder.name);
        copyDirectorySync(srcSub, destSub, mediaStats);
      }
    }

    // Normalize and copy unrotated assets if present (e.g. products_... and variants_...)
    const unrotatedDir = path.join(BACKUP_DIR, "backup_raw_unrotated");
    if (fs.existsSync(unrotatedDir)) {
      const rawFiles = fs.readdirSync(unrotatedDir);
      const destProdDir = path.join(ACTIVE_UPLOADS_DIR, "products");
      const destVarDir = path.join(ACTIVE_UPLOADS_DIR, "variants");

      for (const f of rawFiles) {
        const srcFile = path.join(unrotatedDir, f);
        if (f.startsWith("products_")) {
          const targetName = f.replace(/^products_/, "");
          const destFile = path.join(destProdDir, targetName);
          if (!fs.existsSync(destFile)) {
            fs.copyFileSync(srcFile, destFile);
            try { fs.chmodSync(destFile, 0o664); } catch (_) {}
            mediaStats.copied++;
          }
        } else if (f.startsWith("variants_")) {
          const targetName = f.replace(/^variants_/, "");
          const destFile = path.join(destVarDir, targetName);
          if (!fs.existsSync(destFile)) {
            fs.copyFileSync(srcFile, destFile);
            try { fs.chmodSync(destFile, 0o664); } catch (_) {}
            mediaStats.copied++;
          }
        }
      }
    }
    console.log(`✅ Media restore complete: ${mediaStats.copied} files copied into active uploads.`);
  } else {
    console.log("ℹ️  Backup directory not present (production environment). Using active uploads/ directory.");
    if (!fs.existsSync(ACTIVE_UPLOADS_DIR)) {
      fs.mkdirSync(ACTIVE_UPLOADS_DIR, { recursive: true, mode: 0o775 });
    }
  }

  // Ensure standard .gitkeep files exist
  try {
    const rootKeep = path.join(ACTIVE_UPLOADS_DIR, ".gitkeep");
    if (!fs.existsSync(rootKeep)) fs.writeFileSync(rootKeep, "");
    const catKeep = path.join(ACTIVE_UPLOADS_DIR, "categories", ".gitkeep");
    if (!fs.existsSync(catKeep)) fs.writeFileSync(catKeep, "");
    const prodKeep = path.join(ACTIVE_UPLOADS_DIR, "products", ".gitkeep");
    if (!fs.existsSync(prodKeep)) fs.writeFileSync(prodKeep, "");
  } catch (err) {
    // Non-fatal if uploads is owned by application user
  }

  // Step 3: Scan Active Uploads & Verify Assets
  console.log("\n[3/5] 🔍 Indexing active upload assets on disk...");
  const { fileList: availableImages, byBasename: imageMapByName } = scanUploadsDirectory(ACTIVE_UPLOADS_DIR);
  console.log(`📁 Found ${availableImages.length} active image assets ready for mapping.`);

  // Step 4: Load Catalog Blueprint
  const catalogDataPath = path.join(__dirname, "catalog-seed-data.json");
  if (!fs.existsSync(catalogDataPath)) {
    throw new Error(`CRITICAL: catalog-seed-data.json not found at ${catalogDataPath}`);
  }
  const { categories, products } = JSON.parse(fs.readFileSync(catalogDataPath, "utf-8"));
  console.log(`📚 Catalog Blueprint loaded: ${categories.length} categories, ${products.length} curated products.`);

  // Step 5: Connect to MongoDB & Seed Database
  console.log(`\n[4/5] 🗄️  Connecting to MongoDB: ${MONGODB_URI.replace(/:[^:]*@/, ":****@")}...`);
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  console.log("✅ Connected to MongoDB successfully.");

  console.log("\n[5/5] ⚡ Seeding Categories, Subcategories, Products, and Variants...");

  // Purge existing catalog collections cleanly
  await db.collection("products").deleteMany({});
  await db.collection("productvariant").deleteMany({});
  await db.collection("productvariants").deleteMany({});
  await db.collection("productimage").deleteMany({});
  await db.collection("variant_images").deleteMany({});
  await db.collection("variantimages").deleteMany({});
  await db.collection("categories").deleteMany({});
  await db.collection("subcategories").deleteMany({});
  await db.collection("carts").deleteMany({});

  // Fallback product image
  const defaultProductFallback =
    availableImages.find((p) => p.includes("/uploads/products/")) || availableImages[0];

  // 1. Insert Categories & Subcategories
  const categoryDocs = [];
  const subcategoryDocs = [];
  const catSlugToId = new Map();
  const subcatSlugToId = new Map();

  for (const cat of categories) {
    catSlugToId.set(cat.slug, cat.id);
    const resolvedCatImg = resolveImage(cat.image, imageMapByName, availableImages) || cat.image;

    categoryDocs.push({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      image: resolvedCatImg,
      description: cat.description,
      position: cat.position,
      submenuId: cat.submenuId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    for (const sub of cat.subcategories || []) {
      subcatSlugToId.set(sub.slug, sub.id);
      subcategoryDocs.push({
        id: sub.id,
        categoryId: cat.id,
        name: sub.name,
        slug: sub.slug,
        description: sub.description,
        position: sub.position,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  if (categoryDocs.length > 0) {
    await db.collection("categories").insertMany(categoryDocs);
  }
  if (subcategoryDocs.length > 0) {
    await db.collection("subcategories").insertMany(subcategoryDocs);
  }
  console.log(`✅ Seeded ${categoryDocs.length} categories & ${subcategoryDocs.length} subcategories.`);

  // 2. Insert Products & Variants
  const productDocs = [];
  const productImageDocs = [];
  const variantDocs = [];
  const variantImageDocs = [];

  let nextImageId = 1001;
  let nextVariantId = 2001;
  let nextVariantImageId = 3001;

  for (const prod of products) {
    const categoryId = catSlugToId.get(prod.categorySlug) || 10;
    const subcategoryId = prod.subcatSlug ? subcatSlugToId.get(prod.subcatSlug) : null;

    // Resolve images
    const verifiedImages = [];
    for (const rawImg of prod.images || []) {
      const resolved = resolveImage(rawImg, imageMapByName, availableImages);
      if (resolved) verifiedImages.push(resolved);
    }
    if (verifiedImages.length === 0 && defaultProductFallback) {
      verifiedImages.push(defaultProductFallback);
    }

    productDocs.push({
      id: prod.id,
      sellerId: prod.id <= 214 ? 7 : 3, // Distribute between Verified Vendor (7) and GAZAARABIA Flagship (3)
      slug: prod.slug,
      title: prod.title,
      shortDescription: prod.shortDescription,
      description: prod.description,
      fitType: prod.fitType || "Standard Fit",
      costPrice: prod.costPrice || 20,
      sellingPrice: prod.sellingPrice || 50,
      discountPrice: prod.discountPrice || null,
      commissionValue: 5,
      baseQty: prod.baseQty || 60,
      barcode: `GZ-${prod.id}`,
      active: true,
      isDeleted: false,
      brandId: 1, // Gaza Heritage
      categoryId,
      subcategoryId,
      soldCount: Math.floor(Math.random() * 80) + 15,
      soldHighlightDuration: 24,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Product Images
    let primarySet = false;
    for (const imgUrl of verifiedImages) {
      productImageDocs.push({
        id: nextImageId++,
        productId: prod.id,
        url: imgUrl,
        alt: prod.title,
        colorId: null,
        primary: !primarySet,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      primarySet = true;
    }

    // Variants
    for (const v of prod.variants || []) {
      const resolvedVarImg =
        resolveImage(v.imageUrl, imageMapByName, availableImages) || verifiedImages[0];
      const vId = nextVariantId++;

      variantDocs.push({
        id: vId,
        productId: prod.id,
        sku: v.sku,
        barcode: `SKU-${vId}`,
        price: v.price || prod.sellingPrice,
        compareAtPrice: prod.discountPrice ? prod.sellingPrice : null,
        stock: v.stock || 20,
        colorId: v.colorId || null,
        sizeId: v.sizeId || null,
        imageUrl: resolvedVarImg,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      variantImageDocs.push({
        id: nextVariantImageId++,
        variantId: vId,
        url: resolvedVarImg,
        altText: `${prod.title} - ${v.sku}`,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  if (productDocs.length > 0) {
    await db.collection("products").insertMany(productDocs);
  }
  if (productImageDocs.length > 0) {
    await db.collection("productimage").insertMany(productImageDocs);
  }
  if (variantDocs.length > 0) {
    await db.collection("productvariant").insertMany(variantDocs);
  }
  if (variantImageDocs.length > 0) {
    await db.collection("variant_images").insertMany(variantImageDocs);
  }

  console.log(`✅ Seeded ${productDocs.length} products, ${variantDocs.length} variants, and ${productImageDocs.length} gallery images.`);

  // 3. Configure Homepage Settings
  const catIds = categoryDocs.map((c) => c.id);
  const prodIds = productDocs.map((p) => p.id);

  const homeSettingUpdate = {
    shopByCategory: catIds.slice(0, 10),
    signatureProducts: prodIds.slice(0, 8),
    trendingNow: prodIds.slice(0, 8),
    trendingProducts: prodIds.slice(0, 8),
    bestSellers: prodIds.slice(4, 12),
    bestSellerProducts: prodIds.slice(4, 12),
    updatedAt: new Date(),
  };

  await db.collection("home-page-setting").updateOne(
    {},
    { $set: homeSettingUpdate, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );

  await db.collection("homepage_settings").updateOne(
    {},
    {
      $set: {
        shopByCategory: catIds.slice(0, 10),
        signatureProducts: prodIds.slice(0, 8),
        trendingProducts: prodIds.slice(0, 8),
        bestSellerProducts: prodIds.slice(4, 12),
        updatedAt: new Date(),
      },
      $setOnInsert: { id: 1, createdAt: new Date() },
    },
    { upsert: true }
  );

  console.log("✅ Homepage display settings updated with fresh category and product showcases.");

  // 4. Create Database Indexes (Safe with existing indexes)
  const safeCreateIndex = async (collection, spec, options = {}) => {
    try {
      await collection.createIndex(spec, options);
    } catch (err) {
      // Ignore if index already exists with different options
    }
  };

  await safeCreateIndex(db.collection("categories"), { id: 1 });
  await safeCreateIndex(db.collection("categories"), { slug: 1 });
  await safeCreateIndex(db.collection("products"), { id: 1 });
  await safeCreateIndex(db.collection("products"), { slug: 1 });
  await safeCreateIndex(db.collection("products"), { categoryId: 1, active: 1 });
  await safeCreateIndex(db.collection("productvariant"), { id: 1 });
  await safeCreateIndex(db.collection("productvariant"), { productId: 1 });

  await client.close();

  console.log("==================================================================");
  console.log("🎉 SEEDING PROCESS COMPLETED SUCCESSFULLY!");
  console.log("==================================================================");
  console.log(`📁 Files Copied:     ${mediaStats.copied}`);
  console.log(`📦 Categories:       ${categoryDocs.length}`);
  console.log(`🏷️  Subcategories:    ${subcategoryDocs.length}`);
  console.log(`👗 Products:         ${productDocs.length}`);
  console.log(`✨ Product Variants: ${variantDocs.length}`);
  console.log(`🖼️  Product Images:   ${productImageDocs.length}`);
  console.log("==================================================================\n");
}

if (require.main === module) {
  runSeed().catch((err) => {
    console.error("\n❌ SEEDING FAILED:", err);
    process.exit(1);
  });
}

module.exports = { runSeed };
