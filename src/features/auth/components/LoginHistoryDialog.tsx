// features/auth/components/LoginHistoryDialog.tsx
// "Kirish tarixi" oynasi (Sozlamalar → Hisob xavfsizligi). "Faol qurilmalar"dan
// FARQLI: bu doimiy audit-log — sessiya yakunlangan/muddati tugagandan keyin
// ham yozuv saqlanib qoladi. Har bir urinish (muvaffaqiyatli VA muvaffaqiyatsiz)
// vaqti, brauzeri, IP manzili bilan ko'rsatiladi — GitHub/Google'dagi
// "xavfsizlik jurnali" standartiga mos.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/features/auth/api/auth.api';
import { authErrorMessage } from '@/features/auth/lib/auth-errors';
import { fmtIp, fmtTime } from '@/features/auth/lib/device-format';
import type { LoginEvent, LoginEventType } from '@/features/auth/types';

interface LoginHistoryDialogProps {
  open: boolean;
  onClose: () => void;
}

function EventGlyph({ type }: { type: LoginEventType }) {
  const cls = 'h-5 w-5';
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  if (type === 'LOGIN_FAILED') {
    return (
      <svg viewBox="0 0 24 24" className={cls} {...common}>
        <path d="M12 4 3 19.5h18Z" />
        <path d="M12 10v4" />
        <circle cx="12" cy="17" r=".6" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (type === 'PASSWORD_CHANGED') {
    return (
      <svg viewBox="0 0 24 24" className={cls} {...common}>
        <circle cx="8" cy="12" r="3.5" />
        <path d="M11.5 12h8m-3 0v3m-2-3v2.5" />
      </svg>
    );
  }
  if (type === 'TWO_FACTOR_ENABLED' || type === 'TWO_FACTOR_DISABLED') {
    return (
      <svg viewBox="0 0 24 24" className={cls} {...common}>
        <path d="M12 3.5 5 6.5v5c0 4.5 3 7.5 7 8.5 4-1 7-4 7-8.5v-5Z" />
      </svg>
    );
  }
  // REGISTER, LOGIN_SUCCESS, GOOGLE_LOGIN — bir xil "kirish" belgisi
  return (
    <svg viewBox="0 0 24 24" className={cls} {...common}>
      <path d="M14 4.5H6.5A2 2 0 0 0 4.5 6.5v11a2 2 0 0 0 2 2H14" />
      <path d="M11 12h9.5m0 0-3-3m3 3-3 3" />
    </svg>
  );
}

export function LoginHistoryDialog({ open, onClose }: LoginHistoryDialogProps) {
  const { t } = useTranslation();
  const [events, setEvents] = useState<LoginEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEvents(null);
    setError(null);
    authApi
      .loginHistory()
      .then(setEvents)
      .catch((e) => {
        setEvents([]);
        setError(authErrorMessage(e));
      });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('auth.loginHistory.ariaLabel')}
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-[20px] bg-white p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-serif text-lg font-semibold text-brand-900">{t('auth.loginHistory.title')}</h3>
        <p className="mt-1 text-xs text-brand-500">
          {t('auth.loginHistory.desc')}
        </p>

        <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {events === null && <p className="py-6 text-center text-sm text-neutral-400">{t('auth.loginHistory.loading')}</p>}

          {events?.map((ev) => {
            const failed = ev.type === 'LOGIN_FAILED';
            return (
              <div
                key={ev.id}
                className={`flex items-start gap-3 rounded-xl border p-3 ${
                  failed ? 'border-red-200 bg-red-50/60' : 'border-neutral-200'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    failed ? 'bg-red-100 text-red-600' : 'bg-brand-50 text-brand-600'
                  }`}
                >
                  <EventGlyph type={ev.type} />
                </span>
                <div className="min-w-0 flex-1">
                  <span className={`text-sm font-semibold ${failed ? 'text-red-700' : 'text-brand-900'}`}>
                    {t(`auth.loginHistory.events.${ev.type}`)}
                  </span>
                  <p className="mt-1 text-xs text-neutral-500">
                    {ev.browser} — {ev.os}
                    {ev.device === 'mobile' ? t('auth.loginHistory.mobileSuffix') : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">{fmtIp(ev.ip)}</p>
                  <p className="mt-0.5 text-xs text-neutral-400">{fmtTime(ev.createdAt)}</p>
                </div>
              </div>
            );
          })}

          {events !== null && events.length === 0 && !error && (
            <p className="py-6 text-center text-sm text-neutral-400">{t('auth.loginHistory.noHistory')}</p>
          )}
        </div>

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 shrink-0 rounded-field border border-neutral-200 py-3 text-sm font-medium text-brand-900 transition-colors hover:bg-brand-50"
        >
          {t('auth.loginHistory.close')}
        </button>
      </div>
    </div>
  );
}
