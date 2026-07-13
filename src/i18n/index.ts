// i18n/index.ts
// Ilova tili — foydalanuvchi Sozlamalar'dan tanlaydi (O'zbek/Rus), tanlov
// localStorage'da saqlanadi (keyingi safar ilovani ochganda eslab qoladi).
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import uz from './locales/uz.json';
import ru from './locales/ru.json';

export const SUPPORTED_LANGUAGES = ['uz', 'ru'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'uz';
const STORAGE_KEY = 'shajara.lang';

export function loadSavedLanguage(): SupportedLanguage {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(saved as SupportedLanguage)
      ? (saved as SupportedLanguage)
      : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function saveLanguage(lang: SupportedLanguage): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* localStorage yo'q bo'lsa — indamay o'tamiz (faqat UI qulayligi) */
  }
}

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      uz: { translation: uz },
      ru: { translation: ru },
    },
    lng: loadSavedLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: { escapeValue: false }, // React JSX o'zi ekranlaydi (XSS himoyasi)
    returnNull: false,
  });

export default i18n;
