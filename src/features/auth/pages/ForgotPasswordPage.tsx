// src/features/auth/pages/ForgotPasswordPage.tsx
// Faqat UI — butun logika useForgotPassword() hook'ida. Bosqichlar:
// email (agar login sahifasidan oldindan uzatilmagan bo'lsa) -> yangi parol +
// tasdiqlash + emailga yuborilgan 6 xonali kod (o'z ALOHIDA blokida). Email
// oldindan uzatilgan bo'lsa loading/spinner YO'Q — ikkinchi bosqich DARHOL
// ko'rinadi, kod esa orqa fonda so'raladi.
import { Link } from 'react-router-dom';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useForgotPassword } from '@/features/auth/hooks/useForgotPassword';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { Alert } from '@/shared/ui/Alert';
import { SegmentedCodeInput } from '@/shared/ui/SegmentedCodeInput';
import { ArrowLeftIcon, LockIcon, MailIcon } from '@/shared/ui/icons';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const {
    step,
    emailForm,
    resetForm,
    submitEmail,
    confirm,
    resend,
    resendCooldown,
    resent,
    backToEmail,
    serverError,
  } = useForgotPassword();
  const {
    register: registerEmail,
    formState: { errors: emailErrors, isSubmitting: submittingEmail },
  } = emailForm;
  const {
    register: registerReset,
    formState: { errors: resetErrors, isSubmitting: confirming },
  } = resetForm;

  return (
    // h-dvh + overflow-hidden — sahifa ekranga qulflanadi, scroll chiqmaydi.
    <div
      className="relative flex h-dvh flex-col overflow-hidden bg-[#F4F5EF] bg-cover bg-center"
      style={{ backgroundImage: "url('/bgtree.png')" }}
    >
      <div className="pointer-events-none absolute inset-0 bg-white/30" />

      <div className="relative mx-auto flex h-full w-full max-w-md flex-col justify-center px-4 pb-3 pt-3 sm:max-w-lg">
        <header className="flex flex-col items-center text-center">
          <h1 className="font-serif text-3xl font-semibold text-brand-800 sm:text-4xl">{t('auth.brand')}</h1>
          <p className="mt-1 text-[13px] leading-snug text-brand-700">
            {t('auth.forgotPassword.subtitle')}
          </p>
        </header>

        <main className="mt-5 w-full shrink-0 rounded-[22px] bg-white/95 p-4 shadow-card backdrop-blur-sm sm:p-5">
          {step === 'email' ? (
            <>
              <h2 className="mt-2 text-center font-serif text-[22px] font-semibold text-brand-900">
                {t('auth.forgotPassword.title')}
              </h2>
              <p className="mt-1.5 text-center text-[13px] leading-snug text-brand-700">
                {t('auth.forgotPassword.desc')}
              </p>

              <form onSubmit={submitEmail} noValidate className="mt-4 space-y-2.5">
                <TextField
                  icon={<MailIcon />}
                  type="email"
                  autoFocus
                  autoComplete="email"
                  placeholder={t('auth.forgotPassword.emailPlaceholder')}
                  error={emailErrors.email?.message}
                  {...registerEmail('email')}
                />

                {serverError && <Alert>{serverError}</Alert>}

                <Button type="submit" loading={submittingEmail} className="!mt-3">
                  {t('auth.forgotPassword.continue')}
                </Button>
              </form>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-medium text-brand-700">
                <Link to="/login" className="flex items-center gap-1.5 hover:text-brand-900">
                  <ArrowLeftIcon width={16} height={16} />
                  {t('auth.forgotPassword.backToLogin')}
                </Link>
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={backToEmail}
                className="flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-900"
              >
                <ArrowLeftIcon width={16} height={16} />
                {t('auth.forgotPassword.back')}
              </button>

              <h2 className="mt-2 text-center font-serif text-[22px] font-semibold text-brand-900">
                {t('auth.forgotPassword.newPasswordTitle')}
              </h2>

              <form onSubmit={confirm} noValidate className="mt-4 space-y-4">
                {/* Yangi parol bloki */}
                <div className="space-y-2.5">
                  <TextField
                    icon={<LockIcon />}
                    isPassword
                    autoFocus
                    autoComplete="new-password"
                    placeholder={t('auth.forgotPassword.newPasswordPlaceholder')}
                    error={resetErrors.newPassword?.message}
                    {...registerReset('newPassword')}
                  />
                  <TextField
                    icon={<LockIcon />}
                    isPassword
                    autoComplete="new-password"
                    placeholder={t('auth.forgotPassword.confirmNewPasswordPlaceholder')}
                    error={resetErrors.confirmPassword?.message}
                    {...registerReset('confirmPassword')}
                  />
                </div>

                {/* Tasdiqlash kodi — o'z ALOHIDA, yakka blokida, parol maydonlaridan aniq ajratilgan */}
                <div
                  data-testid="otp-block"
                  className="rounded-field border border-brand-100 bg-brand-50/60 p-3"
                >
                  <p className="mb-2 text-xs font-medium text-brand-700">{t('auth.forgotPassword.confirmationCode')}</p>
                  <Controller
                    control={resetForm.control}
                    name="code"
                    render={({ field }) => (
                      <SegmentedCodeInput
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        error={resetErrors.code?.message}
                      />
                    )}
                  />
                </div>

                {serverError && <Alert>{serverError}</Alert>}
                {resent && (
                  <p className="text-center text-xs font-medium text-brand-600">
                    {t('auth.forgotPassword.codeResent')}
                  </p>
                )}

                <Button type="submit" loading={confirming} className="!mt-1">
                  {t('auth.forgotPassword.save')}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => void resend()}
                disabled={resendCooldown > 0}
                className="mt-3 w-full text-center text-sm font-medium text-link hover:underline disabled:cursor-not-allowed disabled:text-neutral-400 disabled:no-underline"
              >
                {resendCooldown > 0
                  ? t('auth.forgotPassword.resendWithCooldown', { seconds: resendCooldown })
                  : t('auth.forgotPassword.resend')}
              </button>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
