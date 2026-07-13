// src/features/landing/components/Stats.tsx
// Statistika paneli — alohida, mustaqil komponent. Stillar: ./Stats.css
import { useTranslation } from 'react-i18next';
import { CloudIcon, GiftIcon, ShieldCheckIcon, TreeIcon } from '@/shared/ui/icons';
import './Stats.css';

export function Stats() {
  const { t } = useTranslation();
  const STATS = [
    { Icon: GiftIcon, value: '10,000+', label: t('landing.stats.users') },
    { Icon: TreeIcon, value: '50,000+', label: t('landing.stats.trees') },
    { Icon: CloudIcon, value: '100,000+', label: t('landing.stats.memories') },
    { Icon: ShieldCheckIcon, value: '99.9%', label: t('landing.stats.security') },
  ];
  return (
    <section id="afzalliklar" className="stats">
      <div className="stats__grid">
        {STATS.map(({ Icon, value, label }) => (
          <div key={label} className="stats__item">
            <span className="stats__icon">
              <Icon width={20} height={20} />
            </span>
            <div>
              <p className="stats__value">{value}</p>
              <p className="stats__label">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
