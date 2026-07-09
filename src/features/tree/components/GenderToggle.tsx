// features/tree/components/GenderToggle.tsx
import type { Gender } from '@/features/tree/model/relations';

interface GenderToggleProps {
  value: Gender;
  onChange: (g: Gender) => void;
}

/** Erkak / Ayol tanlash (Add va Edit dialoglarida) */
export function GenderToggle({ value, onChange }: GenderToggleProps) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange('MALE')}
        className={`flex-1 rounded-field border py-2.5 text-sm font-medium transition-colors ${
          value === 'MALE'
            ? 'border-brand-600 bg-brand-50 text-brand-800'
            : 'border-neutral-200 text-neutral-500'
        }`}
      >
        Erkak
      </button>
      <button
        type="button"
        onClick={() => onChange('FEMALE')}
        className={`flex-1 rounded-field border py-2.5 text-sm font-medium transition-colors ${
          value === 'FEMALE'
            ? 'border-pink-400 bg-pink-50 text-pink-700'
            : 'border-neutral-200 text-neutral-500'
        }`}
      >
        Ayol
      </button>
    </div>
  );
}
