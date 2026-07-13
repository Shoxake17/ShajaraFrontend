// src/features/landing/components/Navbar.tsx
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/shared/hooks/useLanguage';
import './Navbar.css';

export function Navbar() {
  const { t } = useTranslation();
  const { language, cycleLanguage } = useLanguage();
  const NAV_LINKS = [
    { href: '#asosiy', label: t('landing.navbar.links.home') },
    { href: '#imkoniyatlar', label: t('landing.navbar.links.features') },
    { href: '#afzalliklar', label: t('landing.navbar.links.benefits') },
    { href: '#tariflar', label: t('landing.navbar.links.pricing') },
    { href: '#faq', label: t('landing.navbar.links.faq') },
  ];
  return (
    <header className="navbar">
      <div className="navbar__inner">
        {/* Logo — register.png rasmidan */}
        <Link to="/" className="navbar__brand">
          <img
            src="/registertree.png"
            alt={t('landing.navbar.logoAlt')}
            draggable={false}
            className="navbar__logoImg"
          />
          <span className="navbar__brandName">Shajara</span>
        </Link>

        {/* Markaziy navigatsiya havolalari */}
        <nav className="navbar__nav">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="navbar__link">
              {l.label}
            </a>
          ))}
        </nav>

        {/* O'ng blok: til tanlagich + Kirish tugmasi */}
        <div className="navbar__actions">
          <button
            type="button"
            className="navbar__lang"
            aria-label={t('landing.navbar.langLabel')}
            onClick={cycleLanguage}
          >
            {/* Globus ikonkasi */}
            <svg
              className="navbar__langIcon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            {language.toUpperCase()}
            {/* Chevron (pastga) ikonkasi */}
            <svg
              className="navbar__langChevron"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          <Link to="/login" className="navbar__cta">
            {t('landing.navbar.login')}
          </Link>
        </div>
      </div>
    </header>
  );
}