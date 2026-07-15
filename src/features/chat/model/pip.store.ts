// features/chat/model/pip.store.ts
// Ilova ichidagi kichik video oynasi (Picture-in-Picture) — global, AppLayout
// darajasida render qilinadi, shunda foydalanuvchi boshqa sahifaga o'tsa ham
// video davom etadi (brauzerning tizim darajasidagi PiP API'si EMAS —
// to'liq o'zimiz boshqaradigan, ilova ICHIDAGI suzuvchi oyna).
import { create } from 'zustand';

interface PipState {
  url: string | null;
  startTime: number;
  open: (url: string, startTime: number) => void;
  close: () => void;
}

export const usePipStore = create<PipState>((set) => ({
  url: null,
  startTime: 0,
  open: (url, startTime) => set({ url, startTime }),
  close: () => set({ url: null, startTime: 0 }),
}));
