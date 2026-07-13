// features/tree/components/YearInputs.tsx
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const CURRENT_YEAR = new Date().getFullYear();

interface YearInputsProps {
  birthYear: string;
  deathYear: string;
  onBirth: (v: string) => void;
  onDeath: (v: string) => void;
}

const cls =
  'w-full rounded-field border border-neutral-200 bg-white px-4 py-3.5 text-[15px] text-brand-900 outline-none focus:border-brand-600';

/** Tug'ilgan va vafot yili (Add va Edit dialoglarida) */
export function YearInputs({ birthYear, deathYear, onBirth, onDeath }: YearInputsProps) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-3">
      <input
        type="number"
        inputMode="numeric"
        min={1000}
        max={CURRENT_YEAR}
        placeholder={t('tree.birthYearPlaceholder')}
        value={birthYear}
        onChange={(e) => onBirth(e.target.value)}
        className={cls}
      />
      <input
        type="number"
        inputMode="numeric"
        min={1000}
        max={CURRENT_YEAR}
        placeholder={t('tree.deathYearPlaceholder')}
        value={deathYear}
        onChange={(e) => onDeath(e.target.value)}
        className={cls}
      />
    </div>
  );
}

/** Yillar validatsiyasi — ikkala dialog ham ishlatadi */
export function validateYears(birthYear: string, deathYear: string): string | null {
  const by = birthYear ? Number(birthYear) : undefined;
  const dy = deathYear ? Number(deathYear) : undefined;
  if (by && dy && dy < by) return i18n.t('tree.yearOrderError');
  return null;
}
