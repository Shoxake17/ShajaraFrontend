// app/ThemeBackground.tsx
// "Light" (shisha) ko'rinish rejimida butun ekranni qopligan tabiat
// surati — desktop.png (lg+) yoki mobile.png (kichik ekran). Boshqa
// rejimlarda (soft/dark) umuman render qilinmaydi. AppLayout root
// konteynerining ENG BOSHIDA, -z-10 bilan joylashtiriladi — barcha
// sahifa kontenti (index.css'dagi [data-theme="light"] override
// qoidalari orqali shaffoflashtirilgan panellar) ustidan ko'rinadi.
import { useTheme } from '@/shared/hooks/useTheme';

export function ThemeBackground() {
  const { theme } = useTheme();
  if (theme !== 'light') return null;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
      <div className="h-full w-full bg-[url(/mobile.png)] bg-cover bg-center lg:hidden" />
      <div className="hidden h-full w-full bg-[url(/desktop.png)] bg-cover bg-center lg:block" />
    </div>
  );
}
