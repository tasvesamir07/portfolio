import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, 'dist', 'assets');
const SIZE_LIMIT_KB = 200; // 200KB limit for gzipped assets

if (!fs.existsSync(DIST_DIR)) {
    console.error('Error: Build directory not found. Please run npm run build first.');
    process.exit(1);
}

const files = fs.readdirSync(DIST_DIR);
let failed = false;

console.log('Checking bundle sizes against a budget of ' + SIZE_LIMIT_KB + ' KB gzipped...');

files.forEach(file => {
    if (file.endsWith('.js')) {
        const filePath = path.join(DIST_DIR, file);
        const content = fs.readFileSync(filePath);
        const gzipped = zlib.gzipSync(content);
        const sizeKb = gzipped.length / 1024;

        console.log(`Asset: ${file} | Size (Gzipped): ${sizeKb.toFixed(2)} KB`);

        if (sizeKb > SIZE_LIMIT_KB) {
            console.error(`  FAIL: Asset exceeds size budget of ${SIZE_LIMIT_KB} KB!`);
            failed = true;
        }
    }
});

if (failed) {
    console.error('Build bundle budget check failed.');
    process.exit(1);
} else {
    console.log('Success: All JS bundle sizes are within the budget!');
    process.exit(0);
}
