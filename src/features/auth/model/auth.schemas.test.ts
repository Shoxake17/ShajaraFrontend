import { describe, expect, it } from 'vitest';
import { changePasswordSchema, loginSchema, registerSchema, verifyCodeSchema } from './auth.schemas';

const validRegister = {
  fullName: 'Test Foydalanuvchi',
  phone: '+998 90 123 45 67',
  email: 'test@example.com',
  password: 'Parol123',
  confirmPassword: 'Parol123',
  terms: true as const,
};

describe('loginSchema', () => {
  it("TELEFON bilan qabul qiladi (probel bilan ham)", () => {
    expect(loginSchema.safeParse({ identifier: '+998 90 123 45 67', password: 'Parol123' }).success).toBe(true);
    expect(loginSchema.safeParse({ identifier: '+998901234567', password: 'Parol123' }).success).toBe(true);
  });

  it('EMAIL bilan ham qabul qiladi', () => {
    expect(loginSchema.safeParse({ identifier: 'test@example.com', password: 'Parol123' }).success).toBe(true);
    expect(loginSchema.safeParse({ identifier: 'Test.User@Mail.UZ', password: 'Parol123' }).success).toBe(true);
  });

  it("noto'g'ri telefon/email formatini rad etadi", () => {
    expect(loginSchema.safeParse({ identifier: '901234567', password: 'Parol123' }).success).toBe(false);
    expect(loginSchema.safeParse({ identifier: '+7 900 123 45 67', password: 'Parol123' }).success).toBe(false);
    expect(loginSchema.safeParse({ identifier: 'notemail', password: 'Parol123' }).success).toBe(false);
    expect(loginSchema.safeParse({ identifier: 'a@b', password: 'Parol123' }).success).toBe(false);
  });

  it('qisqa parolni rad etadi', () => {
    expect(loginSchema.safeParse({ identifier: '+998901234567', password: '1234567' }).success).toBe(false);
  });
});

describe('registerSchema', () => {
  it("to'g'ri ma'lumotni qabul qiladi", () => {
    expect(registerSchema.safeParse(validRegister).success).toBe(true);
  });

  it('katta harfsiz parolni rad etadi', () => {
    const r = registerSchema.safeParse({ ...validRegister, password: 'parol123', confirmPassword: 'parol123' });
    expect(r.success).toBe(false);
  });

  it('raqamsiz parolni rad etadi', () => {
    const r = registerSchema.safeParse({ ...validRegister, password: 'Parolabc', confirmPassword: 'Parolabc' });
    expect(r.success).toBe(false);
  });

  it('parollar mos kelmasa confirmPassword maydonida xato beradi', () => {
    const r = registerSchema.safeParse({ ...validRegister, confirmPassword: 'Boshqa123' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].path).toContain('confirmPassword');
    }
  });

  it('shartlarga rozilik bo\'lmasa rad etadi', () => {
    expect(registerSchema.safeParse({ ...validRegister, terms: false }).success).toBe(false);
  });

  it("noto'g'ri emailni rad etadi", () => {
    expect(registerSchema.safeParse({ ...validRegister, email: 'notemail' }).success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  const valid = {
    currentPassword: 'EskiParol1',
    newPassword: 'YangiParol9',
    confirmPassword: 'YangiParol9',
  };

  it("to'g'ri ma'lumotni qabul qiladi", () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it("bo'sh joriy parolni rad etadi", () => {
    expect(changePasswordSchema.safeParse({ ...valid, currentPassword: '' }).success).toBe(false);
  });

  it('zaif yangi parolni rad etadi (qisqa / katta harfsiz / raqamsiz)', () => {
    expect(changePasswordSchema.safeParse({ ...valid, newPassword: 'Qis1', confirmPassword: 'Qis1' }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ ...valid, newPassword: 'parolyangi1', confirmPassword: 'parolyangi1' }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ ...valid, newPassword: 'ParolYangi', confirmPassword: 'ParolYangi' }).success).toBe(false);
  });

  it('parollar mos kelmasa confirmPassword maydonida xato beradi', () => {
    const r = changePasswordSchema.safeParse({ ...valid, confirmPassword: 'Boshqa123' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].path).toContain('confirmPassword');
    }
  });

  it('yangi parol joriy bilan bir xil bo\'lsa rad etadi', () => {
    const r = changePasswordSchema.safeParse({
      currentPassword: 'YangiParol9',
      newPassword: 'YangiParol9',
      confirmPassword: 'YangiParol9',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].path).toContain('newPassword');
    }
  });
});

describe('verifyCodeSchema', () => {
  it('6 xonali raqamli kodni qabul qiladi', () => {
    expect(verifyCodeSchema.safeParse({ code: '123456' }).success).toBe(true);
  });

  it("6 xonadan qisqa/uzun yoki raqam bo'lmagan kodni rad etadi", () => {
    expect(verifyCodeSchema.safeParse({ code: '12345' }).success).toBe(false);
    expect(verifyCodeSchema.safeParse({ code: '1234567' }).success).toBe(false);
    expect(verifyCodeSchema.safeParse({ code: 'abcdef' }).success).toBe(false);
    expect(verifyCodeSchema.safeParse({ code: '' }).success).toBe(false);
  });
});
