// shared/hooks/useTheme.ts
// Ilova ko'rinish rejimi — chat.store.ts/call.store.ts bilan bir xil
// zustand naqshi (oddiy useState EMAS — MUHIM: bir nechta komponent
// (SettingsPage'dagi tanlagich VA AppLayout'dagi ThemeBackground) shu
// holatni BIR VAQTDA o'qiydi; agar har biri o'zining ALOHIDA useState'iga
// ega bo'lsa, Sozlamalar'da rejim o'zgartirilganda ThemeBackground BUNI
// UMUMAN BILMAY QOLARDI — aynan shu xato tufayli "Light" tanlanganda fon
// surati sahifa qayta yuklanmaguncha ko'rinmasdi). Uch rejim: "soft"
// (hozirgi standart oq ko'rinish, hech narsa o'zgarmaydi), "light" (Apple
// uslubidagi shisha/frosted dizayn, orqa fonda tabiat surati — index.css'
// dagi [data-theme="light"] global override qoidalari orqali), "dark"
// (qorong'i rejim, xuddi shu texnika bilan).
import { create } from 'zustand';

export type AppTheme = 'soft' | 'light' | 'dark';

const STORAGE_KEY = 'ajdo:theme';

function readStoredTheme(): AppTheme {
  if (typeof window === 'undefined') return 'soft';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'soft';
}

function applyTheme(theme: AppTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
}

// Birinchi render'dan OLDIN (modul yuklanganda) qo'llaniladi — aks holda
// sahifa ochilganda bir lahza "soft" ko'rinib, keyin tanlangan rejimga
// almashib qolar edi (flash of wrong theme).
applyTheme(readStoredTheme());

interface ThemeState {
  theme: AppTheme;
  setTheme: (next: AppTheme) => void;
}

export const useTheme = create<ThemeState>((set) => ({
  theme: readStoredTheme(),
  setTheme: (next) => {
    applyTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    set({ theme: next });
  },
}));
