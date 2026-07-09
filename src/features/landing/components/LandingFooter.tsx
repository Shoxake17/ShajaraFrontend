// src/features/landing/components/LandingFooter.tsx
// Landing sahifa footer bo'limi — alohida, mustaqil komponent.
// Stillar: ./LandingFooter.css
import { ArrowRightIcon, FacebookIcon, InstagramIcon, TelegramIcon } from '@/shared/ui/icons';
import { TreeLogo } from '@/shared/ui/TreeLogo';
import './LandingFooter.css';

const FOOTER_SECTIONS = [
  {
    title: "Bo'limlar",
    links: [
      { href: '#asosiy', label: 'Asosiy' },
      { href: '#imkoniyatlar', label: 'Imkoniyatlar' },
      { href: '#afzalliklar', label: 'Afzalliklar' },
      { href: '#tariflar', label: 'Tariflar' },
      { href: '#faq', label: 'F.A.Q' },
    ],
  },
  {
    title: 'Foydali havolalar',
    links: [
      { href: '#', label: 'Blog' },
      { href: '#', label: "Qo'llanma" },
      { href: '#', label: 'Maxfiylik siyosati' },
      { href: '#', label: 'Foydalanish shartlari' },
      { href: '#', label: 'Biz haqimizda' },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer id="faq" className="landingFooter">
      <div className="landingFooter__inner">
        <div className="landingFooter__grid">
          <div>
            <div className="landingFooter__brand">
              <TreeLogo className="h-7 w-7 text-brand-800" />
              <span className="landingFooter__brandName">Shajara</span>
            </div>
            <p className="landingFooter__desc">
              Shajara — oila tarixini saqlash, avlodlarni bog&#8216;lash va kelajak uchun meros
              qoldirish platformasi.
            </p>
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
            <h4 className="landingFooter__heading">Yangiliklar</h4>
            <p className="landingFooter__newsText">
              Yangiliklar va foydali maqolalar dastlab sizda bo&#8216;lsin.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="landingFooter__newsForm">
              <input
                type="email"
                required
                placeholder="Email manzilingiz"
                className="landingFooter__newsInput"
              />
              <button type="submit" aria-label="Obuna bo'lish" className="landingFooter__newsBtn">
                <ArrowRightIcon width={16} height={16} />
              </button>
            </form>
          </div>
        </div>

        <div className="landingFooter__bottom">
          <p>&copy; 2024 Shajara. Barcha huquqlar himoyalangan.</p>
          <span>UZ O&#8216;zbekcha</span>
        </div>
      </div>
    </footer>
  );
}
