// features/tree/components/YearInputs.tsx
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const CURRENT_YEAR = new Date().getFullYear();
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

interface YearInputsProps {
  birthYear: string;
  deathYear: string;
  onBirth: (v: string) => void;
  onDeath: (v: string) => void;
  /** Ixtiyoriy — faqat yil ma'lum bo'lsa bo'sh qoldiriladi. Kartada
   * KO'RSATILMAYDI (faqat yil), Profil panelida to'liq sana uchun. */
  birthMonth: string;
  birthDay: string;
  deathMonth: string;
  deathDay: string;
  onBirthMonth: (v: string) => void;
  onBirthDay: (v: string) => void;
  onDeathMonth: (v: string) => void;
  onDeathDay: (v: string) => void;
}

const cls =
  'w-full rounded-field border border-neutral-200 bg-white px-4 py-3.5 text-[15px] text-brand-900 outline-none focus:border-brand-600';
const smallCls =
  'w-full rounded-field border border-neutral-200 bg-white px-2 py-2.5 text-[13px] text-brand-700 outline-none focus:border-brand-600';

/** Oy/kun tanlash (ixtiyoriy) — bitta ustun (tug'ilgan YOKI vafot) uchun */
function MonthDaySelect({
  month,
  day,
  onMonth,
  onDay,
}: {
  month: string;
  day: string;
  onMonth: (v: string) => void;
  onDay: (v: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-1.5">
      <select value={month} onChange={(e) => onMonth(e.target.value)} className={smallCls} aria-label={t('tree.birthMonthLabel')}>
        <option value="">{t('tree.monthPlaceholder')}</option>
        {MONTHS.map((m) => (
          <option key={m} value={m}>
            {t(`tree.months.${m}`)}
          </option>
        ))}
      </select>
      <select value={day} onChange={(e) => onDay(e.target.value)} className={smallCls} aria-label={t('tree.birthDayLabel')}>
        <option value="">{t('tree.dayPlaceholder')}</option>
        {DAYS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Tug'ilgan va vafot yili + ixtiyoriy oy/kun (Add va Edit dialoglarida) */
export function YearInputs({
  birthYear,
  deathYear,
  onBirth,
  onDeath,
  birthMonth,
  birthDay,
  deathMonth,
  deathDay,
  onBirthMonth,
  onBirthDay,
  onDeathMonth,
  onDeathDay,
}: YearInputsProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
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
      <div className="flex gap-3">
        <div className="flex-1">
          <MonthDaySelect month={birthMonth} day={birthDay} onMonth={onBirthMonth} onDay={onBirthDay} />
        </div>
        <div className="flex-1">
          <MonthDaySelect month={deathMonth} day={deathDay} onMonth={onDeathMonth} onDay={onDeathDay} />
        </div>
      </div>
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
