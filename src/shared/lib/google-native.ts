// shared/lib/google-native.ts
// Nativ (Capacitor Android) Google Sign-In — Play Services'ning o'z hisob
// tanlash oynasini ochadi (GIS popup'idan farqli, WebView ichida ham
// ishlaydi). Client ID'lar bu yerda EMAS, capacitor.config.ts'dagi
// plugins.GoogleAuth (androidClientId/serverClientId) orqali beriladi.
//
// ID TOKEN, ACCESS TOKEN EMAS: plugin sign-in natijasi ikkovini ham
// qaytaradi, lekin ACCESS token eskirgan/nostabil AccountManager API
// orqali olinardi (ko'p qurilmalarda hisob tanlangandan keyin xato
// berardi) — patches/@codetrix-studio+capacitor-google-auth+*.patch
// bilan bu qadam olib tashlandi. ID token esa sign-in natijasining
// o'zida, hech qanday qo'shimcha so'rovsiz ISHONCHLI keladi (JWT,
// backend uni Google kalitlari bilan tekshiradi).
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

let initialized = false;

async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  await GoogleAuth.initialize();
  initialized = true;
}

/** Hisob tanlash oynasini ochadi va backend tekshiradigan ID token qaytaradi */
export async function requestGoogleIdTokenNative(): Promise<string> {
  await ensureInitialized();
  const result = await GoogleAuth.signIn();
  return result.authentication.idToken;
}
