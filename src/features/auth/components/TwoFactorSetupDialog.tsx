// features/auth/components/TwoFactorSetupDialog.tsx
// Ikki bosqichli autentifikatsiyani YOQISH oynasi. UCH BOSQICH:
//  1) ochilishi bilan yangi maxfiy kalit so'raladi (HALI yoqilmagan) — QR kod
//     va qo'lda kiritish uchun matn ko'rsatiladi;
//  2) foydalanuvchi authenticator ilovasidan olgan 6 xonali kodni kiritadi —
//     to'g'ri bo'lsagina 2FA SHU YERDA haqiqatan yoqiladi;
//  3) zaxira kodlar FAQAT BIR MARTA ko'rsatiladi — qurilma yo'qolganda
//     kirish uchun (foydalanuvchi ularni saqlab qo'yishi kerak).
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/ui/Button';
import { Alert } from '@/shared/ui/Alert';
import { SegmentedCodeInput } from '@/shared/ui/SegmentedCodeInput';
import { authApi } from '@/features/auth/api/auth.api';
import { authErrorMessage } from '@/features/auth/lib/auth-errors';
import {
  confirmTwoFactorSetupSchema,
  type ConfirmTwoFactorSetupForm,
} from '@/features/auth/model/auth.schemas';

interface TwoFactorSetupDialogProps {
  open: boolean;
  onClose: () => void;
  /** 2FA muvaffaqiyatli yoqilgach (foydalanuvchi zaxira kodlarni yopgach) chaqiriladi */
  onEnabled: () => void;
}

export function TwoFactorSetupDialog({ open, onClose, onEnabled }: TwoFactorSetupDialogProps) {
  const [step, setStep] = useState<'loading' | 'scan' | 'recovery'>('loading');
  const [secret, setSecret] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const codeForm = useForm<ConfirmTwoFactorSetupForm>({ resolver: zodResolver(confirmTwoFactorSetupSchema) });
  const { handleSubmit, reset, formState: { errors, isSubmitting } } = codeForm;

  // Oyna har ochilganda yangi kalit so'raladi (eski kalit tashlab yuboriladi)
  useEffect(() => {
    if (!open) return;
    setStep('loading');
    setServerError(null);
    setCopied(false);
    reset();
    (async () => {
      try {
        const result = await authApi.setupTwoFactor();
        setSecret(result.secret);
        setQrCodeDataUrl(result.qrCodeDataUrl);
        setStep('scan');
      } catch (error) {
        setServerError(authErrorMessage(error));
      }
    })();
  }, [open, reset]);

  if (!open) return null;

  const confirm = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const { recoveryCodes: codes } = await authApi.confirmTwoFactor({ code: values.code });
      setRecoveryCodes(codes);
      setStep('recovery');
    } catch (error) {
      setServerError(authErrorMessage(error));
    }
  });

  const copyRecoveryCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard ruxsati bo'lmasa ham kodlar ekranda ko'rinib turadi — muhim emas
    }
  };

  const finish = () => {
    onEnabled();
    onClose();
  };

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
        aria-label="Ikki bosqichli autentifikatsiyani yoqish"
        className="w-full max-w-sm rounded-[20px] bg-white p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 'loading' ? (
          <>
            <h3 className="font-serif text-lg font-semibold text-brand-900">
              Ikki bosqichli autentifikatsiya
            </h3>
            {serverError ? (
              <>
                <Alert>{serverError}</Alert>
                <Button type="button" onClick={onClose} className="mt-4 !py-3 !text-sm">
                  Yopish
                </Button>
              </>
            ) : (
              <div className="mt-6 flex justify-center">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
              </div>
            )}
          </>
        ) : step === 'scan' ? (
          <>
            <h3 className="font-serif text-lg font-semibold text-brand-900">
              Authenticator ilovasi bilan bog&#8216;lash
            </h3>
            <p className="mt-1.5 text-[13px] leading-snug text-brand-700">
              Google Authenticator (yoki boshqa TOTP ilovasi) bilan quyidagi QR kodni skanerlang, so&#8216;ng
              ilova ko&#8216;rsatgan 6 xonali kodni kiriting.
            </p>

            {qrCodeDataUrl && (
              <div className="mt-3 flex justify-center">
                <img
                  src={qrCodeDataUrl}
                  alt="2FA QR kod"
                  width={176}
                  height={176}
                  className="rounded-xl border border-neutral-200 p-2"
                />
              </div>
            )}

            <p className="mt-2 text-center text-[11px] text-brand-500">
              Skanerlab bo&#8216;lmasa, qo&#8216;lda kiriting:
            </p>
            <p className="mt-1 break-all rounded-field bg-neutral-50 px-3 py-2 text-center font-mono text-xs tracking-wide text-brand-900">
              {secret}
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
                    error={errors.code?.message}
                  />
                )}
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
                  Yoqish
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h3 className="font-serif text-lg font-semibold text-brand-900">Zaxira kodlar</h3>
            <p className="mt-1.5 text-[13px] leading-snug text-brand-700">
              Ikki bosqichli autentifikatsiya <b>yoqildi</b>. Quyidagi kodlarni xavfsiz joyda saqlang — telefon
              yo&#8216;qolsa, har biri BIR MARTA ishlatiladigan bu kodlar orqali kirishingiz mumkin bo&#8216;ladi.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 rounded-field bg-neutral-50 p-3 font-mono text-[13px] text-brand-900">
              {recoveryCodes.map((code) => (
                <span key={code}>{code}</span>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void copyRecoveryCodes()}
              className="mt-3 w-full text-center text-sm font-medium text-link hover:underline"
            >
              {copied ? 'Nusxalandi ✓' : 'Nusxalash'}
            </button>

            <Button type="button" onClick={finish} className="mt-4 !py-3 !text-sm">
              Saqladim, yopish
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
