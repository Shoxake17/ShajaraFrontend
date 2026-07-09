import { describe, expect, it } from 'vitest';
import { fmtIp, fmtTime } from './device-format';

describe('fmtTime', () => {
  it("bo'sh yoki yaroqsiz qiymatda tire qaytaradi", () => {
    expect(fmtTime('')).toBe('—');
    expect(fmtTime('not-a-date')).toBe('—');
  });

  it('ISO vaqtni DD.MM.YYYY, HH:mm formatiga keltiradi', () => {
    // Lokal vaqt zonasidan qat'iy nazar, format shakli to'g'ri bo'lishi kerak
    const result = fmtTime('2026-01-05T09:07:00.000Z');
    expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/);
  });
});

describe('fmtIp', () => {
  it("bo'sh IP'da tushunarli xabar qaytaradi", () => {
    expect(fmtIp('')).toBe("Manzil noma'lum");
  });

  it('localhost/loopback IP\'ni taniydi', () => {
    expect(fmtIp('127.0.0.1')).toBe('Shu kompyuter (localhost)');
    expect(fmtIp('::1')).toBe('Shu kompyuter (localhost)');
  });

  it('IPv4-mapped IPv6 prefiksini olib tashlaydi', () => {
    expect(fmtIp('::ffff:127.0.0.1')).toBe('Shu kompyuter (localhost)');
  });

  it('mahalliy tarmoq IP\'larini belgilaydi', () => {
    expect(fmtIp('192.168.1.5')).toBe('Mahalliy tarmoq · 192.168.1.5');
    expect(fmtIp('10.0.0.2')).toBe('Mahalliy tarmoq · 10.0.0.2');
  });

  it('ommaviy IP\'ni o\'zgarishsiz qaytaradi', () => {
    expect(fmtIp('8.8.8.8')).toBe('8.8.8.8');
  });
});
