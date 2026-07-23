// features/settings/components/FaqDialog.tsx
// "Tez-tez so'raladigan savollar" (Sozlamalar → Yordam) — oddiy dropdown
// (accordion) ro'yxati, backend shart emas.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon } from '@/shared/ui/icons';
import { useLanguage } from '@/shared/hooks/useLanguage';
import { FAQ_CONTENT } from '../faqContent';

function FaqRow({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-neutral-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-medium text-brand-900"
      >
        <span>{question}</span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <p className="pb-3 text-sm leading-relaxed text-neutral-600">{answer}</p>}
    </div>
  );
}

export function FaqDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { language } = useLanguage();

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
        aria-label={t('settings.help.faq')}
        className="flex h-[min(600px,80vh)] w-full max-w-lg flex-col overflow-hidden rounded-[20px] bg-white shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3.5">
          <h3 className="font-serif text-base font-semibold text-brand-900">{t('settings.help.faq')}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100"
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          {FAQ_CONTENT[language].map((item, i) => (
            <FaqRow key={i} question={item.question} answer={item.answer} />
          ))}
        </div>
      </div>
    </div>
  );
}
