// features/push/push.api.ts
import { http } from '@/shared/api/http';

export type PushPlatform = 'WEB' | 'ANDROID';

export const pushApi = {
  register: (token: string, platform: PushPlatform) =>
    http.post<void>('/push/register', { token, platform }).then((r) => r.data),
  unregister: (token: string) => http.delete<void>('/push/register', { data: { token } }).then((r) => r.data),
};
