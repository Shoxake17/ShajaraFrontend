// features/auth/lib/auth-errors.ts
import { isAxiosError } from 'axios';

/**
 * Server xatosini foydalanuvchi tushunadigan xabarga aylantirish.
 * Bitta joyda — yangi status qo'shilsa faqat shu fayl o'zgaradi.
 */
export function authErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    // Server aniq sabab yuborgan bo'lsa — o'shani ko'rsatamiz
    // (masalan "Google token boshqa ilovaga tegishli")
    const serverMessage = (error.response?.data as { message?: unknown } | undefined)?.message;
    if (typeof serverMessage === 'string' && serverMessage.length > 0) {
      return serverMessage;
    }
    switch (error.response?.status) {
      case 401:
        return "Telefon raqam yoki parol noto'g'ri";
      case 409:
        return "Bu telefon raqam yoki email allaqachon ro'yxatdan o'tgan";
      case 429:
        return "Juda ko'p urinish. Bir daqiqadan so'ng qayta urinib ko'ring";
    }
  }
  return "Xatolik yuz berdi. Qaytadan urinib ko'ring";
}
