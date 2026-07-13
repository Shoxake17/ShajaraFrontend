// shared/hooks/useLanguage.ts
// Joriy til + almashtirish — Sozlamalar va Kirish sahifasi ikkalasida ham
// ishlatiladi (qayta yozilmasin uchun).
import { useTranslation } from 'react-i18next';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, saveLanguage, type SupportedLanguage } from '@/i18n';

/** Til nomlari — o'z tilida (endonim), UI tiliga qarab tarjima qilinmaydi. */
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  uz: "O'zbekcha",
  ru: 'Русский',
  en: 'English',
};

export function useLanguage() {
  const { i18n } = useTranslation();
  const language = (SUPPORTED_LANGUAGES as readonly string[]).includes(i18n.language)
    ? (i18n.language as SupportedLanguage)
    : DEFAULT_LANGUAGE;

  const setLanguage = (lang: SupportedLanguage) => {
    void i18n.changeLanguage(lang);
    saveLanguage(lang);
  };

  /** Keyingi tilga o'tadi (uz -> ru -> en -> uz, ...) — oddiy bitta tugmali
      almashtirgichlarda (Login/Register/Navbar) ishlatiladi. */
  const cycleLanguage = () => {
    const idx = SUPPORTED_LANGUAGES.indexOf(language);
    setLanguage(SUPPORTED_LANGUAGES[(idx + 1) % SUPPORTED_LANGUAGES.length]);
  };

  return { language, setLanguage, cycleLanguage };
}
