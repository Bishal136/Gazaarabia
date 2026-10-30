import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const APP_DIR = process.env.APP_DIR || (fs.existsSync('/var/www/Gazaarabia') ? '/var/www/Gazaarabia' : process.cwd());

async function optimizeFile(filePath, maxWidth = 800) {
  try {
    const stat = fs.statSync(filePath);
    const originalSize = stat.size;
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    const webpPath = path.join(path.dirname(filePath), `${baseName}.webp`);

    let buffer = await sharp(filePath)
      .resize({
        width: maxWidth,
        withoutEnlargement: true,
        fit: 'inside',
      })
      .webp({ quality: 78 })
      .toBuffer();

    fs.writeFileSync(webpPath, buffer);
    const savedPercent = (((originalSize - buffer.length) / originalSize) * 100).toFixed(1);
    console.log(`[WEBP] ${path.basename(filePath)}: ${(originalSize/1024).toFixed(0)}KB -> ${(buffer.length/1024).toFixed(0)}KB (saved ${savedPercent}%)`);
  } catch (err) {
    console.error(`[ERROR] ${filePath}:`, err.message);
  }
}

async function run() {
  console.log(`=== Converting Product & Variant Photos to WebP (Root: ${APP_DIR}) ===`);

  const prodDir = path.join(APP_DIR, 'uploads/products');
  if (fs.existsSync(prodDir)) {
    const files = fs.readdirSync(prodDir);
    for (const file of files) {
      const p = path.join(prodDir, file);
      try {
        if (fs.statSync(p).isFile() && (p.endsWith('.png') || p.endsWith('.jpg') || p.endsWith('.jpeg') || p.endsWith('.JPG') || p.endsWith('.JPEG'))) {
          await optimizeFile(p, 800);
        }
      } catch (e) {}
    }
  }

  const varDir = path.join(APP_DIR, 'uploads/variants');
  if (fs.existsSync(varDir)) {
    const files = fs.readdirSync(varDir);
    for (const file of files) {
      const p = path.join(varDir, file);
      try {
        if (fs.statSync(p).isFile() && (p.endsWith('.png') || p.endsWith('.jpg') || p.endsWith('.jpeg') || p.endsWith('.JPG') || p.endsWith('.JPEG'))) {
          await optimizeFile(p, 800);
        }
      } catch (e) {}
    }
  }

  console.log('=== Product WebP Optimization Complete! ===');
}

run();
