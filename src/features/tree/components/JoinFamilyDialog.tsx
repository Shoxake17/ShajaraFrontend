// features/tree/components/JoinFamilyDialog.tsx
// Sozlamalar → "Oila a'zosiga qo'shilish": allaqachon ro'yxatdan o'tgan
// foydalanuvchi BOSHQA odamning ulashish kodini (Doska → a'zo profili →
// "Ulashish kodi") kiritib, o'sha daraxtga VIEWER bo'lib qo'shiladi —
// ro'yxatdan o'tishda ishlatiladigan bilan bir xil mexanizm, faqat
// istalgan vaqt, allaqachon kirgan holda.
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { Alert } from '@/shared/ui/Alert';
import { UsersDuoIcon } from '@/shared/ui/icons';
import { familyApi } from '@/features/tree/api/family.api';
import { useTreeStore } from '@/features/tree/model/tree.store';
import { authErrorMessage } from '@/features/auth/lib/auth-errors';

interface JoinFamilyDialogProps {
  open: boolean;
  onClose: () => void;
}

interface JoinFamilyForm {
  shareCode: string;
}

function getJoinFamilySchema() {
  return z.object({
    shareCode: z
      .string()
      .trim()
      .regex(/^[A-Z0-9]{12}$/i, ''),
  });
}

export function JoinFamilyDialog({ open, onClose }: JoinFamilyDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const loadBoard = useTreeStore((s) => s.loadBoard);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<JoinFamilyForm>({
    resolver: zodResolver(getJoinFamilySchema()),
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
      await familyApi.joinByShareCode(values.shareCode.trim().toUpperCase());
      await loadBoard();
      onClose();
      navigate('/doska');
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
        aria-label={t('settings.joinFamily.ariaLabel')}
        className="w-full max-w-sm rounded-[20px] bg-white p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-serif text-lg font-semibold text-brand-900">
          {t('settings.joinFamily.title')}
        </h3>
        <p className="mt-1.5 text-[13px] leading-snug text-brand-700">
          {t('settings.joinFamily.desc')}
        </p>

        <form onSubmit={submit} noValidate className="mt-4 space-y-2.5">
          <TextField
            icon={<UsersDuoIcon />}
            autoFocus
            maxLength={12}
            placeholder={t('settings.joinFamily.codePlaceholder')}
            error={errors.shareCode?.message ? t('auth.validation.shareCodeLength') : undefined}
            {...register('shareCode')}
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
              {t('settings.joinFamily.join')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
