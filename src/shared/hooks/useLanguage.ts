// shared/hooks/useLanguage.ts
// Joriy til + almashtirish — Sozlamalar va Kirish sahifasi ikkalasida ham
// ishlatiladi (qayta yozilmasin uchun).
import { useTranslation } from 'react-i18next';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, saveLanguage, type SupportedLanguage } from '@/i18n';

export function useLanguage() {
  const { i18n } = useTranslation();
  const language = (SUPPORTED_LANGUAGES as readonly string[]).includes(i18n.language)
    ? (i18n.language as SupportedLanguage)
    : DEFAULT_LANGUAGE;

  const setLanguage = (lang: SupportedLanguage) => {
    void i18n.changeLanguage(lang);
    saveLanguage(lang);
  };

  return { language, setLanguage };
}
