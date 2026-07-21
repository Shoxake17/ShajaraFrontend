import { z } from 'zod';
import i18n from '@/i18n';

// Model fayl — komponent EMAS, shu bois har schema FUNKSIYA sifatida
// eksport qilinadi (relations.ts/kinship.ts'dagi kabi andoza): har
// chaqirilganda JORIY tildan xabarlarni o'qiydi, til Sozlamalar'dan
// o'zgartirilsa forma xatolari ham yangi tilda chiqadi.

function phoneSchema() {
  return z
    .string()
    .min(1, i18n.t('auth.validation.phoneRequired'))
    .regex(/^\+998\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/, i18n.t('auth.validation.phoneInvalid'));
}

/** Kirish maydoni: telefon (+998 90 123 45 67) YOKI email qabul qilinadi */
function identifierSchema() {
  return z
    .string()
    .trim()
    .min(1, i18n.t('auth.validation.identifierRequired'))
    .refine(
      (v) =>
        /^\+998\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/.test(v) ||
        z.string().email().safeParse(v).success,
      i18n.t('auth.validation.identifierInvalid'),
    );
}

export function getLoginSchema() {
  return z.object({
    identifier: identifierSchema(),
    password: z.string().min(8, i18n.t('auth.validation.passwordMin')),
  });
}

export function getRegisterSchema() {
  return z
    .object({
      fullName: z.string().min(3, i18n.t('auth.validation.fullNameMin')),
      phone: phoneSchema(),
      email: z.string().email(i18n.t('auth.validation.emailInvalid')),
      password: z
        .string()
        .min(8, i18n.t('auth.validation.passwordMin'))
        .regex(/[A-Z]/, i18n.t('auth.validation.passwordUppercase'))
        .regex(/\d/, i18n.t('auth.validation.passwordDigit')),
      confirmPassword: z.string(),
      // Ixtiyoriy 12 xonalik ulashish kodi (bo'sh yoki aynan 12 belgi)
      shareCode: z
        .string()
        .trim()
        .regex(/^([A-Z0-9]{12})?$/i, i18n.t('auth.validation.shareCodeLength'))
        .optional(),
      terms: z.literal(true, {
        errorMap: () => ({ message: i18n.t('auth.validation.termsRequired') }),
      }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      path: ['confirmPassword'],
      message: i18n.t('auth.validation.passwordsMismatch'),
    });
}

/** Yangi parol siyosati — register va backend (ChangePasswordDto) bilan bir xil */
function newPasswordSchema() {
  return z
    .string()
    .min(8, i18n.t('auth.validation.passwordMin'))
    .max(128, i18n.t('auth.validation.passwordMax'))
    .regex(/[A-Z]/, i18n.t('auth.validation.passwordUppercase'))
    .regex(/\d/, i18n.t('auth.validation.passwordDigit'));
}

export function getChangePasswordSchema() {
  return z
    .object({
      currentPassword: z.string().min(1, i18n.t('auth.validation.currentPasswordRequired')),
      newPassword: newPasswordSchema(),
      confirmPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      path: ['confirmPassword'],
      message: i18n.t('auth.validation.passwordsMismatch'),
    })
    .refine((d) => d.newPassword !== d.currentPassword, {
      path: ['newPassword'],
      message: i18n.t('auth.validation.newPasswordSameAsCurrent'),
    });
}

/** Ro'yxatdan o'tishni tasdiqlash — emailga yuborilgan 6 xonali kod */
export function getVerifyCodeSchema() {
  return z.object({
    code: z.string().regex(/^\d{6}$/, i18n.t('auth.validation.code6Digits')),
  });
}

/** Parolni unutdingizmi — 1-bosqich: faqat email */
export function getForgotPasswordEmailSchema() {
  return z.object({
    email: z.string().trim().email(i18n.t('auth.validation.emailInvalid')),
  });
}

/** Parolni unutdingizmi — 2-bosqich: yangi parol + tasdiqlash + OTP kod bitta formada */
export function getResetPasswordSchema() {
  return z
    .object({
      newPassword: newPasswordSchema(),
      confirmPassword: z.string(),
      code: z.string().regex(/^\d{6}$/, i18n.t('auth.validation.code6Digits')),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      path: ['confirmPassword'],
      message: i18n.t('auth.validation.passwordsMismatch'),
    });
}

/** Login — 2-bosqich (2FA yoqilgan hisoblar uchun): 6 xonali TOTP kod YOKI 10 belgili zaxira kod */
export function getTwoFactorLoginSchema() {
  return z.object({
    code: z
      .string()
      .trim()
      .regex(/^(\d{6}|[A-Za-z2-9]{10})$/, i18n.t('auth.validation.totpOrBackupCode')),
  });
}

/** 2FA sozlashni tasdiqlash — faqat authenticator ilovasidan olingan 6 xonali kod (zaxira kod EMAS) */
export function getConfirmTwoFactorSetupSchema() {
  return z.object({
    code: z.string().regex(/^\d{6}$/, i18n.t('auth.validation.code6Digits')),
  });
}

/** 2FA o'chirish — joriy parol majburiy tasdiqlanadi */
export function getDisableTwoFactorSchema() {
  return z.object({
    password: z.string().min(1, i18n.t('auth.validation.currentPasswordRequired')),
  });
}

/**
 * Sozlamalar → Profil: emaili yo'q hisobga email qo'shish. `requirePassword`
 * — hisobda hali PAROL ham yo'q bo'lsa (masalan Telegram-only) true: shu
 * holda parol maydonlari ham majburiy va email bilan BIRGA, bitta OTP
 * tasdig'ida o'rnatiladi (SetPasswordDialog'ni alohida ochish shart emas).
 */
export function getAddEmailSchema(requirePassword: boolean) {
  return z
    .object({
      email: z.string().trim().email(i18n.t('auth.validation.emailInvalid')),
      newPassword: requirePassword ? newPasswordSchema() : z.string().optional().default(''),
      confirmPassword: z.string().optional().default(''),
    })
    .refine((d) => !requirePassword || d.newPassword === d.confirmPassword, {
      path: ['confirmPassword'],
      message: i18n.t('auth.validation.passwordsMismatch'),
    });
}

/** Sozlamalar → Xavfsizlik: parol yo'q hisobga birinchi marta parol o'rnatish */
export function getSetPasswordSchema() {
  return z
    .object({
      newPassword: newPasswordSchema(),
      confirmPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      path: ['confirmPassword'],
      message: i18n.t('auth.validation.passwordsMismatch'),
    });
}

/** Hisobni o'chirish — parol IXTIYORIY (Google/Telegram orqali ochilgan
 * hisobda parol yo'q — bo'sh qoldirilsa ham bo'ladi, server tekshiradi) */
export function getDeleteAccountSchema() {
  return z.object({
    password: z.string().optional(),
  });
}

export type LoginForm = z.infer<ReturnType<typeof getLoginSchema>>;
export type RegisterForm = z.infer<ReturnType<typeof getRegisterSchema>>;
export type ChangePasswordForm = z.infer<ReturnType<typeof getChangePasswordSchema>>;
export type VerifyCodeForm = z.infer<ReturnType<typeof getVerifyCodeSchema>>;
export type ForgotPasswordEmailForm = z.infer<ReturnType<typeof getForgotPasswordEmailSchema>>;
export type ResetPasswordForm = z.infer<ReturnType<typeof getResetPasswordSchema>>;
export type TwoFactorLoginForm = z.infer<ReturnType<typeof getTwoFactorLoginSchema>>;
export type ConfirmTwoFactorSetupForm = z.infer<ReturnType<typeof getConfirmTwoFactorSetupSchema>>;
export type DisableTwoFactorForm = z.infer<ReturnType<typeof getDisableTwoFactorSchema>>;
export type DeleteAccountForm = z.infer<ReturnType<typeof getDeleteAccountSchema>>;
export type AddEmailForm = z.infer<ReturnType<typeof getAddEmailSchema>>;
export type SetPasswordForm = z.infer<ReturnType<typeof getSetPasswordSchema>>;
