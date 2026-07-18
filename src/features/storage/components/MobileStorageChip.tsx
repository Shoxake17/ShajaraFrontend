// features/storage/components/MobileStorageChip.tsx
// Mobil doska sahifalarida (Doska/Oila a'zolarim) — desktop Sidebar'dagi
// xotira blokining mobil muqobili (Sidebar mobilda umuman ko'rinmaydi).
// Bitta pill — bosilsa to'liq "Tarif rejalari" oynasi ochiladi (Xotira HAM,
// Slot HAM o'sha oynaning ICHIDA — tashqarida alohida "Slot" tugmasi YO'Q,
// bu ataylab shunday: hammasi bitta joyda, Plan blogi ichida boshqariladi).
//
// O'NGGA SURIB YASHIRISH: pill'ni o'ngga tortsa (chegaradan oshsa) ekran
// chetiga yashirinadi — qoladigan kichik tutqich TEPAGA/PASTGA SURILADI
// (qotib qolmaydi), joyi useStorageStore'da saqlanadi. 70%+ to'lgan bo'lsa
// yashirish TAQIQLANADI.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HIDE_CHIP_MAX_PERCENT, formatBytes, storagePercent, useStorageStore } from '../storage.store';
import { PricingModal } from '@/features/billing/components/PricingModal';
import { useTheme } from '@/shared/hooks/useTheme';

const MB = 1024 * 1024;
const DRAG_HIDE_THRESHOLD = 56; // shuncha pikseldan ko'p o'ngga tortilsa — yashiriladi
const TAP_MOVE_THRESHOLD = 6; // shundan kam harakat — bosish (tap) deb hisoblanadi

export function useStorageChipVisibility() {
  const usedBytes = useStorageStore((s) => s.usedBytes);
  const limitBytes = useStorageStore((s) => s.limitBytes);
  const chipHidden = useStorageStore((s) => s.chipHidden);
  const percent = storagePercent(usedBytes, limitBytes);
  const canHide = percent < HIDE_CHIP_MAX_PERCENT;
  return { effectivelyHidden: chipHidden && canHide, percent };
}

export function MobileStorageChip() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const usedBytes = useStorageStore((s) => s.usedBytes);
  const limitBytes = useStorageStore((s) => s.limitBytes);
  const loadUsage = useStorageStore((s) => s.loadUsage);
  const chipHidden = useStorageStore((s) => s.chipHidden);
  const setChipHidden = useStorageStore((s) => s.setChipHidden);
  const chipTabPercentY = useStorageStore((s) => s.chipTabPercentY);
  const setChipTabPercentY = useStorageStore((s) => s.setChipTabPercentY);

  const [open, setOpen] = useState(false);

  // Pill — ufqiy surish (yashirish)
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const movedRef = useRef(false);

  // Tutqich (yashirin holatdagi tutqich) — tik surish, qotib qolmasin
  const [tabDragY, setTabDragY] = useState(0);
  const [tabDragging, setTabDragging] = useState(false);
  const tabStartYRef = useRef(0);
  const tabMovedRef = useRef(false);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  const percent = storagePercent(usedBytes, limitBytes);
  const remaining = limitBytes - usedBytes;
  // Sidebar'dagi bilan bir xil bosqich: 10 MB dan kam qolsa qizil, 30 MB dan kam qolsa sariq
  const ringColor = remaining < 10 * MB ? '#dc2626' : remaining < 30 * MB ? '#d97706' : '#2C4A38';
  const canHide = percent < HIDE_CHIP_MAX_PERCENT;
  const effectivelyHidden = chipHidden && canHide;

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!canHide) return; // 70%+ — surib bo'lmaydi
    setDragging(true);
    movedRef.current = false;
    startXRef.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return;
    const delta = e.clientX - startXRef.current;
    if (Math.abs(delta) > TAP_MOVE_THRESHOLD) movedRef.current = true;
    setDragX(Math.max(0, delta)); // faqat o'ngga (musbat) suriladi
  };
  const endDrag = () => {
    if (!dragging) return;
    setDragging(false);
    if (dragX > DRAG_HIDE_THRESHOLD) setChipHidden(true);
    setDragX(0);
  };

  const onClick = () => {
    if (movedRef.current) {
      movedRef.current = false; // bu tap emas, drag edi — modal ochilmasin
      return;
    }
    setOpen(true);
  };

  // Tutqich (yashirin holatdagi tutqich) — tik surish
  const onTabPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    setTabDragging(true);
    tabMovedRef.current = false;
    tabStartYRef.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onTabPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!tabDragging) return;
    const delta = e.clientY - tabStartYRef.current;
    if (Math.abs(delta) > TAP_MOVE_THRESHOLD) tabMovedRef.current = true;
    setTabDragY(delta);
  };
  const endTabDrag = () => {
    if (!tabDragging) return;
    setTabDragging(false);
    if (tabMovedRef.current) {
      const viewportH = window.innerHeight || 800;
      setChipTabPercentY(chipTabPercentY + (tabDragY / viewportH) * 100);
    }
    setTabDragY(0);
  };
  const onTabClick = () => {
    if (tabMovedRef.current) {
      tabMovedRef.current = false;
      return;
    }
    setChipHidden(false);
  };

  if (effectivelyHidden) {
    return (
      <>
        <button
          type="button"
          onPointerDown={onTabPointerDown}
          onPointerMove={onTabPointerMove}
          onPointerUp={endTabDrag}
          onPointerCancel={endTabDrag}
          onClick={onTabClick}
          aria-label={t('billing.title')}
          style={{
            top: `${chipTabPercentY}%`,
            transform: `translateY(calc(-50% + ${tabDragY}px))`,
            touchAction: 'none',
            transition: tabDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          className="absolute right-0 z-[5] flex h-11 w-5 items-center justify-center rounded-l-full border-2 border-r-0 border-brand-200 bg-white shadow-md md:hidden"
        >
          <span className="h-5 w-1 rounded-full bg-brand-300" />
        </button>
        <PricingModal open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={onClick}
        aria-label={t('billing.title')}
        style={{
          transform: `translateX(${dragX}px)`,
          touchAction: 'pan-y',
          transition: dragging ? 'none' : 'transform 0.2s ease-out',
        }}
        className="absolute bottom-3 right-3 z-[5] inline-flex items-center gap-2.5 rounded-full border-2 border-brand-200 bg-white py-2 pl-2 pr-4 shadow-md md:hidden"
      >
        {/* Hajm sig'imi (volume) ko'rinishi — to'lgan qismi (percent) halqa
            sifatida ranglangan, qolgani bo'sh (conic-gradient donut). */}
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(${ringColor} ${percent * 3.6}deg, #E5E7EB 0deg)` }}
        >
          {/* MUHIM: bu doiracha atigi 28px — Light rejimdagi umumiy shisha
              qoidasi (blur) juda kichik elementlarda "shakli yo'q dog'"ga
              aylanib, atrofdagi rangli halqadan (ringColor) rang "yuqib"
              o'tishiga sabab bo'lardi. Shu bois bu yerda .bg-white
              ISHLATILMAYDI — o'rniga aniq, blursiz rang beriladi. */}
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-bold"
            style={{
              color: ringColor,
              backgroundColor: theme === 'dark' ? '#1c1e1c' : theme === 'light' ? 'rgb(255 255 255 / 0.9)' : '#fff',
            }}
          >
            {percent}%
          </span>
        </span>
        <span className="text-left leading-tight">
          <span className="block text-[11px] font-semibold text-brand-900">
            {t('nav.memory')} · {formatBytes(usedBytes)}/{formatBytes(limitBytes)}
          </span>
          <span className="block text-[11px] font-medium text-brand-600">{t('billing.expand')} →</span>
        </span>
      </button>
      <PricingModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
