// features/chat/lib/socket.ts
// Xabarlar uchun bitta umumiy Socket.IO ulanish (butun ilova davomida bitta
// nusxa). Token FUNKSIYA sifatida beriladi — har qayta ulanishda (masalan
// access token yangilangandan keyin) ENG YANGI qiymat o'qiladi.
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/features/auth/model/auth.store';
import { env } from '@/shared/config/env';

// nginx faqat "/api/*" ni backend'ga proxy qiladi (infra/nginx/conf.d) —
// shu bois socket.io yo'li ham shu ostida (backend: chat.gateway.ts'dagi
// bir xil `path`).
const SOCKET_PATH = '/api/socket.io/';

function resolveSocketUrl(): string {
  // Nativ ilova: VITE_API_URL mutlaq (https://ajdo.uz/api/v1) — shundan
  // domenni ajratib olamiz. Veb: nisbiy ('/api/v1') — joriy sahifa manzili.
  if (env.apiUrl.startsWith('http')) return new URL(env.apiUrl).origin;
  return window.location.origin;
}

let socket: Socket | null = null;

export function getChatSocket(): Socket {
  if (socket) return socket;
  // Namespace ("/chat") URL yo'lining bir qismi sifatida beriladi (socket.io
  // konvensiyasi) — `path` esa transport (HTTP) manzili, ikkalasi boshqa-boshqa.
  socket = io(`${resolveSocketUrl()}/chat`, {
    path: SOCKET_PATH,
    autoConnect: false,
    transports: ['websocket', 'polling'],
    auth: (cb) => cb({ token: useAuthStore.getState().accessToken }),
  });
  return socket;
}

export function connectChatSocket(): void {
  const s = getChatSocket();
  if (!s.connected) s.connect();
}

export function disconnectChatSocket(): void {
  socket?.disconnect();
}
