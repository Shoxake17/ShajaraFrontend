// features/chat/api/calls.api.ts
// Qo'ng'iroq harakatlari (invite/accept/decline/end) — Android native ilova
// ham AYNAN shu REST endpointlardan foydalanadi (backend: calls.controller.ts).
import { http } from '@/shared/api/http';

export type CallType = 'AUDIO' | 'VIDEO';

export interface CallSession {
  callId: string;
  roomName: string;
  token: string;
  livekitUrl: string;
}

export const callsApi = {
  invite: (calleeId: string, type: CallType) =>
    http.post<CallSession>('/calls/invite', { calleeId, type }).then((r) => r.data),
  accept: (callId: string) => http.post<CallSession>('/calls/accept', { callId }).then((r) => r.data),
  decline: (callId: string) => http.post<void>('/calls/decline', { callId }).then((r) => r.data),
  end: (callId: string) => http.post<void>('/calls/end', { callId }).then((r) => r.data),
};
