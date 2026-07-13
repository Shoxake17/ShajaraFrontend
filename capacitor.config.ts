import type { CapacitorConfig } from '@capacitor/cli';

// Google Sign-In (nativ): Google Cloud Console'da "Android" turidagi OAuth
// client ID yaratilgach shu yerga qo'yiladi (package: uz.ajdo.shajara,
// SHA-1: `cd android && ./gradlew signingReport` bilan olinadi — debug
// build uchun). serverClientId — mavjud VEB client ID (VITE_GOOGLE_CLIENT_ID
// bilan bir xil qiymat), backend GOOGLE_CLIENT_ID bilan solishtiradi.
const ANDROID_GOOGLE_CLIENT_ID = 'REPLACE_ME.apps.googleusercontent.com';
const WEB_GOOGLE_CLIENT_ID = '834981016654-s75eidlrcjm6qrhm9cr6aiv1rpc9ar6l.apps.googleusercontent.com';

const config: CapacitorConfig = {
  appId: 'uz.ajdo.shajara',
  appName: 'AJDO',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      androidClientId: ANDROID_GOOGLE_CLIENT_ID,
      serverClientId: WEB_GOOGLE_CLIENT_ID,
    },
  },
};

export default config;
