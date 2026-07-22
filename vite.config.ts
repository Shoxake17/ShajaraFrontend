/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => ({
  // MUHIM: Electron `file://` protokoli orqali index.html'ni to'g'ridan-
  // to'g'ri diskdan ochadi (server YO'Q) — standart MUTLAQ yo'llar
  // ("/assets/...") shu holatda diskning ILDIZ papkasiga hal bo'lib,
  // BARCHA JS/CSS fayllari topilmay qolardi. Faqat Electron rejimida
  // NISBIY yo'l ("./assets/...") ishlatiladi — veb/Capacitor build'lariga
  // (ular server/virtual-host orqali xizmat qiladi) TA'SIR QILMAYDI.
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
    // e2e/ — Playwright'niki, vitest tegmaydi
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
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
