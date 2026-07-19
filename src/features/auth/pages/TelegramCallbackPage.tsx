// features/auth/pages/TelegramCallbackPage.tsx
// Telegram OAuth popup shu sahifaga qaytadi (return_to) — URL query
// parametrlarini (id, first_name, ..., hash) o'qib, ochgan oynaga
// localStorage orqali yetkazadi va o'zini yopadi. Foydalanuvchi bu
// sahifani deyarli ko'rmaydi (bir zumda yopiladi).
import { useEffect } from 'react';
import { TELEGRAM_CALLBACK_STORAGE_KEY } from '@/shared/lib/telegram';

export function TelegramCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('hash')) {
      const payload: Record<string, string> = {};
      for (const [key, value] of params.entries()) payload[key] = value;
      localStorage.setItem(TELEGRAM_CALLBACK_STORAGE_KEY, JSON.stringify(payload));
    }
    window.close();
  }, []);

  return (
    <div className="flex h-dvh items-center justify-center bg-brand-50 px-4 text-center text-sm text-brand-700">
      Tasdiqlanmoqda… Bu oynani yopishingiz mumkin.
    </div>
  );
}
