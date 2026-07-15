// features/chat/model/chat.store.ts
import { create } from 'zustand';
import { chatApi, type ChatContact, type ChatMessage, type SendMessagePayload } from '../api/chat.api';
import { getChatSocket, connectChatSocket, disconnectChatSocket } from '../lib/socket';
import { useStorageStore } from '@/features/storage/storage.store';

interface ChatState {
  contacts: ChatContact[];
  contactsLoaded: boolean;
  activeUserId: string | null;
  messagesByUserId: Record<string, ChatMessage[]>;
  connected: boolean;
  loadContacts: () => Promise<void>;
  openConversation: (otherUserId: string) => Promise<void>;
  closeConversation: () => void;
  sendMessage: (otherUserId: string, dto: SendMessagePayload) => Promise<void>;
  markRead: (otherUserId: string) => void;
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
      const messages = await chatApi.listMessages(otherUserId);
      set((s) => ({ messagesByUserId: { ...s.messagesByUserId, [otherUserId]: messages } }));
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
        message?: ChatMessage;
      };
      if (res?.error || !res?.message) throw new Error(res?.error ?? 'Xabar yuborilmadi');
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

    socket.on('connect', () => set({ connected: true }));
    socket.on('disconnect', () => set({ connected: false }));
  },

  disconnect: () => {
    disconnectChatSocket();
    set({ connected: false });
  },

  reset: () =>
    set({ contacts: [], contactsLoaded: false, activeUserId: null, messagesByUserId: {}, connected: false }),
}));

export function chatUnreadTotal(contacts: ChatContact[]): number {
  return contacts.reduce((sum, c) => sum + c.unreadCount, 0);
}
