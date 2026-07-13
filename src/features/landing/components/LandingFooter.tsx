// src/features/landing/components/LandingFooter.tsx
// Landing sahifa footer bo'limi — alohida, mustaqil komponent.
// Stillar: ./LandingFooter.css
import { useTranslation } from 'react-i18next';
import { ArrowRightIcon, FacebookIcon, InstagramIcon, TelegramIcon } from '@/shared/ui/icons';
import { TreeLogo } from '@/shared/ui/TreeLogo';
import { useLanguage } from '@/shared/hooks/useLanguage';
import './LandingFooter.css';

export function LandingFooter() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const FOOTER_SECTIONS = [
    {
      title: t('landing.footer.sectionsTitle'),
      links: [
        { href: '#asosiy', label: t('landing.navbar.links.home') },
        { href: '#imkoniyatlar', label: t('landing.navbar.links.features') },
        { href: '#afzalliklar', label: t('landing.navbar.links.benefits') },
        { href: '#tariflar', label: t('landing.navbar.links.pricing') },
        { href: '#faq', label: t('landing.navbar.links.faq') },
      ],
    },
    {
      title: t('landing.footer.usefulLinksTitle'),
      links: [
        { href: '#', label: t('landing.footer.links.blog') },
        { href: '#', label: t('landing.footer.links.guide') },
        { href: '#', label: t('landing.footer.links.privacy') },
        { href: '#', label: t('landing.footer.links.terms') },
        { href: '#', label: t('landing.footer.links.about') },
      ],
    },
  ];
  return (
    <footer id="faq" className="landingFooter">
      <div className="landingFooter__inner">
        <div className="landingFooter__grid">
          <div>
            <div className="landingFooter__brand">
              <TreeLogo className="h-7 w-7 text-brand-800" />
              <span className="landingFooter__brandName">Shajara</span>
            </div>
            <p className="landingFooter__desc">{t('landing.footer.desc')}</p>
            <div className="landingFooter__social">
              <a href="#" aria-label="Telegram" className="landingFooter__socialBtn">
                <TelegramIcon width={16} height={16} />
              </a>
              <a href="#" aria-label="Instagram" className="landingFooter__socialBtn">
                <InstagramIcon />
              </a>
              <a href="#" aria-label="Facebook" className="landingFooter__socialBtn">
                <FacebookIcon />
              </a>
            </div>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h4 className="landingFooter__heading">{section.title}</h4>
              <div className="landingFooter__links">
                {section.links.map((l) => (
                  <a key={l.label} href={l.href} className="landingFooter__link">
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
          ))}

          <div>
            <h4 className="landingFooter__heading">{t('landing.footer.newsTitle')}</h4>
            <p className="landingFooter__newsText">{t('landing.footer.newsText')}</p>
            <form onSubmit={(e) => e.preventDefault()} className="landingFooter__newsForm">
              <input
                type="email"
                required
                placeholder={t('landing.footer.emailPlaceholder')}
                className="landingFooter__newsInput"
              />
              <button type="submit" aria-label={t('landing.footer.subscribe')} className="landingFooter__newsBtn">
                <ArrowRightIcon width={16} height={16} />
              </button>
            </form>
          </div>
        </div>

        <div className="landingFooter__bottom">
          <p>{t('landing.footer.copyright')}</p>
          <span>
            {language === 'ru' ? t('landing.footer.langRu') : language === 'en' ? t('landing.footer.langEn') : t('landing.footer.langUz')}
          </span>
        </div>
      </div>
    </footer>
  );
}
