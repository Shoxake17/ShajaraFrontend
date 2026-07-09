// features/auth/hooks/useBootstrapSession.ts
import { useEffect } from 'react';
import { authApi } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/features/auth/model/auth.store';

/**
 * Ilova ochilganda sessiyani tiklash:
 * /auth/me chaqiriladi -> 401 bo'lsa http interceptor httpOnly cookie bilan
 * tokenni avtomatik yangilab qayta urinadi -> muvaffaqiyatda profil xotiraga tushadi.
 * localStorage umuman ishlatilmaydi (XSS'dan himoya).
 */
export function useBootstrapSession() {
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await authApi.me();
        if (!cancelled) useAuthStore.getState().setUser(user);
      } catch {
        if (!cancelled) useAuthStore.getState().logout();
      } finally {
        if (!cancelled) useAuthStore.getState().setInitialized();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return initialized;
}
