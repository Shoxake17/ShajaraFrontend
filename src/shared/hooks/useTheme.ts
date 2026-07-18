// shared/hooks/useTheme.ts
// Ilova ko'rinish rejimi — useLanguage.ts bilan bir xil naqsh. Uch rejim:
// "soft" (hozirgi standart oq ko'rinish, hech narsa o'zgarmaydi), "light"
// (Apple uslubidagi shisha/frosted dizayn, orqa fonda tabiat surati —
// index.css'dagi [data-theme="light"] global override qoidalari orqali),
// "dark" (qorong'i rejim, xuddi shu texnika bilan).
import { useEffect, useState } from 'react';

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

export function useTheme() {
  const [theme, setThemeState] = useState<AppTheme>(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (next: AppTheme) => {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  return { theme, setTheme };
}
