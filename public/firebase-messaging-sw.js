// public/firebase-messaging-sw.js
// Firebase Cloud Messaging — FON (background) push bildirishnomalari uchun
// (tab/ilova butunlay yopiq bo'lganda ham ishlaydi). Bu fayl STATIK holda
// /firebase-messaging-sw.js manzilida xizmat qiladi (Vite uni o'zgartirmaydi),
// shu bois src/shared/lib/firebase.ts'dagi konfiguratsiyani IMPORT QILA
// OLMAYDI — qiymatlar shu yerga to'g'ridan-to'g'ri yozilgan (Firebase Web
// config MAXFIY EMAS, klient tomonda ochiq bo'lishi normal amaliyot).
//
// Qiymatlar .env'dagi VITE_FIREBASE_* bilan BIR XIL (Firebase loyihasi: ajdo-833a3).
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAnZ_oAbz1FYj0DgIGpG1kKl4WGcfpkPtA',
  authDomain: 'ajdo-833a3.firebaseapp.com',
  projectId: 'ajdo-833a3',
  storageBucket: 'ajdo-833a3.firebasestorage.app',
  messagingSenderId: '195817634378',
  appId: '1:195817634378:web:c2ffaa05aa570b7b4d04b3',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // Backend ATAYLAB faqat `data` yuboradi (Android'dagi heads-up/large-icon
  // muammosi uchun) — shuning uchun sarlavha/matn `payload.notification`da
  // EMAS, `payload.data`da keladi.
  const data = payload.data || {};
  const title = data.title || 'AJDO';
  const body = data.body || '';
  self.registration.showNotification(title, {
    body,
    icon: '/shajaratree.png',
    badge: '/shajaratree.png',
    tag: data.otherUserId ? `chat-${data.otherUserId}` : undefined,
    data,
  });
});

// Bildirishnoma bosilganda — Telegram uslubida to'g'ridan-to'g'ri o'sha
// suhbatga o'tkazadi (mavjud tab bo'lsa fokus, bo'lmasa yangi oyna).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/xabarlar';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
      return undefined;
    }),
  );
});
