// src/features/landing/components/Features.tsx
// "Nima uchun Shajara?" bo'limi — alohida, mustaqil komponent.
// Stillar: ./Features.css
import { useTranslation } from 'react-i18next';
import { CloudIcon, ShieldCheckIcon, TreeIcon, UsersDuoIcon } from '@/shared/ui/icons';
import './Features.css';

export function Features() {
  const { t } = useTranslation();
  const FEATURES = [
    { Icon: TreeIcon, title: t('landing.features.tree.title'), description: t('landing.features.tree.description') },
    { Icon: ShieldCheckIcon, title: t('landing.features.secure.title'), description: t('landing.features.secure.description') },
    { Icon: CloudIcon, title: t('landing.features.cloud.title'), description: t('landing.features.cloud.description') },
    { Icon: UsersDuoIcon, title: t('landing.features.share.title'), description: t('landing.features.share.description') },
  ];
  return (
    <section id="imkoniyatlar" className="features">
      <div className="features__inner">
        <div className="features__head">
          <h2 className="features__title">{t('landing.features.title')}</h2>
          <p className="features__subtitle">{t('landing.features.subtitle')}</p>
        </div>

        <div className="features__grid">
          {FEATURES.map(({ Icon, title, description }) => (
            <div key={title} className="features__card">
              <span className="features__icon">
                <Icon width={24} height={24} />
              </span>
              <h3 className="features__cardTitle">{title}</h3>
              <p className="features__cardText">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
