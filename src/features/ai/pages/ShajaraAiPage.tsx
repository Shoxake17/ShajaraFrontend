// features/ai/pages/ShajaraAiPage.tsx
// "Shajara AI" — sun'iy intellekt yordamchisi (tez orada). Hozircha ko'rinish
// namunasi: oila daraxti bo'yicha savol-javob, qarindoshlik izlash va h.k.
import { PageShell } from '@/shared/ui/PageShell';

const FEATURES = [
  {
    title: 'Qarindoshlikni aniqlash',
    desc: "Ikki a'zo bir-biriga kim bo'lishini so'rang — AI zanjirni topib beradi.",
  },
  {
    title: 'Oila tarixini yozish',
    desc: "A'zolar ma'lumotidan avlodlar hikoyasini matn ko'rinishida tayyorlaydi.",
  },
  {
    title: "Ma'lumotni to'ldirish",
    desc: "Yetishmayotgan qarindoshlar va bo'shliqlarni topishда yordam beradi.",
  },
];

export function ShajaraAiPage() {
  return (
    <PageShell title="Shajara AI" subtitle="Sun'iy intellekt yordamchisi">
      <div className="mx-auto max-w-3xl">
        {/* Hero */}
        <div className="rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-8 text-center shadow-sm">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-700 text-white">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
              <path d="M12 3.5 13.6 8l4.5 1.6-4.5 1.6L12 15.7l-1.6-4.5L5.9 9.6 10.4 8 12 3.5Z" />
              <path d="M18.5 15.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9Z" />
            </svg>
          </span>
          <h2 className="font-serif text-2xl font-semibold text-brand-900">Tez orada</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-brand-600">
            Shajara AI — oila daraxtingiz bo&#8216;yicha savol beradigan, qarindoshliklarni
            tushuntiradigan va tarixni yozib beradigan aqlli yordamchi.
          </p>
        </div>

        {/* Imkoniyatlar */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-brand-900">{f.title}</h3>
              <p className="mt-1 text-xs text-brand-500">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Namuna kiritish (o'chirilgan) */}
        <div className="mt-6 flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2.5">
          <input
            disabled
            placeholder="Masalan: “Akmal menga kim bo'ladi?” — tez orada"
            className="min-w-0 flex-1 bg-transparent text-sm text-neutral-400 outline-none"
          />
          <span className="shrink-0 rounded-full bg-neutral-200 px-3 py-1 text-xs font-medium text-neutral-500">
            Tez orada
          </span>
        </div>
      </div>
    </PageShell>
  );
}
