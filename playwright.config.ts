import { defineConfig } from '@playwright/test';

/**
 * E2E: haqiqiy backend (localhost:3000) + frontend (localhost:5173) bilan.
 * Bazalar docker-compose.dev.yml orqali ishlab turishi kerak.
 * Ishlayotgan serverlar bo'lsa qayta ishlatadi (reuseExistingServer).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node dist/main.js',
      cwd: '../ShajaraBackendNode',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
