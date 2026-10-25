// One-time setup of a Supabase project (local or hosted): team, first mentor, content, profiles.
// Safe to run again: it skips what already exists. It creates only what the variables below
// name: no demo children, no answers, no test mentor.
//
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… SUPABASE_ANON_KEY=… \
//   MENTOR_EMAIL=you@example.com MENTOR_PASSWORD=… MENTOR_LABEL="bố Trí" \
//   PROFILES="An:🦊,Bình:🐼:2222" pnpm bootstrap
//
// PROFILES: name:avatar[:4-digit code], in the order the picker shows them. Without a code the
// child taps their picture (codes are off for a new team); a code can be set later in "Các con".
// A new team starts with: Halloween skin on, team progress on, codes off.
//
// The service role key is used only here, on your machine; it never goes into the app.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { validateContent } from '../src/content/validate';

const env = (k: string, fallback?: string) => {
  const v = process.env[k] ?? fallback;
  if (v == null) throw new Error(`Set ${k}`);
  return v;
};

const url = env('SUPABASE_URL');
const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
const anonKey = env('SUPABASE_ANON_KEY');
const slug = env('TEAM_SLUG', 'default');
const teamName = env('TEAM_NAME', 'Đội Magic');
const email = env('MENTOR_EMAIL').toLowerCase();
const password = env('MENTOR_PASSWORD');
const contentFile = env('CONTENT_FILE', 'content/course-content.json');
// What the children call the mentor in kid-facing text; see TeamSettings.mentorLabel.
const mentorLabel = process.env.MENTOR_LABEL?.trim();
const profilesSpec = process.env.PROFILES ?? '';

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  // Team
  let { data: team } = await admin.from('teams').select('id').eq('slug', slug).maybeSingle();
  if (!team) {
    const settings = { skin: 'halloween', teamProgress: true, requirePin: false, ...(mentorLabel ? { mentorLabel } : {}) };
    const res = await admin.from('teams').insert({ slug, name: teamName, settings }).select('id').single();
    if (res.error) throw res.error;
    team = res.data;
    console.log(`team "${slug}" created`);
  } else if (mentorLabel) {
    const cur = await admin.from('teams').select('settings').eq('id', team.id).single();
    if (cur.error) throw cur.error;
    const up = await admin.from('teams').update({ settings: { ...cur.data.settings, mentorLabel } }).eq('id', team.id);
    if (up.error) throw up.error;
  }
  if (mentorLabel) console.log(`children call the mentor "${mentorLabel}"`);

  // Mentor account
  let userId: string | undefined;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.data.user) {
    userId = created.data.user.id;
    console.log(`mentor ${email} created`);
  } else {
    const list = await admin.auth.admin.listUsers({ perPage: 1000 });
    userId = list.data.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (!userId) throw created.error ?? new Error('could not create mentor');
    console.log(`mentor ${email} exists`);
  }
  const m = await admin.from('mentors').upsert({ user_id: userId, team_id: team!.id, email }, { onConflict: 'user_id' });
  if (m.error) throw m.error;

  // From here on act as the mentor, through the same functions the console uses.
  const mentor = createClient(url, anonKey, { auth: { persistSession: false } });
  const signIn = await mentor.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;

  const { data: active } = await mentor.from('content_versions').select('id').eq('is_active', true).maybeSingle();
  if (!active) {
    const json = JSON.parse(readFileSync(contentFile, 'utf8'));
    const check = validateContent(json);
    if (!check.ok) throw new Error(`content invalid:\n${check.errors.map((e) => `  [${e.id}] ${e.where}: ${e.message}`).join('\n')}`);
    const up = await mentor.rpc('mentor_upload_content', { p_content: json, p_activate: true });
    if (up.error) throw up.error;
    console.log(`content ${json.contentVersion} uploaded and active`);
  } else console.log('content already active');

  const { data: existing } = await mentor.from('profiles').select('display_name');
  const have = new Set((existing ?? []).map((p: { display_name: string }) => p.display_name));
  for (const spec of profilesSpec.split(',').map((s) => s.trim()).filter(Boolean)) {
    const [name, avatar, pin = ''] = spec.split(':');
    if (have.has(name)) continue;
    // No code: the server stores a random one and marks the profile as having none (pin_set).
    const r = await mentor.rpc('mentor_create_profile', { p_name: name, p_avatar: avatar, p_pin: pin });
    if (r.error) throw r.error;
    console.log(`profile ${name} created`);
  }
  console.log('done');
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
