// electron/preload.js
// contextIsolation yoqilgan holda, React ilovasi "men Electron ichida
// ishlayapmanmi?" deb tekshira olishi uchun (router.tsx — Landing
// o'rniga Mobile uslubidagi Ro'yxatdan o'tish/Kirish sahifasini
// ko'rsatish uchun, xuddi Capacitor.isNativePlatform() kabi).
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
});
