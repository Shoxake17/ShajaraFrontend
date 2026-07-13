// features/tree/components/PhotoPicker.tsx
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
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
export function uploadErrorMessage(err: unknown): string {
  const quota = quotaMessage(err);
  if (quota) return quota;
  const status = (err as { response?: { status?: number } } | undefined)?.response?.status;
  if (status === 401) return i18n.t('tree.photoPicker.sessionExpired');
  if (status === 503) return i18n.t('tree.photoPicker.storageNotConfigured');
  return i18n.t('tree.photoPicker.uploadFailed');
}

/** Yumaloq rasm yuklash — Cloudflare R2'ga to'g'ridan-to'g'ri (Add va Edit dialoglarida) */
export function PhotoPicker({ value, female, onChange, onError }: PhotoPickerProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  // Yuklashdan darhol keyin ko'rsatish uchun MAHALLIY (blob) oldindan ko'rish —
  // `onChange`ga uzatiladigan `url` endi R2 obyekt KALITI (masalan
  // "members/x/y.jpg"), to'g'ridan-to'g'ri <img src> sifatida ishlamaydi
  // (bucket endi yopiq). Saqlangach, doska qayta yuklanganda haqiqiy
  // (imzolangan) havola keladi — shu vaqtgacha localPreview ko'rsatiladi.
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const localPreviewRef = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    };
  }, []);

  const pick = async (file: File) => {
    setUploading(true);
    if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    const blobUrl = URL.createObjectURL(file);
    localPreviewRef.current = blobUrl;
    setLocalPreview(blobUrl);
    try {
      const { url, size } = await uploadPhoto(file);
      onChange(url, size);
    } catch (err) {
      setLocalPreview(null);
      onError(uploadErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const shown = localPreview ?? value;

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
          ) : shown ? (
            <img src={shown} alt={t('tree.photoPicker.alt')} className="h-full w-full object-cover" />
          ) : (
            <span className="text-[11px] text-neutral-400">{t('tree.photoPicker.addLabel')}</span>
          )}
        </span>
      </label>
    </div>
  );
}
