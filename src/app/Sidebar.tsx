// app/Sidebar.tsx
// Chap navigatsiya paneli — FAQAT desktop/tablet (`lg:` va undan katta, 1024px+).
// Mobil/kichik ekranlarda buning o'rniga pastki tab-bar (`BottomNav.tsx`) ishlatiladi.
import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth';
import { authApi } from '@/features/auth/api/auth.api';
import { useTreeStore } from '@/features/tree/model/tree.store';
import { useStorageStore, formatBytes } from '@/features/storage/storage.store';
import { TreeLogo } from '@/shared/ui/TreeLogo';
import { NAV, LogoutIcon } from './nav-items';

const MB = 1024 * 1024;

export function Sidebar() {
  const navigate = useNavigate();
  const clearSession = useAuthStore((s) => s.logout);
  const usedBytes = useStorageStore((s) => s.usedBytes);
  const limitBytes = useStorageStore((s) => s.limitBytes);
  const loadUsage = useStorageStore((s) => s.loadUsage);
  const [loggingOut, setLoggingOut] = useState(false);

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
      await authApi.logout().catch(() => undefined);
      useTreeStore.getState().reset();
      useStorageStore.getState().reset();
      clearSession();
      navigate('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors',
      'justify-center lg:justify-start',
      isActive
        ? 'bg-brand-800 text-white shadow-sm'
        : 'text-brand-700 hover:bg-brand-50 hover:text-brand-900',
    ].join(' ');

  return (
    <aside className="hidden h-full w-16 shrink-0 flex-col border-r border-brand-100 bg-white lg:flex lg:w-60">
      {/* Logotip */}
      <div className="flex h-14 shrink-0 items-center justify-center gap-2 border-b border-brand-100 px-3 lg:justify-start">
        <TreeLogo className="h-8 w-8 shrink-0 text-brand-800" />
        <span className="hidden font-sans text-lg font-bold text-brand-900 lg:block">
          AJDO
        </span>
      </div>

      {/* Navigatsiya */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2 lg:p-3">
        {NAV.map(({ to, label, Icon, img, end }) => (
          <NavLink key={to} to={to} end={end} className={linkClass} title={label}>
            {img ? (
              <img src={img} alt="" className="-ml-1.5 h-8 w-8 shrink-0 object-contain" />
            ) : Icon ? (
              <Icon className="shrink-0" />
            ) : null}
            <span className={`hidden lg:block ${img ? '-ml-2' : ''}`}>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Xotira (free tier) — sidebardan ajralib turadigan yumaloq karta */}
      <div className="hidden shrink-0 px-3 py-2 lg:block">
        <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-3 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-brand-700">Xotira</span>
            <span className={`font-semibold ${pctColor}`}>{percent}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${Math.max(percent, 2)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-brand-500">
            {formatBytes(usedBytes)} / {formatBytes(limitBytes)} foydalanilgan
          </p>
        </div>
      </div>

      {/* Chiqish */}
      <div className="shrink-0 border-t border-brand-100 p-2 lg:p-3">
        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          title="Chiqish"
          className="flex w-full items-center justify-center gap-3 rounded-full border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 lg:justify-start"
        >
          <LogoutIcon className="shrink-0" />
          <span className="hidden lg:block">Chiqish</span>
        </button>
      </div>
    </aside>
  );
}
