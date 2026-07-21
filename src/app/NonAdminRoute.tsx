// app/NonAdminRoute.tsx
// Admin hisobiga (isAdmin=true) tegishli EMAS sahifalar (Doska/Oila
// a'zolarim/Media galereya) — admin bu marshrutlarga to'g'ridan-to'g'ri
// URL orqali kirmoqchi bo'lsa ham /admin'ga yo'naltiriladi. HAQIQIY ma'lumot
// himoyasi baribir backend'da (FamilyController/MediaController — admin
// akkauntida ham o'z bo'sh daraxti bo'ladi, boshqa hech kimning
// ma'lumotiga tegmaydi) — bu yerdagi tekshiruv faqat UI/mahsulot qarori
// (admin panel faqat boshqaruv uchun, oddiy foydalanuvchi funksiyalari
// unga tegishli emas).
//
// MUHIM: react-router'da <Outlet context> avtomatik pastga o'tmaydi — shu
// bois AppLayout'ning konteksti bu yerda useOutletContext() bilan olinib
// qayta <Outlet context={...}> orqali uzatiladi (AdminRoute'dagi bilan
// bir xil naqsh/bug tuzatish).
import { Navigate, Outlet, useOutletContext } from 'react-router-dom';
import { useAuthStore } from '@/features/auth';
import type { AppLayoutContext } from './AppLayout';

export function NonAdminRoute() {
  const isAdmin = useAuthStore((s) => s.user?.isAdmin ?? false);
  const layoutContext = useOutletContext<AppLayoutContext>();
  if (isAdmin) return <Navigate to="/admin" replace />;
  return <Outlet context={layoutContext} />;
}
