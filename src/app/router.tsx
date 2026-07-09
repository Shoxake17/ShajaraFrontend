import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/app/ProtectedRoute';
import { AppLayout } from '@/app/AppLayout';

// Code splitting: har sahifa alohida chunk — birinchi yuklash tezroq
const LandingPage = lazy(() =>
  import('@/features/landing/pages/LandingPage').then((m) => ({ default: m.LandingPage })),
);
const LoginPage = lazy(() =>
  import('@/features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('@/features/auth/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('@/features/auth/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
);
const TreeBoardPage = lazy(() =>
  import('@/features/tree/pages/TreeBoardPage').then((m) => ({ default: m.TreeBoardPage })),
);
const FamilyMembersPage = lazy(() =>
  import('@/features/tree/pages/FamilyMembersPage').then((m) => ({ default: m.FamilyMembersPage })),
);
const MediaGalleryPage = lazy(() =>
  import('@/features/media/pages/MediaGalleryPage').then((m) => ({ default: m.MediaGalleryPage })),
);
const ShajaraAiPage = lazy(() =>
  import('@/features/ai/pages/ShajaraAiPage').then((m) => ({ default: m.ShajaraAiPage })),
);
const SettingsPage = lazy(() =>
  import('@/features/settings/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

function withSuspense(page: React.ReactNode) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-brand-50">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
        </div>
      }
    >
      {page}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  { path: '/', element: withSuspense(<LandingPage />) },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/doska', element: withSuspense(<TreeBoardPage />) },
          { path: '/oila', element: withSuspense(<FamilyMembersPage />) },
          { path: '/media', element: withSuspense(<MediaGalleryPage />) },
          { path: '/ai', element: withSuspense(<ShajaraAiPage />) },
          { path: '/sozlamalar', element: withSuspense(<SettingsPage />) },
        ],
      },
    ],
  },
  { path: '/login', element: withSuspense(<LoginPage />) },
  { path: '/register', element: withSuspense(<RegisterPage />) },
  { path: '/forgot-password', element: withSuspense(<ForgotPasswordPage />) },
  { path: '*', element: <Navigate to="/login" replace /> },
]);
