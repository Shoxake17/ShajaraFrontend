// features/tree/components/MemberSearch.tsx
// Oila a'zolarini ism/familiya bo'yicha qidirish (client-side, doskadagi
// yuklangan a'zolar ustidan). Xavfsizlik:
//  - Faqat SUBSTRING moslash (regex EMAS) -> ReDoS hujumi bo'lmaydi.
//  - React matnni avtomatik escape qiladi -> XSS bo'lmaydi.
//  - Kiritish uzunligi cheklangan, natijalar soni cheklangan (DoS'dan himoya).
//  - Server so'rovi yo'q -> injection yo'q.
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface SearchItem {
  id: string;
  name: string;
  relation: string;
}

const MAX_QUERY = 64;
const MAX_RESULTS = 8;

/** Turli apostroflarni birlashtirib, kichik harfga keltiramiz (o'/oʻ/o` bir xil) */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’ʻʼ`'´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A'zolarni ism bo'yicha filtrlash. SUBSTRING moslash (regex EMAS -> ReDoS yo'q).
 * Natijalar soni cheklangan (DoS'dan himoya). Sof funksiya — test qilinadi.
 */
export function filterMembers(
  items: SearchItem[],
  query: string,
  max = MAX_RESULTS,
): SearchItem[] {
  const q = normalize(query);
  if (q.length === 0) return [];
  const out: SearchItem[] = [];
  for (const it of items) {
    if (normalize(it.name).includes(q)) {
      out.push(it);
      if (out.length >= max) break;
    }
  }
  return out;
}

interface Props {
  items: SearchItem[];
  onSelect: (id: string) => void;
}

export function MemberSearch({ items, onSelect }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const results = useMemo(() => filterMembers(items, query, MAX_RESULTS), [query, items]);

  // Tashqariga bosilganda yopiladi
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => setActive(0), [query]);

  const choose = (id: string) => {
    onSelect(id);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) {
      if (e.key === 'Escape') (e.target as HTMLInputElement).blur();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = results[active];
      if (pick) choose(pick.id);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && query.trim().length > 0;

  return (
    <div ref={boxRef} className="relative w-full max-w-xs">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" strokeLinecap="round" />
          </svg>
        </span>
        <input
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          maxLength={MAX_QUERY}
          placeholder={t('tree.memberSearch.placeholder')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value.slice(0, MAX_QUERY));
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full rounded-full border border-transparent bg-brand-50 py-2 pl-9 pr-3 text-sm text-brand-900 outline-none transition-colors placeholder:text-brand-400 focus:border-brand-300 focus:bg-white"
        />
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="no-scrollbar absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-card"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-neutral-400">{t('tree.memberSearch.noResults')}</li>
          ) : (
            results.map((r, i) => (
              <li key={r.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(r.id)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                    i === active ? 'bg-brand-50' : 'hover:bg-brand-50'
                  }`}
                >
                  <span className="truncate font-medium text-brand-900">{r.name}</span>
                  <span className="shrink-0 text-xs text-brand-500">{r.relation}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
