// shared/lib/telegram.ts
// Telegram Login Widget'ning "OAuth popup" mexanizmi (oauth.telegram.org) —
// telegram-widget.js iframe/tugmasini yuklamasdan, xuddi shu popup oqimini
// o'zimiz ochamiz, shu bilan bizning tugma boshqa ijtimoiy tugmalar
// (Google/Apple) bilan BIR XIL uslubda qoladi (Telegram o'zining tayyor
// tugmasini render qilmaydi).
//
// MUHIM (xavfsizlik): bu yerda HECH QANDAY tasdiqlash qilinmaydi — popup
// faqat Telegram'dan qaytgan XOM ma'lumotni frontendga yetkazadi. Haqiqiy
// tekshiruv (HMAC-SHA256 imzo, auth_date muddati) FAQAT backendda
// (auth.service.ts verifyTelegramAuth) — bot tokeni faqat serverda,
// frontendda soxta ma'lumot yasab yuborish orqali hisobga kirib bo'lmaydi.
import { env } from '@/shared/config/env';

export interface TelegramAuthPayload {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export const TELEGRAM_CALLBACK_STORAGE_KEY = 'ajdo:telegram-auth-result';

/**
 * Telegram OAuth popup oynasini ochadi. Foydalanuvchi Telegram'da
 * tasdiqlagach, popup bizning /telegram-callback sahifamizga qaytadi —
 * o'sha sahifa natijani `localStorage`ga yozadi (window.opener EMAS,
 * chunki Cross-Origin-Opener-Policy sozlamalariga qarab popup-opener
 * bog'lanishi uzilib qolishi mumkin — localStorage esa faqat bir xil
 * origin talab qiladi, COOP'dan mustaqil).
 */
export function openTelegramLogin(): Promise<TelegramAuthPayload> {
  return new Promise((resolve, reject) => {
    const returnTo = `${window.location.origin}/telegram-callback`;
    const url =
      `https://oauth.telegram.org/auth?bot_id=${encodeURIComponent(env.telegramBotId)}` +
      `&origin=${encodeURIComponent(window.location.origin)}` +
      `&embed=1&request_access=write&return_to=${encodeURIComponent(returnTo)}`;

    const popup = window.open(url, 'telegram_oauth', 'width=550,height=520,menubar=no,toolbar=no,noopener=no');
    if (!popup) {
      reject(new Error('popup_blocked'));
      return;
    }

    localStorage.removeItem(TELEGRAM_CALLBACK_STORAGE_KEY);
    let settled = false;

    const cleanup = () => {
      window.clearInterval(poll);
      window.removeEventListener('storage', onStorage);
    };
    const finish = (raw: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      localStorage.removeItem(TELEGRAM_CALLBACK_STORAGE_KEY);
      try {
        resolve(JSON.parse(raw) as TelegramAuthPayload);
      } catch {
        reject(new Error('telegram_auth_parse_failed'));
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === TELEGRAM_CALLBACK_STORAGE_KEY && e.newValue) finish(e.newValue);
    };
    window.addEventListener('storage', onStorage);

    // `storage` hodisasi FAQAT boshqa oynalarda o'zgarganda ishga tushadi
    // (ba'zi brauzerlarda kechikishi mumkin) — shu bois qo'shimcha
    // xavfsizlik uchun so'rov (poll) ham qo'yilgan. Popup yopilgan
    // (foydalanuvchi bekor qilgan) holatni ham shu orqali aniqlaymiz.
    const poll = window.setInterval(() => {
      const v = localStorage.getItem(TELEGRAM_CALLBACK_STORAGE_KEY);
      if (v) {
        finish(v);
        return;
      }
      if (popup.closed && !settled) {
        settled = true;
        cleanup();
        reject(new Error('popup_closed'));
      }
    }, 500);
  });
}
