// features/auth/model/auth.store.ts
// XAVFSIZLIK: hech narsa localStorage'ga yozilmaydi.
// Butun sessiya faqat xotirada; sahifa yangilanganda httpOnly cookie
// orqali serverdan qayta tiklanadi (useBootstrapSession).
import { create } from 'zustand';
import { Capacitor } from '@capacitor/core';
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

// Android'da qo'ng'iroq (calls) WebView'dan mustaqil native kod orqali
// ishlaydi (AjdoFirebaseMessagingService, CallActivity — JS/WebView
// ishga tushmagan holatda ham) — shu bois joriy access-token native
// xavfsiz saqlashga (AuthTokenBridge.kt) ham sinxronlanadi. Veb'da
// hech narsa qilmaydi (Capacitor.isNativePlatform() === false).
function syncNative(user: AuthUser | null, accessToken: string | null): void {
  if (!Capacitor.isNativePlatform()) return;
  void import('@/features/chat/lib/native-call').then(({ syncNativeAuthToken, clearNativeAuthToken }) => {
    if (user && accessToken) void syncNativeAuthToken(accessToken, user.id);
    else void clearNativeAuthToken();
  });
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  accessToken: null,
  initialized: false,
  setAccessToken: (accessToken) => {
    set({ accessToken });
    syncNative(get().user, accessToken);
  },
  setSession: (user, accessToken) => {
    set({ user, accessToken });
    syncNative(user, accessToken);
  },
  setUser: (user) => {
    set({ user });
    syncNative(user, get().accessToken);
  },
  setInitialized: () => set({ initialized: true }),
  logout: () => {
    set({ user: null, accessToken: null });
    syncNative(null, null);
  },
}));
