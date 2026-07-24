// electron/preload.js
// contextIsolation yoqilgan holda, React ilovasi "men Electron ichida
// ishlayapmanmi?" deb tekshira olishi uchun (router.tsx — Landing
// o'rniga Mobile uslubidagi Ro'yxatdan o'tish/Kirish sahifasini
// ko'rsatish uchun, xuddi Capacitor.isNativePlatform() kabi).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  // Google'ning "disallowed_useragent" siyosati Electron oynasi ichida
  // GIS popup orqali kirishni bloklaydi — shu bois tizim brauzeri +
  // loopback qayta yo'naltirish oqimi asosiy (main.js) jarayonda bajariladi,
  // natija (ID token) shu IPC orqali qaytadi (useGoogleAuth.ts).
  signInWithGoogle: (clientId) => ipcRenderer.invoke('google-signin', clientId),
  // Sozlamalar → "Yangilanishlarni tekshirish" tugmasi uchun (main.js).
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
});
