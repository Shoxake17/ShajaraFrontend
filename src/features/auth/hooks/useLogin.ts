// features/auth/hooks/useLogin.ts
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  loginSchema,
  twoFactorLoginSchema,
  type LoginForm,
  type TwoFactorLoginForm,
} from '@/features/auth/model/auth.schemas';
import { authApi } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/features/auth/model/auth.store';
import { authErrorMessage } from '@/features/auth/lib/auth-errors';
import { normalizePhone } from '@/shared/lib/phone';

const emailOnlySchema = z.string().trim().email();

/**
 * Login sahifasining butun logikasi: forma, validatsiya, API, sessiya, xatolar.
 * Sahifa komponenti faqat UI chizadi — logika shu yerda, bir marta.
 *
 * Ikki bosqichli autentifikatsiya (2FA) yoqilgan hisoblarda parol to'g'ri
 * bo'lsa ham server sessiya BERMAYDI — `{twoFactorRequired, ticket}` qaytadi.
 * Shu holatda 'twoFactor' bosqichiga o'tiladi: authenticator kodi (yoki
 * zaxira kod) kiritilib, faqat SHU tasdiqlangandan keyin sessiya ochiladi.
 */
export function useLogin() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'twoFactor'>('form');
  const [ticket, setTicket] = useState('');
  /** 'totp' — 6 xonali segmentli kod (odatiy); 'recovery' — 10 belgili zaxira kod (oddiy matn maydoni) */
  const [codeMode, setCodeMode] = useState<'totp' | 'recovery'>('totp');

  const form = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const twoFactorForm = useForm<TwoFactorLoginForm>({ resolver: zodResolver(twoFactorLoginSchema) });

  const submit = form.handleSubmit(async (values) => {
    setServerError(null);
    try {
      // Telefon -> +998XXXXXXXXX ko'rinishiga; email -> kichik harflarga
      const raw = values.identifier.trim();
      const identifier = raw.includes('@') ? raw.toLowerCase() : normalizePhone(raw);
      const result = await authApi.login({ identifier, password: values.password });

      if ('twoFactorRequired' in result) {
        setTicket(result.ticket);
        twoFactorForm.reset();
        setCodeMode('totp');
        setStep('twoFactor');
        return;
      }
      setSession(result.user, result.accessToken);
      navigate('/doska');
    } catch (error) {
      setServerError(authErrorMessage(error));
    }
  });

  /** Login — 2-bosqich: bilet + authenticator (yoki zaxira) kod to'g'ri bo'lsa sessiya shu yerda ochiladi */
  const confirmTwoFactor = twoFactorForm.handleSubmit(async (values) => {
    setServerError(null);
    try {
      const { user, accessToken } = await authApi.verifyTwoFactorLogin({ ticket, code: values.code });
      setSession(user, accessToken);
      navigate('/doska');
    } catch (error) {
      setServerError(authErrorMessage(error));
    }
  });

  /** Formaga qaytish — bilet tashlab yuboriladi, qaytadan parol kiritish kerak bo'ladi */
  const backToForm = () => {
    setServerError(null);
    setTicket('');
    setStep('form');
  };

  /** TOTP kod (segmentli) <-> zaxira kod (oddiy matn) rejimlari orasida almashtirish */
  const toggleCodeMode = () => {
    setServerError(null);
    twoFactorForm.reset();
    setCodeMode((m) => (m === 'totp' ? 'recovery' : 'totp'));
  };

  /**
   * "Parolni unutdingizmi?" — login maydoniga kiritilgan email parol
   * tiklash sahifasiga OLDINDAN uzatiladi (email qaytadan so'ralmaydi).
   * Maydon bo'sh yoki email emas (masalan telefon raqam) bo'lsa —
   * o'sha maydonning o'ziga ogohlantirish chiqadi, sahifa ochilmaydi.
   */
  const goToForgotPassword = () => {
    const raw = form.getValues('identifier')?.trim() ?? '';
    const parsed = emailOnlySchema.safeParse(raw);
    if (!parsed.success) {
      form.setError('identifier', {
        type: 'manual',
        message: raw
          ? 'Parolni tiklash uchun email manzil kiriting (telefon raqam emas)'
          : 'Parolni tiklash uchun avval email manzilingizni kiriting',
      });
      return;
    }
    navigate('/forgot-password', { state: { email: parsed.data.toLowerCase() } });
  };

  return {
    form,
    submit,
    serverError,
    goToForgotPassword,
    step,
    twoFactorForm,
    confirmTwoFactor,
    backToForm,
    codeMode,
    toggleCodeMode,
  };
}
