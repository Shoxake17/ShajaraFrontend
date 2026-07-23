import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { isElectron } from '@/shared/lib/electron';
import { ProtectedRoute } from '@/app/ProtectedRoute';
import { AdminRoute } from '@/app/AdminRoute';
import { NonAdminRoute } from '@/app/NonAdminRoute';
import { AppLayout } from '@/app/AppLayout';

// Code splitting: har sahifa alohida chunk — birinchi yuklash tezroq
const LandingPage = lazy(() =>
  import('@/features/landing/pages/LandingPage').then((m) => ({ default: m.LandingPage })),
);
// Faqat nativ ilovada (Capacitor — Android/iOS) "/" da ko'rinadi, veb'da
// hech qachon yuklanmaydi (lazy chunk sifatida alohida).
const MobileWelcomePage = lazy(() =>
  import('@/features/landing/pages/MobileWelcomePage').then((m) => ({ default: m.MobileWelcomePage })),
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
const TelegramCallbackPage = lazy(() =>
  import('@/features/auth/pages/TelegramCallbackPage').then((m) => ({ default: m.TelegramCallbackPage })),
);
const TermsPage = lazy(() =>
  import('@/features/legal/pages/TermsPage').then((m) => ({ default: m.TermsPage })),
);
const PrivacyPage = lazy(() =>
  import('@/features/legal/pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
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
const MessagesPage = lazy(() =>
  import('@/features/chat/pages/MessagesPage').then((m) => ({ default: m.MessagesPage })),
);
// const ShajaraAiPage = lazy(() =>
//   import('@/features/ai/pages/ShajaraAiPage').then((m) => ({ default: m.ShajaraAiPage })),
// );
const SettingsPage = lazy(() =>
  import('@/features/settings/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const AdminUsersPage = lazy(() =>
  import('@/features/admin/pages/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })),
);
const AdminUserTreePage = lazy(() =>
  import('@/features/admin/pages/AdminUserTreePage').then((m) => ({ default: m.AdminUserTreePage })),
);
const AdminSupportPage = lazy(() =>
  import('@/features/admin/pages/AdminSupportPage').then((m) => ({ default: m.AdminSupportPage })),
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

// Nativ ilova (Capacitor bilan o'ralgan Android/iOS) YOKI Electron
// (Windows desktop) ochilganda "/" da MobileWelcomePage (Kirish/Ro'yxatdan
// o'tish tanlovi) ko'rinadi; veb-brauzerda esa odatdagi marketing
// LandingPage'i o'zgarishsiz qoladi.
const RootPage = Capacitor.isNativePlatform() || isElectron() ? MobileWelcomePage : LandingPage;

export const router = createBrowserRouter([
  { path: '/', element: withSuspense(<RootPage />) },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            element: <NonAdminRoute />,
            children: [
              { path: '/doska', element: withSuspense(<TreeBoardPage />) },
              { path: '/oila', element: withSuspense(<FamilyMembersPage />) },
              { path: '/media', element: withSuspense(<MediaGalleryPage />) },
            ],
          },
          { path: '/xabarlar', element: withSuspense(<MessagesPage />) },
          // { path: '/ai', element: withSuspense(<ShajaraAiPage />) },
          { path: '/sozlamalar', element: withSuspense(<SettingsPage />) },
          {
            element: <AdminRoute />,
            children: [
              { path: '/admin', element: withSuspense(<AdminUsersPage />) },
              { path: '/admin/qollab-quvvatlash', element: withSuspense(<AdminSupportPage />) },
              { path: '/admin/users/:userId', element: withSuspense(<AdminUserTreePage mode="owner" />) },
              { path: '/admin/viewers/:userId', element: withSuspense(<AdminUserTreePage mode="viewer" />) },
            ],
          },
        ],
      },
    ],
  },
  { path: '/login', element: withSuspense(<LoginPage />) },
  { path: '/register', element: withSuspense(<RegisterPage />) },
  { path: '/forgot-password', element: withSuspense(<ForgotPasswordPage />) },
  { path: '/telegram-callback', element: withSuspense(<TelegramCallbackPage />) },
  { path: '/terms', element: withSuspense(<TermsPage />) },
  { path: '/privacy', element: withSuspense(<PrivacyPage />) },
  { path: '*', element: <Navigate to="/login" replace /> },
]);
