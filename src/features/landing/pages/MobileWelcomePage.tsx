// src/features/landing/pages/MobileWelcomePage.tsx
// Faqat NATIV ilova (Capacitor — Android/iOS) ochilganda "/" da ko'rinadigan
// kirish sahifasi (public/page.png maketiga mos: to'q yashil fon, aylana
// ichidagi daraxt logotipi, "Shajara" nomi, "Kirish"/"Ro'yxatdan o'tish"
// tugmalari). Veb-brauzerda esa "/" da odatdagi LandingPage ko'rinadi —
// tanlov router.tsx'da Capacitor.isNativePlatform() orqali qilinadi.
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TreeLogo } from '@/shared/ui/TreeLogo';
import { useAuthStore } from '@/features/auth/model/auth.store';

export function MobileWelcomePage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  if (user) return <Navigate to="/doska" replace />;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-between bg-brand-900 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]">
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <span className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-brand-300/60 text-brand-200">
          <TreeLogo className="h-14 w-14" />
        </span>
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
