// shared/lib/electron.ts
// Ilova Electron (Windows desktop) ichida ishlayaptimi — preload.js
// contextBridge orqali window.electronAPI.isElectron'ni yozib qo'yadi
// (Capacitor.isNativePlatform() bilan bir xil maqsadda ishlatiladi).
export function isElectron(): boolean {
  return Boolean(
    typeof window !== 'undefined' &&
      (window as unknown as { electronAPI?: { isElectron?: boolean } }).electronAPI?.isElectron,
  );
}
