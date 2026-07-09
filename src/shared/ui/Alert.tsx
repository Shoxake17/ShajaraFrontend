// shared/ui/Alert.tsx
import type { ReactNode } from 'react';

/** Forma xatolari uchun yagona alert komponenti (Login, Register va boshqalar). */
export function Alert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-field bg-red-50 px-4 py-3 text-sm text-red-600">
      {children}
    </p>
  );
}
