// features/media/components/MediaUploadDialog.tsx
// Rasm / video / hujjat (PDF) yuklash oynasi. Fayl R2'ga to'g'ridan-to'g'ri
// yuklanadi, so'ng media yozuvi yaratiladi. Klient tomonda tur va hajm
// tekshiriladi (server ham qayta tekshiradi — 100% xavfsiz).
import { useRef, useState, type FormEvent } from 'react';
import { mediaApi, uploadMediaFile } from '../api/media.api';
import { useStorageStore, quotaMessage, formatBytes } from '@/features/storage/storage.store';
import { Button } from '@/shared/ui/Button';

const CURRENT_YEAR = new Date().getFullYear();

// Ruxsat etilgan turlar + maksimal hajm (server bilan bir xil)
const LIMITS: Record<string, number> = {
  'image/jpeg': 10,
  'image/png': 10,
  'image/webp': 10,
  'image/gif': 10,
  'video/mp4': 200,
  'video/webm': 200,
  'video/quicktime': 200,
  'application/pdf': 25,
};

interface Props {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

export function MediaUploadDialog({ open, onClose, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const reset = () => {
    setFile(null);
    setTitle('');
    setYear('');
    setError(null);
  };

  const pick = (f: File | undefined) => {
    if (!f) return;
    const maxMb = LIMITS[f.type];
    if (!maxMb) {
      setError('Faqat rasm, video yoki PDF fayl');
      return;
    }
    if (f.size > maxMb * 1024 * 1024) {
      setError(`Fayl ${maxMb} MB dan katta bo'lmasin`);
      return;
    }
    setError(null);
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, '').slice(0, 120));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return setError('Fayl tanlang');
    const t = title.trim();
    if (t.length < 1) return setError('Nom kiriting');
    if (year && (Number(year) < 1000 || Number(year) > CURRENT_YEAR)) {
      return setError("Yil noto'g'ri");
    }
    // Kvota oldindan tekshiruvi (bekorga R2'ga yuklamaslik uchun)
    const { usedBytes, limitBytes } = useStorageStore.getState();
    if (usedBytes + file.size > limitBytes) {
      return setError(`Xotira yetarli emas. Bo'sh joy: ${formatBytes(Math.max(0, limitBytes - usedBytes))}`);
    }
    setBusy(true);
    setError(null);
    try {
      const up = await uploadMediaFile(file);
      await mediaApi.create({
        url: up.url,
        title: t,
        contentType: up.contentType,
        sizeBytes: up.sizeBytes,
        year: year ? Number(year) : undefined,
      });
      reset();
      onUploaded();
      onClose();
    } catch (err) {
      setError(quotaMessage(err) ?? "Yuklab bo'lmadi. Qaytadan urinib ko'ring");
    } finally {
      setBusy(false);
    }
  };

  const kindLabel = file
    ? file.type.startsWith('video/')
      ? 'Video'
      : file.type === 'application/pdf'
        ? 'Hujjat'
        : 'Rasm'
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Media yuklash"
        className="w-full max-w-md rounded-[22px] bg-white p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-center font-serif text-xl font-semibold text-brand-900">Media yuklash</h2>
        <p className="mt-1 text-center text-[13px] text-brand-500">Rasm, video yoki PDF hujjat</p>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 px-4 py-6 text-center transition-colors hover:border-brand-400"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 15V5m0 0 3.5 3.5M12 5 8.5 8.5" />
                <path d="M5 15v3.5h14V15" />
              </svg>
            </span>
            {file ? (
              <span className="min-w-0 max-w-full">
                <span className="block truncate text-sm font-medium text-brand-900">{file.name}</span>
                <span className="text-xs text-brand-500">
                  {kindLabel} · {(file.size / (1024 * 1024)).toFixed(1)} MB
                </span>
              </span>
            ) : (
              <span className="text-sm font-medium text-brand-700">Fayl tanlash</span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*,application/pdf"
            hidden
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = '';
            }}
          />

          <input
            type="text"
            placeholder="Nomi (masalan: Bobom yoshligi)"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-field border border-neutral-200 bg-white px-4 py-3 text-[15px] text-brand-900 outline-none transition-colors focus:border-brand-600"
          />
          <input
            type="number"
            placeholder="Yil (ixtiyoriy)"
            value={year}
            min={1000}
            max={CURRENT_YEAR}
            inputMode="numeric"
            onChange={(e) => setYear(e.target.value)}
            className="w-full rounded-field border border-neutral-200 bg-white px-4 py-3 text-[15px] text-brand-900 outline-none transition-colors focus:border-brand-600"
          />

          {error && <p className="text-center text-xs text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-field border border-neutral-200 py-3 text-[15px] font-medium text-brand-900 transition-colors hover:bg-brand-50"
            >
              Bekor qilish
            </button>
            <Button type="submit" loading={busy} className="flex-1">
              Yuklash
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
