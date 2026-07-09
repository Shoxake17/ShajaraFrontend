// src/features/auth/pages/RegisterPage.tsx
// Faqat UI — butun logika useRegister() hook'ida. Ikki bosqich: forma (1) va
// emailga yuborilgan 6 xonali kodni tasdiqlash (2).
import { Link } from 'react-router-dom';
import { Controller } from 'react-hook-form';
import { useRegister } from '@/features/auth/hooks/useRegister';
import { SocialButtons } from '@/features/auth/components/SocialButtons';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { Alert } from '@/shared/ui/Alert';
import { SegmentedCodeInput } from '@/shared/ui/SegmentedCodeInput';
import { TreeLogo } from '@/shared/ui/TreeLogo';
import { useMediaQuery } from '@/shared/lib/useMediaQuery';
import {
  ArrowLeftIcon,
  ChevronDownIcon,
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

  if (isDesktop) {
    return (
      <div data-testid="register-desktop" className="flex h-dvh">
        <div className="flex w-[43%] shrink-0 flex-col items-center justify-center gap-3 bg-gradient-to-b from-brand-800 via-brand-900 to-brand-950 p-10 text-center">
          <img
            src="/shajaratree.png"
            alt="Shajara daraxti"
            draggable={false}
            className="max-h-[280px] w-auto select-none object-contain mix-blend-lighten"
            style={{ maskImage: treeMask, WebkitMaskImage: treeMask }}
          />
          <h1 className="mt-2 font-serif text-5xl font-semibold text-white">Shajara</h1>
          <p className="text-sm leading-relaxed text-brand-100">
            Oila daraxtingizni yarating
            <br />
            va avlodlaringizni bog&#8216;lang
          </p>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto bg-white bg-[url('/bgtree.png')] bg-cover bg-center bg-no-repeat px-16 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TreeLogo className="h-7 w-7 text-brand-800" />
              <span className="font-serif text-xl font-semibold text-brand-900">Shajara</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-brand-700">
              <GlobeIcon />
              O&#8216;zbekcha
              <ChevronDownIcon />
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center py-6">
            {step === 'form' ? (
              <>
                <h2 className="font-serif text-[28px] font-semibold text-brand-900">
                  Ro&#8216;yxatdan o&#8216;tish
                </h2>
                <p className="mt-1 text-sm text-brand-600">
                  Yangi hisob yaratish uchun ma&#8216;lumotlaringizni kiriting
                </p>

                <form onSubmit={submit} noValidate className="mt-5 space-y-3">
                  <TextField
                    icon={<UserIcon />}
                    autoComplete="name"
                    placeholder="Ism familiya"
                    error={errors.fullName?.message}
                    {...register('fullName')}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      icon={<PhoneIcon />}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+998 90 123 45 67"
                      error={errors.phone?.message}
                      {...register('phone')}
                    />
                    <TextField
                      icon={<MailIcon />}
                      type="email"
                      autoComplete="email"
                      placeholder="Email manzil"
                      error={errors.email?.message}
                      {...register('email')}
                    />
                    <TextField
                      icon={<LockIcon />}
                      isPassword
                      autoComplete="new-password"
                      placeholder="Parol"
                      error={errors.password?.message}
                      {...register('password')}
                    />
                    <TextField
                      icon={<LockIcon />}
                      isPassword
                      autoComplete="new-password"
                      placeholder="Parolni tasdiqlang"
                      error={errors.confirmPassword?.message}
                      {...register('confirmPassword')}
                    />
                  </div>
                  <TextField
                    icon={<UserIcon />}
                    autoComplete="off"
                    placeholder="Ulashish kodi (ixtiyoriy)"
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
                      Men{' '}
                      <Link to="/terms" className="font-medium text-link hover:underline">
                        foydalanuvchi shartlari
                      </Link>{' '}
                      va{' '}
                      <Link to="/privacy" className="font-medium text-link hover:underline">
                        maxfiylik siyosati
                      </Link>{' '}
                      bilan tanishib chiqdim va roziman
                    </span>
                  </label>
                  {errors.terms && <p className="px-1 text-xs text-red-500">{errors.terms.message}</p>}

                  {serverError && <Alert>{serverError}</Alert>}

                  <Button type="submit" loading={isSubmitting} className="!mt-4">
                    Ro&#8216;yxatdan o&#8216;tish
                  </Button>
                </form>

                <div className="my-4 flex items-center gap-4">
                  <span className="h-px flex-1 bg-neutral-200" />
                  <span className="text-xs text-neutral-400">yoki</span>
                  <span className="h-px flex-1 bg-neutral-200" />
                </div>

                <SocialButtons />

                <p className="mt-4 text-center text-sm text-brand-900">
                  Hisobingiz bormi?{' '}
                  <Link to="/login" className="font-semibold text-link hover:underline">
                    Kirish
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
                  Orqaga
                </button>

                <h2 className="mt-2 font-serif text-[26px] font-semibold text-brand-900">
                  Emailni tasdiqlang
                </h2>
                <p className="mt-1.5 text-[13px] leading-snug text-brand-700">
                  <b>{pendingEmail}</b> manziliga 6 xonali tasdiqlash kodi yubordik. Kodni pastga
                  kiriting — hisobingiz shundan keyin yaratiladi.
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

                  <Button type="submit" loading={confirming} className="!mt-3">
                    Tasdiqlash
                  </Button>
                </form>

                <button
                  type="button"
                  onClick={() => void resend()}
                  disabled={resendCooldown > 0}
                  className="mt-3 w-full text-center text-sm font-medium text-link hover:underline disabled:cursor-not-allowed disabled:text-neutral-400 disabled:no-underline"
                >
                  {resendCooldown > 0
                    ? `Qayta yuborish (${resendCooldown}s)`
                    : "Kodni qayta yuborish"}
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
      style={{ backgroundImage: "url('/bgtree.png')" }}
    >
      <div className="pointer-events-none absolute inset-0 bg-white/30" />

      <div className="relative mx-auto flex h-full w-full max-w-md flex-col px-4 pb-3 pt-3 sm:max-w-lg">


        {/* Logo + sarlavha — logo flex-1 bilan qolgan joyga moslashadi */}
        <header className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
          <img
            src="/registertree.png"
            alt="Shajara logosi"
            draggable={false}
            // mix-blend-multiply: logoning oq foni och fonga "erib" ketadi
            className="min-h-0 w-auto flex-1 select-none object-contain mix-blend-multiply [max-height:9.5rem]"
          />
          <h1 className="font-serif text-3xl font-semibold text-brand-800 sm:text-4xl">Shajara</h1>
          <p className="mt-1 text-[13px] leading-snug text-brand-700">
            Yangi hisob yarating va oila daraxtingizni boshlang
          </p>
        </header>

        {/* Forma kartasi — balandligi qat'iy, hech qachon ekrandan oshmaydi */}
        <main className="w-full shrink-0 rounded-[22px] bg-white/95 p-4 shadow-card backdrop-blur-sm sm:p-5">
          {step === 'form' ? (
            <>
              <h2 className="text-center font-serif text-[22px] font-semibold text-brand-900">
                Ro&#8216;yxatdan o&#8216;tish
              </h2>

              <form onSubmit={submit} noValidate className="mt-3 space-y-2.5">
                <TextField
                  icon={<UserIcon />}
                  autoComplete="name"
                  placeholder="Ism familiya"
                  error={errors.fullName?.message}
                  {...register('fullName')}
                />
                <TextField
                  icon={<PhoneIcon />}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+998 90 123 45 67"
                  error={errors.phone?.message}
                  {...register('phone')}
                />
                <TextField
                  icon={<MailIcon />}
                  type="email"
                  autoComplete="email"
                  placeholder="Email manzil"
                  error={errors.email?.message}
                  {...register('email')}
                />
                <TextField
                  icon={<LockIcon />}
                  isPassword
                  autoComplete="new-password"
                  placeholder="Parol"
                  error={errors.password?.message}
                  {...register('password')}
                />
                <TextField
                  icon={<LockIcon />}
                  isPassword
                  autoComplete="new-password"
                  placeholder="Parolni tasdiqlang"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />
                <TextField
                  icon={<UserIcon />}
                  autoComplete="off"
                  placeholder="Ulashish kodi (ixtiyoriy)"
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
                    Men{' '}
                    <Link to="/terms" className="font-medium text-link hover:underline">
                      foydalanuvchi shartlari
                    </Link>{' '}
                    va{' '}
                    <Link to="/privacy" className="font-medium text-link hover:underline">
                      maxfiylik siyosati
                    </Link>{' '}
                    bilan tanishib chiqdim va roziman
                  </span>
                </label>
                {errors.terms && <p className="px-1 text-xs text-red-500">{errors.terms.message}</p>}

                {serverError && <Alert>{serverError}</Alert>}

                <Button type="submit" loading={isSubmitting} className="!mt-3">
                  Ro&#8216;yxatdan o&#8216;tish
                </Button>
              </form>

              {/* yoki — Google orqali ro'yxatdan o'tish */}
              <div className="my-2 flex items-center gap-4">
                <span className="h-px flex-1 bg-neutral-200" />
                <span className="text-xs text-neutral-400">yoki</span>
                <span className="h-px flex-1 bg-neutral-200" />
              </div>

              <SocialButtons dense />

              <p className="mt-2.5 text-center text-sm text-brand-900">
                Hisobingiz bormi?{' '}
                <Link to="/login" className="font-semibold text-link hover:underline">
                  Kirish
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
                Orqaga
              </button>

              <h2 className="mt-2 text-center font-serif text-[22px] font-semibold text-brand-900">
                Emailni tasdiqlang
              </h2>
              <p className="mt-1.5 text-center text-[13px] leading-snug text-brand-700">
                <b>{pendingEmail}</b> manziliga 6 xonali tasdiqlash kodi yubordik. Kodni pastga
                kiriting — hisobingiz shundan keyin yaratiladi.
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

                <Button type="submit" loading={confirming} className="!mt-3">
                  Tasdiqlash
                </Button>
              </form>

              <button
                type="button"
                onClick={() => void resend()}
                disabled={resendCooldown > 0}
                className="mt-3 w-full text-center text-sm font-medium text-link hover:underline disabled:cursor-not-allowed disabled:text-neutral-400 disabled:no-underline"
              >
                {resendCooldown > 0
                  ? `Qayta yuborish (${resendCooldown}s)`
                  : "Kodni qayta yuborish"}
              </button>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
