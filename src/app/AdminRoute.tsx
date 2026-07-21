// app/AdminRoute.tsx
// Admin panel marshruti — ProtectedRoute VA AppLayout ICHIDA joylashadi
// (sessiya allaqachon tekshirilgan, umumiy qatlam allaqachon render
// qilingan bo'ladi), shu bois faqat isAdmin bayrog'ini tekshiradi. HAQIQIY
// ruxsat baribir server tomonda (AdminGuard, har so'rovda bazadan)
// tasdiqlanadi — bu yerdagi tekshiruv faqat UI yo'naltirish.
//
// MUHIM: react-router'da <Outlet context> avtomatik "oqib o'tmaydi" — har
// bir oraliq <Outlet> uni ANIQ qayta uzatishi kerak. AppLayout o'z
// <Outlet context={...}> orqali topBarActionsEl va h.k.ni beradi; agar
// bu yerda useOutletContext() bilan olib qayta uzatilmasa, ICHKI sahifalar
// (AdminUsersPage/AdminUserTreePage) useOutletContext() chaqirganda
// undefined olib, "Cannot destructure..." xatosi bilan yiqilardi (bug —
// endi tuzatildi).
import { Navigate, Outlet, useOutletContext } from 'react-router-dom';
import { useAuthStore } from '@/features/auth';
import type { AppLayoutContext } from './AppLayout';

export function AdminRoute() {
  const isAdmin = useAuthStore((s) => s.user?.isAdmin ?? false);
  const layoutContext = useOutletContext<AppLayoutContext>();
  if (!isAdmin) return <Navigate to="/doska" replace />;
  return <Outlet context={layoutContext} />;
}
