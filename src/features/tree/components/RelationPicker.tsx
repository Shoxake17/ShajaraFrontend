// features/tree/components/RelationPicker.tsx
// "Kimligi (qarindoshligi)" tanlagichi — native <select> o'rniga zamonaviy
// (Apple uslubidagi) guruhlangan ro'yxat: tugma bosilganda pastda suzuvchi
// panel ochiladi, tanlangan qator belgi (✓) bilan ko'rinadi. Desktop va
// mobil uchun BITTA komponent — MemberSearch'dagi dropdown bilan bir xil
// andoza (o'zi joylashadigan/kesiladigan, border+rounded+shadow).
import { useEffect, useId, useRef, useState, type SVGProps } from 'react';
import { useTranslation } from 'react-i18next';
import { getRelationGroups, relationLabel, type RelationKey } from '@/features/tree/model/relations';

interface RelationPickerProps {
  value: RelationKey;
  onChange: (value: RelationKey) => void;
  label?: string;
}

const ChevronIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const CheckIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export function RelationPicker({ value, onChange, label }: RelationPickerProps) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t('tree.relationPickerLabel');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (v: RelationKey) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={resolvedLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between rounded-field border bg-white px-4 py-3.5 text-[15px] transition-colors ${
          open ? 'border-brand-600' : 'border-neutral-200 hover:border-neutral-300'
        }`}
      >
        <span className="text-brand-900">{relationLabel(value)}</span>
        <ChevronIcon className={`shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={resolvedLabel}
          className="no-scrollbar absolute z-30 mt-1.5 max-h-72 w-full overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-xl"
        >
          {getRelationGroups().map((g) => (
            <div key={g.title} className="mb-1 last:mb-0">
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                {g.title}
              </p>
              {g.items.map((r) => {
                const selected = r.value === value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => choose(r.value)}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-[15px] transition-colors ${
                      selected ? 'bg-brand-50 font-medium text-brand-800' : 'text-brand-900 hover:bg-neutral-50'
                    }`}
                  >
                    <span className="truncate">{r.label}</span>
                    {selected && <CheckIcon className="shrink-0 text-brand-700" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
