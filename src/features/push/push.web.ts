// features/push/push.web.ts
// Brauzer/PWA push — Capacitor/Android'da ISHLATILMAYDI (push.native.ts
// to'g'ridan-to'g'ri nativ FCM'ga ulanadi, WebView ichida Firebase JS SDK
// ishonchli ishlamaydi). Firebase sozlanmagan bo'lsa (VITE_FIREBASE_* .env'da
// yo'q) — jim hech narsa qilmaydi, ilovaning qolgan qismiga ta'sir qilmaydi.
import { Capacitor } from '@capacitor/core';
import { fcmDeleteToken, fcmGetToken, fcmOnMessage, getMessagingInstance, isFirebaseConfigured } from '@/shared/lib/firebase';
import { pushApi } from './push.api';

let currentToken: string | null = null;

export async function initWebPush(): Promise<void> {
  if (Capacitor.isNativePlatform()) return;
  if (!isFirebaseConfigured()) return;
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = await getMessagingInstance();
    if (!messaging) return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
    if (!vapidKey) return;

    const token = await fcmGetToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    if (!token) return;
    currentToken = token;
    await pushApi.register(token, 'WEB');

    // MUHIM: Firebase "foreground"ni sahifa KO'RINISHIGA (visibility) qarab
    // emas, sahifa JS konteksti tirikligiga qarab belgilaydi — tab
    // yashirin/minimized bo'lsa ham (yopilmagan ekan), xabar service
    // worker'ga EMAS, shu yerga (onMessage) keladi. Shu bois: sahifa
    // haqiqatan YASHIRIN bo'lsa, bildirishnomani O'ZIMIZ ko'rsatamiz;
    // haqiqatan ko'rinib turgan bo'lsa — xabar allaqachon socket orqali
    // chat.store.ts'ga tushgan, qo'shimcha amal shart emas.
    fcmOnMessage(messaging, (payload) => {
      if (!document.hidden) return;
      // Backend ATAYLAB faqat `data` yuboradi (push.service.ts) — sarlavha/matn
      // shu yerda, `payload.notification`da EMAS.
      const data = payload.data ?? {};
      const title = data.title ?? 'AJDO';
      const body = data.body ?? '';
      void registration.showNotification(title, {
        body,
        icon: '/shajaratree.png',
        badge: '/shajaratree.png',
        tag: data.otherUserId ? `chat-${data.otherUserId}` : undefined,
        data,
      });
    });
  } catch {
    // jim — push ixtiyoriy funksiya, muvaffaqiyatsiz bo'lsa ilovaning
    // qolgan qismi to'liq ishlashda davom etadi
  }
}

/** Chiqishda (logout) — shu qurilma boshqa endi push olmasin */
export async function teardownWebPush(): Promise<void> {
  if (!currentToken) return;
  const token = currentToken;
  currentToken = null;
  try {
    await pushApi.unregister(token);
    const messaging = await getMessagingInstance();
    if (messaging) await fcmDeleteToken(messaging);
  } catch {
    // jim
  }
}
