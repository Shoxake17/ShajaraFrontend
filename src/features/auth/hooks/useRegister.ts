// features/auth/hooks/useRegister.ts
// Ro'yxatdan o'tish — IKKI BOSQICH:
//  1) forma yuborilgach hisob HALI yaratilmaydi, faqat emailga 6 xonali
//     tasdiqlash kodi yuboriladi (backend: RegistrationService);
//  2) to'g'ri kod kiritilgach haqiqiy hisob yaratiladi va sessiya ochiladi.
// Bu email egaligini isbotlaydi — soxta/begona email bilan hisob ochilmaydi.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  registerSchema,
  verifyCodeSchema,
  type RegisterForm,
  type VerifyCodeForm,
} from '@/features/auth/model/auth.schemas';
import { authApi } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/features/auth/model/auth.store';
import { authErrorMessage } from '@/features/auth/lib/auth-errors';
import { normalizePhone } from '@/shared/lib/phone';

const RESEND_COOLDOWN_SECONDS = 60;

export function useRegister() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [step, setStep] = useState<'form' | 'code'>('form');
  const [pendingEmail, setPendingEmail] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resent, setResent] = useState(false);

  const form = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });
  const codeForm = useForm<VerifyCodeForm>({ resolver: zodResolver(verifyCodeSchema) });

  // Qayta yuborish cooldown'ining orqaga sanog'i (server 60s cooldown'ini aks ettiradi)
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const submit = form.handleSubmit(async (values) => {
    setServerError(null);
    try {
      const shareCode = values.shareCode?.trim().toUpperCase();
      const email = values.email.trim().toLowerCase();
      await authApi.register({
        fullName: values.fullName.trim(),
        phone: normalizePhone(values.phone),
        email,
        password: values.password,
        ...(shareCode ? { shareCode } : {}),
      });
      setPendingEmail(email);
      setStep('code');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      codeForm.reset();
    } catch (error) {
      setServerError(authErrorMessage(error));
    }
  });

  const confirm = codeForm.handleSubmit(async (values) => {
    setServerError(null);
    try {
      const { user, accessToken } = await authApi.confirmRegister({
        email: pendingEmail,
        code: values.code,
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
      await authApi.resendRegisterCode({ email: pendingEmail });
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    } catch (error) {
      setServerError(authErrorMessage(error));
    }
  };

  /** Formaga qaytish (email/telefon xato kiritilgan bo'lsa) */
  const backToForm = () => {
    setServerError(null);
    setStep('form');
  };

  return {
    step,
    form,
    codeForm,
    submit,
    confirm,
    resend,
    resendCooldown,
    resent,
    backToForm,
    pendingEmail,
    serverError,
  };
}
