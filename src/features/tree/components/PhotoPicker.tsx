// features/tree/components/PhotoPicker.tsx
import { useState } from 'react';
import { uploadPhoto } from '@/features/tree/api/family.api';

interface PhotoPickerProps {
  value: string | null;
  female: boolean;
  onChange: (url: string | null, sizeBytes: number) => void;
  onError: (msg: string) => void;
}

/** Yumaloq rasm yuklash — Cloudflare R2'ga to'g'ridan-to'g'ri (Add va Edit dialoglarida) */
export function PhotoPicker({ value, female, onChange, onError }: PhotoPickerProps) {
  const [uploading, setUploading] = useState(false);

  const pick = async (file: File) => {
    setUploading(true);
    try {
      const { url, size } = await uploadPhoto(file);
      onChange(url, size);
    } catch {
      onError("Rasm yuklab bo'lmadi (Cloudflare sozlanmagan bo'lishi mumkin)");
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
