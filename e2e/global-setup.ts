import { execSync } from 'node:child_process';

export default function globalSetup() {
  execSync('npx supabase db reset', { stdio: 'inherit' });
  execSync('pnpm -s bootstrap:local', { stdio: 'inherit' });
}
