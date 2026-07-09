import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
import { useBootstrapSession } from '@/features/auth/hooks/useBootstrapSession';

export function App() {
  // Sessiya serverdan tiklanmaguncha router ko'rsatilmaydi —
  // aks holda himoyalangan sahifa bir lahza /login ga sakrab yuborardi.
  const initialized = useBootstrapSession();

  if (!initialized) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-brand-50">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
      </div>
    );
  }

  return <RouterProvider router={router} />;
}
