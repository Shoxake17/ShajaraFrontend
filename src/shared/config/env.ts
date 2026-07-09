export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? '/api/v1',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
} as const;
