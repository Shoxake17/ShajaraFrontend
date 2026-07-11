// app/AppLayout.tsx
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { useSessionLiveness } from '@/features/auth/hooks/useSessionLiveness';

export function AppLayout() {
  // Boshqa qurilmadan "Yakunlash" bosilsa — shu tabni ham tezda chiqarib yuboradi
  useSessionLiveness();

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-brand-50 lg:flex-row">
      <Sidebar />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
