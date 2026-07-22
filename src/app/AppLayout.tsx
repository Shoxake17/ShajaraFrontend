// app/AppLayout.tsx
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { ThemeBackground } from './ThemeBackground';
import { useSessionLiveness } from '@/features/auth/hooks/useSessionLiveness';
import { useChatStore } from '@/features/chat/model/chat.store';
import { useCallStore } from '@/features/chat/model/call.store';
import { MiniVideoPlayer } from '@/features/chat/components/MiniVideoPlayer';
import { CallOverlay } from '@/features/chat/components/CallOverlay';
import { MinimizedCallBar } from '@/features/chat/components/MinimizedCallBar';
import { IncomingCallBanner } from '@/features/chat/components/IncomingCallBanner';
import { initWebPush } from '@/features/push/push.web';
import { initNativePush } from '@/features/push/push.native';
import { UpdateCheck } from '@/features/update/UpdateCheck';

/**
 * Har sahifa (Outlet) shu orqali o'zining yuqori panel amallarini (qidiruv,
 * filtr, "+qo'shish" kabi tugmalar) UMUMIY, TO'LIQ KENGLIKDAGI header'ga
 * portal qilib qo'yadi — mockup (desktopajdo.png)da logotip BUTUN sahifa
 * tepasida, Sidebar/asosiy kontent ustida yagona chiziq bo'lib turadi,
 * ikkita alohida "AJDO" emas.
 */
export interface AppLayoutContext {
  topBarActionsEl: HTMLDivElement | null;
  /** Doskani TO'LIQ ekranga (Sidebar + header + BottomNav yashirilgan
      holatga) olib chiqish — Loopa panelidagi fullscreen tugmasi shu orqali
      boshqaradi (TreeBoardPage / FamilyMembersPage). Bu SILLIQ (animatsiyali)
      o'tish. */
  boardFullscreen: boolean;
  setBoardFullscreen: (v: boolean) => void;
  /** Xabarlar sahifasida (mobil, suhbat ochilganda) — faqat AJDO logotipi
      (header o'zi EMAS — portal orqali kelgan tarkib, masalan orqaga+ism-
      familiya, ko'rinishda qoladi) va pastki navigatsiya yashiriladi.
      boardFullscreen'dan farqli — ANIMATSIYASIZ (darhol), navigatsiya
      "sirg'alib" ko'rinmasin deb. */
  chatFullscreen: boolean;
  setChatFullscreen: (v: boolean) => void;
}

// Apple uslubidagi silliq, "elastik" chiqish egri chizig'i — barcha
// fullscreen animatsiyalarida (header, Sidebar, BottomNav) bir xil.
const EASE = 'ease-[cubic-bezier(0.32,0.72,0,1)]';

export function AppLayout() {
  // Boshqa qurilmadan "Yakunlash" bosilsa — shu tabni ham tezda chiqarib yuboradi
  useSessionLiveness();
  const [topBarActionsEl, setTopBarActionsEl] = useState<HTMLDivElement | null>(null);
  const [boardFullscreen, setBoardFullscreen] = useState(false);
  const [chatFullscreen, setChatFullscreen] = useState(false);

  // Xabarlar — ilova ichida bo'lganda (qaysi sahifada bo'lishidan qat'i
  // nazar) doim ulangan, shunda Sidebar/BottomNav'dagi o'qilmagan xabar
  // belgisi va real-vaqtli yetkazish har doim ishlaydi.
  const connectChat = useChatStore((s) => s.connect);
  const disconnectChat = useChatStore((s) => s.disconnect);
  const loadChatContacts = useChatStore((s) => s.loadContacts);
  useEffect(() => {
    connectChat();
    void loadChatContacts();
    return () => disconnectChat();
  }, [connectChat, disconnectChat, loadChatContacts]);

  // Qo'ng'iroq (call:*) socket tinglovchilari — mavjud /chat ulanishi orqali
  // (calls.store.ts o'zi getChatSocket()'dan foydalanadi, yangi ulanish ochmaydi).
  useEffect(() => {
    useCallStore.getState().wireListeners();
  }, []);

  // Ilova/tab BUTUNLAY yopilganda ham xabar kelganda tepada tizim push
  // bildirishnomasi chiqishi uchun (Telegram uslubi) — brauzer/PWA'da
  // Firebase Web Push, Android APK'da nativ FCM (@capacitor/push-notifications).
  // Har ikkalasi ham sozlanmagan/muvaffaqiyatsiz bo'lsa jim o'chirilgan
  // holatda ishlaydi — chatning o'zi (socket) bunga bog'liq emas.
  useEffect(() => {
    void initWebPush();
    void initNativePush();
  }, []);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-brand-50">
      <ThemeBackground />
      <header
        className={`mx-3 flex h-14 shrink-0 items-center gap-2.5 overflow-hidden rounded-full border bg-white px-3 shadow-sm transition-all duration-300 ${EASE} sm:gap-3 sm:px-4 ${
          boardFullscreen
            ? 'mt-0 max-h-0 border-transparent opacity-0'
            : 'mt-6 max-h-14 border-brand-100 opacity-100 lg:mt-3'
        }`}
      >
        {!chatFullscreen && (
          <>
            <img src="/shajaratree.png" alt="AJDO" className="h-8 w-8 shrink-0 rounded-full object-cover" />
            <span className="flex shrink-0 items-center gap-1 font-sans text-lg font-bold text-brand-900 lg:w-[9.5rem]">
              AJDO
            </span>
          </>
        )}
        {/* Har sahifa o'z amallarini (qidiruv, filtr, tugmalar) shu bo'sh
            joyga portal orqali joylashtiradi — bo'sh bo'lsa faqat logotip
            ko'rinadi (masalan Sozlamalar/Media sahifalarida). */}
        <div ref={setTopBarActionsEl} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3" />
      </header>

      <div className="flex min-h-0 flex-1 lg:flex-row">
        <Sidebar fullscreen={boardFullscreen} />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Outlet
            context={
              { topBarActionsEl, boardFullscreen, setBoardFullscreen, chatFullscreen, setChatFullscreen } satisfies AppLayoutContext
            }
          />
        </main>
      </div>
      <BottomNav fullscreen={boardFullscreen || chatFullscreen} instant={chatFullscreen} />
      <MiniVideoPlayer />
      <CallOverlay />
      <MinimizedCallBar />
      <IncomingCallBanner />
      <UpdateCheck />
    </div>
  );
}
