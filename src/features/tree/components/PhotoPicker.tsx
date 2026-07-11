// features/tree/components/PhotoPicker.tsx
import { useState } from 'react';
import { uploadPhoto } from '@/features/tree/api/family.api';
import { quotaMessage } from '@/features/storage/storage.store';

interface PhotoPickerProps {
  value: string | null;
  female: boolean;
  onChange: (url: string | null, sizeBytes: number) => void;
  onError: (msg: string) => void;
}

/**
 * Yuklash xatosini SABABIGA qarab aniq xabarga aylantiradi — avval har doim
 * "Cloudflare sozlanmagan bo'lishi mumkin" deyilardi, hattoki sessiya tugagan
 * (401) yoki xotira to'lgan (413) holatlarida ham — bu chalg'itardi.
 */
function uploadErrorMessage(err: unknown): string {
  const quota = quotaMessage(err);
  if (quota) return quota;
  const status = (err as { response?: { status?: number } } | undefined)?.response?.status;
  if (status === 401) return "Sessiyangiz tugagan. Sahifani yangilab, qaytadan kiring.";
  if (status === 503) return "Rasm saqlash hali sozlanmagan (R2)";
  return "Rasm yuklab bo'lmadi. Internet aloqasini tekshirib, qaytadan urinib ko'ring.";
}

/** Yumaloq rasm yuklash — Cloudflare R2'ga to'g'ridan-to'g'ri (Add va Edit dialoglarida) */
export function PhotoPicker({ value, female, onChange, onError }: PhotoPickerProps) {
  const [uploading, setUploading] = useState(false);

  const pick = async (file: File) => {
    setUploading(true);
    try {
      const { url, size } = await uploadPhoto(file);
      onChange(url, size);
    } catch (err) {
      onError(uploadErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex justify-center">
      <label className="relative cursor-pointer">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void pick(f);
          }}
        />
        <span
          className={`flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed transition-colors ${
            female ? 'border-pink-300 bg-pink-50' : 'border-brand-300 bg-brand-50'
          }`}
        >
          {uploading ? (
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-brand-700" />
          ) : value ? (
            <img src={value} alt="Rasm" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[11px] text-neutral-400">Rasm +</span>
          )}
        </span>
      </label>
    </div>
  );
}
