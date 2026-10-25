// Launch check, read only: a fresh project must hold no children's data, only what bootstrap set up.
// Exits with code 1 if any children's data is there or a test account exists.
//
//   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<secret key> pnpm launch-check
//
// The same check as SQL, for the dashboard's SQL Editor: deploy/launch-check.sql.
import { createClient } from '@supabase/supabase-js';
import { DB_SCHEMA } from '../src/api/schema';

const env = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Set ${k}`);
  return v;
};

const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  db: { schema: DB_SCHEMA },
  auth: { persistSession: false },
});

/** Children's data: every one of these must be empty at launch. */
const MUST_BE_EMPTY: [table: string, what: string][] = [
  ['answer_versions', 'answers'],
  ['quiz_attempts', 'quiz attempts'],
  ['section_timings', 'timings'],
  ['level_states', 'level progress (and the friends news, which is read from it)'],
  ['player_sessions', 'devices signed in'],
  ['pin_attempts', 'code attempts'],
  ['error_log', 'error log'],
];

async function count(table: string): Promise<number> {
  const { count: n, error } = await admin.from(table).select('*', { count: 'exact', head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  return n ?? 0;
}

async function main() {
  let ok = true;
  console.log("Children's data (must be 0):");
  for (const [table, what] of MUST_BE_EMPTY) {
    const n = await count(table);
    if (n !== 0) ok = false;
    console.log(`  ${n === 0 ? 'ok ' : 'NOT EMPTY'}  ${table.padEnd(16)} ${String(n).padStart(4)}  ${what}`);
  }

  console.log('\nSetup:');
  const teams = await admin.from('teams').select('slug, name, settings');
  if (teams.error) throw teams.error;
  for (const t of teams.data) console.log(`  team      ${t.name} (${t.slug}) ${JSON.stringify(t.settings)}`);

  const profiles = await admin.from('profiles').select('display_name, avatar, pin_set').is('archived_at', null).order('created_at');
  if (profiles.error) throw profiles.error;
  console.log(`  profiles  ${profiles.data.map((p) => `${p.avatar} ${p.display_name}${p.pin_set ? '' : ' (no code)'}`).join(', ') || '—'}`);

  const content = await admin.from('content_versions').select('content_version').eq('is_active', true);
  if (content.error) throw content.error;
  console.log(`  content   ${content.data.map((c) => c.content_version).join(', ') || '— none active'}`);

  const mentors = await admin.from('mentors').select('email');
  if (mentors.error) throw mentors.error;
  console.log(`  mentors   ${mentors.data.map((m) => m.email).join(', ') || '—'}`);

  // The project may be shared with other apps: count its accounts, list none of theirs.
  const emails: string[] = [];
  for (let page = 1; ; page++) {
    const users = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (users.error) throw users.error;
    emails.push(...users.data.users.map((u) => u.email ?? ''));
    if (users.data.users.length < 1000) break;
  }
  const test = emails.filter((e) => e.endsWith('@local.test'));
  if (test.length) ok = false;
  console.log(`  accounts  ${emails.length} in the project (all apps)${test.length ? `   TEST ACCOUNT: ${test.join(', ')}` : ''}`);

  console.log(ok ? '\nOK: no children\'s data, no test account.' : '\nNOT READY: see the lines above.');
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
