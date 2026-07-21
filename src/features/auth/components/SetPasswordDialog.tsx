// features/auth/components/SetPasswordDialog.tsx
// Sozlamalar → Xavfsizlik: parol UMUMAN yo'q hisobga (Google/Telegram
// orqali ochilgan) birinchi marta parol o'rnatish. ChangePasswordDialog
// bilan bir xil naqsh, lekin joriy parol so'ralmaydi (yo'q).
//
// Emaili bo'lsa — ikkinchi faktor sifatida emailga kod yuboriladi (2-bosqich).
// Emaili YO'Q (sof Telegram) bo'lsa — backend `expiresInSeconds: 0` bilan
// javob beradi, ya'ni parol SHU YERDA allaqachon o'rnatilgan — kod bosqichi
// UMUMAN ko'rsatilmaydi.
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
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
  getSetPasswordSchema,
  getVerifyCodeSchema,
  type SetPasswordForm,
  type VerifyCodeForm,
} from '@/features/auth/model/auth.schemas';

interface SetPasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

const RESEND_COOLDOWN_SECONDS = 60;

export function SetPasswordDialog({ open, onClose }: SetPasswordDialogProps) {
  const { t } = useTranslation();
  const setUser = useAuthStore((s) => s.setUser);
  const [step, setStep] = useState<'form' | 'code'>('form');
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resent, setResent] = useState(false);

  const form = useForm<SetPasswordForm>({ resolver: zodResolver(getSetPasswordSchema()) });
  const codeForm = useForm<VerifyCodeForm>({ resolver: zodResolver(getVerifyCodeSchema()) });
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = form;
  const {
    handleSubmit: handleCodeSubmit,
    reset: resetCode,
    formState: { errors: codeErrors, isSubmitting: confirming },
  } = codeForm;

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

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  /** Parol o'rnatilgach (kod bilan yoki darhol) — server javobi to'liq
   * AuthUser bermaydi, shu bois `hasPassword`ni to'g'ri aks ettirish uchun
   * joriy foydalanuvchini qayta so'raymiz. */
  const refreshUser = async () => {
    const user = await authApi.me();
    setUser(user);
  };

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const result = await authApi.setPassword({ newPassword: values.newPassword });
      if (result.expiresInSeconds === 0) {
        await refreshUser();
        setSuccess(true);
        return;
      }
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
      await authApi.confirmSetPassword({ code: values.code });
      await refreshUser();
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
      await authApi.resendSetPasswordCode();
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
        aria-label={t('auth.setPassword.ariaLabel')}
        className="w-full max-w-sm rounded-[20px] bg-white p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        {success ? (
          <>
            <h3 className="font-serif text-lg font-semibold text-brand-900">
              {t('auth.setPassword.title')}
            </h3>
            <p className="mt-3 text-sm text-brand-700">{t('auth.setPassword.successDesc')}</p>
            <Button type="button" onClick={onClose} className="mt-5 !py-3 !text-sm">
              {t('common.close')}
            </Button>
          </>
        ) : step === 'form' ? (
          <>
            <h3 className="font-serif text-lg font-semibold text-brand-900">
              {t('auth.setPassword.title')}
            </h3>
            <p className="mt-1 text-xs text-brand-500">{t('auth.setPassword.formDesc')}</p>

            <form onSubmit={submit} noValidate className="mt-4 space-y-2.5">
              <TextField
                icon={<LockIcon />}
                isPassword
                autoFocus
                autoComplete="new-password"
                placeholder={t('auth.setPassword.newPasswordPlaceholder')}
                error={errors.newPassword?.message}
                {...register('newPassword')}
              />
              <TextField
                icon={<LockIcon />}
                isPassword
                autoComplete="new-password"
                placeholder={t('auth.setPassword.confirmNewPasswordPlaceholder')}
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
                  {t('common.cancel')}
                </button>
                <Button type="submit" loading={isSubmitting} className="flex-1 !py-3 !text-sm">
                  {t('auth.setPassword.continue')}
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
              {t('common.back')}
            </button>

            <h3 className="mt-2 font-serif text-lg font-semibold text-brand-900">
              {t('auth.setPassword.confirmEmailTitle')}
            </h3>
            <p className="mt-1.5 text-[13px] leading-snug text-brand-700">
              {t('auth.setPassword.confirmDesc')}
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
                  {t('auth.setPassword.codeResent')}
                </p>
              )}

              <div className="!mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={confirming}
                  className="flex-1 rounded-field border border-neutral-200 py-3 text-sm font-medium text-brand-900 transition-colors hover:bg-brand-50 disabled:opacity-60"
                >
                  {t('common.cancel')}
                </button>
                <Button type="submit" loading={confirming} className="flex-1 !py-3 !text-sm">
                  {t('auth.setPassword.confirm')}
                </Button>
              </div>
            </form>

            <button
              type="button"
              onClick={() => void resend()}
              disabled={resendCooldown > 0}
              className="mt-3 w-full text-center text-sm font-medium text-link hover:underline disabled:cursor-not-allowed disabled:text-neutral-400 disabled:no-underline"
            >
              {resendCooldown > 0
                ? t('auth.setPassword.resendWithCooldown', { seconds: resendCooldown })
                : t('auth.setPassword.resend')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
