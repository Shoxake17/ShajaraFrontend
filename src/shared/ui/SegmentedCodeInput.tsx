// shared/ui/SegmentedCodeInput.tsx
// 6 xonali (yoki boshqa uzunlikdagi) tasdiqlash kodi uchun — har bir raqam
// O'ZINING alohida katakchasida, avtomatik keyingisiga o'tish, Backspace bilan
// orqaga qaytish va bir vaqtda butun kodni joylashtirish (paste) qo'llab-
// quvvatlanadi. react-hook-form bilan `Controller` orqali ishlatiladi
// (bir nechta <input> bitta maydon qiymatini ifodalaydi).
import { useEffect, useRef } from 'react';

interface SegmentedCodeInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function SegmentedCodeInput({
  length = 6,
  value,
  onChange,
  error,
  autoFocus,
  disabled,
}: SegmentedCodeInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const apply = (index: number, chars: string[]) => {
    const next = digits.slice();
    let i = index;
    for (const ch of chars) {
      if (i >= length) break;
      next[i] = ch;
      i++;
    }
    onChange(next.join(''));
    refs.current[Math.min(i, length - 1)]?.focus();
  };

  const handleChange = (index: number, raw: string) => {
    const clean = raw.replace(/\D/g, '');
    if (!clean) {
      const next = digits.slice();
      next[index] = '';
      onChange(next.join(''));
      return;
    }
    apply(index, clean.split(''));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const clean = e.clipboardData.getData('text').replace(/\D/g, '');
    if (clean) apply(0, clean.split(''));
  };

  return (
    <div>
      <div role="group" aria-label="Tasdiqlash kodi" className="flex justify-center gap-2">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            aria-label={`Kod, ${i + 1}-xona`}
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={digit}
            disabled={disabled}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            onPaste={handlePaste}
            className={`h-14 w-11 rounded-field border-2 bg-white text-center text-xl font-semibold text-brand-900 outline-none transition-colors focus:border-brand-600 focus:bg-brand-50/40 disabled:opacity-60 sm:h-16 sm:w-12 ${
              error ? 'border-red-400' : 'border-neutral-200'
            }`}
          />
        ))}
      </div>
      {error && <p className="mt-1.5 text-center text-xs text-red-500">{error}</p>}
    </div>
  );
}
