import type { CapacitorConfig } from '@capacitor/cli';

// ANDROID turidagi OAuth client (paket nomi uz.ajdo.shajara + debug SHA-1
// B4:C9:38:...) Google Cloud Console'da RO'YXATGA OLINGAN — lekin Play
// Services buni kod ichida ID string sifatida HECH QAERDA so'ramaydi, u
// avtomatik/shaffof tarzda paket nomi + imzo sertifikati orqali mos
// keltiriladi. Shu sabab bu yerda ATAYLAB ISHLATILMAYDI (faqat GCP konsolida
// ro'yxatga olingan holda qoladi): 834981016654-4ljnej0rer29jft9mltjv53l5benppgl.apps.googleusercontent.com

// requestIdToken(clientId) ga ANIQ shu (WEB turidagi) client ID beriladi —
// ID token'ning "aud" da'vosi shunga teng bo'ladi va faqat WEB turidagi
// client uchun Google tomonidan tekshiriladigan (verifiable) ID token
// chiqariladi. ANDROID turidagi client ID berilsa — hisob tanlangandan
// keyin ApiException kod 10 (DEVELOPER_ERROR) bilan muvaffaqiyatsiz tugaydi
// (aynan shu xato kuzatilgan edi).
const WEB_GOOGLE_CLIENT_ID = '834981016654-s75eidlrcjm6qrhm9cr6aiv1rpc9ar6l.apps.googleusercontent.com';

const config: CapacitorConfig = {
  appId: 'uz.ajdo.shajara',
  appName: 'AJDO',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      androidClientId: WEB_GOOGLE_CLIENT_ID,
      serverClientId: WEB_GOOGLE_CLIENT_ID,
    },
    // Buning yo'qligi ilova FOREGROUND'da (ochiq/faol) bo'lganda push kelsa
    // @capacitor/push-notifications'ning PushNotificationsPlugin.fireNotification()
    // metodi hech narsa chizmasdan jim tashlab yuborishiga sabab bo'lgan edi —
    // "alert" bo'lmasa, heads-up popup HECH QACHON ko'rsatilmaydi (faqat
    // ilova background/killed bo'lganda FCM o'zi tizim orqali ko'rsatadi).
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
