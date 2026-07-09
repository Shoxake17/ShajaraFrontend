// shared/ui/PageShell.tsx
// Sidebar ichidagi sahifalar uchun umumiy qobiq: sarlavha + scroll qilinadigan tana.
import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  /** Sarlavha o'ng tomonidagi harakat tugmalari */
  actions?: ReactNode;
  children: ReactNode;
}

export function PageShell({ title, subtitle, actions, children }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-brand-100 bg-white px-5 py-3.5">
        <div className="min-w-0">
          <h1 className="truncate font-serif text-lg font-semibold text-brand-900">{title}</h1>
          {subtitle && <p className="truncate text-xs text-brand-500">{subtitle}</p>}
        </div>
        {actions}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
    </div>
  );
}
