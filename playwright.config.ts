import { defineConfig, devices } from '@playwright/test';

// End-to-end acceptance tests (RFP section 12) against local Supabase.
// Needs `npx supabase start`; global setup resets the database and runs the bootstrap.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  globalSetup: './e2e/global-setup.ts',
  use: { baseURL: 'http://127.0.0.1:5173', ...devices['Pixel 7'], trace: 'retain-on-failure' },
  webServer: { command: 'pnpm dev --host 127.0.0.1', url: 'http://127.0.0.1:5173', reuseExistingServer: true },
});
