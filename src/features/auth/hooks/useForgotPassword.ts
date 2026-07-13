// features/auth/hooks/useForgotPassword.ts
// Parolni unutdingizmi:
//  0) Login sahifasidan email OLDINDAN uzatilgan bo'lsa (`location.state.email`),
//     email qaytadan SO'RALMAYDI va HECH QANDAY loading/spinner ko'rsatilmaydi —
//     yangi parol + OTP bosqichi DARHOL ko'rsatiladi, kod esa shu paytda ORQA
//     FONDA (foydalanuvchi parol kiritayotganda) so'raladi.
//     Uzatilmagan bo'lsa (masalan sahifa to'g'ridan-to'g'ri ochilgan) — oddiy
//     email kiritish bosqichi ko'rsatiladi.
//  1) email kiritiladi — hisob mavjud bo'lsa-bo'lmasa ham server BIR XIL
//     javob qaytaradi (enumeration himoyasi: javobga qarab qaysi emaillar
//     ro'yxatdan o'tganini bilib bo'lmaydi). Mavjud bo'lsa emailga kod ketadi.
//  2) yangi parol, uni tasdiqlash va OTP kod birga kiritiladi — kod to'g'ri
//     bo'lsagina yangi parol shu yerda saqlanadi va sessiya avtomatik ochiladi.
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  getForgotPasswordEmailSchema,
  getResetPasswordSchema,
  type ForgotPasswordEmailForm,
  type ResetPasswordForm,
} from '@/features/auth/model/auth.schemas';
import { authApi } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/features/auth/model/auth.store';
import { authErrorMessage } from '@/features/auth/lib/auth-errors';

const RESEND_COOLDOWN_SECONDS = 60;

export function useForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);

  // LoginPage'dan "Parolni unutdingizmi?" bosilganda uzatilgan email —
  // mavjud bo'lsa, email bosqichi butunlay o'tkazib yuboriladi.
  const prefillEmail = (location.state as { email?: string } | null)?.email ?? null;

  const [step, setStep] = useState<'email' | 'reset'>(prefillEmail ? 'reset' : 'email');
  const [pendingEmail, setPendingEmail] = useState(prefillEmail ?? '');
  const [serverError, setServerError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resent, setResent] = useState(false);

  const emailForm = useForm<ForgotPasswordEmailForm>({ resolver: zodResolver(getForgotPasswordEmailSchema()) });
  const resetForm = useForm<ResetPasswordForm>({ resolver: zodResolver(getResetPasswordSchema()) });

  // Qayta yuborish cooldown'ining orqaga sanog'i (server 60s cooldown'ini aks ettiradi)
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  /** Email bosqichidan qo'lda yuborilganda — javobni KUTIB, keyin bosqich almashadi */
  const submitEmail = emailForm.handleSubmit(async (values) => {
    const email = values.email.trim().toLowerCase();
    setServerError(null);
    try {
      await authApi.forgotPassword({ email });
      setPendingEmail(email);
      setStep('reset');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      resetForm.reset();
    } catch (error) {
      setServerError(authErrorMessage(error));
    }
  });

  // Email oldindan uzatilgan bo'lsa — hech qanday loading/spinner KO'RSATMASDAN
  // parol+OTP bosqichi DARHOL ko'rinadi; kod so'rovi ORQA FONDA, foydalanuvchi
  // parol kiritayotganda jo'natiladi (StrictMode'da ikki marta yuborilmasligi
  // uchun `sentRef` bilan himoyalangan).
  const sentRef = useRef(false);
  useEffect(() => {
    if (!prefillEmail || sentRef.current) return;
    sentRef.current = true;
    setResendCooldown(RESEND_COOLDOWN_SECONDS); // fon so'rovi tugamasidan oldin qayta bosilmasin
    authApi.forgotPassword({ email: prefillEmail }).catch((error: unknown) => {
      setServerError(authErrorMessage(error));
    });
  }, [prefillEmail]);

  const confirm = resetForm.handleSubmit(async (values) => {
    setServerError(null);
    try {
      const { user, accessToken } = await authApi.confirmForgotPassword({
        email: pendingEmail,
        code: values.code,
        newPassword: values.newPassword,
      });
      setSession(user, accessToken);
      navigate('/doska');
    } catch (error) {
      setServerError(authErrorMessage(error));
    }
  });

  const resend = async () => {
    if (resendCooldown > 0) return;
    setServerError(null);
    setResent(false);
    try {
      await authApi.resendForgotPasswordCode({ email: pendingEmail });
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    } catch (error) {
      setServerError(authErrorMessage(error));
    }
  };

  /** Emailga qaytish (masalan noto'g'ri email kiritilgan bo'lsa) — mavjud email bilan oldindan to'ldirilgan */
  const backToEmail = () => {
    setServerError(null);
    if (pendingEmail) emailForm.setValue('email', pendingEmail);
    setStep('email');
  };

  return {
    step,
    emailForm,
    resetForm,
    submitEmail,
    confirm,
    resend,
    resendCooldown,
    resent,
    backToEmail,
    pendingEmail,
    serverError,
  };
}
