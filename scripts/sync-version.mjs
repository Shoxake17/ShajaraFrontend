// scripts/sync-version.mjs
// android/app/build.gradle'dagi versionCode/versionName'ni o'qib,
// src/generated/app-version.ts'ga yozadi — ilova ICHIDAGI yangilanish
// tekshiruvi (UpdateCheck.tsx) shu qiymatni serverdagi downloads/latest.json
// bilan solishtiradi. `npm run build:capacitor`dan OLDIN ishga tushadi,
// shu bois har bir nativ build o'zining haqiqiy versiyasini bilib qoladi
// (qo'lda ikki joyda alohida-alohida yangilash SHART emas).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const gradlePath = join(__dirname, '..', 'android', 'app', 'build.gradle');
const gradle = readFileSync(gradlePath, 'utf8');

const versionCodeMatch = gradle.match(/versionCode\s+(\d+)/);
const versionNameMatch = gradle.match(/versionName\s+"([^"]+)"/);
if (!versionCodeMatch || !versionNameMatch) {
  throw new Error("android/app/build.gradle'dan versionCode/versionName topilmadi");
}

const outDir = join(__dirname, '..', 'src', 'generated');
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, 'app-version.ts'),
  `// AVTOMATIK GENERATSIYA QILINGAN — qo'lda tahrirlamang.
// Manba: scripts/sync-version.mjs, android/app/build.gradle'dan o'qiydi.
export const APP_VERSION_CODE = ${versionCodeMatch[1]};
export const APP_VERSION_NAME = '${versionNameMatch[1]}';
`,
);

console.log(`app-version.ts yangilandi: versionCode=${versionCodeMatch[1]}, versionName=${versionNameMatch[1]}`);
