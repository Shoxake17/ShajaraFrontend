// src/features/landing/components/Features.tsx
// "Nima uchun Shajara?" bo'limi — alohida, mustaqil komponent.
// Stillar: ./Features.css
import { CloudIcon, ShieldCheckIcon, TreeIcon, UsersDuoIcon } from '@/shared/ui/icons';
import './Features.css';

const FEATURES = [
  {
    Icon: TreeIcon,
    title: 'Oila daraxti',
    description: "Avlodlaringizni daraxt ko'rinishida yarating va bog'lang.",
  },
  {
    Icon: ShieldCheckIcon,
    title: 'Xavfsiz maʻlumotlar',
    description: "Ma'lumotlaringiz maksimal darajada himoyalangan va xavfsiz.",
  },
  {
    Icon: CloudIcon,
    title: 'Bulutli saqlash',
    description: "Ma'lumotlaringiz bulutda saqlanadi va istalgan joydan kirish mumkin.",
  },
  {
    Icon: UsersDuoIcon,
    title: "Oila a'zolari bilan ulashish",
    description: "Oila a'zolaringiz bilan daraxtni birgalikda tahrirlash va boshqarish.",
  },
];

export function Features() {
  return (
    <section id="imkoniyatlar" className="features">
      <div className="features__inner">
        <div className="features__head">
          <h2 className="features__title">Nima uchun Shajara?</h2>
          <p className="features__subtitle">
            Oila tarixini saqlash va avlodlarga yetkazish endi juda oson.
          </p>
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
