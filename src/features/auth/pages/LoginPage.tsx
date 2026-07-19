// src/features/auth/pages/LoginPage.tsx
// Faqat UI — butun logika useLogin() hook'ida.
import { Link } from 'react-router-dom';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import styles from './LoginPage.module.css';
import { useLogin } from '@/features/auth/hooks/useLogin';
import { LANGUAGE_NAMES, useLanguage } from '@/shared/hooks/useLanguage';
import type { SupportedLanguage } from '@/i18n';
import { SocialButtons } from '@/features/auth/components/SocialButtons';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { Alert } from '@/shared/ui/Alert';
import { SegmentedCodeInput } from '@/shared/ui/SegmentedCodeInput';
import { SelectPicker } from '@/shared/ui/SelectPicker';
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  GlobeIcon,
  HelpCircleIcon,
  KeyIcon,
  LockIcon,
  PhoneIcon,
  ShieldCheckIcon,
  ShieldLockIcon,
} from '@/shared/ui/icons';

/**
 * Daraxt rasmining foni to'q yashil qatlam — mix-blend-lighten uni sahifa
 * gradientiga "eritadi", radial mask esa to'rtburchak chetlarni yumshatadi.
 */
const treeMask =
  'radial-gradient(ellipse 60% 56% at 50% 47%, black 60%, transparent 92%)';

export function LoginPage() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const {
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
  } = useLogin();
  const {
    register,
    formState: { errors, isSubmitting },
  } = form;
  const {
    register: registerTwoFactor,
    formState: { errors: twoFactorErrors, isSubmitting: confirmingTwoFactor },
  } = twoFactorForm;

  return (
    // Joylashuv LoginPage.module.css'da — daraxt bloki balandligi endi
    // to'g'ridan-to'g'ri clamp(min, %vh, max) bilan hisoblanadi (flex-grow
    // "bo'sh joy taqsimlash"iga bog'liq EMAS), qolgan BUTUN joy kartaga
    // tegishli — karta hech qachon hisobga olinmay pastdan kesilmaydi.
    <div className={styles.page}>
      {step === 'form' ? (
        <header className={styles.hero}>
          <img
            src="/shajaratree.png"
            alt="Shajara daraxti"
            draggable={false}
            className={styles.heroImage}
            style={{ maskImage: treeMask, WebkitMaskImage: treeMask }}
          />
          <h1 className={styles.heroTitle}>{t('auth.brand')}</h1>
          <p className={styles.heroTagline}>
            {t('auth.login.heroTaglineLine1')}
            <br />
            {t('auth.login.heroTaglineLine2')}
          </p>
        </header>
      ) : (
        <header className={styles.heroCompact}>
          <h1 className={styles.heroCompactTitle}>{t('auth.brand')}</h1>
        </header>
      )}

      {/* Oq karta — QOLGAN BARCHA joyni egallaydi, sig'masa ICHIDA scroll
          qiladi. "Ro'yxatdan o'tish" havolasi endi HECH QACHON ekrandan
          chiqib ketmaydi. Desktopда (lg:) — logo+til qatori + markazlashgan
          forma ustuni (shajaradesktop.png maketi); mobilда bu qator/ustun
          ko'rinmaydi (display:none/contents), joylashuvga ta'sir qilmaydi. */}
      <main className={styles.card}>
        <div className={styles.desktopTopBar}>
          <div className={styles.desktopLogo}>
            <img src="/registertree.png" alt="" draggable={false} className="h-7 w-7 shrink-0 select-none object-contain" />
            <span className={styles.desktopLogoText}>{t('auth.brand')}</span>
          </div>
          {/* Til tanlagichi endi bosilganda ochiladigan/tanlanadigan blok
              (SelectPicker) — avvalgi bitta tugmali "aylanuvchi" (cycle)
              o'rniga (fikr-mulohaza bo'yicha). */}
          <SelectPicker
            value={language}
            onChange={(v) => setLanguage(v as SupportedLanguage)}
            label={LANGUAGE_NAMES[language]}
            icon={<GlobeIcon />}
            options={(['uz', 'ru', 'en'] as const).map((l) => ({ value: l, label: LANGUAGE_NAMES[l] }))}
          />
        </div>

        <div className={styles.desktopFormColumn}>
        {step === 'form' ? (
          <>
            <h2 className="text-center font-serif text-[22px] font-semibold text-brand-900 sm:text-[26px] lg:text-left lg:text-[28px]">{t('auth.login.title')}</h2>
            <p className={styles.desktopSubtitle}>
              {t('auth.login.subtitle')}
            </p>

            <form onSubmit={submit} noValidate className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
              <TextField
                icon={<PhoneIcon />}
                type="text"
                autoComplete="username"
                placeholder={t('auth.login.identifierPlaceholder')}
                error={errors.identifier?.message}
                {...register('identifier')}
              />
              <TextField
                icon={<LockIcon />}
                isPassword
                autoComplete="current-password"
                placeholder={t('auth.login.passwordPlaceholder')}
                error={errors.password?.message}
                {...register('password')}
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={goToForgotPassword}
                  className="text-sm font-medium text-link hover:underline"
                >
                  {t('auth.login.forgotPassword')}
                </button>
              </div>

              {serverError && <Alert>{serverError}</Alert>}

              <Button type="submit" loading={isSubmitting}>
                {t('auth.login.submit')}
              </Button>
            </form>

            {/* yoki */}
            <div className="my-3 flex items-center gap-4 sm:my-4">
              <span className="h-px flex-1 bg-neutral-200" />
              <span className="text-sm text-neutral-400">{t('auth.login.or')}</span>
              <span className="h-px flex-1 bg-neutral-200" />
            </div>

            <SocialButtons dense />

            <p className="mt-3 text-center text-[15px] text-brand-900 sm:mt-4">
              {t('auth.login.noAccount')}{' '}
              <Link to="/register" className="font-semibold text-link hover:underline">
                {t('auth.login.registerLink')}
              </Link>
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={backToForm}
              className="flex items-center gap-3 text-sm font-medium text-brand-900"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100">
                <ArrowLeftIcon width={18} height={18} />
              </span>
              {t('auth.login.back')}
            </button>

            <div className="mt-3 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-neutral-100 bg-white shadow-card">
                <ShieldLockIcon width={28} height={28} className="text-brand-800" />
              </div>
            </div>

            <h2 className="mt-3 text-center font-serif text-[21px] font-semibold text-brand-900">
              {t('auth.login.twoFactorTitle')}
            </h2>
            <p className="mt-1.5 text-center text-[13px] leading-snug text-brand-700">
              {codeMode === 'totp'
                ? t('auth.login.twoFactorTotpDesc')
                : t('auth.login.twoFactorBackupDesc')}
            </p>

            <form onSubmit={confirmTwoFactor} noValidate className="mt-4 space-y-4">
              {codeMode === 'totp' ? (
                <Controller
                  control={twoFactorForm.control}
                  name="code"
                  render={({ field }) => (
                    <SegmentedCodeInput
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      autoFocus
                      error={twoFactorErrors.code?.message}
                    />
                  )}
                />
              ) : (
                <TextField
                  icon={<KeyIcon />}
                  autoFocus
                  autoComplete="one-time-code"
                  placeholder={t('auth.login.backupCodePlaceholder')}
                  maxLength={10}
                  error={twoFactorErrors.code?.message}
                  {...registerTwoFactor('code')}
                />
              )}

              {codeMode === 'totp' && (
                <div className="flex items-start gap-3 rounded-2xl bg-brand-50 p-3.5">
                  <ShieldCheckIcon width={18} height={18} className="mt-0.5 shrink-0 text-brand-700" />
                  <p className="text-[13px] leading-snug text-brand-800">
                    {t('auth.login.totpHelp')}
                  </p>
                </div>
              )}

              {serverError && <Alert>{serverError}</Alert>}

              <Button type="submit" loading={confirmingTwoFactor}>
                {t('auth.login.verifyCode')}
              </Button>
            </form>

            <div className="my-4 flex items-center gap-4">
              <span className="h-px flex-1 bg-neutral-200" />
              <span className="text-xs font-medium tracking-wide text-neutral-400">{t('auth.login.orUpper')}</span>
              <span className="h-px flex-1 bg-neutral-200" />
            </div>

            <button
              type="button"
              onClick={toggleCodeMode}
              className="flex w-full items-center gap-3 rounded-2xl border border-neutral-200 px-4 py-3.5 text-left transition-colors hover:bg-brand-50"
            >
              <KeyIcon width={20} height={20} className="shrink-0 text-brand-700" />
              <span className="flex-1 text-sm font-medium text-brand-900">
                {codeMode === 'totp' ? t('auth.login.useBackupCode') : t('auth.login.useAuthenticatorCode')}
              </span>
              <ChevronRightIcon width={18} height={18} className="shrink-0 text-neutral-300" />
            </button>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-brand-600">
              <HelpCircleIcon width={16} height={16} />
              {t('auth.login.needHelp')}
            </p>
          </>
        )}
        </div>
      </main>
    </div>
  );
}
