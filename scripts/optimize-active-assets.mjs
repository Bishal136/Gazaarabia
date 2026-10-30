import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function optimizeFile(filePath, maxWidth = 1920, isCategory = false) {
  try {
    const stat = fs.statSync(filePath);
    const originalSize = stat.size;
    const ext = path.extname(filePath).toLowerCase();

    const targetWidth = isCategory ? 800 : maxWidth;

    let pipeline = sharp(filePath).resize({
      width: targetWidth,
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
    } else {
      console.log(`[SKIPPED] ${path.basename(filePath)}: already optimal`);
    }
  } catch (err) {
    console.error(`[ERROR] ${filePath}:`, err.message);
  }
}

async function run() {
  console.log('=== Optimizing Active Homepage Banners & Category Icons ===');

  const banners = [
    '/var/www/Gazaarabia/uploads/homepage/hero/1778924120493-Herro--Banner.png',
    '/var/www/Gazaarabia/uploads/homepage/hero/1779392901001-Herro-Banner-Movile-Vertion.png',
    '/var/www/Gazaarabia/uploads/homepage/banner/1779034450855-Bottom-Banner.png'
  ];

  for (const b of banners) {
    if (fs.existsSync(b)) await optimizeFile(b, 1920, false);
  }

  const categoryDir = '/var/www/Gazaarabia/uploads/categories';
  if (fs.existsSync(categoryDir)) {
    const catFiles = fs.readdirSync(categoryDir);
    for (const file of catFiles) {
      const p = path.join(categoryDir, file);
      if (fs.statSync(p).isFile() && (p.endsWith('.png') || p.endsWith('.jpg') || p.endsWith('.jpeg'))) {
        await optimizeFile(p, 800, true);
      }
    }
  }

  console.log('=== Done! ===');
}

run();
