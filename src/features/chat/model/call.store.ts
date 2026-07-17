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
import { Capacitor } from '@capacitor/core';
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
  callerAvatarUrl: string | null;
  callerRelation: string | null;
}

/** CallOverlay uchun minimal "kim bilan gaplashyapman" ma'lumoti — chiquvchi
 * qo'ng'iroqda to'liq ChatContact bor (gender ham), lekin kiruvchini qabul
 * qilganda faqat IncomingCallInfo'dagi maydonlar mavjud (gender yo'q,
 * shu bois avatar rangi standart bo'yicha tanlanadi) — ikkalasi ham shu
 * umumiy shaklga moslanadi. */
export interface CallPeerInfo {
  fullName: string;
  photoUrl: string | null;
  relation: string | null;
  gender: string;
}

interface CallState {
  phase: CallPhase;
  callId: string | null;
  peer: CallPeerInfo | null;
  callType: CallType;
  incoming: IncomingCallInfo | null;
  room: Room | null;
  micMuted: boolean;
  cameraOff: boolean;
  screenSharing: boolean;
  /** Qo'ng'iroq boshlangan payt (Date.now()) — ikki tomonda BIR XIL
   * ko'rinadigan davomiylik hisoblagichi uchun (CallOverlay shundan
   * hisoblaydi). `active` bosqichiga o'tganda o'rnatiladi. */
  callStartedAt: number | null;
  error: string | null;

  wireListeners: () => void;
  startCall: (contact: ChatContact, type: CallType) => Promise<void>;
  acceptIncoming: () => Promise<void>;
  declineIncoming: () => void;
  hangUp: () => Promise<void>;
  toggleMic: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  /** Suhbatdosh xonaga birinchi marta qo'shilganda chaqiriladi (CallOverlay
   * Room hodisalarini tinglab chaqiradi) — ikki tomonda BIR XIL boshlanish
   * nuqtasidan hisoblangan davomiylik uchun (accept so'rovi vaqtidan EMAS,
   * chunki chaqiruvchi ancha oldin ulangan bo'ladi). */
  markCallStarted: () => void;
  reset: () => void;
}

let listenersWired = false;

// MUHIM TUZATISH ("ulanadi-keyin-uziladi" xatosi): tugma bosilgani bilan
// React holati SINXRON yangilanmaydi (render/commit keyingi tsiklda) — shu
// oraliqda ikkinchi marta bosish (tez ikki marta bosish, yoki hodisa
// navbatida allaqachon turgan ikkinchi klik) startCall()/acceptIncoming()ni
// IKKINCHI marta ishga tushirar, natijada IKKITA mustaqil Room() obyekti
// BIR VAQTDA ulanardi. LiveKit BIR XIL identity bilan ikkinchi marta
// ulanishni ko'rgach BIRINCHI ulanishni SERVER TOMONDAN uzadi — aynan shu
// "connected" dan darhol keyin "disconnected -> connecting" holat almashinuvi
// konsolda ko'ringan sabab edi. Yechim: bitta vaqtda faqat BITTA ulanish
// urinishi bo'lishini kafolatlovchi sinxron qulf.
let joinInFlight = false;

interface JoinResult {
  room: Room;
  micFailed: boolean;
  cameraFailed: boolean;
}

async function joinRoom(token: string, livekitUrl: string, callType: CallType): Promise<JoinResult> {
  const room = new Room();
  await room.connect(livekitUrl, token);
  // MUHIM TUZATISH ("ulanadi-darhol-uziladi" xatosi): `room.connect()`
  // O'ZI muvaffaqiyatli bo'lishi bilanoq suhbatdosh (masalan native
  // chaqiruvchi) buni allaqachon ParticipantConnected sifatida ko'radi.
  // Lekin mikrofon/kamera ULASHISH (getUserMedia) BUTUNLAY BOSHQA qadam —
  // brauzer ruxsat so'ramasa/rad etsa, mikrofon boshqa oynada band bo'lsa
  // yoki qurilma topilmasa, bu chaqiruvlar CHIQARIB YUBORARDI (throw), va
  // bu istisno yuqoriga — acceptIncoming()/startCall()ning catch blokiga
  // o'tib, ALLAQACHON MUVAFFAQIYATLI o'rnatilgan xona ulanishini
  // reset()'ga majburlardi. Natijada: xona serverga ULANDI (shu bois
  // boshqa tomon uni ko'rdi), lekin DARHOL qayta uzildi — garchi ulanishning
  // o'zi mutlaqo sog'lom bo'lsa ham. Endi media xatosi ulanishni O'LDIRMAYDI
  // — Zoom/Telegram kabi, ruxsat/qurilma muammosi bo'lsa ham qo'ng'iroq
  // DAVOM ETADI (shunchaki o'sha trek uzatilmaydi, foydalanuvchi keyinroq
  // qo'lda yoqishga urinishi mumkin).
  let micFailed = false;
  let cameraFailed = false;
  try {
    await room.localParticipant.setMicrophoneEnabled(true);
  } catch {
    micFailed = true;
  }
  if (callType === 'VIDEO') {
    try {
      await room.localParticipant.setCameraEnabled(true);
    } catch {
      cameraFailed = true;
    }
  }
  return { room, micFailed, cameraFailed };
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
  callStartedAt: null,
  error: null,

  wireListeners: () => {
    // Android native'da qo'ng'iroqning TO'LIQ mustaqil o'z oqimi bor
    // (FCM push -> IncomingCallActivity/CallActivity, calls/native-call.ts) —
    // shu WebView'ning bu yerdagi JS/livekit-client bilan PARALLEL ravishda
    // xuddi shu 'call:invite' socket hodisasiga ham reaksiya qilishi ikkita
    // mustaqil qo'ng'iroq oqimini bir vaqtda ishga tushirar edi: foydalanuvchi
    // native ekran o'rniga (yoki u bilan bir qatorda) shu WebView tagidagi
    // JS CallOverlay/IncomingCallBanner bilan ham "band" qilinishi mumkin edi
    // — natijada ikki tomon ikki XIL klient (native LiveKit SDK vs
    // brauzer WebRTC) bilan ulanib, holat (connecting/ulandi) mos kelmasligi
    // va WebView audio orqali o'z-o'zini eshitish kabi muammolarga sabab
    // bo'lgan. Shu bois native platformada bu tinglovchilar UMUMAN
    // ULANMAYDI — qo'ng'iroq FAQAT native oqim orqali boshqariladi.
    if (Capacitor.isNativePlatform()) return;
    if (listenersWired) return;
    listenersWired = true;
    const socket = getChatSocket();

    socket.on('call:invite', (payload: IncomingCallInfo) => {
      // Xuddi shu qo'ng'iroq uchun ikkinchi marta 'call:invite' kelishi
      // mumkin (masalan socket qisqa uzilib qayta ulansa) — bu holda
      // HECH NARSA qilmaymiz (avtomatik rad etib QO'YMAYMIZ), aks holda
      // ALLAQACHON javob berilgan/qabul qilingan qo'ng'iroq tasodifan
      // rad etilib, ulanib turgan aloqa uzilib qolar edi.
      if (payload.callId === get().callId) return;
      // Band bo'lsak (allaqachon BOSHQA qo'ng'iroqdamiz) — avtomatik rad etamiz
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
    // Allaqachon boshqa qo'ng'iroq jarayonida bo'lsak (yoki tugma tez-tez
    // bosilib IKKINCHI marta shu funksiya ishga tushirilgan bo'lsa) — indamay
    // chiqamiz. Bu ikki mustaqil LiveKit ulanishning (va ulardan biri server
    // tomonidan majburan uzilishining) oldini oladi.
    if (get().phase !== 'idle' || joinInFlight) return;
    joinInFlight = true;
    set({
      phase: 'ringing-outgoing',
      peer: { fullName: contact.fullName, photoUrl: contact.photoUrl, relation: contact.relation, gender: contact.gender },
      callType: type,
      error: null,
    });
    try {
      const session = await callsApi.invite(contact.userId, type);
      // MUHIM TUZATISH: `callId` ILGARI faqat joinRoom() (LiveKit ulanish +
      // mikrofon/kamera nashr qilish, tarmoqqa qarab bir necha soniya
      // cho'zilishi mumkin) tugagandan KEYIN o'rnatilardi. Agar foydalanuvchi
      // "jiringlayapti" holatida — javob kutmasdan — Qizil tugmani bossa,
      // hangUp() shu paytda `callId`ni HALI NULL deb topib, backend'ga
      // /calls/end SO'ROVI UMUMAN YUBORILMASDI — natijada chaqiruvchining
      // o'z ekrani yopilsa ham, chaqirilayotgan tomon (B) 30 soniyalik
      // muddat tugagunga qadar jiringlab QOLIB KETARDI. Endi `callId`
      // invite() javob berishi bilanoq (joinRoom'ni kutmasdan) o'rnatiladi.
      set({ callId: session.callId });
      const { room, micFailed, cameraFailed } = await joinRoom(session.token, session.livekitUrl, type);
      // Ulanish tugagunga qadar foydalanuvchi qizil tugmani bosib ulgurgan
      // (hangUp -> reset()) bo'lishi mumkin — bu holda `callId` allaqachon
      // null (yoki boshqa qo'ng'iroqniki). Bunday "kech qolgan" ulanishni
      // holatga QO'SHMASDAN darhol uzamiz, aks holda allaqachon bekor
      // qilingan qo'ng'iroq ekranga qaytib kelib "jonlanib" qolar edi.
      if (get().callId !== session.callId) {
        void room.disconnect();
        return;
      }
      set({ room, micMuted: micFailed, cameraOff: type === 'VIDEO' && cameraFailed });
    } catch (e) {
      set({ error: (e as Error).message });
      get().reset();
    } finally {
      joinInFlight = false;
    }
  },

  acceptIncoming: async () => {
    // `joinInFlight` — startCall bilan bir xil qulf: tez-tez ikki marta
    // bosish (yoki hodisa navbatidagi ikkinchi klik) ikkinchi marta
    // ishga tushishining oldini oladi.
    if (joinInFlight) return;
    const incoming = get().incoming;
    if (!incoming) return;
    joinInFlight = true;
    // MUHIM TUZATISH: avval `peer` FAQAT startCall() (chiquvchi qo'ng'iroq)
    // paytida o'rnatilardi — kiruvchini qabul qilganda `incoming` "active"
    // bosqichida null'ga tozalangach, CallOverlay'da chaqiruvchining ismi/
    // rasmi/qarindoshligi ko'rsatiladigan HECH QANDAY ma'lumot qolmasdi
    // (shu bois "AJDO" standart matni ko'rinardi). Endi `incoming`dan
    // `peer`ga ko'chiriladi. `incoming` shu yerdayoq null qilinadi — aks
    // holda tugma DOMda hali turgan lahzada ikkinchi klik xuddi shu
    // `incoming`ni qayta o'qib, accept() so'rovini IKKINCHI marta yuborardi.
    set({
      phase: 'connecting',
      incoming: null,
      peer: {
        fullName: incoming.callerName,
        photoUrl: incoming.callerAvatarUrl,
        relation: incoming.callerRelation,
        gender: 'MALE',
      },
    });
    try {
      const session = await callsApi.accept(incoming.callId);
      const { room, micFailed, cameraFailed } = await joinRoom(session.token, session.livekitUrl, incoming.callType);
      // startCall()dagi bilan bir xil himoya — foydalanuvchi ulanish
      // tugagunga qadar qizil tugmani bosib ulgurgan bo'lishi mumkin.
      if (get().callId !== incoming.callId) {
        void room.disconnect();
        return;
      }
      set({
        room,
        phase: 'active',
        incoming: null,
        micMuted: micFailed,
        cameraOff: incoming.callType === 'VIDEO' && cameraFailed,
      });
    } catch (e) {
      set({ error: (e as Error).message });
      get().reset();
    } finally {
      joinInFlight = false;
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

  markCallStarted: () => {
    if (get().callStartedAt == null) set({ callStartedAt: Date.now() });
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
      callStartedAt: null,
      error: null,
    });
  },
}));
