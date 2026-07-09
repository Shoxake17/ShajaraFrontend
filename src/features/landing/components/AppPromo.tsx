// src/features/landing/components/AppPromo.tsx
// "Har doim yoningizda" (ilova targ'iboti) bo'limi — alohida, mustaqil
// komponent. Stillar: ./AppPromo.css | Telefon logotipi: /phone.png rasmidan.
import { AppleIcon, PlayStoreIcon } from '@/shared/ui/icons';
import './AppPromo.css';

export function AppPromo() {
  return (
    <section className="appPromo">
      <div className="appPromo__inner">
        <div>
          <p className="appPromo__eyebrow">Oson. Zamonaviy. Ishonchli.</p>
          <h2 className="appPromo__title">Har doim yoningizda</h2>
          <p className="appPromo__text">
            Shajara ilovasi orqali oila tarixingizni istalgan vaqtda, istalgan joyda boshqaring va
            boyiting.
          </p>

          <div className="appPromo__stores">
            <a href="#" className="appPromo__storeBtn">
              <AppleIcon className="h-6 w-6" />
              <span>
                <span className="appPromo__storeLabel">App Store&#8216;dan</span>
                <span className="appPromo__storeName">yuklab oling</span>
              </span>
            </a>
            <a href="#" className="appPromo__storeBtn">
              <PlayStoreIcon />
              <span>
                <span className="appPromo__storeLabel">Google Play&#8216;dan</span>
                <span className="appPromo__storeName">yuklab oling</span>
              </span>
            </a>
          </div>
        </div>

        <div className="appPromo__phoneWrap">
            <img
              src="/phone.png"
              alt="Shajara ilovasi logotipi"
              draggable={false}
              className="appPromo__phoneLogo"
            />
        </div>
      </div>
    </section>
  );
}