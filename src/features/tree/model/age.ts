// features/tree/model/age.ts
// Yosh hisoblash — sof funksiya (testlanadi, deterministik).
import i18n from '@/i18n';

interface LifeInfo {
  /** "1950 – 2010" yoki to'liq sana ma'lum bo'lsa "20-May, 1950 – 15-Iyun,
   * 2010" ko'rinishidagi yillar (yoki null) */
  years: string | null;
  /** "76 yosh" yoki "60 yoshda vafot etgan" (yoki null) */
  age: string | null;
}

/** Ixtiyoriy oy/kun — faqat Profil panelida to'liq sana uchun (kartada
 * doim faqat yil ko'rsatiladi, shu funksiya kartada chaqirilmaydi). */
interface FullDateInputs {
  birthMonth?: number | null;
  birthDay?: number | null;
  deathMonth?: number | null;
  deathDay?: number | null;
}

function formatDate(year: number | null, month?: number | null, day?: number | null): string {
  if (!year) return '?';
  if (month && day) return i18n.t('tree.age.fullDate', { day, month: i18n.t(`tree.months.${month}`), year });
  return String(year);
}

/**
 * Tug'ilgan/vafot yiliga qarab yillar va yoshni tavsiflaydi.
 *  - faqat tug'ilgan yil: hozirgi yilgacha bo'lgan yosh ("76 yosh").
 *  - tug'ilgan + vafot: vafot etganda nechi yoshda edi ("60 yoshda vafot etgan").
 *  - `dates` orqali oy/kun berilsa — "years" to'liq sana bilan qaytadi
 *    (masalan "20-May, 1950 – 15-Iyun, 2010"); berilmasa faqat yil.
 * @param currentYear test uchun almashtirilishi mumkin (default — joriy yil).
 */
export function describeLife(
  birthYear: number | null,
  deathYear: number | null,
  currentYear: number = new Date().getFullYear(),
  dates?: FullDateInputs,
): LifeInfo {
  const years =
    birthYear || deathYear
      ? `${formatDate(birthYear, dates?.birthMonth, dates?.birthDay)} – ${
          deathYear ? formatDate(deathYear, dates?.deathMonth, dates?.deathDay) : ''
        }`.trim()
      : null;

  let age: string | null = null;
  if (birthYear) {
    if (deathYear) {
      const atDeath = deathYear - birthYear;
      if (atDeath >= 0) age = i18n.t('tree.age.diedAtAge', { n: atDeath });
    } else {
      const now = currentYear - birthYear;
      if (now >= 0) age = i18n.t('tree.age.aliveYears', { n: now });
    }
  }

  return { years, age };
}
