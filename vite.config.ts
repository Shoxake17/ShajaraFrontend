/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => ({
  // MUHIM: Electron o'zining maxsus "app://ajdo.uz" protokoli orqali
  // index.html'ni yuklaydi (electron/main.js — oddiy `file://` CORS uchun
  // "null" origin yuborardi, backend buni whitelist qila olmasdi). Bu
  // sxema ILDIZ (standart: true) sifatida ro'yxatdan o'tgan bo'lsa ham,
  // NISBIY yo'l ("./assets/...") ishlatishda davom etamiz — chunki
  // ilova FAQAT bitta marta (index.html) yuklanadi, keyin React Router
  // mijoz tomonida navigatsiya qiladi (haqiqiy sahifa qayta yuklanmaydi).
  base: mode === 'electron' ? './' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // Xabarlar (Socket.IO, "/api/socket.io/") — WS upgrade so'rovlari ham
        // shu proxy orqali o'tishi uchun.
        ws: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    // e2e/ — Playwright'niki, vitest tegmaydi. electron/ — o'zining ALOHIDA
    // node_modules'iga ega (masalan exponential-backoff'ning o'z jest
    // testlari) — asosiy `node_modules/**` bu yerga yetib bormaydi.
    exclude: ['e2e/**', 'node_modules/**', 'electron/**', 'dist/**'],
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
}));
