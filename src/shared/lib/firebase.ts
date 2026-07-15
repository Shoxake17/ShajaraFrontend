// shared/lib/firebase.ts
// Faqat BRAUZER/PWA push uchun (Capacitor/Android'da @capacitor/push-notifications
// to'g'ridan-to'g'ri nativ FCM'ga ulanadi — bu fayl u yerda ishlatilmaydi).
// Konfiguratsiya maxfiy EMAS (Firebase Web config — klient bundle'ida ochiq
// bo'lishi normal amaliyot), shu bois .env'da oddiy VITE_ o'zgaruvchilar
// sifatida saqlanadi. Sozlanmagan bo'lsa (hali .env to'ldirilmagan) — bu
// modul jim o'chirilgan holatda ishlaydi, ilovaning qolgan qismiga
// TA'SIR QILMAYDI.
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, deleteToken, isSupported, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export function isFirebaseConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

let app: FirebaseApp | null = null;
let messagingPromise: Promise<Messaging | null> | null = null;

/** Lazy — faqat kerak bo'lganda (push ishga tushirilganda) initsializatsiya qilinadi */
export function getMessagingInstance(): Promise<Messaging | null> {
  if (messagingPromise) return messagingPromise;
  messagingPromise = (async () => {
    if (!isFirebaseConfigured()) return null;
    try {
      if (!(await isSupported())) return null;
      if (!app) app = initializeApp(firebaseConfig);
      return getMessaging(app);
    } catch {
      return null;
    }
  })();
  return messagingPromise;
}

export { getToken as fcmGetToken, onMessage as fcmOnMessage, deleteToken as fcmDeleteToken };
