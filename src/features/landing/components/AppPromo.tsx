// src/features/landing/components/AppPromo.tsx
// "Har doim yoningizda" (ilova targ'iboti) bo'limi — alohida, mustaqil
// komponent. Stillar: ./AppPromo.css | Telefon logotipi: /phone.png rasmidan.
import { useTranslation } from 'react-i18next';
import { AppleIcon, PlayStoreIcon } from '@/shared/ui/icons';
import './AppPromo.css';

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