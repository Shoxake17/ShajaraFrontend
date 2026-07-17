// features/chat/api/chat.api.ts
import { http } from '@/shared/api/http';

export interface ChatContact {
  userId: string;
  memberId: string;
  fullName: string;
  gender: string;
  photoUrl: string | null;
  /** Shajara doskasidagi tayyor belgi ("Aka", "Ona", ...) — qo'ng'iroq
   * ekranida ism ostida ko'rsatish uchun. */
  relation: string | null;
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
  editedAt: string | null;
  createdAt: string;
}

/** Chatdagi "qo'ng'iroqlar tarixi" yozuvi — Telegram uslubidagi tizim
 * yozuvi sifatida render qilinadi (MessagesPage.tsx `messages`ga
 * birlashtiriladi). Backend: calls.service.ts'ning `call.history`
 * hodisasi/chat.service.ts'ning `listCallHistory()`. */
export interface CallHistoryItem {
  callId: string;
  callerId: string;
  calleeId: string;
  callType: 'AUDIO' | 'VIDEO';
  status: 'RINGING' | 'ACCEPTED' | 'DECLINED' | 'MISSED' | 'ENDED';
  startedAt: string | null;
  endedAt: string | null;
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
      .get<{ messages: ChatMessage[]; calls: CallHistoryItem[] }>(`/chat/conversations/${otherUserId}/messages`, {
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
  /** Xabar MATNINI tahrirlash — faqat yuboruvchi */
  editMessage: (messageId: string, text: string) =>
    http.patch<ChatMessage>(`/chat/messages/${messageId}`, { text }).then((r) => r.data),
  /** Biriktirma (rasm/video/hujjat) uchun bir martalik R2 yuklash havolasi */
  createUploadUrl: (contentType: string) =>
    http
      .post<{ uploadUrl: string; key: string; kind: ChatAttachmentType }>('/chat/upload-url', { contentType })
      .then((r) => r.data),
};

/**
 * Xabarga rasm/video/hujjat biriktirish — family.api.ts:uploadPhoto() bilan
 * bir xil to'g'ridan-to'g'ri R2'ga yuklash naqshi. XMLHttpRequest ishlatiladi
 * (fetch emas) — chunki faqat XHR "upload.onprogress" orqali HAQIQIY yuklash
 * foizini beradi (Telegram uslubidagi bubble ichidagi % ko'rsatkich uchun
 * shart — soxta/taxminiy progress emas).
 */
export async function uploadChatAttachment(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ key: string; contentType: string; sizeBytes: number; kind: ChatAttachmentType }> {
  const { uploadUrl, key, kind } = await chatApi.createUploadUrl(file.type);
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`R2_HTTP_ERROR: ${xhr.status} ${xhr.statusText}`.trim()));
    };
    xhr.onerror = () => reject(new Error('R2_NETWORK_ERROR: tarmoq xatosi'));
    xhr.send(file);
  });
  return { key, contentType: file.type, sizeBytes: file.size, kind };
}
