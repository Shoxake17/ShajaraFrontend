import { describe, expect, it } from 'vitest';
import { normalizePhone } from './phone';

describe('normalizePhone', () => {
  it('probellarni olib tashlaydi', () => {
    expect(normalizePhone('+998 90 123 45 67')).toBe('+998901234567');
  });

  it("probelsiz raqamni o'zgartirmaydi", () => {
    expect(normalizePhone('+998901234567')).toBe('+998901234567');
  });
});
