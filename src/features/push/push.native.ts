// features/push/push.native.ts
// Android APK (Capacitor) — to'g'ridan-to'g'ri NATIV FCM'ga ulanadi
// (@capacitor/push-notifications), Firebase JS SDK (push.web.ts) EMAS.
// google-services.json android/app/ ostiga qo'yilmagan bo'lsa — plagin
// registratsiyasi jim muvaffaqiyatsiz bo'ladi (registrationError), ilovaning
// qolgan qismiga ta'sir qilmaydi.
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { pushApi } from './push.api';
import { router } from '@/app/router';

let listenersWired = false;

function wireListeners(): void {
  if (listenersWired) return;
  listenersWired = true;

  PushNotifications.addListener('registration', (token) => {
    void pushApi.register(token.value, 'ANDROID');
  });
  PushNotifications.addListener('registrationError', () => {
    // jim — push ixtiyoriy funksiya
  });
  // Ilova FON REJIMIDAN (background) bildirishnoma bosilib ochilganda —
  // Telegram uslubida to'g'ridan-to'g'ri o'sha suhbatga o'tkazamiz.
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const otherUserId = action.notification.data?.otherUserId as string | undefined;
    void router.navigate(otherUserId ? `/xabarlar?with=${otherUserId}` : '/xabarlar');
  });
}

/**
 * Har LOGIN'da chaqiriladi (AppLayout mount — auth o'tishlarida qayta
 * ishga tushadi). `PushNotifications.register()` har safar 'registration'
 * hodisasini QAYTA beradi — shu orqali umumiy qurilmada boshqa hisobga
 * o'tilganda token backend'da (upsert) YANGI foydalanuvchiga qayta
 * bog'lanadi, avvalgi egasi endi push olmay qoladi.
 */
export async function initNativePush(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const current = await PushNotifications.checkPermissions();
    let granted = current.receive === 'granted';
    if (!granted && current.receive !== 'denied') {
      const requested = await PushNotifications.requestPermissions();
      granted = requested.receive === 'granted';
    }
    if (!granted) return;
    wireListeners();
    await PushNotifications.register();
  } catch {
    // jim
  }
}
