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
      .post<{ uploadUrl: string; publicUrl: string; kind: MediaType }>('/media/upload-url', {
        contentType,
      })
      .then((r) => r.data),

  create: (payload: CreateMediaPayload) =>
    http.post<MediaDto>('/media', payload).then((r) => r.data),

  update: (id: string, patch: { title?: string; year?: number | null }) =>
    http.patch<MediaDto>(`/media/${id}`, patch).then((r) => r.data),

  remove: (id: string) => http.delete<void>(`/media/${id}`).then((r) => r.data),
};

/** Faylni R2'ga TO'G'RIDAN-TO'G'RI yuklaydi (backend orqali o'tmaydi). */
export async function uploadMediaFile(
  file: File,
): Promise<{ url: string; kind: MediaType; contentType: string; sizeBytes: number }> {
  const { uploadUrl, publicUrl, kind } = await mediaApi.getUploadUrl(file.type);
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!res.ok) throw new Error('Fayl yuklanmadi');
  return { url: publicUrl, kind, contentType: file.type, sizeBytes: file.size };
}
