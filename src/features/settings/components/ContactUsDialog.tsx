// features/settings/components/ContactUsDialog.tsx
// "Bog'lanish" (Sozlamalar → Yordam) — bosilganda ikkita usul: Telegram
// (to'g'ridan-to'g'ri dasturchi bilan) va Gmail (support email). Backend
// shart emas — sof tashqi havolalar.
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MailIcon2, type IconCmp } from './settings-ui';
import { TelegramIcon } from '@/shared/ui/icons';

const TELEGRAM_URL = 'https://t.me/shoxrux_developer';
const SUPPORT_EMAIL = 'support@ajdo.uz';

function OptionButton({
  Icon,
  label,
  sub,
  onClick,
}: {
  Icon: IconCmp;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 text-left transition hover:border-brand-300 hover:bg-brand-50"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-brand-900">{label}</span>
        <span className="block truncate text-xs text-neutral-500">{sub}</span>
      </span>
    </button>
  );
}

export function ContactUsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();

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
        aria-label={t('settings.help.contact')}
        className="w-full max-w-sm rounded-[20px] bg-white p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-serif text-lg font-semibold text-brand-900">{t('settings.help.contact')}</h3>
        <p className="mt-1 text-sm text-neutral-500">{t('settings.help.contactDesc')}</p>

        <div className="mt-4 space-y-2.5">
          <OptionButton
            Icon={TelegramIcon as IconCmp}
            label="Telegram"
            sub="@shoxrux_developer"
            onClick={() => window.open(TELEGRAM_URL, '_blank', 'noopener,noreferrer')}
          />
          <OptionButton
            Icon={MailIcon2}
            label="Email"
            sub={SUPPORT_EMAIL}
            onClick={() => window.open(`mailto:${SUPPORT_EMAIL}`, '_blank')}
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl border border-neutral-200 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
        >
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}
