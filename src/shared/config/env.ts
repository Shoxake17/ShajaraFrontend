export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? '/api/v1',
  /** APK yuklab olish/yangilanish manifesti joylashgan sayt manzili —
   * nativ (Capacitor) buildda MUTLAQ ("https://ajdo.uz", apiUrl'dan
   * "/api/v1" qismini olib tashlab hosil qilinadi — WebView hech qanday
   * nginx orqali proxy qilinmagani uchun), veb buildda esa BO'SH ("" —
   * o'sha origin'ning o'zidan nisbiy `/downloads/...` sifatida ishlaydi). */
  downloadsBaseUrl: (import.meta.env.VITE_API_URL ?? '').replace(/\/api\/v1\/?$/, ''),
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
  /** Telegram bot username (masalan "AJDOO_bot") — maxfiy emas, widget/
   * oauth havolasini qurish uchun. Bot tokeni FAQAT backend'da. */
  telegramBotUsername: import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? 'AJDOO_bot',
  /** Telegram bot ID (raqamli, getMe orqali olingan) — oauth.telegram.org
   * popup havolasi shuni talab qiladi (username emas). Maxfiy emas. */
  telegramBotId: import.meta.env.VITE_TELEGRAM_BOT_ID ?? '8622516314',
} as const;
