// Picks the backend from VITE_BACKEND. The mentor console and the player app share one instance.
// Both backends are loaded on demand so the children's bundle only carries the one in use.
import type { CourseContent } from '../content/types';
import type { MentorApi, PlayerApi } from './types';
import type { LocalStore } from './local';

export const BACKEND = (import.meta.env.VITE_BACKEND as string | undefined) ?? 'supabase';
export const TEAM_SLUG = (import.meta.env.VITE_TEAM_SLUG as string | undefined) ?? 'default';

let player: Promise<PlayerApi> | null = null;
let mentor: Promise<MentorApi> | null = null;
let localStore: Promise<LocalStore> | null = null;

function local(): Promise<LocalStore> {
  // The supplied content file seeds the in-browser database on first run.
  localStore ??= import('./local').then(
    ({ LocalStore }) => new LocalStore(async () => (await import('../../content/course-content.json')).default as unknown as CourseContent),
  );
  return localStore;
}

let client: ReturnType<typeof supabaseClient> | null = null;
async function supabaseClient() {
  const { makeClient } = await import('./supabase');
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set (see .env.example)');
  return makeClient(url, key);
}

export function playerApi(): Promise<PlayerApi> {
  player ??= (async () => {
    if (BACKEND === 'local') {
      const { LocalPlayerApi } = await import('./local');
      return new LocalPlayerApi(await local());
    }
    const { SupabasePlayerApi } = await import('./supabase');
    return new SupabasePlayerApi(await (client ??= supabaseClient()), TEAM_SLUG);
  })();
  return player;
}

export function mentorApi(): Promise<MentorApi> {
  mentor ??= (async () => {
    if (BACKEND === 'local') {
      const { LocalMentorApi } = await import('./local');
      return new LocalMentorApi(await local());
    }
    const { SupabaseMentorApi } = await import('./supabase');
    return new SupabaseMentorApi(await (client ??= supabaseClient()));
  })();
  return mentor;
}
