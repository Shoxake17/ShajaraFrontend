// features/media/components/MediaEditDialog.tsx
// Media nomi va yilini tahrirlash oynasi.
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { mediaApi } from '../api/media.api';
import { Button } from '@/shared/ui/Button';

const CURRENT_YEAR = new Date().getFullYear();

export interface EditableMedia {
  id: string;
  title: string;
  year: number | null;
}

interface Props {
  item: EditableMedia | null;
  onClose: () => void;
  onSaved: () => void;
}

export function MediaEditDialog({ item, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setYear(item.year != null ? String(item.year) : '');
      setError(null);
    }
  }, [item]);

  if (!item) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 1) return setError(t('media.uploadDialog.enterName'));
    if (year && (Number(year) < 1000 || Number(year) > CURRENT_YEAR)) return setError(t('media.uploadDialog.invalidYear'));
    setBusy(true);
    setError(null);
    try {
      await mediaApi.update(item.id, { title: trimmedTitle, year: year ? Number(year) : null });
      onSaved();
      onClose();
    } catch {
      setError(t('media.editDialog.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-brand-950/40 p-4" onClick={onClose}>
      <div role="dialog" aria-label={t('media.editDialog.ariaLabel')} className="w-full max-w-md rounded-[22px] bg-white p-5 shadow-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-center font-serif text-xl font-semibold text-brand-900">{t('media.editDialog.title')}</h2>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input
            type="text"
            placeholder={t('media.editDialog.namePlaceholder')}
            value={title}
            maxLength={120}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-field border border-neutral-200 bg-white px-4 py-3 text-[15px] text-brand-900 outline-none transition-colors focus:border-brand-600"
          />
          <input
            type="number"
            placeholder={t('media.uploadDialog.yearPlaceholder')}
            value={year}
            min={1000}
            max={CURRENT_YEAR}
            inputMode="numeric"
            onChange={(e) => setYear(e.target.value)}
            className="w-full rounded-field border border-neutral-200 bg-white px-4 py-3 text-[15px] text-brand-900 outline-none transition-colors focus:border-brand-600"
          />
          {error && <p className="text-center text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-field border border-neutral-200 py-3 text-[15px] font-medium text-brand-900 transition-colors hover:bg-brand-50">
              {t('common.cancel')}
            </button>
            <Button type="submit" loading={busy} className="flex-1">
              {t('common.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
