// features/auth/api/auth.api.ts
// Faqat HTTP chaqiruvlar — tiplar types.ts da, logika hooks/ da.
import { http } from '@/shared/api/http';
import type {
  AuthResponse,
  AuthUser,
  ChangePasswordDto,
  ChangePasswordStartResponse,
  ConfirmChangePasswordDto,
  ConfirmForgotPasswordDto,
  ConfirmRegisterDto,
  ConfirmTwoFactorDto,
  ConfirmTwoFactorResponse,
  DisableTwoFactorDto,
  ForgotPasswordStartResponse,
  LoginDto,
  LoginEvent,
  RegisterDto,
  RegisterStartResponse,
  ResendCodeDto,
  SessionInfo,
  TwoFactorRequiredResponse,
  TwoFactorSetupResponse,
  TwoFactorStatus,
  VerifyTwoFactorLoginDto,
} from '@/features/auth/types';

export const authApi = {
  /** Ro'yxatdan o'tish — 1-bosqich: hisob HALI yaratilmaydi, emailga kod yuboriladi */
  register: (dto: RegisterDto) =>
    http.post<RegisterStartResponse>('/auth/register', dto).then((r) => r.data),
  /** Ro'yxatdan o'tish — 2-bosqich: to'g'ri kod bilan hisob yaratiladi va sessiya ochiladi */
  confirmRegister: (dto: ConfirmRegisterDto) =>
    http.post<AuthResponse>('/auth/register/confirm', dto).then((r) => r.data),
  /** Tasdiqlash kodini qayta yuborish (60s cooldown) */
  resendRegisterCode: (dto: ResendCodeDto) =>
    http.post<{ expiresInSeconds: number }>('/auth/register/resend', dto).then((r) => r.data),
  /** 2FA yoqilgan hisobda token EMAS, {twoFactorRequired, ticket} qaytadi */
  login: (dto: LoginDto) =>
    http.post<AuthResponse | TwoFactorRequiredResponse>('/auth/login', dto).then((r) => r.data),
  /** Login — 2-bosqich: bilet + authenticator kod (yoki zaxira kod) to'g'ri bo'lsa sessiya shu yerda ochiladi */
  verifyTwoFactorLogin: (dto: VerifyTwoFactorLoginDto) =>
    http.post<AuthResponse>('/auth/2fa/verify-login', dto).then((r) => r.data),
  /** 2FA holati (Sozlamalar sahifasi uchun) */
  twoFactorStatus: () => http.get<TwoFactorStatus>('/auth/2fa/status').then((r) => r.data),
  /** 2FA sozlash — 1-bosqich: yangi maxfiy kalit + QR kod (HALI yoqilmagan) */
  setupTwoFactor: () => http.post<TwoFactorSetupResponse>('/auth/2fa/setup').then((r) => r.data),
  /** 2FA sozlash — 2-bosqich: kod to'g'ri bo'lsa HAQIQATAN yoqiladi, zaxira kodlar shu yerda qaytadi */
  confirmTwoFactor: (dto: ConfirmTwoFactorDto) =>
    http.post<ConfirmTwoFactorResponse>('/auth/2fa/confirm', dto).then((r) => r.data),
  /** 2FA o'chirish — joriy parol majburiy tasdiqlanadi */
  disableTwoFactor: (dto: DisableTwoFactorDto) =>
    http.post<void>('/auth/2fa/disable', dto).then((r) => r.data),
  /** Google access token bilan kirish/ro'yxatdan o'tish */
  google: (dto: { accessToken: string }) =>
    http.post<AuthResponse>('/auth/google', dto).then((r) => r.data),
  /** Joriy sessiya egasi. 401 bo'lsa interceptor cookie orqali avtomatik yangilaydi. */
  me: () => http.get<AuthUser>('/auth/me').then((r) => r.data),
  logout: () => http.post<void>('/auth/logout').then((r) => r.data),
  /** Parolni o'zgartirish — 1-bosqich: parol HALI o'zgarmaydi, emailga kod yuboriladi */
  changePassword: (dto: ChangePasswordDto) =>
    http.post<ChangePasswordStartResponse>('/auth/change-password', dto).then((r) => r.data),
  /** Parolni o'zgartirish — 2-bosqich: to'g'ri kod bilan parol shu yerda yangilanadi */
  confirmChangePassword: (dto: ConfirmChangePasswordDto) =>
    http.post<{ accessToken: string }>('/auth/change-password/confirm', dto).then((r) => r.data),
  /** Parol o'zgartirish kodini qayta yuborish (60s cooldown) */
  resendChangePasswordCode: () =>
    http.post<{ expiresInSeconds: number }>('/auth/change-password/resend').then((r) => r.data),
  /** Parolni unutdingizmi — 1-bosqich: hisob bor-yo'qligidan qat'iy nazar BIR XIL javob (enumeration himoyasi) */
  forgotPassword: (dto: ResendCodeDto) =>
    http.post<ForgotPasswordStartResponse>('/auth/forgot-password', dto).then((r) => r.data),
  /** Parolni unutdingizmi — 2-bosqich: to'g'ri kod bilan yangi parol shu yerda saqlanadi va sessiya ochiladi */
  confirmForgotPassword: (dto: ConfirmForgotPasswordDto) =>
    http.post<AuthResponse>('/auth/forgot-password/confirm', dto).then((r) => r.data),
  /** Parol tiklash kodini qayta yuborish (60s cooldown) */
  resendForgotPasswordCode: (dto: ResendCodeDto) =>
    http.post<{ expiresInSeconds: number }>('/auth/forgot-password/resend', dto).then((r) => r.data),
  /** Faol qurilmalar (sessiyalar) ro'yxati */
  sessions: () => http.get<SessionInfo[]>('/auth/sessions').then((r) => r.data),
  /** Bitta qurilma sessiyasini yakunlash */
  revokeSession: (id: string) => http.delete<void>(`/auth/sessions/${id}`).then((r) => r.data),
  /** Joriy qurilmadan boshqa barcha sessiyalarni yakunlash */
  revokeOtherSessions: () => http.delete<void>('/auth/sessions/others').then((r) => r.data),
  /** Kirish tarixi — doimiy audit-log (muvaffaqiyatli + muvaffaqiyatsiz urinishlar) */
  loginHistory: () => http.get<LoginEvent[]>('/auth/login-history').then((r) => r.data),
};
