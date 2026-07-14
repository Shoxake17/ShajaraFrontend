// app/AppLayout.tsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { useSessionLiveness } from '@/features/auth/hooks/useSessionLiveness';

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
      boshqaradi (TreeBoardPage / FamilyMembersPage). */
  boardFullscreen: boolean;
  setBoardFullscreen: (v: boolean) => void;
}

// Apple uslubidagi silliq, "elastik" chiqish egri chizig'i — barcha
// fullscreen animatsiyalarida (header, Sidebar, BottomNav) bir xil.
const EASE = 'ease-[cubic-bezier(0.32,0.72,0,1)]';

export function AppLayout() {
  // Boshqa qurilmadan "Yakunlash" bosilsa — shu tabni ham tezda chiqarib yuboradi
  useSessionLiveness();
  const [topBarActionsEl, setTopBarActionsEl] = useState<HTMLDivElement | null>(null);
  const [boardFullscreen, setBoardFullscreen] = useState(false);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-brand-50">
      
      <header
        className={`mx-3 flex h-14 shrink-0 items-center gap-2.5 overflow-hidden rounded-full border bg-white px-3 shadow-sm transition-all duration-300 ${EASE} sm:gap-3 sm:px-4 ${
          boardFullscreen
            ? 'mt-0 max-h-0 border-transparent opacity-0'
            : 'mt-6 max-h-14 border-brand-100 opacity-100 lg:mt-3'
        }`}
      >
        <img src="/shajaratree.png" alt="AJDO" className="h-8 w-8 shrink-0 rounded-full object-cover" />
        <span className="flex shrink-0 items-center gap-1 font-sans text-lg font-bold text-brand-900 lg:w-[9.5rem]">
          AJDO
        </span>
        {/* Har sahifa o'z amallarini (qidiruv, filtr, tugmalar) shu bo'sh
            joyga portal orqali joylashtiradi — bo'sh bo'lsa faqat logotip
            ko'rinadi (masalan Sozlamalar/Media sahifalarida). */}
        <div ref={setTopBarActionsEl} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3" />
      </header>

      <div className="flex min-h-0 flex-1 lg:flex-row">
        <Sidebar fullscreen={boardFullscreen} />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Outlet
            context={{ topBarActionsEl, boardFullscreen, setBoardFullscreen } satisfies AppLayoutContext}
          />
        </main>
      </div>
      <BottomNav fullscreen={boardFullscreen} />
    </div>
  );
}
