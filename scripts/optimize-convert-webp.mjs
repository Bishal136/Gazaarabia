import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { MongoClient } from "mongodb";

const MONGO_URI = process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/gazaarabia";
const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".JPG", ".JPEG"]);

async function convertFile(filePath, isHeroOrBanner) {
  const ext = path.extname(filePath);
  if (!IMAGE_EXTENSIONS.has(ext)) return null;

  const dir = path.dirname(filePath);
  const baseName = path.basename(filePath, ext);
  const webpPath = path.join(dir, `${baseName}.webp`);

  const stat = fs.statSync(filePath);
  const origSize = stat.size;

  if (fs.existsSync(webpPath)) {
    return {
      origSize,
      webpSize: fs.statSync(webpPath).size,
      origPath: filePath,
      webpPath,
    };
  }

  const maxWidth = isHeroOrBanner ? 1600 : 800;
  const quality = isHeroOrBanner ? 80 : 78;

  try {
    const buffer = fs.readFileSync(filePath);
    const webpBuffer = await sharp(buffer)
      .resize({ width: maxWidth, withoutEnlargement: true, fit: "inside" })
      .webp({ quality })
      .toBuffer();

    fs.writeFileSync(webpPath, webpBuffer);
    return {
      origSize,
      webpSize: webpBuffer.length,
      origPath: filePath,
      webpPath,
    };
  } catch (err) {
    console.warn(`[WARN] Failed to convert ${filePath}:`, err.message);
    return null;
  }
}

async function scanAndConvert(dir, isHeroOrBanner = false) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let results = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const isSubHero = isHeroOrBanner || entry.name.includes("hero") || entry.name.includes("banner");
      results = results.concat(await scanAndConvert(fullPath, isSubHero));
    } else if (entry.isFile()) {
      const res = await convertFile(fullPath, isHeroOrBanner);
      if (res) results.push(res);
    }
  }
  return results;
}

async function updateDatabase() {
  console.log("Connecting to MongoDB to update image URLs to WebP...");
  let client;
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db();

    // 1. Homepage Settings
    const settings = await db.collection("homepage_settings").findOne();
    if (settings) {
      let modified = false;
      const heroSlides = (settings.heroSlides || []).map((slide) => {
        let { desktop, mobile } = slide;
        if (desktop && !desktop.endsWith(".webp")) {
          desktop = desktop.replace(/\.(png|jpg|jpeg|JPG|JPEG)$/i, ".webp");
          modified = true;
        }
        if (mobile && !mobile.endsWith(".webp")) {
          mobile = mobile.replace(/\.(png|jpg|jpeg|JPG|JPEG)$/i, ".webp");
          modified = true;
        }
        return { ...slide, desktop, mobile };
      });

      let midBanner = settings.midBanner;
      if (midBanner && !midBanner.endsWith(".webp")) {
        midBanner = midBanner.replace(/\.(png|jpg|jpeg|JPG|JPEG)$/i, ".webp");
        modified = true;
      }

      if (modified) {
        await db.collection("homepage_settings").updateOne(
          { _id: settings._id },
          { $set: { heroSlides, midBanner } }
        );
        console.log("✓ Updated homepage_settings with WebP paths.");
      }
    }

    // 2. Categories
    const categories = await db.collection("categories").find({ image: { $regex: /\.(png|jpg|jpeg|JPG|JPEG)$/i } }).toArray();
    for (const cat of categories) {
      const newImg = cat.image.replace(/\.(png|jpg|jpeg|JPG|JPEG)$/i, ".webp");
      await db.collection("categories").updateOne({ _id: cat._id }, { $set: { image: newImg } });
    }
    console.log(`✓ Updated ${categories.length} categories to WebP.`);

    // 3. Product Images
    const prodImages = await db.collection("productimage").find({ url: { $regex: /\.(png|jpg|jpeg|JPG|JPEG)$/i } }).toArray();
    for (const img of prodImages) {
      const newUrl = img.url.replace(/\.(png|jpg|jpeg|JPG|JPEG)$/i, ".webp");
      await db.collection("productimage").updateOne({ _id: img._id }, { $set: { url: newUrl } });
    }
    console.log(`✓ Updated ${prodImages.length} productimage records to WebP.`);

    // 4. Product Variants
    const variants = await db.collection("productvariant").find({ image: { $regex: /\.(png|jpg|jpeg|JPG|JPEG)$/i } }).toArray();
    for (const v of variants) {
      const newImg = v.image.replace(/\.(png|jpg|jpeg|JPG|JPEG)$/i, ".webp");
      await db.collection("productvariant").updateOne({ _id: v._id }, { $set: { image: newImg } });
    }
    console.log(`✓ Updated ${variants.length} productvariant records to WebP.`);

    console.log("✓ MongoDB WebP URL migration complete!");
  } catch (err) {
    console.warn("MongoDB update warning (running offline or disconnected):", err.message);
  } finally {
    if (client) await client.close();
  }
}

async function main() {
  console.log("==========================================================");
  console.log("🚀 GAZAARABIA ASSET OPTIMIZER & WEBP CONVERTER");
  console.log("==========================================================");

  console.log(`Scanning uploads directory: ${UPLOAD_ROOT}...`);
  const conversions = await scanAndConvert(UPLOAD_ROOT);

  let totalOrig = 0;
  let totalWebp = 0;
  for (const c of conversions) {
    totalOrig += c.origSize;
    totalWebp += c.webpSize;
  }

  const saved = totalOrig - totalWebp;
  const pct = totalOrig > 0 ? ((saved / totalOrig) * 100).toFixed(1) : 0;

  console.log(`\nProcessed ${conversions.length} image files.`);
  console.log(`Total Original Size : ${(totalOrig / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Total WebP Size     : ${(totalWebp / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Bandwidth Saved     : ${(saved / (1024 * 1024)).toFixed(2)} MB (${pct}% reduction!)\n`);

  await updateDatabase();
  console.log("==========================================================");
}

main();
