// app/ThemeBackground.tsx
// "Light" (shisha) ko'rinish rejimida butun ekranni qopligan tabiat
// surati — desktop.jpg (lg+) yoki mobile.jpg (kichik ekran). Boshqa
// rejimlarda (soft/dark) umuman render qilinmaydi.
//
// MUHIM: har bir breakpoint uchun O'ZINING mustaqil `fixed inset-0`
// elementi bor (ICHKI qo'shimcha wrapper YO'Q) — o'lchami to'g'ridan-to'g'ri
// viewport'ga (inset:0) bog'liq, oraliq h-full/w-full % hisoblashiga
// tayanmaydi. Shu bois har qanday holatda ham butun ekranga (chap/o'ng
// chetlarigacha) to'liq yoyiladi — "o'ng va chap tomonlariga yoyilmasdan
// qolib qora bo'lib qolgan" fikr-mulohaza bo'yicha mustahkamlangan.
// background-size/position/repeat inline style orqali (Tailwind klass
// emas) — hech qanday specificity/purge shubhasisiz har doim qo'llanadi.
import type { CSSProperties } from 'react';
import { useTheme } from '@/shared/hooks/useTheme';

const coverStyle = (url: string): CSSProperties => ({
  backgroundImage: `url('${url}')`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
});

export function ThemeBackground() {
  const { theme } = useTheme();
  if (theme !== 'light') return null;

  return (
    <>
      <div className="pointer-events-none fixed inset-0 -z-10 lg:hidden" aria-hidden="true" style={coverStyle('/mobile.jpg')} />
      <div className="pointer-events-none fixed inset-0 -z-10 hidden lg:block" aria-hidden="true" style={coverStyle('/desktop.jpg')} />
    </>
  );
}
