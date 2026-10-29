import { execSync } from 'child_process';
import fs from 'fs';

try {
  if (fs.existsSync('.next/static')) {
    console.log('Pre-compressing static assets with gzip for Nginx gzip_static...');
    execSync('find .next/static -type f \\( -name "*.js" -o -name "*.css" \\) -exec gzip -k -9 -f {} +', { stdio: 'inherit' });
    console.log('Pre-compression complete.');
  }
} catch (e) {
  console.warn('Pre-compression skipped or warning:', e?.message || e);
}
