// features/auth/lib/auth-errors.ts
import { isAxiosError } from 'axios';
import i18n from '@/i18n';

/**
 * Server xatosini foydalanuvchi tushunadigan xabarga aylantirish.
 * Bitta joyda — yangi status qo'shilsa faqat shu fayl o'zgaradi.
 *
 * ESLATMA: `serverMessage` — backend'dan kelgan XOM matn, u hali
 * frontend tiliga BOG'LIQ EMAS (backend hozircha faqat o'zbekcha
 * qaytaradi) — shu bois TARJIMA QILINMAYDI, faqat pastdagi (frontend
 * o'zi hosil qiladigan) zaxira xabarlar tarjima qilinadi.
 */
export function authErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const serverMessage = (error.response?.data as { message?: unknown } | undefined)?.message;
    if (typeof serverMessage === 'string' && serverMessage.length > 0) {
      return serverMessage;
    }
    switch (error.response?.status) {
      case 401:
        return i18n.t('auth.errors.invalidCredentials');
      case 409:
        return i18n.t('auth.errors.alreadyRegistered');
      case 429:
        return i18n.t('auth.errors.tooManyAttempts');
    }
  }
  return i18n.t('common.genericError');
}
