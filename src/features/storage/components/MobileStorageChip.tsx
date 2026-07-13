// features/storage/components/MobileStorageChip.tsx
// Mobil doska sahifalarida (Doska/Oila a'zolarim) — desktop Sidebar'dagi
// xotira blokining mobil muqobili (Sidebar mobilda umuman ko'rinmaydi).
// IXCHAM pill (butun ekran kengligini QAMRAB OLMAYDI — foydalanuvchi buni
// aniq so'ragan), BottomNav bilan bir xil chekka bo'shlig'i (mx-3 andozasi —
// right-3) va bir xil bordеr uslubi (border-2 border-brand-200), ichki
// bo'shliq esa ikki tomondan (pl/pr) bir xilroq — "Apple style" pill.
// Zoom panelidan PASTDA joylashadi: TreeBoardPage/FamilyMembersPage'da
// <Controls className="!bottom-[74px] md:!bottom-[10px]"> orqali mobilda
// (ozgina) yuqoriga suriladi — shu bo'shliqqa shu pill joylashadi.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStorageStore, formatBytes } from '../storage.store';
import { PricingModal } from '@/features/billing/components/PricingModal';

const MB = 1024 * 1024;

export function MobileStorageChip() {
  const { t } = useTranslation();
  const usedBytes = useStorageStore((s) => s.usedBytes);
  const limitBytes = useStorageStore((s) => s.limitBytes);
  const loadUsage = useStorageStore((s) => s.loadUsage);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  const percent = limitBytes > 0 ? Math.min(100, Math.round((usedBytes / limitBytes) * 100)) : 0;
  const remaining = limitBytes - usedBytes;
  // Sidebar'dagi bilan bir xil bosqich: 10 MB dan kam qolsa qizil, 30 MB dan kam qolsa sariq
  const ringColor = remaining < 10 * MB ? '#dc2626' : remaining < 30 * MB ? '#d97706' : '#2C4A38';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('billing.title')}
        className="absolute bottom-3 right-3 z-[5] inline-flex items-center gap-2.5 rounded-full border-2 border-brand-200 bg-white py-2 pl-2 pr-4 shadow-md md:hidden"
      >
        {/* Hajm sig'imi (volume) ko'rinishi — to'lgan qismi (percent) halqa
            sifatida ranglangan, qolgani bo'sh (conic-gradient donut). */}
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(${ringColor} ${percent * 3.6}deg, #E5E7EB 0deg)` }}
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[9px] font-bold"
            style={{ color: ringColor }}
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
