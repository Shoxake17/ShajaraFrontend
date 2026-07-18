// app/ThemeBackground.tsx
// "Light" va "Dark" (ikkalasi ham shisha) ko'rinish rejimlarida butun
// ekranni qopligan tabiat surati — Light: desktop.jpg (lg+) / mobile.jpg
// (kichik ekran); Dark: darkdesktop.png (lg+) / darkmobile.png (kichik
// ekran, tungi/qorong'i surat). "Soft" rejimida umuman render qilinmaydi.
//
// MUHIM: har bir breakpoint uchun O'ZINING mustaqil `fixed inset-0`
// elementi bor (ICHKI qo'shimcha wrapper YO'Q) — o'lchami to'g'ridan-to'g'ri
// viewport'ga (inset:0) bog'liq, oraliq h-full/w-full % hisoblashiga
// tayanmaydi. Shu bois har qanday holatda ham butun ekranga (chap/o'ng
// chetlarigacha) to'liq yoyiladi.
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
  if (theme === 'soft') return null;

  const mobileUrl = theme === 'dark' ? '/darkmobile.png' : '/mobile.jpg';
  const desktopUrl = theme === 'dark' ? '/darkdesktop.png' : '/desktop.jpg';

  return (
    <>
      <div className="pointer-events-none fixed inset-0 -z-10 lg:hidden" aria-hidden="true" style={coverStyle(mobileUrl)} />
      <div className="pointer-events-none fixed inset-0 -z-10 hidden lg:block" aria-hidden="true" style={coverStyle(desktopUrl)} />
    </>
  );
}
