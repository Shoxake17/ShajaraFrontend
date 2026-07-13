// shared/lib/google-native.ts
// Nativ (Capacitor Android) Google Sign-In — Play Services'ning o'z hisob
// tanlash oynasini ochadi (GIS popup'idan farqli, WebView ichida ham
// ishlaydi). Client ID'lar bu yerda EMAS, capacitor.config.ts'dagi
// plugins.GoogleAuth (androidClientId/serverClientId) orqali beriladi.
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

let initialized = false;

async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  await GoogleAuth.initialize();
  initialized = true;
}

/** Hisob tanlash oynasini ochadi va backend tekshiradigan access token qaytaradi */
export async function requestGoogleAccessTokenNative(): Promise<string> {
  await ensureInitialized();
  const result = await GoogleAuth.signIn();
  return result.authentication.accessToken;
}
