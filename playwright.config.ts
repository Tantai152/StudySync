import { defineConfig, devices } from '@playwright/test';

/**
 * StudySync E2E test configuration.
 *
 * Before running tests, start both servers:
 *   Terminal 1 (backend):  cd backend && npm run dev   -> http://localhost:3000
 *   Terminal 2 (frontend): cd frontend && npm run dev   -> http://localhost:5173
 *
 * Then run: npx playwright test
 */
export default defineConfig({
  testDir: './e2e',
  // Serial execution: the app uses a single remote MySQL with a small
  // connection pool (10). Parallel workers exhaust it and cause 500s.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  // Remote Aiven DB makes each API round-trip slow; give tests headroom.
  timeout: 60000,
  reporter: process.env.CI ? [['html'], ['junit', { outputFile: 'test-results/results.xml' }]] : 'list',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Servers are started manually before running tests (locally) or in CI workflow.
  // No webServer section to avoid port conflicts.
});
