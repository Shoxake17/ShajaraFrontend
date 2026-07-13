// features/media/api/media.api.ts
import { http } from '@/shared/api/http';

export type MediaType = 'IMAGE' | 'VIDEO' | 'DOCUMENT';

export interface MediaDto {
  id: string;
  type: MediaType;
  url: string;
  title: string;
  year: number | null;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface CreateMediaPayload {
  url: string;
  title: string;
  contentType: string;
  sizeBytes: number;
  year?: number;
}

export const mediaApi = {
  list: () => http.get<MediaDto[]>('/media').then((r) => r.data),

  getUploadUrl: (contentType: string) =>
    http
      .post<{ uploadUrl: string; key: string; kind: MediaType }>('/media/upload-url', {
        contentType,
      })
      .then((r) => r.data),

  create: (payload: CreateMediaPayload) =>
    http.post<MediaDto>('/media', payload).then((r) => r.data),

  update: (id: string, patch: { title?: string; year?: number | null }) =>
    http.patch<MediaDto>(`/media/${id}`, patch).then((r) => r.data),

  remove: (id: string) => http.delete<void>(`/media/${id}`).then((r) => r.data),
};

/**
 * Faylni R2'ga TO'G'RIDAN-TO'G'RI yuklaydi (backend orqali o'tmaydi).
 * Qaytadi: R2 obyekt KALITI (ochiq URL EMAS — ko'rish uchun backend
 * har safar vaqtinchalik imzolangan havola beradi, `mediaApi.list()`da).
 */
export async function uploadMediaFile(
  file: File,
): Promise<{ url: string; kind: MediaType; contentType: string; sizeBytes: number }> {
  const { uploadUrl, key, kind } = await mediaApi.getUploadUrl(file.type);
  let res: Response;
  try {
    res = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });
  } catch (err) {
    // fetch() javob OLMASDAN rad etsa — CORS yoki tarmoq darajasidagi xato
    // (masalan R2 bucket'ning o'z CORS siyosati so'rov manbasiga ruxsat
    // bermayapti). HTTP status YO'Q — shu bois alohida turkum.
    throw new Error(`R2_NETWORK_ERROR: ${(err as Error).message}`);
  }
  if (!res.ok) {
    throw new Error(`R2_HTTP_ERROR: ${res.status} ${res.statusText}`.trim());
  }
  return { url: key, kind, contentType: file.type, sizeBytes: file.size };
}
