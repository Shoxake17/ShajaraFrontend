// src/features/landing/pages/LandingPage.tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/model/auth.store';
import { Navbar } from '@/features/landing/components/Navbar';
import { LandingMain } from '@/features/landing/components/LandingMain';
import { Features } from '@/features/landing/components/Features';
import { Stats } from '@/features/landing/components/Stats';
import { AppPromo } from '@/features/landing/components/AppPromo';
import { LandingFooter } from '@/features/landing/components/LandingFooter';

export function LandingPage() {
  const user = useAuthStore((s) => s.user);
  if (user) return <Navigate to="/doska" replace />;

  return (
    <div>
      <Navbar />
      <LandingMain />
      <Features />
      <Stats />
      <AppPromo />
      <LandingFooter />
    </div>
  );
}
