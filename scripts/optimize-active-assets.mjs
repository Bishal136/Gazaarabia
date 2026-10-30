import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';

const APP_DIR = process.env.APP_DIR || (fs.existsSync('/var/www/Gazaarabia') ? '/var/www/Gazaarabia' : process.cwd());
const MONGO_URI = process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/gazaarabia";

async function optimizeToWebP(filePath, maxWidth = 1600, quality = 80) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const stat = fs.statSync(filePath);
    const originalSize = stat.size;
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    const webpPath = path.join(path.dirname(filePath), `${baseName}.webp`);

    const buffer = await sharp(filePath)
      .resize({
        width: maxWidth,
        withoutEnlargement: true,
        fit: 'inside',
      })
      .webp({ quality })
      .toBuffer();

    fs.writeFileSync(webpPath, buffer);
    const saved = originalSize - buffer.length;
    const savedPercent = ((saved / originalSize) * 100).toFixed(1);
    console.log(`[WEBP] ${path.basename(filePath)}: ${(originalSize/1024).toFixed(0)}KB -> ${(buffer.length/1024).toFixed(0)}KB (-${savedPercent}%)`);
    return webpPath;
  } catch (err) {
    console.error(`[ERROR] ${filePath}:`, err.message);
    return null;
  }
}

async function run() {
  console.log(`=== Converting Active Homepage Banners & Category Icons to WebP ===`);

  const heroDir = path.join(APP_DIR, 'uploads/homepage/hero');
  if (fs.existsSync(heroDir)) {
    const files = fs.readdirSync(heroDir);
    for (const f of files) {
      if (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')) {
        await optimizeToWebP(path.join(heroDir, f), 1600, 80);
      }
    }
  }

  const bannerDir = path.join(APP_DIR, 'uploads/homepage/banner');
  if (fs.existsSync(bannerDir)) {
    const files = fs.readdirSync(bannerDir);
    for (const f of files) {
      if (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')) {
        await optimizeToWebP(path.join(bannerDir, f), 1600, 80);
      }
    }
  }

  const categoryDir = path.join(APP_DIR, 'uploads/categories');
  if (fs.existsSync(categoryDir)) {
    const files = fs.readdirSync(categoryDir);
    for (const f of files) {
      if (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')) {
        await optimizeToWebP(path.join(categoryDir, f), 800, 78);
      }
    }
  }

  // Update MongoDB to reference WebP
  let client;
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db();

    // 1. Homepage settings
    const settings = await db.collection("homepage_settings").findOne();
    if (settings) {
      const heroSlides = (settings.heroSlides || []).map((slide) => ({
        ...slide,
        desktop: slide.desktop?.replace(/\.(png|jpg|jpeg|JPG|JPEG)$/i, ".webp"),
        mobile: slide.mobile?.replace(/\.(png|jpg|jpeg|JPG|JPEG)$/i, ".webp"),
      }));
      const midBanner = settings.midBanner?.replace(/\.(png|jpg|jpeg|JPG|JPEG)$/i, ".webp");
      await db.collection("homepage_settings").updateOne(
        { _id: settings._id },
        { $set: { heroSlides, midBanner } }
      );
      console.log("✓ Updated homepage_settings with WebP URLs in MongoDB");
    }

    // 2. Categories
    const categories = await db.collection("categories").find({}).toArray();
    for (const cat of categories) {
      if (cat.image && !cat.image.endsWith(".webp")) {
        const webpImg = cat.image.replace(/\.(png|jpg|jpeg|JPG|JPEG)$/i, ".webp");
        await db.collection("categories").updateOne({ _id: cat._id }, { $set: { image: webpImg } });
      }
    }
    console.log(`✓ Updated categories to WebP in MongoDB`);

    // 3. Product Images (All Featured & Active)
    const images = await db.collection("productimage").find({}).toArray();
    for (const img of images) {
      if (img.url && !img.url.endsWith(".webp")) {
        const webpUrl = img.url.replace(/\.(png|jpg|jpeg|JPG|JPEG)$/i, ".webp");
        await db.collection("productimage").updateOne({ _id: img._id }, { $set: { url: webpUrl } });
      }
    }
    console.log(`✓ Updated ${images.length} productimage records to WebP in MongoDB`);

  } catch (err) {
    console.warn("MongoDB connection note:", err.message);
  } finally {
    if (client) await client.close();
  }

  console.log('=== Active Assets Optimization Complete! ===');
}

run();
