// shared/lib/electron.ts
// Ilova Electron (Windows desktop) ichida ishlayaptimi — preload.js
// contextBridge orqali window.electronAPI'ni yozib qo'yadi
// (Capacitor.isNativePlatform() bilan bir xil maqsadda ishlatiladi).
export type DesktopUpdateCheckResult =
  | { status: 'available'; version: string }
  | { status: 'not-available' }
  | { status: 'error'; message: string };

interface ElectronAPI {
  isElectron: true;
  signInWithGoogle: (clientId: string) => Promise<{ idToken: string }>;
  checkForUpdates: () => Promise<DesktopUpdateCheckResult>;
  getAppVersion: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export function isElectron(): boolean {
  return Boolean(typeof window !== 'undefined' && window.electronAPI?.isElectron);
}

/**
 * Desktop'da Google orqali kirish — tizim brauzeri + loopback OAuth oqimi
 * (main.js), chunki Google Electron'ning o'z oynasi ichidagi popup'ni
 * "disallowed_useragent" xatosi bilan bloklaydi (veb GIS popup'dan farqli
 * o'laroq bu yerda faqat ID token qaytadi).
 */
export function signInWithGoogleDesktop(clientId: string): Promise<{ idToken: string }> {
  if (!window.electronAPI) return Promise.reject(new Error('not_electron'));
  return window.electronAPI.signInWithGoogle(clientId);
}

/** Sozlamalar → "Yangilanishlarni tekshirish" tugmasi (desktop) */
export function checkForUpdatesDesktop(): Promise<DesktopUpdateCheckResult> {
  if (!window.electronAPI) return Promise.reject(new Error('not_electron'));
  return window.electronAPI.checkForUpdates();
}

/** Sozlamalar → "Ilova versiyasi" qatori (desktop) */
export function getAppVersionDesktop(): Promise<string> {
  if (!window.electronAPI) return Promise.reject(new Error('not_electron'));
  return window.electronAPI.getAppVersion();
}
