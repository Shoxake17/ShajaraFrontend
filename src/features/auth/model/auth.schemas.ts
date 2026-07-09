import { z } from 'zod';

const phoneSchema = z
  .string()
  .min(1, "Telefon raqam kiritilishi shart")
  .regex(/^\+998\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/, "Telefon raqam noto'g'ri (+998 90 123 45 67)");

/** Kirish maydoni: telefon (+998 90 123 45 67) YOKI email qabul qilinadi */
const identifierSchema = z
  .string()
  .trim()
  .min(1, 'Telefon raqam yoki email kiritilishi shart')
  .refine(
    (v) =>
      /^\+998\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/.test(v) ||
      z.string().email().safeParse(v).success,
    "Telefon raqam (+998 90 123 45 67) yoki email noto'g'ri",
  );

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(8, "Parol kamida 8 ta belgidan iborat bo'lishi kerak"),
});

export const registerSchema = z
  .object({
    fullName: z.string().min(3, "Ism familiya kamida 3 ta belgidan iborat bo'lishi kerak"),
    phone: phoneSchema,
    email: z.string().email("Email manzil noto'g'ri"),
    password: z
      .string()
      .min(8, "Parol kamida 8 ta belgidan iborat bo'lishi kerak")
      .regex(/[A-Z]/, "Parolda kamida bitta katta harf bo'lishi kerak")
      .regex(/\d/, "Parolda kamida bitta raqam bo'lishi kerak"),
    confirmPassword: z.string(),
    // Ixtiyoriy 12 xonalik ulashish kodi (bo'sh yoki aynan 12 belgi)
    shareCode: z
      .string()
      .trim()
      .regex(/^([A-Z0-9]{12})?$/i, "Ulashish kodi 12 belgidan iborat bo'lishi kerak")
      .optional(),
    terms: z.literal(true, {
      errorMap: () => ({ message: "Shartlarga rozilik bildirishingiz kerak" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Parollar mos kelmadi',
  });

/** Yangi parol siyosati — register va backend (ChangePasswordDto) bilan bir xil */
const newPasswordSchema = z
  .string()
  .min(8, "Parol kamida 8 ta belgidan iborat bo'lishi kerak")
  .max(128, "Parol 128 ta belgidan oshmasligi kerak")
  .regex(/[A-Z]/, "Parolda kamida bitta katta harf bo'lishi kerak")
  .regex(/\d/, "Parolda kamida bitta raqam bo'lishi kerak");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Joriy parolni kiriting'),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Parollar mos kelmadi',
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ['newPassword'],
    message: 'Yangi parol joriy paroldan farq qilishi kerak',
  });

/** Ro'yxatdan o'tishni tasdiqlash — emailga yuborilgan 6 xonali kod */
export const verifyCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "6 xonali kodni to'liq kiriting"),
});

/** Parolni unutdingizmi — 1-bosqich: faqat email */
export const forgotPasswordEmailSchema = z.object({
  email: z.string().trim().email("Email manzil noto'g'ri"),
});

/** Parolni unutdingizmi — 2-bosqich: yangi parol + tasdiqlash + OTP kod bitta formada */
export const resetPasswordSchema = z
  .object({
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
    code: z.string().regex(/^\d{6}$/, "6 xonali kodni to'liq kiriting"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Parollar mos kelmadi',
  });

/** Login — 2-bosqich (2FA yoqilgan hisoblar uchun): 6 xonali TOTP kod YOKI 10 belgili zaxira kod */
export const twoFactorLoginSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^(\d{6}|[A-Za-z2-9]{10})$/, "6 xonali kod yoki 10 belgili zaxira kodni kiriting"),
});

/** 2FA sozlashni tasdiqlash — faqat authenticator ilovasidan olingan 6 xonali kod (zaxira kod EMAS) */
export const confirmTwoFactorSetupSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "6 xonali kodni to'liq kiriting"),
});

/** 2FA o'chirish — joriy parol majburiy tasdiqlanadi */
export const disableTwoFactorSchema = z.object({
  password: z.string().min(1, 'Joriy parolni kiriting'),
});

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
export type VerifyCodeForm = z.infer<typeof verifyCodeSchema>;
export type ForgotPasswordEmailForm = z.infer<typeof forgotPasswordEmailSchema>;
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;
export type TwoFactorLoginForm = z.infer<typeof twoFactorLoginSchema>;
export type ConfirmTwoFactorSetupForm = z.infer<typeof confirmTwoFactorSetupSchema>;
export type DisableTwoFactorForm = z.infer<typeof disableTwoFactorSchema>;
