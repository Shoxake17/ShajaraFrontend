// features/chat/model/chat.store.ts
import { create } from 'zustand';
import { chatApi, type CallHistoryItem, type ChatContact, type ChatMessage, type SendMessagePayload } from '../api/chat.api';
import { getChatSocket, connectChatSocket, disconnectChatSocket } from '../lib/socket';
import { useStorageStore } from '@/features/storage/storage.store';
import { useAuthStore } from '@/features/auth/model/auth.store';

interface ChatState {
  contacts: ChatContact[];
  contactsLoaded: boolean;
  activeUserId: string | null;
  messagesByUserId: Record<string, ChatMessage[]>;
  /** Chatdagi "qo'ng'iroqlar tarixi" tizim-yozuvlari — messagesByUserId
   * bilan BIR XIL kalit (otherUserId), MessagesPage.tsx ikkalasini
   * createdAt bo'yicha birlashtirib render qiladi. */
  callsByUserId: Record<string, CallHistoryItem[]>;
  connected: boolean;
  loadContacts: () => Promise<void>;
  openConversation: (otherUserId: string) => Promise<void>;
  closeConversation: () => void;
  sendMessage: (otherUserId: string, dto: SendMessagePayload) => Promise<void>;
  markRead: (otherUserId: string) => void;
  deleteMessage: (otherUserId: string, messageId: string) => Promise<void>;
  editMessage: (otherUserId: string, messageId: string, text: string) => Promise<void>;
  connect: () => void;
  disconnect: () => void;
  reset: () => void;
}

// Socket event tinglovchilari FAQAT bir marta ulanadi (moduldagi bitta
// socket instansi bilan birga yashaydi) — connect() qayta chaqirilsa ham
// (masalan sahifa qayta ochilganda) ikkilanmasin.
let listenersWired = false;

export const useChatStore = create<ChatState>((set, get) => ({
  contacts: [],
  contactsLoaded: false,
  activeUserId: null,
  messagesByUserId: {},
  callsByUserId: {},
  connected: false,

  loadContacts: async () => {
    try {
      const contacts = await chatApi.listContacts();
      set({ contacts, contactsLoaded: true });
    } catch {
      // jim — ro'yxat shunchaki bo'sh ko'rinadi
    }
  },

  openConversation: async (otherUserId) => {
    set({ activeUserId: otherUserId });
    try {
      const { messages, calls } = await chatApi.listMessages(otherUserId);
      set((s) => ({
        messagesByUserId: { ...s.messagesByUserId, [otherUserId]: messages },
        callsByUserId: { ...s.callsByUserId, [otherUserId]: calls },
      }));
      get().markRead(otherUserId);
    } catch {
      // jim
    }
  },

  closeConversation: () => set({ activeUserId: null }),

  sendMessage: async (otherUserId, dto) => {
    const socket = getChatSocket();
    let message: ChatMessage;
    if (socket.connected) {
      const res = (await socket
        .timeout(8000)
        .emitWithAck('message:send', { recipientId: otherUserId, ...dto })) as {
        ok?: boolean;
        error?: string;
        status?: number;
        message?: ChatMessage;
      };
      if (res?.error || !res?.message) {
        // MUHIM: quotaMessage() (storage.store.ts) faqat Axios'ning
        // `err.response.status` shaklini biladi — WebSocket xatosi bunday
        // maydonga ega EMAS (backend chat.gateway.ts'dan kelgan oddiy
        // `{error, status}`), shu bois SHU YERDA xuddi Axios xatosidek
        // qayta shakllantiramiz — aks holda 413 (xotira to'lgan) ham
        // umumiy "Xabar yuborilmadi" bo'lib ko'rinib qolardi.
        const err = new Error(res?.error ?? 'Xabar yuborilmadi') as Error & {
          response?: { status?: number; data?: { message?: string } };
        };
        if (res?.status) err.response = { status: res.status, data: { message: res.error } };
        throw err;
      }
      message = res.message;
    } else {
      message = await chatApi.sendMessage(otherUserId, dto);
    }
    set((s) => ({
      messagesByUserId: {
        ...s.messagesByUserId,
        [otherUserId]: [...(s.messagesByUserId[otherUserId] ?? []), message],
      },
    }));
    void get().loadContacts(); // oxirgi xabar/tartib yangilanishi uchun
    // Xabar (matn+biriktirma) yuboruvchining o'z xotira kvotasiga qo'shiladi
    // (backend: QuotaService.usage() "messages" bucket) — Sidebar/Sozlamalar
    // dagi foizni SHU YERDA ham yangilaymiz (avvalgi xato: faqat Sidebar
    // o'zi mount bo'lganda bir marta yuklardi, chat orqali yuborilgan
    // rasm/video sarfga qo'shilib qo'shilmagani ko'rinmasdi).
    void useStorageStore.getState().loadUsage();
  },

  markRead: (otherUserId) => {
    void chatApi.markRead(otherUserId);
    const socket = getChatSocket();
    if (socket.connected) socket.emit('message:read', { otherUserId });
    set((s) => ({
      contacts: s.contacts.map((c) => (c.userId === otherUserId ? { ...c, unreadCount: 0 } : c)),
    }));
  },

  /** Faqat o'zi yuborgan xabarni o'chira oladi (server ham qayta tekshiradi) — DB'dan ham, R2'dan ham o'chadi, boshqa tomonga ham real-vaqtda bildiriladi (message:deleted) */
  deleteMessage: async (otherUserId, messageId) => {
    await chatApi.deleteMessage(messageId);
    set((s) => ({
      messagesByUserId: {
        ...s.messagesByUserId,
        [otherUserId]: (s.messagesByUserId[otherUserId] ?? []).filter((m) => m.id !== messageId),
      },
    }));
    void get().loadContacts();
    void useStorageStore.getState().loadUsage();
  },

  /** Faqat o'zi yuborgan xabar MATNINI tahrirlaydi (server ham qayta tekshiradi) */
  editMessage: async (otherUserId, messageId, text) => {
    const updated = await chatApi.editMessage(messageId, text);
    set((s) => ({
      messagesByUserId: {
        ...s.messagesByUserId,
        [otherUserId]: (s.messagesByUserId[otherUserId] ?? []).map((m) => (m.id === messageId ? updated : m)),
      },
    }));
    void get().loadContacts();
    void useStorageStore.getState().loadUsage();
  },

  connect: () => {
    connectChatSocket();
    if (listenersWired) return;
    listenersWired = true;
    const socket = getChatSocket();

    socket.on('message:new', (message: ChatMessage) => {
      // Server faqat QABUL QILUVCHIning xonasiga yuboradi — shu bois bu
      // yerga keladigan xabarning yuboruvchisi HAR DOIM "boshqa tomon".
      const otherUserId = message.senderId;
      const isActive = get().activeUserId === otherUserId;
      set((s) => {
        const existing = s.messagesByUserId[otherUserId] ?? [];
        return {
          messagesByUserId: { ...s.messagesByUserId, [otherUserId]: [...existing, message] },
          contacts: s.contacts.map((c) =>
            c.userId === otherUserId
              ? {
                  ...c,
                  lastMessage: message.text,
                  lastMessageAt: message.createdAt,
                  unreadCount: isActive ? 0 : c.unreadCount + 1,
                }
              : c,
          ),
        };
      });
      if (isActive) get().markRead(otherUserId);
    });

    socket.on('message:read', ({ by }: { by: string }) => {
      set((s) => ({
        messagesByUserId: {
          ...s.messagesByUserId,
          [by]: (s.messagesByUserId[by] ?? []).map((m) =>
            m.senderId !== by ? { ...m, readAt: m.readAt ?? new Date().toISOString() } : m,
          ),
        },
      }));
    });

    socket.on('message:deleted', ({ messageId }: { messageId: string }) => {
      set((s) => {
        const messagesByUserId = { ...s.messagesByUserId };
        for (const otherUserId of Object.keys(messagesByUserId)) {
          messagesByUserId[otherUserId] = messagesByUserId[otherUserId].filter((m) => m.id !== messageId);
        }
        return { messagesByUserId };
      });
    });

    socket.on('message:edited', (message: ChatMessage) => {
      // Yuboruvchi HAR DOIM "boshqa tomon" (server faqat qarshi tarafga yuboradi)
      const otherUserId = message.senderId;
      set((s) => ({
        messagesByUserId: {
          ...s.messagesByUserId,
          [otherUserId]: (s.messagesByUserId[otherUserId] ?? []).map((m) => (m.id === message.id ? message : m)),
        },
      }));
    });

    // Qo'ng'iroq yakunlanganda (ikkala tomonga ham yuboriladi, backend:
    // chat.gateway.ts'ning onCallHistory) — suhbat ochiq bo'lsa darhol
    // ko'rinishi uchun, o'zimiz qaysi tomon (caller/callee) ekanligimizga
    // qarab "boshqa tomon" ID'sini aniqlab, o'sha suhbat ro'yxatiga
    // qo'shamiz.
    socket.on('call:history', (item: CallHistoryItem) => {
      const myId = useAuthStore.getState().user?.id;
      const otherUserId = myId === item.callerId ? item.calleeId : item.callerId;
      set((s) => ({
        callsByUserId: {
          ...s.callsByUserId,
          [otherUserId]: [item, ...(s.callsByUserId[otherUserId] ?? []).filter((c) => c.callId !== item.callId)],
        },
      }));
    });

    socket.on('connect', () => set({ connected: true }));
    socket.on('disconnect', () => set({ connected: false }));
  },

  disconnect: () => {
    disconnectChatSocket();
    set({ connected: false });
  },

  reset: () =>
    set({
      contacts: [],
      contactsLoaded: false,
      activeUserId: null,
      messagesByUserId: {},
      callsByUserId: {},
      connected: false,
    }),
}));

export function chatUnreadTotal(contacts: ChatContact[]): number {
  // Himoya: bu selektor har bir sahifada (Sidebar/BottomNav, AppLayout
  // orqali GLOBAL) ishlaydi — agar `contacts` biror lahzada array
  // bo'lmasa (masalan useSyncExternalStoreWithSelector'ning tranzit
  // holati), .reduce() BUTUN ilovani ("t.reduce is not a function")
  // krash qilib qo'yardi.
  if (!Array.isArray(contacts)) return 0;
  return contacts.reduce((sum, c) => sum + c.unreadCount, 0);
}
