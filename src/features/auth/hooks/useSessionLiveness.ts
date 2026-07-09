// features/auth/hooks/useSessionLiveness.ts
// "Faol qurilmalar"dan yakunlangan (yoki parol o'zgartirilib bekor qilingan)
// sessiyani ushbu qurilmada DARHOL aniqlash uchun.
// Backend endi har so'rovda sessiyani Redis'dan tekshiradi (real-time revocation),
// lekin foydalanuvchi hech qanday amal qilmasa (bo'sh/faol bo'lmagan sahifa)
// hech qanday so'rov ketmaydi — shu sababli mahalliy tayanch so'rovni davriy
// yuboramiz. 401 kelsa http interceptor avval refresh urinadi (u ham
// yakunlangan sessiyada muvaffaqiyatsiz bo'ladi) va keyin avtomatik logout
// qiladi — ProtectedRoute foydalanuvchini /login ga chiqaradi.
import { useEffect } from 'react';
import { authApi } from '@/features/auth/api/auth.api';

const CHECK_INTERVAL_MS = 20_000;

export function useSessionLiveness() {
  useEffect(() => {
    const check = () => {
      authApi.me().catch(() => {
        // Xato interceptor darajasida hal qilinadi (refresh yoki logout)
      });
    };

    const interval = setInterval(check, CHECK_INTERVAL_MS);
    // Tabga qaytilganda ham darhol tekshiramiz — "kutish"ni qisqartiradi
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}
