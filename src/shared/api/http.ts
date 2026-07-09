import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/shared/config/env';
import { useAuthStore } from '@/features/auth/model/auth.store';
import { getSessionTag } from '@/shared/lib/session-tag';

export const http = axios.create({
  baseURL: env.apiUrl,
  timeout: 15_000,
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Refresh cookie'ni shu tabga bog'lash uchun (boshqa tabdagi qayta login
  // bu tabning sessiyasini o'chirib qo'ymasligi uchun — refresh-cookie.ts'ga qarang)
  config.headers['X-Session-Tag'] = getSessionTag();
  return config;
});

/**
 * 401 kelganda access tokenni bir marta yangilab, navbatdagi so'rovlarni
 * bitta refresh promisega bog'laymiz (thundering herd oldini olish).
 */
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const { data } = await axios.post<{ accessToken: string }>(
      `${env.apiUrl}/auth/refresh`,
      {},
      { withCredentials: true, headers: { 'X-Session-Tag': getSessionTag() } },
    );
    useAuthStore.getState().setAccessToken(data.accessToken);
    return data.accessToken;
  } catch {
    useAuthStore.getState().logout();
    return null;
  }
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
