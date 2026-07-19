export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? '/api/v1',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
  /** Telegram bot username (masalan "AJDOO_bot") — maxfiy emas, widget/
   * oauth havolasini qurish uchun. Bot tokeni FAQAT backend'da. */
  telegramBotUsername: import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? 'AJDOO_bot',
  /** Telegram bot ID (raqamli, getMe orqali olingan) — oauth.telegram.org
   * popup havolasi shuni talab qiladi (username emas). Maxfiy emas. */
  telegramBotId: import.meta.env.VITE_TELEGRAM_BOT_ID ?? '8622516314',
} as const;
