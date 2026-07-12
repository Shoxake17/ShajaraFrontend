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
}

export function AppLayout() {
  // Boshqa qurilmadan "Yakunlash" bosilsa — shu tabni ham tezda chiqarib yuboradi
  useSessionLiveness();
  // useRef EMAS — callback ref + state: portal nishoni DOM'ga ilingandan
  // keyin qayta render bo'lishi kerak, aks holda bolalar (Outlet) birinchi
  // renderda ref.current === null holatini ko'radi.
  const [topBarActionsEl, setTopBarActionsEl] = useState<HTMLDivElement | null>(null);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-brand-50">
      {/* Umumiy yuqori panel — BARCHA sahifalarda bir xil, to'liq kenglikda
          (Sidebar va asosiy kontent ustida, ikkalasidan ustunroq qatorda). */}
      <header className="mx-3 mt-3 flex h-14 shrink-0 items-center gap-2.5 rounded-full border border-brand-100 bg-white px-3 shadow-sm sm:gap-3 sm:px-4">
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
        <Sidebar />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Outlet context={{ topBarActionsEl } satisfies AppLayoutContext} />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
