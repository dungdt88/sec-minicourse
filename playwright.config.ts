import { defineConfig, devices } from '@playwright/test';
import { E2E } from './e2e/env';

// End-to-end acceptance tests (RFP section 12) against local Supabase.
// Needs a running Supabase stack; global setup RESETS that database and runs the bootstrap.
// See e2e/env.ts to point it at a separate stack instead of the dev one.
const baseURL = `http://127.0.0.1:${E2E.appPort}`;
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  globalSetup: './e2e/global-setup.ts',
  use: { baseURL, ...devices['Pixel 7'], trace: 'retain-on-failure' },
  webServer: {
    command: `npx vite --port ${E2E.appPort} --strictPort --host 127.0.0.1`,
    url: baseURL,
    reuseExistingServer: E2E.appPort === 5173,
    env: { VITE_BACKEND: 'supabase', VITE_SUPABASE_URL: E2E.supabaseUrl, VITE_SUPABASE_ANON_KEY: E2E.anonKey, VITE_TEAM_SLUG: 'default' },
  },
});
