// src/features/landing/pages/MobileWelcomePage.tsx
// Faqat NATIV ilova (Capacitor — Android/iOS) ochilganda "/" da ko'rinadigan
// kirish sahifasi (public/page.png maketiga mos: public/pagebg.png orqa foni,
// public/shajaratree.png daraxt rasmi, "Shajara" nomi, "Kirish"/"Ro'yxatdan
// o'tish" tugmalari). Veb-brauzerda esa "/" da odatdagi LandingPage
// ko'rinadi — tanlov router.tsx'da Capacitor.isNativePlatform() orqali
// qilinadi. Daraxt rasmini fonga "eritish" LoginPage'dagi bilan bir xil
// usul (mix-blend-mode + radial mask) — chetlari to'satdan kesilib
// qolmaydi, orqa fonga tabiiy singib ketadi.
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth/model/auth.store';

const treeMask =
  'radial-gradient(ellipse 60% 56% at 50% 47%, black 60%, transparent 92%)';

export function MobileWelcomePage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  if (user) return <Navigate to="/doska" replace />;

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-between bg-brand-900 bg-cover bg-center px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]"
      style={{ backgroundImage: "url('/pagebg.png')" }}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-2">
        <img
          src="/shajaratree.png"
          alt={t('auth.brand')}
          draggable={false}
          className="h-56 w-56 object-contain"
          style={{ mixBlendMode: 'lighten', maskImage: treeMask, WebkitMaskImage: treeMask }}
        />
        <h1 className="font-serif text-4xl font-semibold text-brand-50">{t('auth.brand')}</h1>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <Link
          to="/login"
          className="flex w-full items-center justify-center rounded-field bg-brand-600 py-4 text-[16px] font-semibold text-white shadow-card transition-colors hover:bg-brand-500"
        >
          {t('auth.login.submit')}
        </Link>
        <Link
          to="/register"
          className="flex w-full items-center justify-center rounded-field border border-brand-400/50 bg-white/5 py-4 text-[16px] font-semibold text-brand-50 transition-colors hover:bg-white/10"
        >
          {t('auth.register.submit')}
        </Link>
      </div>
    </div>
  );
}
