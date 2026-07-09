import { describe, expect, it } from 'vitest';
import { describeLife } from './age';

describe('describeLife', () => {
  it('faqat tug\'ilgan yil — hozirgi yilgacha yosh', () => {
    const r = describeLife(1990, null, 2026);
    expect(r.years).toBe('1990 –');
    expect(r.age).toBe('36 yosh');
  });

  it('tug\'ilgan va vafot yili — nechi yoshda vafot etgani', () => {
    const r = describeLife(1950, 2010, 2026);
    expect(r.years).toBe('1950 – 2010');
    expect(r.age).toBe('60 yoshda vafot etgan');
  });

  it('yil kiritilmagan — hech narsa', () => {
    const r = describeLife(null, null, 2026);
    expect(r.years).toBeNull();
    expect(r.age).toBeNull();
  });

  it('faqat vafot yili — yoshni hisoblab bo\'lmaydi', () => {
    const r = describeLife(null, 2000, 2026);
    expect(r.years).toBe('? – 2000');
    expect(r.age).toBeNull();
  });

  it('shu yili tug\'ilgan — 0 yosh', () => {
    expect(describeLife(2026, null, 2026).age).toBe('0 yosh');
  });

  it('nomuvofiq yillar (vafot < tug\'ilgan) — yosh ko\'rsatilmaydi', () => {
    expect(describeLife(2010, 1990, 2026).age).toBeNull();
  });
});
