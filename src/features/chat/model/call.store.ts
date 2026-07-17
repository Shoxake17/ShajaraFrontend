// features/chat/model/call.store.ts
// Ovozli/videoli qo'ng'iroq holati — chat.store.ts/pip.store.ts bilan bir
// xil naqsh (bitta global instansiya, socket tinglovchilari FAQAT bir marta
// ulanadi). Qo'ng'iroq HARAKATLARI (invite/accept/decline/end) REST orqali
// (calls.api.ts) — veb VA Android native bir xil yo'ldan foydalanadi.
// Real-vaqtli signalizatsiya (boshqa tomon nima qildi) — mavjud /chat socket
// ulanishi orqali (backend: chat.gateway.ts'dagi @OnEvent tinglovchilari).
//
// Video/ovoz trek(lar)ini DOM'ga ulash CallOverlay.tsx'ning o'z ishi (Room
// hodisalarini to'g'ridan-to'g'ri tinglaydi) — MediaStreamTrack kabi
// serializatsiya qilib bo'lmaydigan obyektlarni zustand holatida saqlash
// shart emas, faqat `room` instansiyasining o'zi beriladi.
import { create } from 'zustand';
import { Room } from 'livekit-client';
import { getChatSocket } from '../lib/socket';
import { callsApi, type CallType } from '../api/calls.api';
import type { ChatContact } from '../api/chat.api';

export type CallPhase = 'idle' | 'ringing-outgoing' | 'ringing-incoming' | 'connecting' | 'active';

export interface IncomingCallInfo {
  callId: string;
  callerId: string;
  callerName: string;
  callType: CallType;
  roomName: string;
}

interface CallState {
  phase: CallPhase;
  callId: string | null;
  peer: ChatContact | null;
  callType: CallType;
  incoming: IncomingCallInfo | null;
  room: Room | null;
  micMuted: boolean;
  cameraOff: boolean;
  screenSharing: boolean;
  error: string | null;

  wireListeners: () => void;
  startCall: (contact: ChatContact, type: CallType) => Promise<void>;
  acceptIncoming: () => Promise<void>;
  declineIncoming: () => void;
  hangUp: () => Promise<void>;
  toggleMic: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  reset: () => void;
}

let listenersWired = false;

async function joinRoom(token: string, livekitUrl: string, callType: CallType): Promise<Room> {
  const room = new Room();
  await room.connect(livekitUrl, token);
  await room.localParticipant.setMicrophoneEnabled(true);
  if (callType === 'VIDEO') await room.localParticipant.setCameraEnabled(true);
  return room;
}

export const useCallStore = create<CallState>((set, get) => ({
  phase: 'idle',
  callId: null,
  peer: null,
  callType: 'AUDIO',
  incoming: null,
  room: null,
  micMuted: false,
  cameraOff: false,
  screenSharing: false,
  error: null,

  wireListeners: () => {
    if (listenersWired) return;
    listenersWired = true;
    const socket = getChatSocket();

    socket.on('call:invite', (payload: IncomingCallInfo) => {
      // Band bo'lsak (allaqachon boshqa qo'ng'iroqdamiz) — avtomatik rad etamiz
      if (get().phase !== 'idle') {
        void callsApi.decline(payload.callId);
        return;
      }
      set({ phase: 'ringing-incoming', incoming: payload, callType: payload.callType, callId: payload.callId });
    });

    socket.on('call:accepted', () => set({ phase: 'active' }));
    socket.on('call:declined', () => get().reset());
    socket.on('call:ended', () => get().reset());
  },

  startCall: async (contact, type) => {
    set({ phase: 'ringing-outgoing', peer: contact, callType: type, error: null });
    try {
      const session = await callsApi.invite(contact.userId, type);
      const room = await joinRoom(session.token, session.livekitUrl, type);
      set({ callId: session.callId, room });
    } catch (e) {
      set({ error: (e as Error).message });
      get().reset();
    }
  },

  acceptIncoming: async () => {
    const incoming = get().incoming;
    if (!incoming) return;
    set({ phase: 'connecting' });
    try {
      const session = await callsApi.accept(incoming.callId);
      const room = await joinRoom(session.token, session.livekitUrl, incoming.callType);
      set({ room, phase: 'active', incoming: null });
    } catch (e) {
      set({ error: (e as Error).message });
      get().reset();
    }
  },

  declineIncoming: () => {
    const incoming = get().incoming;
    if (incoming) void callsApi.decline(incoming.callId);
    set({ phase: 'idle', incoming: null, callId: null });
  },

  hangUp: async () => {
    const callId = get().callId;
    if (callId) void callsApi.end(callId);
    get().reset();
  },

  toggleMic: async () => {
    const room = get().room;
    if (!room) return;
    const next = !get().micMuted;
    await room.localParticipant.setMicrophoneEnabled(!next);
    set({ micMuted: next });
  },

  toggleCamera: async () => {
    const room = get().room;
    if (!room) return;
    const next = !get().cameraOff;
    await room.localParticipant.setCameraEnabled(!next);
    set({ cameraOff: next });
  },

  toggleScreenShare: async () => {
    const room = get().room;
    if (!room) return;
    const next = !get().screenSharing;
    await room.localParticipant.setScreenShareEnabled(next);
    set({ screenSharing: next });
  },

  reset: () => {
    const room = get().room;
    if (room) void room.disconnect();
    set({
      phase: 'idle',
      callId: null,
      peer: null,
      incoming: null,
      room: null,
      micMuted: false,
      cameraOff: false,
      screenSharing: false,
      error: null,
    });
  },
}));
