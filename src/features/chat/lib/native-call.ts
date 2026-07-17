// features/chat/lib/native-call.ts
// Android'da qo'ng'iroq/video-qo'ng'iroq WebView (livekit-client) orqali
// EMAS — to'liq mustaqil NATIVE (Kotlin, LiveKit Android SDK) ekranda
// ochiladi (android/.../calls/CallPlugin.kt). Sabab: qulf ekranida
// jiringlash va ekran ulashishni BOSHLASH WebView'da ishlamaydi. Naqsh
// native-billing.ts bilan bir xil (o'zimiz yozgan kichik Capacitor plagini).
import { registerPlugin } from '@capacitor/core';

interface CallPluginApi {
  startCall(options: {
    calleeId: string;
    callType: 'AUDIO' | 'VIDEO';
    calleeName?: string;
    calleePhotoUrl?: string;
  }): Promise<void>;
  syncAuthToken(options: { accessToken: string; userId: string }): Promise<void>;
  clearAuthToken(): Promise<void>;
}

const CallPlugin = registerPlugin<CallPluginApi>('CallPlugin');

// calleeName/calleePhotoUrl — JS'da ALLAQACHON mavjud (ChatContact, server
// so'rovisiz) — Apple/Telegram uslubidagi qo'ng'iroq ekranida chaqirilayotgan
// odamning ismi/rasmini DARHOL (tarmoq kutmasdan) ko'rsatish uchun.
export async function startNativeCall(
  calleeId: string,
  callType: 'AUDIO' | 'VIDEO',
  calleeName?: string,
  calleePhotoUrl?: string | null,
): Promise<void> {
  await CallPlugin.startCall({
    calleeId,
    callType,
    ...(calleeName ? { calleeName } : {}),
    ...(calleePhotoUrl ? { calleePhotoUrl } : {}),
  });
}

/** auth.store.ts har safar accessToken o'zgarganda chaqiradi — native
 * AjdoFirebaseMessagingService/CallActivity (WebView'siz) shu tokenni
 * o'qiydi (AuthTokenBridge.kt). */
export async function syncNativeAuthToken(accessToken: string, userId: string): Promise<void> {
  await CallPlugin.syncAuthToken({ accessToken, userId });
}

export async function clearNativeAuthToken(): Promise<void> {
  await CallPlugin.clearAuthToken();
}
