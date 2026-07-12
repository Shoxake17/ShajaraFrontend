// app/BottomNav.tsx
// Pastki tab-bar — FAQAT mobil/kichik ekranlarda (`lg:` dan pastda, <1024px).
// Desktop/tabletда buning o'rniga chap Sidebar ishlatiladi (`Sidebar.tsx`).
// Odatiy mobil ilova naqshi: 5 ta asosiy bo'lim, ikon ustida + qisqa yorliq
// ostida. "Chiqish" bu yerda YO'Q (5 ta band joy yetarli) — u Sozlamalar
// sahifasida (mobil va desktopда bir xil) joylashgan.
import { NavLink } from 'react-router-dom';
import { NAV } from './nav-items';

export function BottomNav() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
      isActive ? 'text-brand-800' : 'text-brand-400',
    ].join(' ');

  return (
    // Apple/app uslubi: suzuvchi (floating) TO'LIQ yumaloq (pill) karta —
    // atrofida joy (mx/mb), ANIQ ko'rinadigan border + soya.
    <nav
      aria-label="Asosiy navigatsiya"
      className="mx-3 mb-[max(0.75rem,env(safe-area-inset-bottom))] flex shrink-0 overflow-hidden rounded-full border-2 border-brand-200 bg-white shadow-md lg:hidden"
    >
      {NAV.map(({ to, shortLabel, Icon, img, end }) => (
        <NavLink key={to} to={to} end={end} className={linkClass}>
          {img ? (
            <img src={img} alt="" className="h-7 w-7 object-contain" />
          ) : Icon ? (
            <Icon width={22} height={22} />
          ) : null}
          <span className="truncate">{shortLabel}</span>
        </NavLink>
      ))}
    </nav>
  );
}
