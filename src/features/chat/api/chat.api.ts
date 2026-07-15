// features/chat/api/chat.api.ts
import { http } from '@/shared/api/http';

export interface ChatContact {
  userId: string;
  memberId: string;
  fullName: string;
  gender: string;
  photoUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export type ChatAttachmentType = 'IMAGE' | 'VIDEO' | 'DOCUMENT';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string | null;
  attachmentUrl: string | null;
  attachmentType: ChatAttachmentType | null;
  attachmentSizeBytes: number | null;
  sizeBytes: number;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface SendMessagePayload {
  text?: string;
  attachmentUrl?: string;
  attachmentContentType?: string;
  attachmentSizeBytes?: number;
}

export const chatApi = {
  /** Shajara doskasidagi (ota tomon + ona tomon) xabar yubora oladigan a'zolar */
  listContacts: () => http.get<ChatContact[]>('/chat/contacts').then((r) => r.data),
  listMessages: (otherUserId: string, before?: string) =>
    http
      .get<ChatMessage[]>(`/chat/conversations/${otherUserId}/messages`, {
        params: before ? { before } : undefined,
      })
      .then((r) => r.data),
  /** Socket ishlamasa fallback — real-vaqtli yetkazish baribir ishlaydi (backend broadcastNewMessage) */
  sendMessage: (otherUserId: string, dto: SendMessagePayload) =>
    http.post<ChatMessage>(`/chat/conversations/${otherUserId}/messages`, dto).then((r) => r.data),
  markRead: (otherUserId: string) =>
    http.patch<void>(`/chat/conversations/${otherUserId}/read`).then((r) => r.data),
  /** Xabarni (va biriktirmani) butunlay o'chiradi — DB'dan ham, R2'dan ham; boshqa tomonga ham real-vaqtda bildiriladi */
  deleteMessage: (messageId: string) => http.delete<void>(`/chat/messages/${messageId}`).then((r) => r.data),
  /** Biriktirma (rasm/video/hujjat) uchun bir martalik R2 yuklash havolasi */
  createUploadUrl: (contentType: string) =>
    http
      .post<{ uploadUrl: string; key: string; kind: ChatAttachmentType }>('/chat/upload-url', { contentType })
      .then((r) => r.data),
};

/** Xabarga rasm/video/hujjat biriktirish — family.api.ts:uploadPhoto() bilan bir xil to'g'ridan-to'g'ri R2'ga yuklash naqshi */
export async function uploadChatAttachment(
  file: File,
): Promise<{ key: string; contentType: string; sizeBytes: number; kind: ChatAttachmentType }> {
  const { uploadUrl, key, kind } = await chatApi.createUploadUrl(file.type);
  let res: Response;
  try {
    res = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
  } catch (err) {
    throw new Error(`R2_NETWORK_ERROR: ${(err as Error).message}`);
  }
  if (!res.ok) throw new Error(`R2_HTTP_ERROR: ${res.status} ${res.statusText}`.trim());
  return { key, contentType: file.type, sizeBytes: file.size, kind };
}
