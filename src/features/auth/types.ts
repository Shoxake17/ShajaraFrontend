// features/auth/types.ts
// Auth feature'ning BARCHA tiplari bitta joyda — store, api, hooks shu yerdan oladi.

export type ProfileVisibility = 'PUBLIC' | 'FAMILY' | 'PRIVATE';

export interface AuthUser {
  id: string;
  fullName: string;
  /** Google orqali ochilgan akkauntlarda telefon bo'lmasligi mumkin */
  phone: string | null;
  /** Telegram orqali ochilgan (email/telefon berilmaydigan) hisoblarda bo'sh (null) bo'lishi mumkin */
  email: string | null;
  /** Sozlamalar → Maxfiylik → "Profil ko'rinishi" — Shajara doskasidagi o'z ROOT kartasini kimlar ko'rishi */
  profileVisibility: ProfileVisibility;
  /** Sozlamalar → Maxfiylik → "Kimlar sizni topa olishi mumkin" — qidiruv (MemberSearch) orqali topilish */
  searchVisibility: ProfileVisibility;
  /** Sozlamalar → Maxfiylik → "Ma'lumotlar ko'rinishi" — men yuklagan rasm/video/hujjatlarni kimlar ko'rishi */
  dataVisibility: ProfileVisibility;
  /** Sozlamalar → Maxfiylik → "Kimlar sizga xabar yuborishi mumkin" */
  messageVisibility: ProfileVisibility;
  /** Sozlamalar → Xavfsizlik → "Telegram orqali bog'lash" holati (xom
   * Telegram ID emas — faqat bog'langan/bog'lanmaganligi) */
  telegramLinked: boolean;
  /** Xom hash EMAS — faqat parol bor/yo'qligi (Google/Telegram orqali
   * ochilgan hisoblarda parol bo'lmasligi mumkin) — Sozlamalar → Xavfsizlik
   * "Parolni o'zgartirish" yoki "Parol o'rnatish" qatorlaridan qaysi
   * birini ko'rsatishni shu bilan hal qiladi. */
  hasPassword: boolean;
}

export interface RegisterDto {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  /** Ixtiyoriy 12 xonalik ulashish kodi — o'sha daraxtga VIEWER bo'lib qo'shiladi */
  shareCode?: string;
}

export interface LoginDto {
  /** Telefon raqam (+998XXXXXXXXX) YOKI email — bitta maydonda */
  identifier: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

/** POST /auth/register javobi — hisob HALI yaratilmagan, faqat kod yuborilgan */
export interface RegisterStartResponse {
  email: string;
  expiresInSeconds: number;
}

export interface ConfirmRegisterDto {
  email: string;
  code: string;
}

export interface ResendCodeDto {
  email: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

/** POST /auth/change-password javobi — parol HALI o'zgarmagan, faqat kod yuborilgan */
export interface ChangePasswordStartResponse {
  expiresInSeconds: number;
}

export interface ConfirmChangePasswordDto {
  code: string;
}

/** Faqat parolli hisobda majburiy — Google/Telegram orqali ochilgan hisobda bo'sh qoldiriladi */
export interface DeleteAccountDto {
  password?: string;
}

/** POST /auth/delete-account javobi — hisob HALI o'chmagan, faqat kod yuborilgan */
export interface DeleteAccountStartResponse {
  expiresInSeconds: number;
}

export interface ConfirmDeleteAccountDto {
  code: string;
}

export interface AddEmailDto {
  email: string;
}

/** POST /auth/email/add javobi — email HALI saqlanmagan, faqat kod yuborilgan */
export interface AddEmailStartResponse {
  expiresInSeconds: number;
}

export interface ConfirmAddEmailDto {
  code: string;
}

export interface SetPasswordDto {
  newPassword: string;
}

/** POST /auth/password/set javobi — parol HALI saqlanmagan (agar
 * expiresInSeconds === 0 bo'lsa, emaili yo'qligi sabab allaqachon SHU
 * YERDA o'rnatilgan — kod bosqichi kerak emas) */
export interface SetPasswordStartResponse {
  expiresInSeconds: number;
}

export interface ConfirmSetPasswordDto {
  code: string;
}

/** POST /auth/forgot-password javobi — hisob mavjud bo'lsa-bo'lmasa ham BIR XIL shakl (enumeration himoyasi) */
export interface ForgotPasswordStartResponse {
  expiresInSeconds: number;
}

export interface ConfirmForgotPasswordDto {
  email: string;
  code: string;
  newPassword: string;
}

/**
 * POST /auth/login javobi — agar hisobda ikki bosqichli autentifikatsiya
 * yoqilgan bo'lsa, token EMAS, shu shakl qaytadi (sessiya HALI ochilmagan).
 */
export interface TwoFactorRequiredResponse {
  twoFactorRequired: true;
  /** Faqat /auth/2fa/verify-login uchun yaroqli, bir martalik bilet */
  ticket: string;
}

export interface VerifyTwoFactorLoginDto {
  ticket: string;
  /** 6 xonali TOTP kod YOKI 10 belgili zaxira kod */
  code: string;
}

export interface TwoFactorStatus {
  enabled: boolean;
}

/** POST /auth/2fa/setup javobi — 2FA HALI yoqilmagan, faqat sozlash uchun */
export interface TwoFactorSetupResponse {
  secret: string;
  otpauthUrl: string;
  /** data:image/png;base64,... — Google Authenticator skanerlashi uchun */
  qrCodeDataUrl: string;
}

export interface ConfirmTwoFactorDto {
  code: string;
}

/** POST /auth/2fa/confirm javobi — zaxira kodlar FAQAT SHU YERDA, bir marta qaytadi */
export interface ConfirmTwoFactorResponse {
  recoveryCodes: string[];
}

export interface DisableTwoFactorDto {
  password: string;
}

/** Faol qurilma (sessiya) — GET /auth/sessions */
export interface SessionInfo {
  id: string;
  browser: string;
  os: string;
  /** 'desktop' | 'mobile' | 'unknown' */
  device: string;
  ip: string;
  /** Birinchi kirish vaqti (ISO) */
  createdAt: string;
  /** Oxirgi faollik (ISO) */
  lastSeenAt: string;
  /** Shu qurilmaning o'zi */
  current: boolean;
}

/** Kirish tarixi hodisasi turi */
export type LoginEventType =
  | 'REGISTER'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'GOOGLE_LOGIN'
  | 'PASSWORD_CHANGED'
  | 'TWO_FACTOR_ENABLED'
  | 'TWO_FACTOR_DISABLED';

/** Kirish tarixi yozuvi — GET /auth/login-history (doimiy audit-log) */
export interface LoginEvent {
  id: string;
  type: LoginEventType;
  browser: string;
  os: string;
  device: string;
  ip: string;
  createdAt: string;
}
