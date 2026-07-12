import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/shared/config/env';
import { useAuthStore } from '@/features/auth/model/auth.store';

export const http = axios.create({
  baseURL: env.apiUrl,
  timeout: 15_000,
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * 401 kelganda access tokenni bir marta yangilab, navbatdagi so'rovlarni
 * bitta refresh promisega bog'laymiz (thundering herd oldini olish — shu TAB
 * ichida). Bitta brauzerning bir necha tabi bir vaqtda /refresh so'rasa,
 * hammasi BIR XIL httpOnly cookie'ni baham ko'radi — shu sabab Web Locks
 * API (`navigator.locks`) orqali BUTUN BRAUZER darajasida ham faqat bitta
 * tab haqiqiy so'rov yuboradi (qolganlari navbatda kutadi). Aks holda
 * parallel so'rovlar bir xil eski tokenni taqdim etib, backend'da noto'g'ri
 * "qayta ishlatish" (reuse) signalini keltirib chiqarib, foydalanuvchining
 * BARCHA sessiyalarini bekor qilib yuborishi mumkin edi.
 */
let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  try {
    const { data } = await axios.post<{ accessToken: string }>(
      `${env.apiUrl}/auth/refresh`,
      {},
      { withCredentials: true },
    );
    useAuthStore.getState().setAccessToken(data.accessToken);
    return data.accessToken;
  } catch {
    useAuthStore.getState().logout();
    return null;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return navigator.locks.request('shajara-refresh', doRefresh);
  }
  return doRefresh();
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      refreshing ??= refreshAccessToken().finally(() => (refreshing = null));
      const token = await refreshing;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return http(original);
      }
    }
    return Promise.reject(error);
  },
);
