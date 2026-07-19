// features/auth/hooks/useTelegramLink.ts
import { useState } from 'react';
import { authApi } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/features/auth/model/auth.store';
import { authErrorMessage } from '@/features/auth/lib/auth-errors';
import { openTelegramLogin } from '@/shared/lib/telegram';

/**
 * Sozlamalar → Xavfsizlik: ALLAQACHON kirilgan hisobga Telegram'ni
 * bog'lash — useTelegramAuth (Login/Register) bilan BIR XIL OAuth
 * popup oqimi, lekin YANGI SESSIYA OCHISH/hisob yaratish O'RNIGA joriy
 * (kirilgan) hisobga telegramId yozadi. Shu bilan keyingi safar
 * Telegram orqali kirilsa YANGI hisob EMAS, aynan shu hisobga kiriladi.
 */
export function useTelegramLink() {
  const setUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkTelegram = async () => {
    setError(null);
    setLoading(true);
    try {
      const payload = await openTelegramLogin();
      const user = await authApi.telegramLink(payload);
      setUser(user);
    } catch (e) {
      // Foydalanuvchi popup'ni yopgan/bloklagan bo'lsa — xato ko'rsatmaymiz
      const err = e as { message?: string };
      if (err.message === 'popup_closed' || err.message === 'popup_blocked') {
        return;
      }
      setError(authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return { linkTelegram, loading, error };
}
