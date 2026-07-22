// src/features/landing/components/AppPromo.tsx
// "Har doim yoningizda" (ilova targ'iboti) bo'limi — alohida, mustaqil
// komponent. Stillar: ./AppPromo.css | Telefon logotipi: /phone.png rasmidan.
import { useTranslation } from 'react-i18next';
import { AppleIcon, PlayStoreIcon } from '@/shared/ui/icons';
import './AppPromo.css';

const AndroidApkIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v11m0 0-4-4m4 4 4-4" />
    <path d="M5 15v3.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V15" />
  </svg>
);
const DesktopIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4.5" width="18" height="12" rx="2" />
    <path d="M8 20.5h8M12 16.5v4" />
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
                (public/downloads/, GitHub Actions har push'da avtomatik
                yangilaydi — deploy.yml#build-apk). `download` atributi
                brauzerga faylni ochish EMAS, TO'G'RIDAN-TO'G'RI YUKLASHNI
                buyuradi. */}
            <a href="/downloads/AJDO.apk" download="AJDO.apk" className="appPromo__storeBtn">
              <AndroidApkIcon />
              <span>
                <span className="appPromo__storeLabel">{t('landing.appPromo.apkLabel')}</span>
                <span className="appPromo__storeName">{t('landing.appPromo.downloadSuffix')}</span>
              </span>
            </a>
            {/* Desktop versiyasi HALI MAVJUD EMAS — tugma ko'rinadi, lekin
                hech narsa yuklamaydi (onClick — preventDefault). */}
            <button
              type="button"
              onClick={(e) => e.preventDefault()}
              className="appPromo__storeBtn appPromo__storeBtn--disabled"
              aria-disabled="true"
            >
              <DesktopIcon />
              <span>
                <span className="appPromo__storeLabel">{t('landing.appPromo.desktopLabel')}</span>
                <span className="appPromo__storeName">{t('landing.appPromo.comingSoonSuffix')}</span>
              </span>
            </button>
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