// shared/lib/google.ts
// Google Identity Services (GIS) — akkaunt tanlash popupini ochib,
// OAuth2 access token qaytaradi. SDK faqat kerak bo'lganda yuklanadi.
//
// MUHIM: bu FAQAT VEB brauzerda ishlaydi — Google GIS popup/token flow'i
// nativ ilova (Capacitor) WebView'ini avtomatik aniqlab, "disallowed_
// useragent" xatosi bilan RAD ETADI (bu Google'ning o'zining xavfsizlik
// siyosati, bizning kodimizdagi xato emas). Nativ ilovada shu sabab
// google-native.ts'dagi @codetrix-studio/capacitor-google-auth (Android
// Play Services'ning o'z hisob tanlash oynasi) ishlatiladi — useGoogleAuth
// hook'i Capacitor.isNativePlatform()ga qarab ikkovidan birini tanlaydi.

interface TokenResponse {
  access_token?: string;
  error?: string;
}

interface TokenClient {
  requestAccessToken: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: { type: string }) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';
let gsiLoading: Promise<void> | null = null;

function loadGsi(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  gsiLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gsiLoading = null;
      reject(new Error('Google SDK yuklanmadi'));
    };
    document.head.appendChild(script);
  });
  return gsiLoading;
}

/** Google akkaunt tanlash oynasini ochadi va access token qaytaradi */
export async function requestGoogleAccessToken(clientId: string): Promise<string> {
  await loadGsi();
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: (response) => {
        if (response.access_token) resolve(response.access_token);
        else reject(new Error(response.error ?? 'google_auth_failed'));
      },
      // Foydalanuvchi oynani yopsa ham promise osilib qolmasin
      error_callback: (error) => reject(new Error(error.type)),
    });
    client.requestAccessToken();
  });
}
