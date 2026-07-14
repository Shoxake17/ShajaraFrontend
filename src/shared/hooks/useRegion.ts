// shared/hooks/useRegion.ts
// Mintaqa (Sozlamalar → Til va mintaqa) — sana/vaqt formatini avtomatik
// belgilaydi (i18n/index.ts'dagi til tanlovi bilan bir xil naqsh: localStorage,
// try/catch himoyasi). Zustand ishlatiladi — bir nechta SelectPicker/format
// ko'rsatkichi bir vaqtda sinxron yangilanishi uchun (oddiy useState buni
// boshqa komponentlarga bildirmasdi).
import { create } from 'zustand';

export const SUPPORTED_REGIONS = ['UZ', 'RU', 'US'] as const;
export type Region = (typeof SUPPORTED_REGIONS)[number];
export const DEFAULT_REGION: Region = 'UZ';

const STORAGE_KEY = 'shajara.region';

function loadSavedRegion(): Region {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (SUPPORTED_REGIONS as readonly string[]).includes(saved ?? '')
      ? (saved as Region)
      : DEFAULT_REGION;
  } catch {
    return DEFAULT_REGION;
  }
}

function saveRegion(region: Region): void {
  try {
    localStorage.setItem(STORAGE_KEY, region);
  } catch {
    /* localStorage yo'q bo'lsa — indamay o'tamiz (faqat UI qulayligi) */
  }
}

interface RegionState {
  region: Region;
  setRegion: (r: Region) => void;
}

export const useRegionStore = create<RegionState>((set) => ({
  region: loadSavedRegion(),
  setRegion: (r) => {
    saveRegion(r);
    set({ region: r });
  },
}));

export interface RegionFormat {
  /** Sana ko'rinishi — O'zbekiston/Rossiya: kun.oy.yil, AQSH: oy/kun/yil */
  dateFormat: 'DMY_DOT' | 'MDY_SLASH';
  /** Vaqt 12 soatlik (AM/PM) — faqat AQSH; qolganlari 24 soatlik */
  hour12: boolean;
}

export const REGION_FORMATS: Record<Region, RegionFormat> = {
  UZ: { dateFormat: 'DMY_DOT', hour12: false },
  RU: { dateFormat: 'DMY_DOT', hour12: false },
  US: { dateFormat: 'MDY_SLASH', hour12: true },
};

export function useRegion() {
  const region = useRegionStore((s) => s.region);
  const setRegion = useRegionStore((s) => s.setRegion);
  return { region, setRegion };
}
