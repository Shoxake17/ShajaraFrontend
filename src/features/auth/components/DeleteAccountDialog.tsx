// features/auth/components/DeleteAccountDialog.tsx
// Hisobni o'chirish oynasi (Sozlamalar → Eksport → "Hisobni o'chirish"). IKKI
// BOSQICH (ChangePasswordDialog bilan bir xil naqsh, faqat QAYTARIB
// BO'LMAYDIGAN amal ekani uchun qizil/danger uslub bilan):
//  1) parolli hisobda joriy parol tekshiriladi (Google/Telegram orqali
//     ochilgan hisobda parol shart emas) — hisob HALI o'chmaydi, emailga
//     6 xonali tasdiqlash kodi yuboriladi;
//  2) to'g'ri kod kiritilgach hisob SHU YERDA HAQIQATAN va QAYTARIB
//     BO'LMAYDIGAN tarzda o'chiriladi. Foydalanuvchi qo'shgan oila
//     a'zolari va rasm/video/hujjatlar daraxtda SAQLANIB QOLADI (backend
//     kafolati — schema.prisma'da ownerId atayin FK'siz).
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
import { authErrorMessage } from '@/features/auth/lib/auth-errors';
import {
  getDeleteAccountSchema,
  getVerifyCodeSchema,
  type DeleteAccountForm,
  type VerifyCodeForm,
} from '@/features/auth/model/auth.schemas';

interface DeleteAccountDialogProps {
  open: boolean;
  onClose: () => void;
  /** Hisob HAQIQATAN o'chirilgandan keyin chaqiriladi — sessiya tozalash + redirect SettingsPage'da amalga oshiriladi */
  onDeleted: () => void;
}

const RESEND_COOLDOWN_SECONDS = 60;

export function DeleteAccountDialog({ open, onClose, onDeleted }: DeleteAccountDialogProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'form' | 'code'>('form');
  const [serverError, setServerError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resent, setResent] = useState(false);

  const form = useForm<DeleteAccountForm>({ resolver: zodResolver(getDeleteAccountSchema()) });
  const codeForm = useForm<VerifyCodeForm>({ resolver: zodResolver(getVerifyCodeSchema()) });
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = form;
  const {
    handleSubmit: handleCodeSubmit,
    reset: resetCode,
    formState: { errors: codeErrors, isSubmitting: confirming },
  } = codeForm;

  // Oyna har ochilganda toza holatdan boshlanadi
  useEffect(() => {
    if (open) {
      reset();
      resetCode();
      setStep('form');
      setServerError(null);
      setResendCooldown(0);
    }
  }, [open, reset, resetCode]);

  // Qayta yuborish cooldown'ining orqaga sanog'i
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
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
      await authApi.deleteAccount({ password: values.password || undefined });
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
      await authApi.confirmDeleteAccount({ code: values.code });
      // Hisob HAQIQATAN o'chdi — sessiya tozalash/redirect chaqiruvchiga (SettingsPage) tegishli
      onDeleted();
    } catch (error) {
      setServerError(authErrorMessage(error));
    }
  });

  const resend = async () => {
    if (resendCooldown > 0) return;
    setServerError(null);
    setResent(false);
    try {
      await authApi.resendDeleteAccountCode();
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
        aria-label={t('auth.deleteAccount.ariaLabel')}
        className="w-full max-w-sm rounded-[20px] bg-white p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 'form' ? (
          <>
            <h3 className="font-serif text-lg font-semibold text-red-600">
              {t('auth.deleteAccount.title')}
            </h3>
            <p className="mt-1 text-xs leading-snug text-red-500">
              {t('auth.deleteAccount.warning')}
            </p>

            <form onSubmit={submit} noValidate className="mt-4 space-y-2.5">
              <TextField
                icon={<LockIcon />}
                isPassword
                autoFocus
                autoComplete="current-password"
                placeholder={t('auth.deleteAccount.passwordPlaceholder')}
                error={errors.password?.message}
                {...register('password')}
              />
              <p className="px-1 text-[11px] text-brand-500">{t('auth.deleteAccount.passwordHint')}</p>

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
                <Button
                  type="submit"
                  loading={isSubmitting}
                  className="!bg-red-600 hover:!bg-red-700 flex-1 !py-3 !text-sm"
                >
                  {t('auth.deleteAccount.continue')}
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

            <h3 className="mt-2 font-serif text-lg font-semibold text-red-600">
              {t('auth.deleteAccount.confirmEmailTitle')}
            </h3>
            <p className="mt-1.5 text-[13px] leading-snug text-brand-700">
              {t('auth.deleteAccount.confirmDesc')}
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
                  {t('auth.deleteAccount.codeResent')}
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
                <Button
                  type="submit"
                  loading={confirming}
                  className="!bg-red-600 hover:!bg-red-700 flex-1 !py-3 !text-sm"
                >
                  {t('auth.deleteAccount.confirm')}
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
                ? t('auth.deleteAccount.resendWithCooldown', { seconds: resendCooldown })
                : t('auth.deleteAccount.resend')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
