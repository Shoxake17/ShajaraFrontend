// src/features/landing/components/Stats.tsx
// Statistika paneli — alohida, mustaqil komponent. Stillar: ./Stats.css
import { CloudIcon, GiftIcon, ShieldCheckIcon, TreeIcon } from '@/shared/ui/icons';
import './Stats.css';

const STATS = [
  { Icon: GiftIcon, value: '10,000+', label: 'Foydalanuvchilar' },
  { Icon: TreeIcon, value: '50,000+', label: 'Yaratilgan daraxtlar' },
  { Icon: CloudIcon, value: '100,000+', label: 'Saqlangan xotiralar' },
  { Icon: ShieldCheckIcon, value: '99.9%', label: 'Xavfsizlik darajasi' },
];

export function Stats() {
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
