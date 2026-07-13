// shared/ui/SelectPicker.tsx
// Umumiy Apple uslubidagi dropdown tanlagich — native <select> o'rniga:
// tugma bosilganda ro'yxat ochiladi, tanlangan qator ✓ belgi bilan
// ajralib turadi (MediaGalleryPage'dagi FilterPicker/RelationPicker bilan
// bir xil andoza).
import { useEffect, useRef, useState, type SVGProps } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectPickerProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  label: string;
  className?: string;
}

const ChevronIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const CheckIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export function SelectPicker({ value, options, onChange, label, className = '' }: SelectPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex min-w-0 items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-left transition-colors ${
          open ? 'border-brand-600' : 'border-neutral-200 hover:border-neutral-300'
        }`}
      >
        <span className="truncate text-[13px] font-medium text-brand-900">{current?.label ?? label}</span>
        <ChevronIcon className={`shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="no-scrollbar absolute right-0 z-30 mt-1.5 max-h-72 w-max min-w-full overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-xl"
        >
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  selected ? 'bg-brand-50 font-medium text-brand-800' : 'text-brand-900 hover:bg-neutral-50'
                }`}
              >
                <span className="truncate">{o.label}</span>
                {selected && <CheckIcon className="shrink-0 text-brand-700" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
