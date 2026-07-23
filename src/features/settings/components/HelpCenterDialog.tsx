// features/settings/components/HelpCenterDialog.tsx
// "Yordam Markazi" (Sozlamalar → Yordam) — kichik, real-vaqtli suhbat oynasi,
// admin bilan (Admin panel → Qo'llab-quvvatlash sahifasida javob yoziladi).
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { chatApi } from '@/features/chat/api/chat.api';
import { MiniChatThread } from '@/features/chat/components/MiniChatThread';

export function HelpCenterDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [adminId, setAdminId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAdminId(null);
    setError(false);
    chatApi
      .getSupportAdminId()
      .then((r) => setAdminId(r.adminId))
      .catch(() => setError(true));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('settings.help.helpCenter')}
        className="flex h-[min(600px,80vh)] w-full max-w-md flex-col overflow-hidden rounded-[20px] bg-white shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3.5">
          <div>
            <h3 className="font-serif text-base font-semibold text-brand-900">{t('settings.help.helpCenter')}</h3>
            <p className="text-xs text-neutral-500">{t('settings.help.helpCenterDesc')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100"
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1">
          {error && (
            <p className="p-5 text-center text-sm text-red-600">
              {t('settings.help.helpCenterEmpty')}
            </p>
          )}
          {!error && adminId && (
            <MiniChatThread
              userId={adminId}
              name={t('settings.help.helpCenter')}
              placeholder={t('settings.help.helpCenterPlaceholder')}
              emptyLabel={t('settings.help.helpCenterEmpty')}
            />
          )}
          {!error && !adminId && (
            <div className="flex h-full items-center justify-center">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
