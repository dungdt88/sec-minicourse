// Where the e2e suite runs. Defaults: the dev stack (local Supabase on :54321, app on :5173).
// Set E2E_SUPABASE_WORKDIR / E2E_SUPABASE_URL / E2E_APP_PORT to run against a separate throwaway
// Supabase stack, so the reset in global-setup never touches the dev database.
export const E2E = {
  workdir: process.env.E2E_SUPABASE_WORKDIR ?? '',
  supabaseUrl: process.env.E2E_SUPABASE_URL ?? 'http://127.0.0.1:54321',
  appPort: Number(process.env.E2E_APP_PORT ?? 5173),
  anonKey: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
  serviceKey: 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz',
};
