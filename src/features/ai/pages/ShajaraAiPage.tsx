// features/ai/pages/ShajaraAiPage.tsx
// "Shajara AI" — sun'iy intellekt yordamchisi (tez orada). Imkoniyatlar
// kartalari va savol-javob qatori: yozib yuborilsa, pastda (boshqa AI
// ilovalariga o'xshash, Apple uslubidagi bordered blokda) javob chiqadi —
// hozircha DEMO javob (haqiqiy AI hali ulanmagan, "Tez orada").
import { useState, type FormEvent, type SVGProps } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import type { AppLayoutContext } from '@/app/AppLayout';

const iconBase = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const SparkleIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...iconBase} {...p}>
    <path d="M12 3.5 13.6 8l4.5 1.6-4.5 1.6L12 15.7l-1.6-4.5L5.9 9.6 10.4 8 12 3.5Z" />
    <path d="M18.5 15.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9Z" />
  </svg>
);
const SendIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...iconBase} strokeWidth={2} {...p}>
    <path d="m4 12 16-7-6.5 16-2.5-7-7-2Z" />
  </svg>
);

interface Turn {
  q: string;
  a: string;
}

const DEMO_ANSWER =
  "Tez orada bu savolingizga chinakam javob bera olaman — hozircha Shajara AI ustida ishlanmoqda. Kuzatib boring!";

export function ShajaraAiPage() {
  const { topBarActionsEl } = useOutletContext<AppLayoutContext>();
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState<Turn[]>([]);

  // Haqiqiy AI hali ulanmagan — demo javob, faqat kiritish/javob
  // blokining KO'RINISHINI namoyish qilish uchun ("Tez orada").
  const onAsk = (e: FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setConversation((c) => [...c, { q, a: DEMO_ANSWER }]);
    setQuestion('');
  };

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
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          {/* Imkoniyatlar */}
          <div className="grid gap-3 sm:grid-cols-3"></div>

          {/* Savol-javob — o'zi yuborgan savol pushti-brend pufakchada,
              AI javobi esa Apple uslubidagi BORDERED blokda (rounded-2xl,
              yumshoq soya, kichik AI belgisi bilan). */}
          {conversation.length > 0 && (
            <div className="space-y-4">
              {conversation.map((turn, i) => (
                <div key={i} className="space-y-2.5">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-700 px-4 py-2.5 text-sm text-white shadow-sm">
                      {turn.q}
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-100 bg-white text-brand-700 shadow-sm">
                      <SparkleIcon width={15} height={15} />
                    </span>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-brand-100 bg-white px-4 py-3 text-sm leading-relaxed text-brand-900 shadow-sm">
                      {turn.a}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Xabar yozish qatori — yozib yuborilsa yuqorida javob chiqadi */}
          <form
            onSubmit={onAsk}
            className="flex shrink-0 items-center gap-2 rounded-full border border-neutral-200 bg-white p-1.5 shadow-sm transition-colors focus-within:border-brand-400"
          >
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Masalan: “Akmal menga kim bo'ladi?”"
              className="min-w-0 flex-1 bg-transparent px-3 text-sm text-brand-900 outline-none placeholder:text-neutral-400"
            />
            <span className="hidden shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-medium text-neutral-500 sm:inline-block">
              Tez orada
            </span>
            <button
              type="submit"
              disabled={!question.trim()}
              aria-label="Yuborish"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white transition-colors hover:bg-brand-800 disabled:bg-neutral-200 disabled:text-neutral-400"
            >
              <SendIcon width={16} height={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
