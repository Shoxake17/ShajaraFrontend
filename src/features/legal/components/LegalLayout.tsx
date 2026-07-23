// features/legal/components/LegalLayout.tsx
// /terms va /privacy sahifalari uchun umumiy qatlam — LoginPage/RegisterPage'dagi
// bilan bir xil brend header (logotip + til tanlagich), lekin forma o'rniga
// uzun matnli hujjat uchun mo'ljallangan bitta ustunli o'qish maydoni.
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_NAMES, useLanguage } from '@/shared/hooks/useLanguage';
import type { SupportedLanguage } from '@/i18n';
import { SelectPicker } from '@/shared/ui/SelectPicker';
import { ArrowLeftIcon, GlobeIcon } from '@/shared/ui/icons';
import type { LegalDoc } from '../legalContent';

export function LegalLayout({ doc }: { doc: LegalDoc }) {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-900"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <img src="/registertree.png" alt="" draggable={false} className="h-6 w-6 shrink-0 select-none object-contain" />
            <span className="font-serif text-lg font-semibold text-brand-900">{t('auth.brand')}</span>
          </button>
          <SelectPicker
            value={language}
            onChange={(v) => setLanguage(v as SupportedLanguage)}
            label={LANGUAGE_NAMES[language]}
            icon={<GlobeIcon />}
            options={(['uz', 'ru', 'en'] as const).map((l) => ({ value: l, label: LANGUAGE_NAMES[l] }))}
          />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="font-serif text-3xl font-semibold text-brand-900">{doc.title}</h1>
        <p className="mt-2 text-sm text-neutral-500">{doc.updatedLabel}</p>

        <div className="mt-8 space-y-2 text-[15px] leading-relaxed text-neutral-700">
          {doc.intro.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="mt-10 space-y-10">
          {doc.sections.map((section, i) => (
            <section key={i}>
              <h2 className="font-serif text-xl font-semibold text-brand-900">
                {i + 1}. {section.heading}
              </h2>
              <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-neutral-700">
                {section.paragraphs.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
                {section.list && (
                  <ul className="list-disc space-y-1.5 pl-5">
                    {section.list.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-12 border-t border-neutral-200 pt-6 text-sm text-neutral-500">{doc.footer}</p>
      </main>
    </div>
  );
}
