import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const TARGET_EXTENSIONS = new Set(['.js', '.css', '.svg', '.json', '.txt', '.xml', '.html', '.ico', '.map']);

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  }
  return arrayOfFiles;
}

try {
  const targetDir = path.resolve('.next/static');
  if (fs.existsSync(targetDir)) {
    console.log('Pre-compressing static assets with Gzip and Brotli for Nginx gzip_static / brotli_static...');
    const allFiles = getAllFiles(targetDir);
    let count = 0;

    for (const filePath of allFiles) {
      const ext = path.extname(filePath).toLowerCase();
      if (TARGET_EXTENSIONS.has(ext) && !filePath.endsWith('.gz') && !filePath.endsWith('.br')) {
        const content = fs.readFileSync(filePath);

        // 1. Generate .gz (level 9 maximum compression)
        const gzPath = `${filePath}.gz`;
        if (!fs.existsSync(gzPath)) {
          const gzipped = zlib.gzipSync(content, { level: 9 });
          fs.writeFileSync(gzPath, gzipped);
        }

        // 2. Generate .br (brotli quality 9 optimal compression/speed)
        const brPath = `${filePath}.br`;
        if (!fs.existsSync(brPath)) {
          const brotlied = zlib.brotliCompressSync(content, {
            params: {
              [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
              [zlib.constants.BROTLI_PARAM_QUALITY]: 9,
            },
          });
          fs.writeFileSync(brPath, brotlied);
        }

        count++;
      }
    }
    console.log(`Pre-compression complete. Processed ${count} static assets (.gz and .br generated).`);
  }
} catch (e) {
  console.warn('Pre-compression skipped or warning:', e?.message || e);
}
