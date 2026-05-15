// Copies Stockfish WASM files from node_modules into public/stockfish/
// Runs automatically before `npm run dev` and `npm run build`.
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, '../node_modules/stockfish/bin');
const dest = join(__dirname, '../public/stockfish');

mkdirSync(dest, { recursive: true });

const files = [
  ['stockfish-18-single.js', 'stockfish.js'],
  ['stockfish-18-single.wasm', 'stockfish.wasm'],
];

for (const [from, to] of files) {
  const srcPath = join(src, from);
  const destPath = join(dest, to);
  if (!existsSync(srcPath)) {
    console.error(`Missing: ${srcPath}`);
    process.exit(1);
  }
  copyFileSync(srcPath, destPath);
}

console.log('✓ Stockfish files copied to public/stockfish/');
