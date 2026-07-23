// features/auth/hooks/useGoogleAuth.ts
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { authApi } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/features/auth/model/auth.store';
import { authErrorMessage } from '@/features/auth/lib/auth-errors';
import { requestGoogleAccessToken } from '@/shared/lib/google';
import { requestGoogleIdTokenNative } from '@/shared/lib/google-native';
import { isElectron, signInWithGoogleDesktop } from '@/shared/lib/electron';
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
    const isDesktop = isElectron();
    if (isDesktop ? !env.googleDesktopClientId : !env.googleClientId) {
      setError("Google orqali kirish hali sozlanmagan");
      return;
    }
    setLoading(true);
    try {
      // Uchta muhit — uchta har xil oqim:
      // - Nativ (Capacitor): GIS popup ishlamaydi (Google WebView'ni
      //   bloklaydi) — Play Services'ning o'z hisob tanlash oynasi
      //   ishlatiladi, u ID token qaytaradi (access token emas).
      // - Desktop (Electron): xuddi shu sababdan (Google Electron
      //   oynasini ham "disallowed_useragent" deb bloklaydi) — tizim
      //   brauzeri + loopback OAuth oqimi (electron.ts), u ham ID token
      //   qaytaradi.
      // - Veb: GIS popup, ACCESS token.
      const isNative = Capacitor.isNativePlatform();
      const { user, accessToken } = isNative
        ? await authApi.google({ idToken: await requestGoogleIdTokenNative() })
        : isDesktop
          ? await authApi.google({ idToken: (await signInWithGoogleDesktop(env.googleDesktopClientId)).idToken })
          : await authApi.google({ accessToken: await requestGoogleAccessToken(env.googleClientId) });
      setSession(user, accessToken);
      navigate('/doska');
    } catch (e) {
      // Foydalanuvchi hisob tanlashni bekor qilgan bo'lsa — xato ko'rsatmaymiz
      // (veb: GIS popup_closed/access_denied; nativ plugin: SIGN_IN_CANCELLED,
      // kod 12501 — https://developers.google.com/android/reference/com/google/android/gms/auth/api/signin/GoogleSignInStatusCodes)
      const err = e as { message?: string; code?: string };
      if (err.message === 'popup_closed' || err.message === 'access_denied' || err.code === '12501') {
        return;
      }
      // Nativ plugin xatosi backend javobi EMAS (axios emas) — authErrorMessage
      // buni umumiy "Xatolik yuz berdi"ga aylantirardi, aniq sababni yashirib.
      // Diagnostika uchun XOM xabar + STATUS KODINI ham qo'shib ko'rsatamiz
      // (kod muhim: masalan 10 = DEVELOPER_ERROR — OAuth client/SHA-1/consent
      // screen sozlamasida xato, https://developers.google.com/android/reference/com/google/android/gms/common/api/CommonStatusCodes).
      const base = authErrorMessage(e);
      const isNonAxiosError = (Capacitor.isNativePlatform() || isDesktop) && typeof e === 'object' && e !== null;
      const raw = isNonAxiosError
        ? [err.message, err.code ? `kod: ${err.code}` : null].filter(Boolean).join(', ')
        : null;
      setError(raw && raw !== base ? `${base} (${raw})` : base);
    } finally {
      setLoading(false);
    }
  };

  return { signInWithGoogle, loading, error };
}
