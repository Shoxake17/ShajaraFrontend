// features/auth/components/ChangePasswordDialog.tsx
// Parolni o'zgartirish oynasi (Sozlamalar → Hisob xavfsizligi). IKKI BOSQICH:
//  1) joriy parol tekshiriladi, lekin parol HALI o'zgarmaydi — emailga 6
//     xonali tasdiqlash kodi yuboriladi (ikkinchi faktor: hatto sessiya
//     o'g'irlangan bo'lsa ham, hujumchi email pochtasiga kirmasdan parolni
//     o'zgartira olmaydi);
//  2) to'g'ri kod kiritilgach parol SHU YERDA yangilanadi va server BARCHA
//     eski sessiyalarni bekor qiladi.
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { Alert } from '@/shared/ui/Alert';
import { SegmentedCodeInput } from '@/shared/ui/SegmentedCodeInput';
import { ArrowLeftIcon, LockIcon } from '@/shared/ui/icons';
import { authApi } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/features/auth/model/auth.store';
import { authErrorMessage } from '@/features/auth/lib/auth-errors';
import {
  changePasswordSchema,
  verifyCodeSchema,
  type ChangePasswordForm,
  type VerifyCodeForm,
} from '@/features/auth/model/auth.schemas';

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

const RESEND_COOLDOWN_SECONDS = 60;

export function ChangePasswordDialog({ open, onClose }: ChangePasswordDialogProps) {
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const [step, setStep] = useState<'form' | 'code'>('form');
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resent, setResent] = useState(false);

  const form = useForm<ChangePasswordForm>({ resolver: zodResolver(changePasswordSchema) });
  const codeForm = useForm<VerifyCodeForm>({ resolver: zodResolver(verifyCodeSchema) });
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = form;
  const {
    handleSubmit: handleCodeSubmit,
    reset: resetCode,
    formState: { errors: codeErrors, isSubmitting: confirming },
  } = codeForm;

  // Oyna har ochilganda toza holatdan boshlanadi (eski parollar xotirada qolmasin)
  useEffect(() => {
    if (open) {
      reset();
      resetCode();
      setStep('form');
      setServerError(null);
      setSuccess(false);
      setResendCooldown(0);
    }
  }, [open, reset, resetCode]);

  // Qayta yuborish cooldown'ining orqaga sanog'i
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // Escape bilan yopish (yuborish paytida emas)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setStep('code');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      resetCode();
    } catch (error) {
      setServerError(authErrorMessage(error));
    }
  });

  const confirm = handleCodeSubmit(async (values) => {
    setServerError(null);
    try {
      const { accessToken } = await authApi.confirmChangePassword({ code: values.code });
      // Server barcha eski sessiyalarni bekor qildi — yangi tokenni qabul qilamiz
      setAccessToken(accessToken);
      reset();
      resetCode();
      setSuccess(true);
    } catch (error) {
      setServerError(authErrorMessage(error));
    }
  });

  const resend = async () => {
    if (resendCooldown > 0) return;
    setServerError(null);
    setResent(false);
    try {
      await authApi.resendChangePasswordCode();
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    } catch (error) {
      setServerError(authErrorMessage(error));
    }
  };

  const backToForm = () => {
    setServerError(null);
    setStep('form');
  };

  const handleClose = () => {
    if (isSubmitting || confirming) return;
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/40 p-4"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Parolni o'zgartirish"
        className="w-full max-w-sm rounded-[20px] bg-white p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        {success ? (
          <>
            <h3 className="font-serif text-lg font-semibold text-brand-900">
              Parolni o&#8216;zgartirish
            </h3>
            <p className="mt-3 text-sm text-brand-700">
              Parolingiz muvaffaqiyatli o&#8216;zgartirildi. Xavfsizlik uchun boshqa barcha
              qurilmalardagi sessiyalar yakunlandi.
            </p>
            <Button type="button" onClick={onClose} className="mt-5 !py-3 !text-sm">
              Yopish
            </Button>
          </>
        ) : step === 'form' ? (
          <>
            <h3 className="font-serif text-lg font-semibold text-brand-900">
              Parolni o&#8216;zgartirish
            </h3>
            <p className="mt-1 text-xs text-brand-500">
              Yangi parol kamida 8 ta belgi, bitta katta harf va bitta raqamdan iborat
              bo&#8216;lishi kerak.
            </p>

            <form onSubmit={submit} noValidate className="mt-4 space-y-2.5">
              <TextField
                icon={<LockIcon />}
                isPassword
                autoFocus
                autoComplete="current-password"
                placeholder="Joriy parol"
                error={errors.currentPassword?.message}
                {...register('currentPassword')}
              />
              <TextField
                icon={<LockIcon />}
                isPassword
                autoComplete="new-password"
                placeholder="Yangi parol"
                error={errors.newPassword?.message}
                {...register('newPassword')}
              />
              <TextField
                icon={<LockIcon />}
                isPassword
                autoComplete="new-password"
                placeholder="Yangi parolni tasdiqlang"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />

              {serverError && <Alert>{serverError}</Alert>}

              <div className="!mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 rounded-field border border-neutral-200 py-3 text-sm font-medium text-brand-900 transition-colors hover:bg-brand-50 disabled:opacity-60"
                >
                  Bekor qilish
                </button>
                <Button type="submit" loading={isSubmitting} className="flex-1 !py-3 !text-sm">
                  Davom etish
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={backToForm}
              className="flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-900"
            >
              <ArrowLeftIcon width={16} height={16} />
              Orqaga
            </button>

            <h3 className="mt-2 font-serif text-lg font-semibold text-brand-900">
              Emailni tasdiqlang
            </h3>
            <p className="mt-1.5 text-[13px] leading-snug text-brand-700">
              Xavfsizlik uchun emailingizga 6 xonali tasdiqlash kodi yubordik. Parol faqat
              shu kod kiritilgandan so&#8216;ng o&#8216;zgaradi.
            </p>

            <form onSubmit={confirm} noValidate className="mt-4 space-y-2.5">
              <Controller
                control={codeForm.control}
                name="code"
                render={({ field }) => (
                  <SegmentedCodeInput
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    autoFocus
                    error={codeErrors.code?.message}
                  />
                )}
              />

              {serverError && <Alert>{serverError}</Alert>}
              {resent && (
                <p className="text-center text-xs font-medium text-brand-600">
                  Yangi kod yuborildi ✓
                </p>
              )}

              <div className="!mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={confirming}
                  className="flex-1 rounded-field border border-neutral-200 py-3 text-sm font-medium text-brand-900 transition-colors hover:bg-brand-50 disabled:opacity-60"
                >
                  Bekor qilish
                </button>
                <Button type="submit" loading={confirming} className="flex-1 !py-3 !text-sm">
                  Tasdiqlash
                </Button>
              </div>
            </form>

            <button
              type="button"
              onClick={() => void resend()}
              disabled={resendCooldown > 0}
              className="mt-3 w-full text-center text-sm font-medium text-link hover:underline disabled:cursor-not-allowed disabled:text-neutral-400 disabled:no-underline"
            >
              {resendCooldown > 0 ? `Qayta yuborish (${resendCooldown}s)` : "Kodni qayta yuborish"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
