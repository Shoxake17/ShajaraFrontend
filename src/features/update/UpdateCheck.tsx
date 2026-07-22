// features/update/UpdateCheck.tsx
// Ilova ICHIDAGI yangilanish tekshiruvi — FAQAT nativ (APK) ilovada ishlaydi.
//
// MUHIM (texnik chegara): Android sideload (Play Market'siz o'rnatilgan)
// ilovalarni HECH QANDAY usul bilan SUKUT (silent, foydalanuvchi
// bilmasdan) avtomatik yangilay OLMAYDI — bu Android'ning o'zining
// xavfsizlik siyosati (har qanday APK o'rnatish/yangilash FOYDALANUVCHI
// tomonidan albatta tasdiqlanishi SHART, hatto ilovaning o'zi so'rasa
// ham). Shu bois bu component "to'liq avtomatik" emas — u ilova
// ochilganda serverdagi eng so'nggi versiyani tekshiradi va yangisi
// bo'lsa BITTA TUGMA bilan yangilashni taklif qiladi (foydalanuvchi
// qayta saytga kirib APK qidirib yuklab olishi SHART emas).
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useTranslation } from 'react-i18next';
import { env } from '@/shared/config/env';
import { APP_VERSION_CODE } from '@/generated/app-version';

interface LatestManifest {
  versionCode: number;
  versionName: string;
}

const APK_URL = `${env.downloadsBaseUrl}/downloads/AJDO.apk`;
const MANIFEST_URL = `${env.downloadsBaseUrl}/downloads/latest.json`;

export function UpdateCheck() {
  const { t } = useTranslation();
  const [latest, setLatest] = useState<LatestManifest | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    fetch(MANIFEST_URL)
      .then((r) => (r.ok ? (r.json() as Promise<LatestManifest>) : null))
      .then((data) => {
        if (data && data.versionCode > APP_VERSION_CODE) setLatest(data);
      })
      .catch(() => undefined); // internet yo'q/server javob bermasa — jim e'tiborsiz qoldiriladi
  }, []);

  if (!latest || dismissed) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white p-3.5 shadow-card sm:inset-x-auto sm:right-4 sm:w-80">
      <p className="text-[13px] text-brand-800">{t('update.available', { version: latest.versionName })}</p>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-xs font-medium text-neutral-400 transition-colors hover:text-neutral-600"
        >
          {t('update.later')}
        </button>
        {/* MUHIM: bu havola ilovaning O'Z domenidan (ajdo.uz) TASHQARIGA
            chiqadi — Capacitor'ning standart xatti-harakati bo'yicha
            (capacitor.config.ts'da allowNavigation ro'yxatiga kiritilmagan
            har qanday havola) tizim brauzerida ochiladi, u yerda Android
            APK'ni yuklab, o'rnatishni foydalanuvchidan so'raydi. */}
        <a
          href={APK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-field bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-800"
        >
          {t('update.action')}
        </a>
      </div>
    </div>
  );
}
