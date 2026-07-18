// app/Sidebar.tsx
// Chap navigatsiya paneli — FAQAT desktop/tablet (`lg:` va undan katta, 1024px+).
// Mobil/kichik ekranlarda buning o'rniga pastki tab-bar (`BottomNav.tsx`) ishlatiladi.
import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth';
import { authApi } from '@/features/auth/api/auth.api';
import { useTreeStore } from '@/features/tree/model/tree.store';
import { useStorageStore, formatBytes } from '@/features/storage/storage.store';
import { useChatStore, chatUnreadTotal } from '@/features/chat/model/chat.store';
import { teardownWebPush } from '@/features/push/push.web';
import { PricingModal } from '@/features/billing/components/PricingModal';
import { useTheme } from '@/shared/hooks/useTheme';
import { useNavItems, LogoutIcon } from './nav-items';

const MB = 1024 * 1024;

interface SidebarProps {
  /** Doska fullscreen rejimida bo'lsa — chapga suzuvchi yopiladi (animatsiya bilan) */
  fullscreen: boolean;
}

export function Sidebar({ fullscreen }: SidebarProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const NAV = useNavItems();
  const navigate = useNavigate();
  const clearSession = useAuthStore((s) => s.logout);
  const usedBytes = useStorageStore((s) => s.usedBytes);
  const limitBytes = useStorageStore((s) => s.limitBytes);
  const loadUsage = useStorageStore((s) => s.loadUsage);
  const unreadCount = useChatStore((s) => chatUnreadTotal(s.contacts));
  const [loggingOut, setLoggingOut] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);

  // Xotira sarfini yuklaymiz (a'zo/media o'zgarganда qayta yuklanadi)
  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  const percent = limitBytes > 0 ? Math.min(100, Math.round((usedBytes / limitBytes) * 100)) : 0;
  const remaining = limitBytes - usedBytes;
  // Rang (100 MB tarif): 10 MB dan kam qolsa qizil, 30 MB dan kam qolsa sariq, aks holda yashil
  const barColor =
    remaining < 10 * MB ? 'bg-red-500' : remaining < 30 * MB ? 'bg-amber-400' : 'bg-brand-600';
  const pctColor =
    remaining < 10 * MB ? 'text-red-600' : remaining < 30 * MB ? 'text-amber-600' : 'text-brand-800';

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await teardownWebPush().catch(() => undefined);
      await authApi.logout().catch(() => undefined);
      useTreeStore.getState().reset();
      useStorageStore.getState().reset();
      useChatStore.getState().disconnect();
      useChatStore.getState().reset();
      clearSession();
      navigate('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  // Desktopda: faol sahifaning ikonkasi VA yozuvi OQ rangda, orqasida
  // to'q yashil (shisha) pill. Light rejimda esa endi FAOL band ham
  // xuddi HOVER holati bilan BIR XIL rangda (och fon + to'q yashil
  // matn) — yashil pill EMAS (fikr-mulohaza: "tanlanib kirganda ham
  // yashil emas, hover rangidek bo'lsin"). Nofaol bandlarda ikonka/
  // yozuv rangi TO'Q YASHIL.
  const activePillClass =
    theme === 'light'
      ? 'bg-brand-50 text-brand-900 shadow-sm'
      : 'bg-brand-800 text-white shadow-sm';

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors',
      'justify-center lg:justify-start',
      isActive ? activePillClass : 'text-brand-700 hover:bg-brand-50 hover:text-brand-900',
    ].join(' ');

  return (
    // AJDO logotipi endi BU YERDA emas — umumiy AppLayout header'ida
    // (mockup: desktopajdo.png — logotip butun sahifa tepasida, Sidebar
    // ustida yagona chiziq). Sidebar o'zi suzuvchi bordered/yumaloq karta.
    // Light/Dark (ikkalasi ham shisha) rejimda: chekka bo'rttirilgan
    // (ring + ichki tepa yorug'lik chizig'i) — haqiqiy oynaga o'xshab.
    <aside
      className={`relative mx-3 mb-3 mt-3 hidden min-h-0 w-16 shrink-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:flex ${
        fullscreen
          ? 'lg:w-0 lg:min-w-0 lg:-translate-x-6 lg:border-transparent lg:opacity-0'
          : theme === 'light'
            ? 'border-white/50 ring-1 ring-white/30 lg:w-60 lg:translate-x-0'
            : theme === 'dark'
              ? 'border-white/10 ring-1 ring-white/10 lg:w-60 lg:translate-x-0'
              : 'border-brand-100 lg:w-60 lg:translate-x-0'
      }`}
    >
      {/* Navigatsiya */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2 lg:p-3">
        {NAV.map(({ to, label, Icon, img, end }) => (
          <NavLink key={to} to={to} end={end} className={linkClass} title={label}>
            <span className="relative shrink-0">
              {img ? (
                <img src={img} alt="" className="-ml-1.5 h-8 w-8 object-contain" />
              ) : Icon ? (
                <Icon />
              ) : null}
              {to === '/xabarlar' && unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </span>
            <span className={`hidden lg:block ${img ? '-ml-2' : ''}`}>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Xotira (tarif) — bosilsa tarif rejalari oynasi ochiladi */}
      <div className="hidden shrink-0 px-3 py-2 lg:block">
        <button
          type="button"
          onClick={() => setPricingOpen(true)}
          className="w-full rounded-2xl border border-brand-100 bg-brand-50/60 p-3 text-left shadow-sm transition-colors hover:border-brand-200 hover:bg-brand-50"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-brand-700">{t('nav.memory')}</span>
            <span className={`font-semibold ${pctColor}`}>{percent}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${Math.max(percent, 2)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-brand-500">
            {t('nav.memoryUsed', { used: formatBytes(usedBytes), limit: formatBytes(limitBytes) })}
          </p>
        </button>
      </div>
      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />

      {/* Chiqish */}
      <div className="shrink-0 border-t border-brand-100 p-2 lg:p-3">
        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="flex w-full items-center justify-center gap-3 rounded-full border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 lg:justify-start"
        >
          <LogoutIcon className="shrink-0" />
          <span className="hidden lg:block">{t('common.logout')}</span>
        </button>
      </div>
    </aside>
  );
}
