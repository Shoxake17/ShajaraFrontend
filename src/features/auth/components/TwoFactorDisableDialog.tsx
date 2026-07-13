// features/auth/components/TwoFactorDisableDialog.tsx
// Ikki bosqichli autentifikatsiyani O'CHIRISH oynasi — joriy parol majburiy
// tasdiqlanadi (sessiya o'g'irlangan bo'lsa ham hujumchi parolni bilmasa
// 2FA'ni o'chira olmaydi).
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { Alert } from '@/shared/ui/Alert';
import { LockIcon } from '@/shared/ui/icons';
import { authApi } from '@/features/auth/api/auth.api';
import { authErrorMessage } from '@/features/auth/lib/auth-errors';
import {
  getDisableTwoFactorSchema,
  type DisableTwoFactorForm,
} from '@/features/auth/model/auth.schemas';

interface TwoFactorDisableDialogProps {
  open: boolean;
  onClose: () => void;
  /** 2FA muvaffaqiyatli o'chirilgach chaqiriladi */
  onDisabled: () => void;
}

export function TwoFactorDisableDialog({ open, onClose, onDisabled }: TwoFactorDisableDialogProps) {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DisableTwoFactorForm>({
    resolver: zodResolver(getDisableTwoFactorSchema()),
  });

  useEffect(() => {
    if (open) {
      reset();
      setServerError(null);
    }
  }, [open, reset]);

  if (!open) return null;

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await authApi.disableTwoFactor({ password: values.password });
      onDisabled();
      onClose();
    } catch (error) {
      setServerError(authErrorMessage(error));
    }
  });

  const handleClose = () => {
    if (isSubmitting) return;
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
        aria-label={t('auth.twoFactorDisable.ariaLabel')}
        className="w-full max-w-sm rounded-[20px] bg-white p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-serif text-lg font-semibold text-brand-900">
          {t('auth.twoFactorDisable.title')}
        </h3>
        <p className="mt-1.5 text-[13px] leading-snug text-brand-700">
          {t('auth.twoFactorDisable.desc')}
        </p>

        <form onSubmit={submit} noValidate className="mt-4 space-y-2.5">
          <TextField
            icon={<LockIcon />}
            isPassword
            autoFocus
            autoComplete="current-password"
            placeholder={t('auth.twoFactorDisable.currentPasswordPlaceholder')}
            error={errors.password?.message}
            {...register('password')}
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
              {t('auth.twoFactorDisable.disable')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
