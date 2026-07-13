// features/storage/storage.store.ts
// Akkaunt xotira sarfi (500 MB free tier) — sidebar bloki uchun.
import { create } from 'zustand';
import { http } from '@/shared/api/http';
import i18n from '@/i18n';

interface UsageResponse {
  usedBytes: number;
  limitBytes: number;
  breakdown: { records: number; images: number; videos: number; documents: number };
}

interface StorageState {
  usedBytes: number;
  limitBytes: number;
  loaded: boolean;
  loadUsage: () => Promise<void>;
  reset: () => void;
}

export const useStorageStore = create<StorageState>((set) => ({
  usedBytes: 0,
  limitBytes: 100 * 1024 * 1024,
  loaded: false,
  loadUsage: async () => {
    try {
      const { data } = await http.get<UsageResponse>('/storage/usage');
      set({ usedBytes: data.usedBytes, limitBytes: data.limitBytes, loaded: true });
    } catch {
      // jim — sidebar shunchaki 0 ko'rsatadi
    }
  },
  reset: () => set({ usedBytes: 0, loaded: false }),
}));

/** 413 (kvota to'lgan) xatosidan xabar matnini ajratadi (aks holda null) */
export function quotaMessage(err: unknown): string | null {
  const e = err as { response?: { status?: number; data?: { message?: string } } };
  if (e?.response?.status === 413) {
    return e.response?.data?.message ?? i18n.t('common.storageQuotaExceeded');
  }
  return null;
}

/** Baytni odam o'qiydigan ko'rinishga (KB/MB/GB) */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}
