// features/auth/index.ts
// Feature'ning "public API"si — tashqaridan faqat shu yerdan import qilinadi.
// Ichki tuzilma o'zgarsa, boshqa fayllar buzilmaydi.
export { LoginPage } from './pages/LoginPage';
export { RegisterPage } from './pages/RegisterPage';
export { ForgotPasswordPage } from './pages/ForgotPasswordPage';
export { useAuthStore } from './model/auth.store';
export { ChangePasswordDialog } from './components/ChangePasswordDialog';
export { SessionsDialog } from './components/SessionsDialog';
export { LoginHistoryDialog } from './components/LoginHistoryDialog';
export { TwoFactorSetupDialog } from './components/TwoFactorSetupDialog';
export { TwoFactorDisableDialog } from './components/TwoFactorDisableDialog';
export type { AuthUser } from './types';
