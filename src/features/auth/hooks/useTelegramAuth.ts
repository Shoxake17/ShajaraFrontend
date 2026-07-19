// features/auth/hooks/useTelegramAuth.ts
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/features/auth/model/auth.store';
import { authErrorMessage } from '@/features/auth/lib/auth-errors';
import { openTelegramLogin } from '@/shared/lib/telegram';

/**
 * Telegram orqali kirish/ro'yxatdan o'tish (Login va Register sahifalari
 * uchun bitta hook, useGoogleAuth bilan bir xil andoza): OAuth popup ->
 * xom ma'lumot -> backend HMAC imzosini tekshiradi -> sessiya.
 */
export function useTelegramAuth() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInWithTelegram = async () => {
    setError(null);
    setLoading(true);
    try {
      const payload = await openTelegramLogin();
      const { user, accessToken } = await authApi.telegram(payload);
      setSession(user, accessToken);
      navigate('/doska');
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

  return { signInWithTelegram, loading, error };
}
