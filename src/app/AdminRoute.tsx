// app/AdminRoute.tsx
// Admin panel marshruti — ProtectedRoute ICHIDA joylashadi (sessiya
// allaqachon tekshirilgan bo'ladi), shu bois faqat isAdmin bayrog'ini
// tekshiradi. HAQIQIY ruxsat baribir server tomonda (AdminGuard, har
// so'rovda bazadan) tasdiqlanadi — bu yerdagi tekshiruv faqat UI
// yo'naltirish (IDOR himoyasi emas, backend allaqachon himoyalangan).
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/features/auth';

export function AdminRoute() {
  const isAdmin = useAuthStore((s) => s.user?.isAdmin ?? false);
  return isAdmin ? <Outlet /> : <Navigate to="/doska" replace />;
}
