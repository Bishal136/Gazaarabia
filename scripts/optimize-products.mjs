import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function optimizeFile(filePath) {
  try {
    const stat = fs.statSync(filePath);
    const originalSize = stat.size;
    if (originalSize < 500 * 1024) return; // Only optimize files > 500KB

    const ext = path.extname(filePath).toLowerCase();

    let pipeline = sharp(filePath).resize({
      width: 1800,
      withoutEnlargement: true,
      fit: 'inside',
    });

    let buffer;
    if (ext === '.png') {
      buffer = await pipeline.png({ quality: 80, compressionLevel: 9 }).toBuffer();
    } else if (ext === '.jpg' || ext === '.jpeg') {
      buffer = await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    } else {
      return;
    }

    if (buffer.length < originalSize) {
      const savedBytes = originalSize - buffer.length;
      const savedPercent = ((savedBytes / originalSize) * 100).toFixed(1);
      fs.writeFileSync(filePath, buffer);
      console.log(`[OPTIMIZED] ${path.basename(filePath)}: ${(originalSize/1024).toFixed(0)}KB -> ${(buffer.length/1024).toFixed(0)}KB (saved ${savedPercent}%)`);
    }
  } catch (err) {
    console.error(`[ERROR] ${filePath}:`, err.message);
  }
}

async function run() {
  console.log('=== Optimizing Heavy Product Photos in /uploads/products (>500KB) ===');

  const prodDir = '/var/www/Gazaarabia/uploads/products';
  if (fs.existsSync(prodDir)) {
    const files = fs.readdirSync(prodDir);
    console.log(`Scanning ${files.length} files...`);
    let count = 0;
    for (const file of files) {
      const p = path.join(prodDir, file);
      try {
        if (fs.statSync(p).isFile() && (p.endsWith('.png') || p.endsWith('.jpg') || p.endsWith('.jpeg') || p.endsWith('.JPG') || p.endsWith('.JPEG'))) {
          await optimizeFile(p);
          count++;
        }
      } catch (e) {}
    }
    console.log(`Processed ${count} product files.`);
  }

  const varDir = '/var/www/Gazaarabia/uploads/variants';
  if (fs.existsSync(varDir)) {
    const files = fs.readdirSync(varDir);
    for (const file of files) {
      const p = path.join(varDir, file);
      try {
        if (fs.statSync(p).isFile() && (p.endsWith('.png') || p.endsWith('.jpg') || p.endsWith('.jpeg') || p.endsWith('.JPG') || p.endsWith('.JPEG'))) {
          await optimizeFile(p);
        }
      } catch (e) {}
    }
  }

  console.log('=== Done! ===');
}

run();
