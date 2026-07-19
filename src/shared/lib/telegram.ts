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
 * Telegram OAuth popup oynasini ochadi. TASDIQLASH TELEGRAM ILOVASIDA
 * bo'lgach (rasm: telegram/confirm.png), oauth.telegram.org POPUP'NING
 * O'ZI /telegram-callback'ga O'TMAYDI — buning o'rniga popup
 * `window.opener.postMessage({event:'auth_result', result:{...}})`
 * yuboradi va o'zini bo'shatadi (shu sabab avval popup "about:blank"da
 * qotib qolgan edi — telegram/bug.png — biz postMessage'ni umuman
 * tinglamagan edik). Bu — Telegram'ning O'Z rasmiy telegram-widget.js
 * kodidagi mexanizm.
 *
 * ZAXIRA sifatida /telegram-callback (URL query orqali, localStorage'ga
 * yozib) yo'li ham saqlanadi — agar Telegram biror holatda popup'ni
 * haqiqatan return_to'ga yo'naltirsa, shu orqali ham ishlayveradi.
 */
export function openTelegramLogin(): Promise<TelegramAuthPayload> {
  return new Promise((resolve, reject) => {
    const returnTo = `${window.location.origin}/telegram-callback`;
    const url =
      `https://oauth.telegram.org/auth?bot_id=${encodeURIComponent(env.telegramBotId)}` +
      `&origin=${encodeURIComponent(window.location.origin)}` +
      `&embed=1&request_access=write&return_to=${encodeURIComponent(returnTo)}`;

    const popup = window.open(url, 'telegram_oauth', 'width=550,height=520,menubar=no,toolbar=no');
    if (!popup) {
      reject(new Error('popup_blocked'));
      return;
    }

    localStorage.removeItem(TELEGRAM_CALLBACK_STORAGE_KEY);
    let settled = false;

    const cleanup = () => {
      window.clearInterval(poll);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('message', onMessage);
    };
    const finish = (payload: TelegramAuthPayload) => {
      if (settled) return;
      settled = true;
      cleanup();
      localStorage.removeItem(TELEGRAM_CALLBACK_STORAGE_KEY);
      // Telegram ba'zan popup'ni o'zi yopmay, bo'sh sahifa holida
      // qoldiradi (telegram/bug.png) — o'zimiz yopamiz.
      try {
        popup.close();
      } catch {
        /* e'tiborsiz qoldiriladi — muhim emas */
      }
      resolve(payload);
    };
    const finishFromRaw = (raw: string) => {
      try {
        finish(JSON.parse(raw) as TelegramAuthPayload);
      } catch {
        if (!settled) {
          settled = true;
          cleanup();
          reject(new Error('telegram_auth_parse_failed'));
        }
      }
    };

    // ASOSIY yo'l — postMessage. `event.source === popup` tekshiruvi
    // xabarning AYNAN shu ochilgan oynadan kelganini kafolatlaydi
    // (Telegram'ning o'z widget kodidagi bilan bir xil tekshiruv) —
    // origin tekshiruvi ham qo'shimcha himoya sifatida.
    const onMessage = (e: MessageEvent) => {
      if (e.source !== popup) return;
      if (e.origin !== 'https://oauth.telegram.org') return;
      const data = e.data as { event?: string; result?: TelegramAuthPayload } | undefined;
      if (data?.event === 'auth_result' && data.result) {
        finish(data.result);
      }
    };
    window.addEventListener('message', onMessage);

    // ZAXIRA yo'l — /telegram-callback sahifasi orqali localStorage.
    const onStorage = (e: StorageEvent) => {
      if (e.key === TELEGRAM_CALLBACK_STORAGE_KEY && e.newValue) finishFromRaw(e.newValue);
    };
    window.addEventListener('storage', onStorage);

    // Popup foydalanuvchi tomonidan yopilgan (bekor qilingan) holatni
    // aniqlash uchun so'rov (poll) — postMessage/storage kelmasa ham.
    const poll = window.setInterval(() => {
      const v = localStorage.getItem(TELEGRAM_CALLBACK_STORAGE_KEY);
      if (v) {
        finishFromRaw(v);
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
