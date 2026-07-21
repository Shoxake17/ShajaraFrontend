// features/auth/components/AddEmailDialog.tsx
// Sozlamalar → Profil: emaili yo'q hisobga (masalan Telegram-only) HAQIQIY
// email qo'shish. IKKI BOSQICH (ChangePasswordDialog bilan bir xil naqsh):
//  1) email kiritiladi — HALI saqlanmaydi, o'sha manzilga 6 xonali
//     tasdiqlash kodi yuboriladi (egaligini isbotlash uchun);
//  2) to'g'ri kod kiritilgach email SHU YERDA saqlanadi.
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { Alert } from '@/shared/ui/Alert';
import { SegmentedCodeInput } from '@/shared/ui/SegmentedCodeInput';
import { ArrowLeftIcon, MailIcon } from '@/shared/ui/icons';
import { authApi } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/features/auth/model/auth.store';
import { authErrorMessage } from '@/features/auth/lib/auth-errors';
import {
  getAddEmailSchema,
  getVerifyCodeSchema,
  type AddEmailForm,
  type VerifyCodeForm,
} from '@/features/auth/model/auth.schemas';

interface AddEmailDialogProps {
  open: boolean;
  onClose: () => void;
}

const RESEND_COOLDOWN_SECONDS = 60;

export function AddEmailDialog({ open, onClose }: AddEmailDialogProps) {
  const { t } = useTranslation();
  const setUser = useAuthStore((s) => s.setUser);
  const [step, setStep] = useState<'form' | 'code'>('form');
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resent, setResent] = useState(false);

  const form = useForm<AddEmailForm>({ resolver: zodResolver(getAddEmailSchema()) });
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

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await authApi.addEmail({ email: values.email });
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
      const user = await authApi.confirmAddEmail({ code: values.code });
      setUser(user);
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
      await authApi.resendAddEmailCode();
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
        aria-label={t('auth.addEmail.ariaLabel')}
        className="w-full max-w-sm rounded-[20px] bg-white p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        {success ? (
          <>
            <h3 className="font-serif text-lg font-semibold text-brand-900">
              {t('auth.addEmail.title')}
            </h3>
            <p className="mt-3 text-sm text-brand-700">{t('auth.addEmail.successDesc')}</p>
            <Button type="button" onClick={onClose} className="mt-5 !py-3 !text-sm">
              {t('common.close')}
            </Button>
          </>
        ) : step === 'form' ? (
          <>
            <h3 className="font-serif text-lg font-semibold text-brand-900">
              {t('auth.addEmail.title')}
            </h3>
            <p className="mt-1 text-xs text-brand-500">{t('auth.addEmail.formDesc')}</p>

            <form onSubmit={submit} noValidate className="mt-4 space-y-2.5">
              <TextField
                icon={<MailIcon />}
                autoFocus
                autoComplete="email"
                placeholder={t('auth.addEmail.emailPlaceholder')}
                error={errors.email?.message}
                {...register('email')}
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
                  {t('auth.addEmail.continue')}
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
              {t('auth.addEmail.confirmEmailTitle')}
            </h3>
            <p className="mt-1.5 text-[13px] leading-snug text-brand-700">
              {t('auth.addEmail.confirmDesc')}
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
                  {t('auth.addEmail.codeResent')}
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
                  {t('auth.addEmail.confirm')}
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
                ? t('auth.addEmail.resendWithCooldown', { seconds: resendCooldown })
                : t('auth.addEmail.resend')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
