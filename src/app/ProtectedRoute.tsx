// app/ProtectedRoute.tsx
// Himoyalangan marshrut: sessiya bo'lmasa /login ga yo'naltiradi.
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/features/auth';

export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
