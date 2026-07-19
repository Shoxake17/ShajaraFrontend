// src/features/auth/pages/RegisterPage.tsx
// Faqat UI — butun logika useRegister() hook'ida. Ikki bosqich: forma (1) va
// emailga yuborilgan 6 xonali kodni tasdiqlash (2).
import { Link } from 'react-router-dom';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useRegister } from '@/features/auth/hooks/useRegister';
import { LANGUAGE_NAMES, useLanguage } from '@/shared/hooks/useLanguage';
import type { SupportedLanguage } from '@/i18n';
import { SocialButtons } from '@/features/auth/components/SocialButtons';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { Alert } from '@/shared/ui/Alert';
import { SegmentedCodeInput } from '@/shared/ui/SegmentedCodeInput';
import { SelectPicker } from '@/shared/ui/SelectPicker';
import { useMediaQuery } from '@/shared/lib/useMediaQuery';
import { useTheme } from '@/shared/hooks/useTheme';
import {
  ArrowLeftIcon,
  GlobeIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
  UserIcon,
} from '@/shared/ui/icons';

/**
 * Daraxt rasmining foni to'q yashil qatlam — mix-blend-lighten uni sahifa
 * gradientiga "eritadi", radial mask esa to'rtburchak chetlarni yumshatadi.
 * (LoginPage'dagi bilan bir xil — faqat desktop panelida ishlatiladi.)
 */
const treeMask =
  'radial-gradient(ellipse 60% 56% at 50% 47%, black 60%, transparent 92%)';

export function RegisterPage() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const {
    step,
    form,
    codeForm,
    submit,
    confirm,
    resend,
    resendCooldown,
    resent,
    backToForm,
    pendingEmail,
    serverError,
  } = useRegister();
  const {
    register,
    formState: { errors, isSubmitting },
  } = form;
  const {
    formState: { errors: codeErrors, isSubmitting: confirming },
  } = codeForm;

  // Mobil va desktop bloklari BIR XIL react-hook-form maydon nomlariga
  // bog'langan alohida <input>lardan iborat. Ikkalasi ham bir vaqtda DOM'da
  // mavjud bo'lsa, RHF faqat OXIRGI mount bo'lgan inputning ref'ini kuzatadi
  // — natijada ko'rinayotgan (lekin "kuzatilmayotgan") inputga yozilgan
  // qiymatlar forma holatiga tushmay qoladi. Shu sababli faqat BITTASI
  // haqiqatda mount qilinadi (CSS emas, JS orqali) — mobil JSX/UI o'zi
  // O'ZGARTIRILMAGAN, faqat qachon mount bo'lishi shu shart bilan boshqariladi.
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { theme } = useTheme();
  const dark = theme === 'dark';

  if (isDesktop) {
    return (
      <div
        data-testid="register-desktop"
        className="flex h-dvh"
        style={dark ? { background: "url('/loginbgdark.png') center / cover no-repeat" } : undefined}
      >
        <div
          className={`flex w-[43%] shrink-0 flex-col items-center justify-center gap-3 p-10 text-center ${
            dark ? '' : 'bg-gradient-to-b from-brand-800 via-brand-900 to-brand-950'
          }`}
        >
          <img
            src="/shajaratree.png"
            alt="Shajara daraxti"
            draggable={false}
            className="max-h-[280px] w-auto select-none object-contain mix-blend-lighten"
            style={{ maskImage: treeMask, WebkitMaskImage: treeMask }}
          />
          <h1 className="mt-2 font-serif text-5xl font-semibold text-white">{t('auth.brand')}</h1>
          <p className={`text-sm leading-relaxed ${dark ? 'text-[#cfe0d2]' : 'text-brand-100'}`}>
            {t('auth.login.heroTaglineLine1')}
            <br />
            {t('auth.login.heroTaglineLine2')}
          </p>
        </div>

        {/* Glass/register.png namunasidagi kabi Dark rejimda karta suzuvchi
            (margin bilan), yumaloq burchakli, yarim shaffof to'q shisha
            panelga aylanadi — bgtree.png rasm o'rniga orqadagi
            loginbgdark.png ko'rinib turadi. Ichkaridagi Tailwind sinflari
            (TextField/SocialButtons: bg-white/border-neutral-200/
            text-brand-900) index.css'dagi GLOBAL Dark qoidalari orqali
            avtomatik moslashadi. */}
        <div
          className={`flex flex-1 flex-col overflow-y-auto px-16 py-8 ${
            dark ? 'm-8 ml-0 rounded-[28px] border border-white/15' : "bg-white bg-[url('/bgtree.png')] bg-cover bg-center bg-no-repeat"
          }`}
          style={
            dark
              ? {
                  backgroundColor: 'rgb(10 14 10 / 0.34)',
                  backdropFilter: 'blur(18px)',
                  WebkitBackdropFilter: 'blur(18px)',
                  boxShadow: '0 24px 60px rgb(0 0 0 / 0.5)',
                }
              : undefined
          }
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/registertree.png" alt="" draggable={false} className="h-7 w-7 shrink-0 select-none object-contain" />
              <span className="font-serif text-xl font-semibold text-brand-900">{t('auth.brand')}</span>
            </div>
            {/* Til tanlagichi endi bosilganda ochiladigan/tanlanadigan blok
                (SelectPicker) — avvalgi bitta tugmali "aylanuvchi" o'rniga. */}
            <SelectPicker
              value={language}
              onChange={(v) => setLanguage(v as SupportedLanguage)}
              label={LANGUAGE_NAMES[language]}
              icon={<GlobeIcon />}
              options={(['uz', 'ru', 'en'] as const).map((l) => ({ value: l, label: LANGUAGE_NAMES[l] }))}
            />
          </div>

          <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center py-6">
            {step === 'form' ? (
              <>
                <h2 className="font-serif text-[28px] font-semibold text-brand-900">
                  {t('auth.register.title')}
                </h2>
                <p className="mt-1 text-sm text-brand-600">
                  {t('auth.register.subtitle')}
                </p>

                <form onSubmit={submit} noValidate className="mt-5 space-y-3">
                  <TextField
                    icon={<UserIcon />}
                    autoComplete="name"
                    placeholder={t('auth.register.fullNamePlaceholder')}
                    error={errors.fullName?.message}
                    {...register('fullName')}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      icon={<PhoneIcon />}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder={t('auth.register.phonePlaceholder')}
                      error={errors.phone?.message}
                      {...register('phone')}
                    />
                    <TextField
                      icon={<MailIcon />}
                      type="email"
                      autoComplete="email"
                      placeholder={t('auth.register.emailPlaceholder')}
                      error={errors.email?.message}
                      {...register('email')}
                    />
                    <TextField
                      icon={<LockIcon />}
                      isPassword
                      autoComplete="new-password"
                      placeholder={t('auth.register.passwordPlaceholder')}
                      error={errors.password?.message}
                      {...register('password')}
                    />
                    <TextField
                      icon={<LockIcon />}
                      isPassword
                      autoComplete="new-password"
                      placeholder={t('auth.register.confirmPasswordPlaceholder')}
                      error={errors.confirmPassword?.message}
                      {...register('confirmPassword')}
                    />
                  </div>
                  <TextField
                    icon={<UserIcon />}
                    autoComplete="off"
                    placeholder={t('auth.register.shareCodePlaceholder')}
                    error={errors.shareCode?.message}
                    {...register('shareCode')}
                  />

                  <label className="flex cursor-pointer items-start gap-2.5 pt-0.5">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-md border border-neutral-300 bg-white transition-colors checked:border-brand-700 checked:bg-brand-700 checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%3E%3Cpath%20fill%3D%22none%22%20stroke%3D%22%23fff%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22m3.5%208.5%203%203%206-7%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat"
                      {...register('terms')}
                    />
                    <span className="text-[13px] leading-snug text-brand-900">
                      {t('auth.register.termsPrefix')}{' '}
                      <Link to="/terms" className="font-medium text-link hover:underline">
                        {t('auth.register.termsLink')}
                      </Link>{' '}
                      {t('auth.register.termsAnd')}{' '}
                      <Link to="/privacy" className="font-medium text-link hover:underline">
                        {t('auth.register.privacyLink')}
                      </Link>{' '}
                      {t('auth.register.termsSuffix')}
                    </span>
                  </label>
                  {errors.terms && <p className="px-1 text-xs text-red-500">{errors.terms.message}</p>}

                  {serverError && <Alert>{serverError}</Alert>}

                  <Button type="submit" loading={isSubmitting} className="!mt-4">
                    {t('auth.register.submit')}
                  </Button>
                </form>

                <div className="my-4 flex items-center gap-4">
                  <span className="h-px flex-1 bg-neutral-200" />
                  <span className="text-xs text-neutral-400">{t('auth.register.or')}</span>
                  <span className="h-px flex-1 bg-neutral-200" />
                </div>

                <SocialButtons />

                <p className="mt-4 text-center text-sm text-brand-900">
                  {t('auth.register.haveAccount')}{' '}
                  <Link to="/login" className="font-semibold text-link hover:underline">
                    {t('auth.register.loginLink')}
                  </Link>
                </p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={backToForm}
                  className="flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-900"
                >
                  <ArrowLeftIcon width={16} height={16} />
                  {t('auth.register.back')}
                </button>

                <h2 className="mt-2 font-serif text-[26px] font-semibold text-brand-900">
                  {t('auth.register.confirmEmailTitle')}
                </h2>
                <p className="mt-1.5 text-[13px] leading-snug text-brand-700">
                  {t('auth.register.confirmEmailDescPrefix')}{' '}<b>{pendingEmail}</b>{' '}{t('auth.register.confirmEmailDescSuffix')}
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
                      {t('auth.register.codeResent')}
                    </p>
                  )}

                  <Button type="submit" loading={confirming} className="!mt-3">
                    {t('auth.register.confirm')}
                  </Button>
                </form>

                <button
                  type="button"
                  onClick={() => void resend()}
                  disabled={resendCooldown > 0}
                  className="mt-3 w-full text-center text-sm font-medium text-link hover:underline disabled:cursor-not-allowed disabled:text-neutral-400 disabled:no-underline"
                >
                  {resendCooldown > 0
                    ? t('auth.register.resendWithCooldown', { seconds: resendCooldown })
                    : t('auth.register.resend')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="register-mobile"
      className="relative flex h-dvh flex-col overflow-hidden bg-[#F4F5EF] bg-cover bg-center"
      style={{ backgroundImage: dark ? "url('/loginbgdark.png')" : "url('/bgtree.png')" }}
    >
      {/* Yorug' xira qatlam FAQAT Soft/Light'da kerak (och rasmni
          "yumshatish" uchun) — Dark'da esa TESKARI ta'sir qilib (surat
          ustiga oq tuman tashlab) fotosuratni xiralashtirar edi, shu
          bois Dark'da butunlay olib tashlandi. */}
      {!dark && <div className="pointer-events-none absolute inset-0 bg-white/30" />}

      <div className="relative mx-auto flex h-full w-full max-w-md flex-col px-4 pb-3 pt-3 sm:max-w-lg">


        {/* Logo + sarlavha — logo flex-1 bilan qolgan joyga moslashadi */}
        <header className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
          <img
            src="/registertree.png"
            alt="Shajara logosi"
            draggable={false}
            // mix-blend-multiply: logoning oq foni och fonga "erib" ketadi
            // (FAQAT och fonda ishlaydi). Dark'da esa TESKARI — mix-blend-
            // lighten (LoginPage'dagi daraxt surati bilan bir xil mantiq),
            // aks holda logo to'q fonda butunlay yo'qolib qolardi.
            className={`min-h-0 w-auto flex-1 select-none object-contain [max-height:9.5rem] ${dark ? 'mix-blend-lighten' : 'mix-blend-multiply'}`}
          />
          <h1 className={`font-serif text-3xl font-semibold sm:text-4xl ${dark ? 'text-white' : 'text-brand-800'}`}>{t('auth.brand')}</h1>
          <p className={`mt-1 text-[13px] leading-snug ${dark ? 'text-[#cfe0d2]' : 'text-brand-700'}`}>
            {t('auth.register.mobileSubtitle')}
          </p>
        </header>

        {/* Forma kartasi — balandligi qat'iy, hech qachon ekrandan oshmaydi */}
        <main className="w-full shrink-0 rounded-[22px] bg-white/95 p-4 shadow-card backdrop-blur-sm sm:p-5">
          {step === 'form' ? (
            <>
              <h2 className="text-center font-serif text-[22px] font-semibold text-brand-900">
                {t('auth.register.title')}
              </h2>

              <form onSubmit={submit} noValidate className="mt-3 space-y-2.5">
                <TextField
                  icon={<UserIcon />}
                  autoComplete="name"
                  placeholder={t('auth.register.fullNamePlaceholder')}
                  error={errors.fullName?.message}
                  {...register('fullName')}
                />
                <TextField
                  icon={<PhoneIcon />}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder={t('auth.register.phonePlaceholder')}
                  error={errors.phone?.message}
                  {...register('phone')}
                />
                <TextField
                  icon={<MailIcon />}
                  type="email"
                  autoComplete="email"
                  placeholder={t('auth.register.emailPlaceholder')}
                  error={errors.email?.message}
                  {...register('email')}
                />
                <TextField
                  icon={<LockIcon />}
                  isPassword
                  autoComplete="new-password"
                  placeholder={t('auth.register.passwordPlaceholder')}
                  error={errors.password?.message}
                  {...register('password')}
                />
                <TextField
                  icon={<LockIcon />}
                  isPassword
                  autoComplete="new-password"
                  placeholder={t('auth.register.confirmPasswordPlaceholder')}
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />
                <TextField
                  icon={<UserIcon />}
                  autoComplete="off"
                  placeholder={t('auth.register.shareCodePlaceholder')}
                  error={errors.shareCode?.message}
                  {...register('shareCode')}
                />

                {/* Shartlar checkbox */}
                <label className="flex cursor-pointer items-start gap-2.5 pt-0.5">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-md border border-neutral-300 bg-white transition-colors checked:border-brand-700 checked:bg-brand-700 checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%3E%3Cpath%20fill%3D%22none%22%20stroke%3D%22%23fff%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22m3.5%208.5%203%203%206-7%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat"
                    {...register('terms')}
                  />
                  <span className="text-[12px] leading-snug text-brand-900">
                    {t('auth.register.termsPrefix')}{' '}
                    <Link to="/terms" className="font-medium text-link hover:underline">
                      {t('auth.register.termsLink')}
                    </Link>{' '}
                    {t('auth.register.termsAnd')}{' '}
                    <Link to="/privacy" className="font-medium text-link hover:underline">
                      {t('auth.register.privacyLink')}
                    </Link>{' '}
                    {t('auth.register.termsSuffix')}
                  </span>
                </label>
                {errors.terms && <p className="px-1 text-xs text-red-500">{errors.terms.message}</p>}

                {serverError && <Alert>{serverError}</Alert>}

                <Button type="submit" loading={isSubmitting} className="!mt-3">
                  {t('auth.register.submit')}
                </Button>
              </form>

              {/* yoki — Google orqali ro'yxatdan o'tish */}
              <div className="my-2 flex items-center gap-4">
                <span className="h-px flex-1 bg-neutral-200" />
                <span className="text-xs text-neutral-400">{t('auth.register.or')}</span>
                <span className="h-px flex-1 bg-neutral-200" />
              </div>

              <SocialButtons dense />

              <p className="mt-2.5 text-center text-sm text-brand-900">
                {t('auth.register.haveAccount')}{' '}
                <Link to="/login" className="font-semibold text-link hover:underline">
                  {t('auth.register.loginLink')}
                </Link>
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={backToForm}
                className="flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-900"
              >
                <ArrowLeftIcon width={16} height={16} />
                {t('auth.register.back')}
              </button>

              <h2 className="mt-2 text-center font-serif text-[22px] font-semibold text-brand-900">
                {t('auth.register.confirmEmailTitle')}
              </h2>
              <p className="mt-1.5 text-center text-[13px] leading-snug text-brand-700">
                {t('auth.register.confirmEmailDescPrefix')}{' '}<b>{pendingEmail}</b>{' '}{t('auth.register.confirmEmailDescSuffix')}
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
                    {t('auth.register.codeResent')}
                  </p>
                )}

                <Button type="submit" loading={confirming} className="!mt-3">
                  {t('auth.register.confirm')}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => void resend()}
                disabled={resendCooldown > 0}
                className="mt-3 w-full text-center text-sm font-medium text-link hover:underline disabled:cursor-not-allowed disabled:text-neutral-400 disabled:no-underline"
              >
                {resendCooldown > 0
                  ? t('auth.register.resendWithCooldown', { seconds: resendCooldown })
                  : t('auth.register.resend')}
              </button>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
