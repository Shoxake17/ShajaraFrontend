// features/chat/lib/presence.ts
// Ilova FON/OLDIN (foreground) holatini serverga bildiradi — backend
// (chat.gateway.ts) shu bayroqqa qarab push yuborish-yubormaslikni hal
// qiladi. Socket ulanganligining o'zi buni bildirmaydi: mobil OS ilovani
// fonga o'tgach ham darhol o'ldirmaydi, ulanish bir muddat ochiq turishi
// mumkin — shu bois aynan shu (chinakam ekran holati) kuzatiladi.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import type { Socket } from 'socket.io-client';

// Backend TTL'i (chat.gateway.ts, FOREGROUND_TTL_MS=35s) dan sezilarli
// qisqaroq bo'lishi shart — aks holda ikkita heartbeat orasidagi tabiiy
// bo'shliqda ham belgi "stale" deb hisoblanib qolishi mumkin.
const HEARTBEAT_MS = 15_000;

export function wirePresenceReporting(socket: Socket): void {
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const report = (foreground: boolean) => {
    socket.emit('presence:state', { foreground });
    // Foreground bo'lsa — davriy ravishda qayta tasdiqlaymiz (heartbeat).
    // SABAB: yakka "men fonga o'tdim" xabari tarmoq/WebView tanaffusi
    // tufayli yo'qolib qolsa, backend'dagi TTL shu heartbeat to'xtaganidan
    // keyin ~35s ichida o'zi tuzatadi — signal cheksiz vaqt noto'g'ri
    // "foreground" bo'lib QOLIB KETMAYDI.
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (foreground) {
      heartbeatTimer = setInterval(() => socket.emit('presence:state', { foreground: true }), HEARTBEAT_MS);
    }
  };

  // MUHIM: reconnect har doim "hozir ochildi" degani EMAS — Android'da
  // fonga o'tish ko'pincha socket'ni uzib-qayta ulaydi (WebView tarmog'i
  // vaqtincha to'xtaydi), shu payt 'connect' qayta chaqiriladi. Shu bois
  // native'da HAR DOIM `true` deb yozib qo'yish YARAMAYDI (aynan shu xato
  // fonga o'tgandan keyingi push'ni bostirib qo'ygan edi) — buning o'rniga
  // Capacitor'dan JORIY (haqiqiy) holatni so'raymiz.
  socket.on('connect', () => {
    if (Capacitor.isNativePlatform()) {
      void App.getState().then(({ isActive }) => report(isActive));
    } else {
      report(!document.hidden);
    }
  });

  if (Capacitor.isNativePlatform()) {
    // Android WebView'da "visibilitychange" ilova fonga o'tganda ishonchli
    // kelavermaydi — Capacitor'ning nativ ilova hayot sikli hodisasi ishlatiladi.
    void App.addListener('appStateChange', ({ isActive }) => report(isActive));
  } else {
    document.addEventListener('visibilitychange', () => report(!document.hidden));
  }
}
