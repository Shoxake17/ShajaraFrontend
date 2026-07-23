// src/features/landing/components/AppPromo.tsx
// "Har doim yoningizda" (ilova targ'iboti) bo'limi — alohida, mustaqil
// komponent. Stillar: ./AppPromo.css | Telefon logotipi: /phone.png rasmidan.
import { useTranslation } from 'react-i18next';
import { AppleIcon, PlayStoreIcon } from '@/shared/ui/icons';
import './AppPromo.css';

// Android "bugdroid" maskoti siluetini rasmiy brend yashil rangida
// (#3DDC84) — umumiy yuklab olish strelkasi EMAS.
const AndroidApkIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="#3DDC84">
    <path d="M7.4 4.9 6.1 2.9a.55.55 0 0 1 .92-.6l1.38 2.15a7 7 0 0 1 6.4 0L16.18 2.3a.55.55 0 0 1 .92.6l-1.3 2a7 7 0 0 1 2.87 4.9H4.53A7 7 0 0 1 7.4 4.9Z" />
    <rect x="4.4" y="10.9" width="15.2" height="7.6" rx="1.4" />
    <rect x="2.4" y="11.6" width="1.7" height="5.4" rx="0.85" />
    <rect x="19.9" y="11.6" width="1.7" height="5.4" rx="0.85" />
    <rect x="8.3" y="19.5" width="1.8" height="3" rx="0.9" />
    <rect x="13.9" y="19.5" width="1.8" height="3" rx="0.9" />
  </svg>
);
// Windows'ning rasmiy 4-panelli "bayroq" logotipi (Windows 11 uslubi,
// Microsoft brend ko'k rangida) — umumiy monitor belgisi EMAS.
const WindowsIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="#0078D4">
    <path d="M3 5.6 10.8 4.5v6.9H3Z" />
    <path d="M11.8 4.3 21 3v8.3h-9.2Z" />
    <path d="M3 12.4h7.8v6.9L3 18.2Z" />
    <path d="M11.8 12.4H21V21l-9.2-1.3Z" />
  </svg>
);

export function AppPromo() {
  const { t } = useTranslation();
  return (
    <section className="appPromo">
      <div className="appPromo__inner">
        <div>
          <p className="appPromo__eyebrow">{t('landing.appPromo.eyebrow')}</p>
          <h2 className="appPromo__title">{t('landing.appPromo.title')}</h2>
          <p className="appPromo__text">{t('landing.appPromo.text')}</p>

          <div className="appPromo__stores">
            <a href="#" className="appPromo__storeBtn">
              <AppleIcon className="h-6 w-6" />
              <span>
                <span className="appPromo__storeLabel">{t('landing.appPromo.appStoreLabel')}</span>
                <span className="appPromo__storeName">{t('landing.appPromo.downloadSuffix')}</span>
              </span>
            </a>
            <a href="#" className="appPromo__storeBtn">
              <PlayStoreIcon />
              <span>
                <span className="appPromo__storeLabel">{t('landing.appPromo.googlePlayLabel')}</span>
                <span className="appPromo__storeName">{t('landing.appPromo.downloadSuffix')}</span>
              </span>
            </a>
            {/* AJDO.apk — nginx orqali statik fayl sifatida xizmat qiladi
                (downloads/, ILDIZ darajasida — public/ ICHIDA EMAS, aks
                holda Android build'iga o'zi bilan birga nusxalanib
                qolardi. GitHub Actions har push'da avtomatik yangilaydi —
                deploy.yml#build-apk). `download` atributi brauzerga
                faylni ochish EMAS, TO'G'RIDAN-TO'G'RI YUKLASHNI buyuradi. */}
            <a href="/downloads/AJDO.apk" download="AJDO.apk" className="appPromo__storeBtn">
              <AndroidApkIcon />
              <span>
                <span className="appPromo__storeLabel">{t('landing.appPromo.apkLabel')}</span>
                <span className="appPromo__storeName">{t('landing.appPromo.downloadSuffix')}</span>
              </span>
            </a>
            {/* AJDO.exe — AJDO.apk bilan bir xil naqsh: nginx statik
                fayl sifatida xizmat qiladi (downloads/desktop/, ILDIZ
                darajasida). GitHub Actions har push'da avtomatik
                yangilaydi — deploy.yml#build-desktop. O'rnatilgach,
                Electron'ning o'zi (electron-updater) keyingi
                yangilanishlarni AVTOMATIK tekshiradi va bitta tugma bilan
                yangilaydi. */}
            <a href="/downloads/desktop/AJDO.exe" download="AJDO.exe" className="appPromo__storeBtn">
              <WindowsIcon />
              <span>
                <span className="appPromo__storeLabel">{t('landing.appPromo.desktopLabel')}</span>
                <span className="appPromo__storeName">{t('landing.appPromo.downloadSuffix')}</span>
              </span>
            </a>
          </div>
        </div>

        <div className="appPromo__phoneWrap">
            <img
              src="/phone.png"
              alt={t('landing.appPromo.logoAlt')}
              draggable={false}
              className="appPromo__phoneLogo"
            />
        </div>
      </div>
    </section>
  );
}