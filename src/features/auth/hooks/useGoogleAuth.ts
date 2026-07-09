// features/auth/hooks/useGoogleAuth.ts
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/features/auth/model/auth.store';
import { authErrorMessage } from '@/features/auth/lib/auth-errors';
import { requestGoogleAccessToken } from '@/shared/lib/google';
import { env } from '@/shared/config/env';

/**
 * Google orqali kirish/ro'yxatdan o'tish (Login va Register sahifalari uchun bitta hook):
 * akkaunt tanlash popupi -> access token -> backend tekshiradi -> sessiya.
 */
export function useGoogleAuth() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    setError(null);
    if (!env.googleClientId) {
      setError("Google orqali kirish hali sozlanmagan");
      return;
    }
    setLoading(true);
    try {
      const googleToken = await requestGoogleAccessToken(env.googleClientId);
      const { user, accessToken } = await authApi.google({ accessToken: googleToken });
      setSession(user, accessToken);
      navigate('/doska');
    } catch (e) {
      // Foydalanuvchi oynani o'zi yopgan bo'lsa — xato ko'rsatmaymiz
      const msg = (e as Error).message;
      if (msg !== 'popup_closed' && msg !== 'access_denied') {
        setError(authErrorMessage(e));
      }
    } finally {
      setLoading(false);
    }
  };

  return { signInWithGoogle, loading, error };
}
