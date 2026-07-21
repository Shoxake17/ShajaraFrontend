// features/auth/components/SharePhoneDialog.tsx
// Telegram Login Widget telefon raqamni HECH QACHON bermaydi (Telegram
// API'ning o'zi cheklovi) — HAQIQIY raqamni olishning yagona yo'li:
// foydalanuvchi botimizga (@<username>) o'tib, "Telefon raqamni ulashish"
// tugmasini bosishi. Bu oyna botni ochish havolasini beradi va bot orqali
// (webhook) telefon saqlangunga qadar `/auth/me`ni davriy so'rab turadi.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { authApi } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/features/auth/model/auth.store';
import { env } from '@/shared/config/env';

interface SharePhoneDialogProps {
  open: boolean;
  onClose: () => void;
}

const POLL_INTERVAL_MS = 2500;

export function SharePhoneDialog({ open, onClose }: SharePhoneDialogProps) {
  const { t } = useTranslation();
  const setUser = useAuthStore((s) => s.setUser);
  const [linked, setLinked] = useState(false);
  const pollRef = useRef<number | null>(null);

  const botLink = `https://t.me/${env.telegramBotUsername}`;

  useEffect(() => {
    if (!open) {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
      setLinked(false);
      return;
    }
    pollRef.current = window.setInterval(() => {
      authApi
        .me()
        .then((user) => {
          if (user.phone) {
            setUser(user);
            setLinked(true);
            if (pollRef.current) window.clearInterval(pollRef.current);
          }
        })
        .catch(() => {
          /* keyingi urinishda qayta tekshiriladi */
        });
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [open, setUser]);

  // Escape bilan yopish
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const openBot = () => {
    window.open(botLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('auth.sharePhone.ariaLabel')}
        className="w-full max-w-sm rounded-[20px] bg-white p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        {linked ? (
          <>
            <h3 className="font-serif text-lg font-semibold text-brand-900">
              {t('auth.sharePhone.successTitle')}
            </h3>
            <p className="mt-3 text-sm text-brand-700">{t('auth.sharePhone.successDesc')}</p>
            <Button type="button" onClick={onClose} className="mt-5 !py-3 !text-sm">
              {t('common.close')}
            </Button>
          </>
        ) : (
          <>
            <h3 className="font-serif text-lg font-semibold text-brand-900">
              {t('auth.sharePhone.title')}
            </h3>
            <p className="mt-1.5 text-[13px] leading-snug text-brand-700">
              {t('auth.sharePhone.desc')}
            </p>
            <Button type="button" onClick={openBot} className="mt-4 !py-3 !text-sm">
              {t('auth.sharePhone.openBot')}
            </Button>
            <p className="mt-3 flex items-center justify-center gap-2 text-xs text-brand-500">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-200 border-t-brand-700" />
              {t('auth.sharePhone.waiting')}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full text-center text-sm font-medium text-brand-700 hover:text-brand-900"
            >
              {t('common.cancel')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
