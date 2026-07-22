// scripts/copy-dist-to-electron.mjs
// `vite build --mode electron` natijasi (dist/) electron/dist/'ga
// nusxalanadi — electron-builder faqat electron/ papkasi ICHIDAGI
// fayllarni paketlay oladi (tashqi "../dist" yo'liga ishonib bo'lmaydi).
import { cpSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, '..', 'dist');
const dest = join(__dirname, '..', 'electron', 'dist');

if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });

console.log(`Veb build electron/dist'ga nusxalandi: ${dest}`);
