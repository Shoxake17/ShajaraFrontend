// features/tree/model/age.ts
// Yosh hisoblash — sof funksiya (testlanadi, deterministik).

interface LifeInfo {
  /** "1950 – 2010" yoki "1950 – " ko'rinishidagi yillar (yoki null) */
  years: string | null;
  /** "76 yosh" yoki "60 yoshda vafot etgan" (yoki null) */
  age: string | null;
}

/**
 * Tug'ilgan/vafot yiliga qarab yillar va yoshni tavsiflaydi.
 *  - faqat tug'ilgan yil: hozirgi yilgacha bo'lgan yosh ("76 yosh").
 *  - tug'ilgan + vafot: vafot etganda nechi yoshda edi ("60 yoshda vafot etgan").
 * @param currentYear test uchun almashtirilishi mumkin (default — joriy yil).
 */
export function describeLife(
  birthYear: number | null,
  deathYear: number | null,
  currentYear: number = new Date().getFullYear(),
): LifeInfo {
  const years = birthYear || deathYear ? `${birthYear ?? '?'} – ${deathYear ?? ''}`.trim() : null;

  let age: string | null = null;
  if (birthYear) {
    if (deathYear) {
      const atDeath = deathYear - birthYear;
      if (atDeath >= 0) age = `${atDeath} yoshda vafot etgan`;
    } else {
      const now = currentYear - birthYear;
      if (now >= 0) age = `${now} yosh`;
    }
  }

  return { years, age };
}
