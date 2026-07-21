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

  it("oy/kun berilsa — to'liq sana (Profil panelida)", () => {
    const r = describeLife(1950, 2010, 2026, { birthMonth: 5, birthDay: 20, deathMonth: 6, deathDay: 15 });
    expect(r.years).toBe('20-May, 1950 – 15-Iyun, 2010');
    expect(r.age).toBe('60 yoshda vafot etgan');
  });

  it("faqat tug'ilgan oy/kun ma'lum (vafot etmagan) — faqat tug'ilgan sana to'liq", () => {
    const r = describeLife(1990, null, 2026, { birthMonth: 3, birthDay: 8 });
    expect(r.years).toBe('8-Mart, 1990 –');
  });

  it("oy/kun berilmasa — faqat yil (kartadagi kabi)", () => {
    const r = describeLife(1950, 2010, 2026);
    expect(r.years).toBe('1950 – 2010');
  });
});
