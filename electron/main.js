// electron/main.js
// AJDO Windows desktop ilovasi — asosiy (main) jarayon. Bir xil React
// ilovasini (../dist, --mode electron bilan qurilgan) BrowserWindow
// ichida ochadi — mobil versiyadagi Capacitor'ning WebView'iga o'xshab.
const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');
const { autoUpdater } = require('electron-updater');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'dist', 'index.html'));

  // Tashqi havolalar (masalan Telegram OAuth popup, yordam/qo'llab-
  // quvvatlash sahifalari) ilova OYNASI ICHIDA emas, tizim brauzerida
  // ochilishi kerak.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  // Ishga tushganda serverdagi eng so'nggi versiyani tekshiradi
  // (deploy.yml#build-desktop CI'da har push'da public/downloads/desktop/
  // ostiga yuklab qo'yiladi). Yangisi topilsa, yuklab olib, foydalanuvchiga
  // NATIV OS dialogida "Qayta ishga tushirib o'rnatish"ni taklif qiladi —
  // electron-updater'ning STANDART xatti-harakati, qo'shimcha UI kod shart
  // emas. Android'dan farqli o'laroq, bu yerda foydalanuvchi faqat BITTA
  // "Restart" tugmasini bosadi — to'liq alohida o'rnatuvchini qayta
  // ishga tushirishi shart emas.
  autoUpdater.checkForUpdatesAndNotify().catch(() => undefined);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
