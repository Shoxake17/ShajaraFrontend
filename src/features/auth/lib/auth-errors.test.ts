import { describe, expect, it } from 'vitest';
import { AxiosError } from 'axios';
import { authErrorMessage } from './auth-errors';

function axiosErrorWithStatus(status: number): AxiosError {
  const err = new AxiosError('Request failed');
  // @ts-expect-error — testda faqat status kerak
  err.response = { status };
  return err;
}

describe('authErrorMessage', () => {
  it("server yuborgan aniq xabar ustuvor (masalan Google xatolari)", () => {
    const err = new AxiosError('Request failed');
    // @ts-expect-error — testda faqat kerakli maydonlar
    err.response = { status: 401, data: { message: 'Google token boshqa ilovaga tegishli' } };
    expect(authErrorMessage(err)).toBe('Google token boshqa ilovaga tegishli');
  });

  it('401 → login xatosi xabari', () => {
    expect(authErrorMessage(axiosErrorWithStatus(401))).toBe(
      "Telefon raqam yoki parol noto'g'ri",
    );
  });

  it('409 → band akkaunt xabari', () => {
    expect(authErrorMessage(axiosErrorWithStatus(409))).toBe(
      "Bu telefon raqam yoki email allaqachon ro'yxatdan o'tgan",
    );
  });

  it('429 → rate-limit xabari', () => {
    expect(authErrorMessage(axiosErrorWithStatus(429))).toContain("ko'p urinish");
  });

  it("noma'lum xato → umumiy xabar", () => {
    expect(authErrorMessage(new Error('boom'))).toBe(
      "Xatolik yuz berdi. Qaytadan urinib ko'ring",
    );
    expect(authErrorMessage(axiosErrorWithStatus(500))).toBe(
      "Xatolik yuz berdi. Qaytadan urinib ko'ring",
    );
  });
});
