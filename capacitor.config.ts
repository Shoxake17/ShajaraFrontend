import type { CapacitorConfig } from '@capacitor/cli';
const ANDROID_GOOGLE_CLIENT_ID = '834981016654-4ljnej0rer29jft9mltjv53l5benppgl.apps.googleusercontent.com';
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
