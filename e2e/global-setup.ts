import { execSync } from 'node:child_process';
import { E2E } from './env';

export default function globalSetup() {
  execSync(`npx supabase db reset${E2E.workdir ? ` --workdir ${E2E.workdir}` : ''}`, { stdio: 'inherit' });
  execSync('npx tsx scripts/bootstrap.ts', {
    stdio: 'inherit',
    env: {
      ...process.env,
      SUPABASE_URL: E2E.supabaseUrl,
      SUPABASE_ANON_KEY: E2E.anonKey,
      SUPABASE_SERVICE_ROLE_KEY: E2E.serviceKey,
      MENTOR_EMAIL: 'mentor@local.test',
      MENTOR_PASSWORD: 'mentor-local-pass',
      PROFILES: 'An:🦊:1111,Bình:🐼:2222,Chi:🦄:3333,Dũng:🐢:4444',
    },
  });
}
