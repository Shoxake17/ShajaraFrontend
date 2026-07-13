// features/auth/components/SessionsDialog.tsx
// "Faol qurilmalar" oynasi (Sozlamalar → Hisob xavfsizligi).
// Har bir kirgan qurilma: brauzer + OS, IP manzil, kirish vaqti, oxirgi faollik.
// Joriy qurilma belgilanadi; qolganlarini bittadan yoki hammasini birdan
// yakunlash mumkin (GitHub/Google'dagi sessiya boshqaruvi standarti).
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/features/auth/api/auth.api';
import { authErrorMessage } from '@/features/auth/lib/auth-errors';
import { fmtIp, fmtTime } from '@/features/auth/lib/device-format';
import type { SessionInfo } from '@/features/auth/types';

interface SessionsDialogProps {
  open: boolean;
  onClose: () => void;
}

function DeviceGlyph({ device }: { device: string }) {
  const cls = 'h-5 w-5';
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  return device === 'mobile' ? (
    <svg viewBox="0 0 24 24" className={cls} {...common}>
      <rect x="7" y="3.5" width="10" height="17" rx="2" />
      <path d="M10.5 18h3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className={cls} {...common}>
      <rect x="3.5" y="5" width="17" height="11" rx="1.5" />
      <path d="M8 19.5h8M12 16v3.5" />
    </svg>
  );
}

export function SessionsDialog({ open, onClose }: SessionsDialogProps) {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await authApi.sessions();
      // Joriy qurilma har doim ro'yxatda birinchi bo'lishi shart (backend
      // tartibiga qo'shimcha — server javobi qanday kelishidan qat'iy nazar)
      setSessions([...list].sort((a, b) => Number(b.current) - Number(a.current)));
    } catch (e) {
      setSessions([]);
      setError(authErrorMessage(e));
    }
  }, []);

  useEffect(() => {
    if (open) {
      setSessions(null);
      void load();
    }
  }, [open, load]);

  // Real vaqtga yaqin yangilanish: oyna ochiq turganda boshqa qurilmadan
  // kirilsa (yoki sessiya boshqa joydan yakunlansa) — ro'yxat o'zi yangilanadi.
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => void load(), 5000);
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const revokeOne = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await authApi.revokeSession(id);
      setSessions((s) => s?.filter((x) => x.id !== id) ?? null);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const revokeOthers = async () => {
    setBusyId('__others__');
    setError(null);
    try {
      await authApi.revokeOtherSessions();
      await load();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const others = (sessions ?? []).filter((s) => !s.current);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('auth.sessions.ariaLabel')}
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-[20px] bg-white p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-serif text-lg font-semibold text-brand-900">{t('auth.sessions.title')}</h3>
        <p className="mt-1 text-xs text-brand-500">
          {t('auth.sessions.desc')}
        </p>

        <div className="mt-4 min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
          {sessions === null && <p className="py-6 text-center text-sm text-neutral-400">{t('auth.sessions.loading')}</p>}

          {sessions?.map((s) => (
            <div
              key={s.id}
              className={`rounded-xl border p-3 ${s.current ? 'border-brand-300 bg-brand-50/60' : 'border-neutral-200'}`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <DeviceGlyph device={s.device} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-brand-900">
                      {s.browser} — {s.os}
                    </span>
                    {s.current && (
                      <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {t('auth.sessions.current')}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">{fmtIp(s.ip)}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{t('auth.sessions.joined')} {fmtTime(s.createdAt)}</p>
                  {s.lastSeenAt !== s.createdAt && (
                    <p className="mt-0.5 text-xs text-neutral-400">
                      {t('auth.sessions.lastActivity')} {fmtTime(s.lastSeenAt)}
                    </p>
                  )}
                </div>
                {!s.current && (
                  <button
                    type="button"
                    onClick={() => void revokeOne(s.id)}
                    disabled={busyId !== null}
                    className="shrink-0 rounded-field border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    {busyId === s.id ? '…' : t('auth.sessions.endSession')}
                  </button>
                )}
              </div>
            </div>
          ))}

          {sessions !== null && sessions.length === 0 && !error && (
            <p className="py-6 text-center text-sm text-neutral-400">{t('auth.sessions.noSessions')}</p>
          )}
        </div>

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

        <div className="mt-4 flex shrink-0 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-field border border-neutral-200 py-3 text-sm font-medium text-brand-900 transition-colors hover:bg-brand-50"
          >
            {t('auth.sessions.close')}
          </button>
          {others.length > 0 && (
            <button
              type="button"
              onClick={() => void revokeOthers()}
              disabled={busyId !== null}
              className="flex-1 rounded-field bg-red-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {busyId === '__others__'
                ? t('auth.sessions.endingOthers')
                : t('auth.sessions.endOthers', { count: others.length })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
