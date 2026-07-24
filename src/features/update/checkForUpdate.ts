// features/update/checkForUpdate.ts
// Mobil (Android/Capacitor) yangilanish tekshiruvining YAGONA manbasi —
// UpdateCheck.tsx (ilova ochilganda avtomatik) VA SettingsPage.tsx
// ("Yangilanishlarni tekshirish" tugmasi, qo'lda) IKKALASI HAM shu bitta
// funksiyani ishlatadi (kod ikki joyda takrorlanmasin uchun).
import { env } from '@/shared/config/env';
import { APP_VERSION_CODE, APP_VERSION_NAME } from '@/generated/app-version';

export interface LatestManifest {
  versionCode: number;
  versionName: string;
}

export interface UpdateCheckResult {
  /** Serverga umuman ulanib bo'ldimi (false — tarmoq/server xatosi) */
  ok: boolean;
  /** Joriy o'rnatilgan versiyadan YANGIROQ topildimi */
  updateAvailable: boolean;
  latest?: LatestManifest;
  currentVersionName: string;
}

const MANIFEST_URL = `${env.downloadsBaseUrl}/downloads/latest.json`;

export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
  try {
    const res = await fetch(MANIFEST_URL);
    if (!res.ok) return { ok: false, updateAvailable: false, currentVersionName: APP_VERSION_NAME };
    const data = (await res.json()) as LatestManifest;
    return {
      ok: true,
      updateAvailable: data.versionCode > APP_VERSION_CODE,
      latest: data,
      currentVersionName: APP_VERSION_NAME,
    };
  } catch {
    // internet yo'q/server javob bermasa
    return { ok: false, updateAvailable: false, currentVersionName: APP_VERSION_NAME };
  }
}
