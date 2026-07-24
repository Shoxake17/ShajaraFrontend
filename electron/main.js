// electron/main.js
// AJDO Windows desktop ilovasi — asosiy (main) jarayon. Bir xil React
// ilovasini (../dist, --mode electron bilan qurilgan) BrowserWindow
// ichida ochadi — mobil versiyadagi Capacitor'ning WebView'iga o'xshab.
const { app, BrowserWindow, shell, protocol, net, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { autoUpdater } = require('electron-updater');

// MUHIM: Electron `app.getPath('userData')` (loglar, cache va h.k. qayerga
// yozilishini belgilaydi) nomi uchun package.json'ning TEPA DARAJADAGI
// "name"/"productName" maydonini ishlatadi — "build.productName" (faqat
// electron-builder o'rnatuvchi/exe nomi uchun ishlatadigan, ICHKI joylashgan
// maydon) buni UMUMAN qamrab olmaydi. Shu bois `app.setName()` chaqirilmasa,
// papka nomi "ajdo-desktop" (package.json'dagi "name") bo'lib qolar edi,
// "AJDO" EMAS — foydalanuvchiga %APPDATA%\AJDO\ qayerdaligini aytish
// chalkashlik keltirib chiqargan edi (haqiqiy papka %APPDATA%\ajdo-desktop\
// bo'lgan). Bu chaqiruv app.whenReady()dan OLDIN, eng boshida bo'lishi SHART.
app.setName('AJDO');

// `file://` orqali yuklangan sahifa CORS uchun "null" origin yuboradi —
// backend buni whitelist qila olmaydi (har qanday lokal HTML fayl ham
// xuddi shu "null"ni yuborardi, bu esa httpOnly refresh-token cookie
// SameSite=None bo'lgani uchun xavfli bo'lardi — ixtiyoriy lokal fayl
// autentifikatsiya javoblarini o'qiy olib qolardi). Shu bois FAQAT shu
// ilova hosil qila oladigan maxsus "app://" sxemasi ro'yxatdan
// o'tkaziladi (standart HTTP kabi to'liq origin sifatida ishlaydi) va
// backend CORS_ORIGIN ro'yxatiga aynan shu manzil qo'shilgan
// (ShajaraBackendNode: common/desktop-origin.ts, main.ts, chat.gateway.ts).
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
  },
]);

const APP_ORIGIN = 'app://ajdo.uz';

// `dist/` papkasidagi build qilingan fayllarni "app://ajdo.uz/<yo'l>"
// manzili orqali xizmat qiladi — `win.loadFile` (file://) o'rniga.
// `net.fetch` `file:` sxemasini ham qo'llab-quvvatlaydi (Electron
// rasmiy hujjati), shu bois MIME turi/oqim (stream) qo'lda yozilishi shart
// emas — brauzerning o'zi fayl kengaytmasidan avtomatik aniqlaydi.
function registerAppProtocol() {
  const distDir = path.join(__dirname, 'dist');
  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url);
    const filePath = path.join(distDir, decodeURIComponent(pathname));
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

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

  win.loadURL(`${APP_ORIGIN}/index.html`);

  // Tashqi havolalar (masalan yordam/qo'llab-quvvatlash sahifalari) tizim
  // brauzerida ochilishi kerak — BITTA ISTISNO bilan: Telegram OAuth
  // popup'i (oauth.telegram.org, telegram.ts) HAQIQIY child oyna sifatida
  // ochilishi SHART, chunki tasdiqlangach `window.opener.postMessage(...)`
  // orqali natijani asosiy oynaga qaytaradi — tashqi (tizim) brauzerga
  // chiqarib yuborilsa, bu butunlay boshqa jarayon bo'lib, postMessage
  // ASLO yetib bora olmaydi va login "jimgina" ishlamay qoladi.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://oauth.telegram.org/')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 550,
          height: 470,
          autoHideMenuBar: true,
          webPreferences: { contextIsolation: true, nodeIntegration: false },
        },
      };
    }
    void shell.openExternal(url);
    return { action: 'deny' };
  });
}

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Ma'lum bir portda emas, OS ajratgan BO'SH portda (0) vaqtinchalik
// lokal HTTP server ochadi va Google'ning `?code=...&state=...` qayta
// yo'naltirishini kutadi — RFC 8252 (Installed-app OAuth, "loopback
// interface redirection"): Google'ning o'zi buni rasmiy tavsiya qiladi,
// chunki desktop ilovalar "maxfiy" (confidential) client bo'la olmaydi
// (client_secret dasturga ochiladi) — shu bois state + PKCE bilan
// himoyalanadi, "client_secret" umuman ishlatilmaydi.
function startLoopbackServer(expectedState) {
  return new Promise((resolveServer, rejectServer) => {
    let settled = false;
    let resolveCode;
    let rejectCode;
    const codePromise = new Promise((res, rej) => {
      resolveCode = res;
      rejectCode = rej;
    });

    const server = http.createServer((req, res) => {
      const reqUrl = new URL(req.url, 'http://127.0.0.1');
      const code = reqUrl.searchParams.get('code');
      const returnedState = reqUrl.searchParams.get('state');
      const error = reqUrl.searchParams.get('error');

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      if (error) {
        res.end('<html><body>Kirish bekor qilindi. Bu oynani yopishingiz mumkin.</body></html>');
        finish(() => rejectCode(new Error(error === 'access_denied' ? 'access_denied' : 'google_auth_failed')));
      } else if (!code || returnedState !== expectedState) {
        res.end('<html><body>Xatolik yuz berdi. Bu oynani yopishingiz mumkin.</body></html>');
        finish(() => rejectCode(new Error('google_state_mismatch')));
      } else {
        res.end(
          '<html><body>Muvaffaqiyatli kirdingiz! Bu oynani yopib, AJDO ilovasiga qaytishingiz mumkin.</body></html>',
        );
        finish(() => resolveCode(code));
      }
    });

    const timeout = setTimeout(() => {
      finish(() => rejectCode(new Error('google_auth_timeout')));
    }, 120_000);

    function finish(action) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      action();
      // Javob (res.end) haqiqatan yuborilgach yopish uchun kichik kechikish.
      setTimeout(() => server.close(), 500);
    }

    server.on('error', rejectServer);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolveServer({ port, waitForCode: () => codePromise });
    });
  });
}

// Google'ning "disallowed_useragent" siyosati Electron'ning o'z
// BrowserWindow'i (popup bo'lsa ham) ichida OAuth kirishni bloklaydi —
// shu bois hisob tanlash TIZIM (standart) brauzerida ochiladi, natija esa
// yuqoridagi vaqtinchalik loopback server orqali qaytadi. PKCE (code
// verifier/challenge) — client_secret'siz xavfsiz kod almashinuvi uchun.
ipcMain.handle('google-signin', async (_event, clientId) => {
  if (!clientId) throw new Error('google_client_missing');

  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest());
  const state = base64url(crypto.randomBytes(16));

  const { port, waitForCode } = await startLoopbackServer(state);
  const redirectUri = `http://127.0.0.1:${port}`;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');

  await shell.openExternal(authUrl.toString());
  const code = await waitForCode();

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) throw new Error('google_token_exchange_failed');
  const tokenJson = await tokenRes.json();
  if (!tokenJson.id_token) throw new Error('google_no_id_token');
  return { idToken: tokenJson.id_token };
});

// Yangilanish tekshiruvining har bir bosqichi shu faylga yoziladi
// (%APPDATA%\AJDO\update.log) — ILGARI xato "jim" (.catch(() => undefined))
// yutilib ketardi, ya'ni tarmoq/versiya/imzo xatosi bo'lsa ham foydalanuvchi
// VA biz buni HECH QACHON bila olmasdik. Oddiy foydalanuvchiga bezovta
// qiluvchi popup ko'rsatilmaydi (bu — fon jarayoni), faqat diagnostika
// uchun faylga yoziladi.
function logUpdate(line) {
  try {
    const logPath = path.join(app.getPath('userData'), 'update.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${line}\n`);
  } catch {
    /* loglash muvaffaqiyatsiz bo'lsa ham ilova ishini davom ettiraveradi */
  }
}

autoUpdater.on('checking-for-update', () => logUpdate('checking-for-update'));
autoUpdater.on('update-available', (info) => logUpdate(`update-available: server=${info.version}`));
autoUpdater.on('update-not-available', (info) =>
  logUpdate(`update-not-available: joriy=${app.getVersion()} server=${info.version}`),
);
autoUpdater.on('error', (err) => logUpdate(`ERROR: ${err && err.message ? err.message : err}`));
autoUpdater.on('download-progress', (p) => logUpdate(`download-progress: ${Math.round(p.percent)}%`));
autoUpdater.on('update-downloaded', (info) => logUpdate(`update-downloaded: ${info.version}`));

// MUHIM: electron-updater'ning ICHKI qarorlari (masalan — "quit paytida
// o'rnatish TASHLAB YUBORILDI, chunki exitCode 0 EMAS", yoki o'rnatish
// jarayonining o'zida chiqqan xato) standart holatda faqat o'zining ICHKI
// logger'iga (hech qayerga yozilmaydigan no-op) ketardi — bizga BUTUNLAY
// KO'RINMAS edi. "Bildirishnoma chiqadi, lekin versiya o'zgarmaydi" kabi
// holatlarni ANIQ sabab bilan (taxmin qilmasdan) tashxislash uchun bu
// xabarlar ENDI bizning o'z update.log faylimizga ham yoziladi.
autoUpdater.logger = {
  info: (msg) => logUpdate(`[updater:info] ${msg}`),
  warn: (msg) => logUpdate(`[updater:warn] ${msg}`),
  error: (msg) => logUpdate(`[updater:error] ${msg}`),
};
app.on('quit', (_event, exitCode) => logUpdate(`app-quit: exitCode=${exitCode}`));

// Sozlamalar → "Yangilanishlarni tekshirish" tugmasi — foydalanuvchi
// ilova ishga tushganda avtomatik tekshiruvni kutmasdan, QO'LDA darhol
// tekshira olishi uchun. Natija keyingi 'update-available'/
// 'update-not-available'/'error' hodisasidan (yoki 20 soniyalik
// kutishdan) olinadi — logUpdate() bilan BIR VAQTDA, bir-biriga
// xalaqit bermaydi (EventEmitter bir nechta tinglovchini qo'llab-
// quvvatlaydi).
ipcMain.handle('check-for-updates', () => {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      autoUpdater.removeListener('update-available', onAvailable);
      autoUpdater.removeListener('update-not-available', onNotAvailable);
      autoUpdater.removeListener('error', onError);
      resolve(result);
    };
    const onAvailable = (info) => finish({ status: 'available', version: info.version });
    const onNotAvailable = () => finish({ status: 'not-available' });
    const onError = (err) => finish({ status: 'error', message: err && err.message ? err.message : String(err) });

    autoUpdater.once('update-available', onAvailable);
    autoUpdater.once('update-not-available', onNotAvailable);
    autoUpdater.once('error', onError);

    autoUpdater
      .checkForUpdatesAndNotify()
      .catch((err) => finish({ status: 'error', message: err && err.message ? err.message : String(err) }));

    const timeout = setTimeout(() => finish({ status: 'error', message: 'timeout' }), 20_000);
  });
});

ipcMain.handle('get-app-version', () => app.getVersion());

app.whenReady().then(() => {
  registerAppProtocol();
  createWindow();

  // Ishga tushganda serverdagi eng so'nggi versiyani tekshiradi
  // (deploy.yml#build-desktop CI'da har push'da downloads/desktop/
  // ostiga yuklab qo'yiladi). Yangisi topilsa, yuklab olib, foydalanuvchiga
  // NATIV OS dialogida "Qayta ishga tushirib o'rnatish"ni taklif qiladi —
  // electron-updater'ning STANDART xatti-harakati, qo'shimcha UI kod shart
  // emas. Android'dan farqli o'laroq, bu yerda foydalanuvchi faqat BITTA
  // "Restart" tugmasini bosadi — to'liq alohida o'rnatuvchini qayta
  // ishga tushirishi shart emas.
  logUpdate(`app-start: joriy versiya=${app.getVersion()}`);
  autoUpdater
    .checkForUpdatesAndNotify()
    .catch((err) => logUpdate(`checkForUpdatesAndNotify xatosi: ${err && err.message ? err.message : err}`));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
