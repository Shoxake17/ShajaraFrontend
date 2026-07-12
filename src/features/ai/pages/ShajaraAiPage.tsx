// features/ai/pages/ShajaraAiPage.tsx
// "Shajara AI" — sun'iy intellekt yordamchisi (tez orada). Imkoniyatlar
// kartalari va o'chirilgan (disabled) xabar yozish qatori.
import type { SVGProps } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import type { AppLayoutContext } from '@/app/AppLayout';

const iconBase = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const LinkIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...iconBase} {...p}>
    <path d="M9 12h6" />
    <path d="M10.5 7H8a5 5 0 0 0 0 10h2.5" />
    <path d="M13.5 7H16a5 5 0 0 1 0 10h-2.5" />
  </svg>
);
const BookIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...iconBase} {...p}>
    <path d="M4 5.5A2 2 0 0 1 6 3.5h14v15H6a2 2 0 0 0-2 2Z" />
    <path d="M20 18.5H6a2 2 0 0 0-2 2" />
  </svg>
);
const PuzzleIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...iconBase} {...p}>
    <path d="M9 4.5h4v2.2a1.6 1.6 0 0 0 2.9 1 1.6 1.6 0 0 1 2.9 1V13h-2.2a1.6 1.6 0 0 0-1 2.9 1.6 1.6 0 0 1-1 2.9H13v2H4.5V9h2.2a1.6 1.6 0 0 0 1-2.9A1.6 1.6 0 0 1 9 4.5Z" />
  </svg>
);
const SendIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...iconBase} strokeWidth={2} {...p}>
    <path d="m4 12 16-7-6.5 16-2.5-7-7-2Z" />
  </svg>
);

const FEATURES = [
  {
    title: 'Qarindoshlikni aniqlash',
    desc: "Ikki a'zo bir-biriga kim bo'lishini so'rang — AI zanjirni topib beradi.",
    Icon: LinkIcon,
    badge: 'bg-brand-50 text-brand-700',
  },
  {
    title: 'Oila tarixini yozish',
    desc: "A'zolar ma'lumotidan avlodlar hikoyasini matn ko'rinishida tayyorlaydi.",
    Icon: BookIcon,
    badge: 'bg-pink-50 text-pink-600',
  },
  {
    title: "Ma'lumotni to'ldirish",
    desc: "Yetishmayotgan qarindoshlar va bo'shliqlarni topishда yordam beradi.",
    Icon: PuzzleIcon,
    badge: 'bg-amber-50 text-amber-600',
  },
];

export function ShajaraAiPage() {
  const { topBarActionsEl } = useOutletContext<AppLayoutContext>();

  return (
    <div className="flex h-full flex-col overflow-hidden bg-brand-50">
      {/* Sarlavha endi BU YERDA emas — AppLayout'ning umumiy header'iga
          portal qilib joylashtiriladi (boshqa sahifalardagi bilan bir xil
          andoza). */}
      {topBarActionsEl &&
        createPortal(
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-brand-900">Shajara AI</p>
            <p className="hidden truncate text-xs text-brand-500 sm:block">Sun&#8216;iy intellekt yordamchisi</p>
          </div>,
          topBarActionsEl,
        )}

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-5">
          {/* Imkoniyatlar */}
          <div className="grid gap-3 sm:grid-cols-3">
            {FEATURES.map(({ title, desc, Icon, badge }) => (
              <div key={title} className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${badge}`}>
                  <Icon width={18} height={18} />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-brand-900">{title}</h3>
                <p className="mt-1 text-xs text-brand-500">{desc}</p>
              </div>
            ))}
          </div>

          {/* Xabar yozish qatori (o'chirilgan) */}
          <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white p-1.5 shadow-sm">
            <input
              disabled
              placeholder="Masalan: “Akmal menga kim bo'ladi?”"
              className="min-w-0 flex-1 bg-transparent px-3 text-sm text-neutral-400 outline-none"
            />
            <span className="hidden shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-medium text-neutral-500 sm:inline-block">
              Tez orada
            </span>
            <button
              disabled
              aria-label="Yuborish"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-400"
            >
              <SendIcon width={16} height={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
