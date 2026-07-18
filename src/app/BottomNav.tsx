// app/BottomNav.tsx
// Pastki tab-bar — FAQAT mobil/kichik ekranlarda (`lg:` dan pastda, <1024px).
// Desktop/tabletда buning o'rniga chap Sidebar ishlatiladi (`Sidebar.tsx`).
// Odatiy mobil ilova naqshi: asosiy bo'limlar, ikon ustida + qisqa yorliq
// ostida. "Chiqish" bu yerda YO'Q (5 ta band joy yetarli) — u Sozlamalar
// sahifasida (mobil va desktopда bir xil) joylashgan.
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNavItems } from './nav-items';
import { useChatStore, chatUnreadTotal } from '@/features/chat/model/chat.store';

interface BottomNavProps {
  /** Doska fullscreen rejimida bo'lsa — pastga suzuvchi yopiladi (animatsiya bilan) */
  fullscreen: boolean;
  /** true bo'lsa — animatsiyasiz, DARHOL yashiriladi/ko'rinadi (Xabarlar
      sahifasida suhbatga kirish/chiqish "sirg'alib" ko'rinmasin deb). */
  instant?: boolean;
}

export function BottomNav({ fullscreen, instant }: BottomNavProps) {
  const { t } = useTranslation();
  const NAV = useNavItems();
  const unreadCount = useChatStore((s) => chatUnreadTotal(s.contacts));
  // Odatiy holatda ikon/yozuv YASHIL — qaysi sahifada ekanligini bilish
  // uchun joriy (faol) sahifaning ikonkasi OQ doira ustida turadi (ikonka
  // rangi to'q yashilligicha qoladi, faqat orqa fon oq bo'lib ajralib
  // turadi — "yashil emas, oq bo'lsin" fikr-mulohaza bo'yicha).
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
      isActive ? 'text-brand-800' : 'text-brand-600',
    ].join(' ');

  return (
    // Apple/app uslubi: suzuvchi (floating) TO'LIQ yumaloq (pill) karta —
    // atrofida joy (mx/mb), ANIQ ko'rinadigan border + soya. Fullscreen'da
    // pastga siljib (translate) yopiladi.
    <nav
      aria-label={t('nav.ariaLabel')}
      className={`mx-3 flex shrink-0 overflow-hidden rounded-full border-2 border-brand-200 bg-white shadow-md transition-all ${
        instant ? 'duration-0' : 'duration-300'
      } ease-[cubic-bezier(0.32,0.72,0,1)] lg:hidden ${
        fullscreen
          ? 'mb-0 max-h-0 translate-y-6 opacity-0'
          : 'mb-[max(0.75rem,env(safe-area-inset-bottom))] max-h-20 translate-y-0 opacity-100'
      }`}
    >
      {NAV.map(({ to, shortLabel, Icon, img, end }) => (
        <NavLink key={to} to={to} end={end} className={linkClass}>
          {({ isActive }) => (
            <>
              <span
                className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                  isActive ? 'bg-white shadow-sm' : ''
                }`}
              >
                {img ? (
                  <img src={img} alt="" className="h-6 w-6 object-contain" />
                ) : Icon ? (
                  <Icon width={19} height={19} />
                ) : null}
                {to === '/xabarlar' && unreadCount > 0 && (
                  <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </span>
              <span className="truncate">{shortLabel}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
