// features/auth/model/auth.store.ts
// XAVFSIZLIK: hech narsa localStorage'ga yozilmaydi.
// Butun sessiya faqat xotirada; sahifa yangilanganda httpOnly cookie
// orqali serverdan qayta tiklanadi (useBootstrapSession).
import { create } from 'zustand';
import type { AuthUser } from '@/features/auth/types';

interface AuthState {
  user: AuthUser | null;
  /** Access token faqat xotirada (XSS o'g'irlay olmaydi); refresh — httpOnly cookie. */
  accessToken: string | null;
  /** Sessiya serverdan tiklab bo'lindimi (ilova shu holatni kutadi) */
  initialized: boolean;
  setAccessToken: (token: string | null) => void;
  setSession: (user: AuthUser, accessToken: string) => void;
  setUser: (user: AuthUser) => void;
  setInitialized: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  initialized: false,
  setAccessToken: (accessToken) => set({ accessToken }),
  setSession: (user, accessToken) => set({ user, accessToken }),
  setUser: (user) => set({ user }),
  setInitialized: () => set({ initialized: true }),
  logout: () => set({ user: null, accessToken: null }),
}));
