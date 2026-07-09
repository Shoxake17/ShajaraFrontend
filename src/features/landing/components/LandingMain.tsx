// src/features/landing/components/LandingMain.tsx
// Landing sahifaning Hero (Main) bo'limi — alohida, mustaqil komponent.
// Stillar: ./LandingMain.css | Jonli: kirish animatsiyalari, suzuvchi
// daraxt, pulsatsiyalanuvchi nur va uchib tushayotgan barglar.
// Daraxt rasmi mix-blend-mode + mask orqali fonga to'liq singdirilgan.
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@/shared/ui/icons';
import './LandingMain.css';

const AVATARS = [
  { initials: 'A', variant: 'landingMain__avatar--light' },
  { initials: 'B', variant: 'landingMain__avatar--mid' },
  { initials: 'D', variant: 'landingMain__avatar--dark' },
];

/** Bitta barg SVG shakli — 5 nusxada turli o'lcham/tezlikda uchadi */
function Leaf({ className }: { className: string }) {
  return (
    <span className={`landingMain__leaf ${className}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.6 3.2C12 3.5 5.6 6.2 4.3 12.6c-.8 4 1.5 7.4 2 8.1.3-1.9 1.2-5.7 3.6-8.6-1 2.6-1.9 6.3-1.6 9 .8.4 2.6 1 4.7.6 6.6-1.2 7.8-9.4 7.9-15.3 0-1.8-1.5-3.3-3.3-3.2z" />
      </svg>
    </span>
  );
}

export function LandingMain() {
  return (
    <section id="asosiy" className="landingMain">
      {/* Uchib tushayotgan barglar — butun hero bo'ylab */}
      <Leaf className="landingMain__leaf--1" />
      <Leaf className="landingMain__leaf--2" />
      <Leaf className="landingMain__leaf--3" />
      <Leaf className="landingMain__leaf--4" />
      <Leaf className="landingMain__leaf--5" />

      <div className="landingMain__inner">
        {/* Chap blok — matn va tugmalar (ketma-ket paydo bo'ladi) */}
        <div>
          <h1 className="landingMain__title">Shajara</h1>

          <p className="landingMain__subtitle">
            Yangi hisob yarating
            <br />
            va oila daraxtingizni boshlang
          </p>

          <p className="landingMain__description">
            Oila tarixingizni asrang, avlodlaringizni bog&#8216;lang va kelajak uchun meros
            qoldiring.
          </p>

          <div className="landingMain__actions">
            <Link to="/register" className="landingMain__ctaPrimary">
              Bepul boshlash
              <ArrowRightIcon />
            </Link>
            <a href="#imkoniyatlar" className="landingMain__ctaSecondary">
              Ko&#8216;proq ma&#8216;lumot
            </a>
          </div>

          <div className="landingMain__proof">
            <div className="landingMain__avatars">
              {AVATARS.map((a) => (
                <span key={a.initials} className={`landingMain__avatar ${a.variant}`}>
                  {a.initials}
                </span>
              ))}
            </div>
            <p className="landingMain__proofText">
              <span className="landingMain__proofStrong">10,000+</span> foydalanuvchi
              <br />
              bizga ishonadi
            </p>
          </div>
        </div>

        {/* O'ng blok — daraxt fonga singdirilgan, chegarasiz */}
        <div className="landingMain__visual">
          <div className="landingMain__glow" aria-hidden="true" />
          <img
            src="/landingtree.png"
            alt="Shajara daraxti"
            draggable={false}
            className="landingMain__image"
          />
        </div>
      </div>
    </section>
  );
}