// Supabase backend. Children never touch tables: every player call is an RPC that takes the
// session token. Mentors read their team's rows (RLS) and write through mentor_* RPCs.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CourseContent } from '../content/types';
import type { TeamProgress } from '../domain/team';
import {
  ApiError,
  type ActiveContent,
  type AnswerVersion,
  type ContentVersionMeta,
  type DeviceType,
  type LevelState,
  type MentorApi,
  type MentorSession,
  type Mutation,
  type PlayerApi,
  type PlayerState,
  type Profile,
  type QuizAttempt,
  type SectionTiming,
  type TeamSettings,
} from './types';

type Row = Record<string, unknown>;

function toApiError(e: { message?: string; code?: string } | null | undefined): ApiError {
  const msg = e?.message ?? '';
  if (/Failed to fetch|NetworkError|network|Load failed|fetch failed/i.test(msg)) return new ApiError('network', msg);
  for (const code of ['wrong_pin', 'rate_limited', 'not_found', 'unauthorized', 'locked', 'invalid', 'stale'] as const)
    if (msg.includes(code)) return new ApiError(code, msg);
  if (e?.code === '28000' || e?.code === '42501') return new ApiError('unauthorized', msg);
  return new ApiError('unknown', msg);
}

async function rpc<T>(client: SupabaseClient, fn: string, args: Row): Promise<T> {
  let res;
  try {
    res = await client.rpc(fn, args);
  } catch (e) {
    throw toApiError(e as Error);
  }
  if (res.error) throw toApiError(res.error);
  return res.data as T;
}

export function makeClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
}

export class SupabasePlayerApi implements PlayerApi {
  readonly kind = 'supabase' as const;
  constructor(
    private client: SupabaseClient,
    private teamSlug: string,
  ) {}

  async listProfiles() {
    const rows = await rpc<Row[]>(this.client, 'public_profiles', { p_team_slug: this.teamSlug });
    return rows.map((r) => ({ id: r.id as string, displayName: r.display_name as string, avatar: r.avatar as string, pinSet: r.pin_set !== false }));
  }

  async login(profileId: string, pin: string, device: DeviceType) {
    const res = await rpc<{ token?: string; error?: string }>(this.client, 'player_login', {
      p_profile_id: profileId,
      p_pin: pin,
      p_device: device,
    });
    if (res.token) return res.token;
    const code = (res.error ?? 'unknown') as ApiError['code'];
    throw new ApiError(code, code, code === 'rate_limited' ? 15 : undefined);
  }

  async logout(token: string) {
    await rpc(this.client, 'player_logout', { p_token: token });
  }

  async activeContent(): Promise<ActiveContent> {
    const rows = await rpc<{ id: string; content: CourseContent }[]>(this.client, 'public_active_content', {
      p_team_slug: this.teamSlug,
    });
    if (!rows.length) throw new ApiError('not_found', 'No active content');
    return rows[0];
  }

  async settings() {
    return (await rpc<TeamSettings | null>(this.client, 'public_team_settings', { p_team_slug: this.teamSlug })) ?? { dataEpoch: 0 };
  }

  async state(token: string) {
    return rpc<PlayerState>(this.client, 'player_state', { p_token: token });
  }

  async teamProgress(token: string) {
    return rpc<TeamProgress>(this.client, 'player_team_progress', { p_token: token });
  }

  async write(token: string, m: Mutation) {
    await rpc(this.client, 'player_write', { p_token: token, m });
  }

  async reportError(_token: string | null, message: string, context: Record<string, unknown>) {
    await rpc(this.client, 'report_error', { p_team_slug: this.teamSlug, p_message: message, p_context: context });
  }
}

const camel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const camelRow = <T>(r: Row): T => Object.fromEntries(Object.entries(r).map(([k, v]) => [camel(k), v])) as T;

export class SupabaseMentorApi implements MentorApi {
  readonly kind = 'supabase' as const;
  constructor(private client: SupabaseClient) {}

  private async select<T>(table: string, columns = '*'): Promise<T[]> {
    const { data, error } = await this.client.from(table).select(columns);
    if (error) throw toApiError(error);
    return ((data ?? []) as unknown as Row[]).map((r) => camelRow<T>(r));
  }

  async session(): Promise<MentorSession | null> {
    const { data } = await this.client.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;
    const { data: rows, error } = await this.client.from('mentors').select('team_id, email, teams(name)').eq('user_id', user.id);
    if (error) throw toApiError(error);
    const row = rows?.[0] as unknown as { team_id: string; email: string; teams: { name: string } | null } | undefined;
    if (!row) return null;
    return { userId: user.id, email: row.email, teamId: row.team_id, teamName: row.teams?.name ?? '' };
  }

  async signIn(email: string, password: string) {
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw new ApiError('unauthorized', error.message);
    const s = await this.session();
    if (!s) {
      await this.client.auth.signOut();
      throw new ApiError('unauthorized', 'Tài khoản này chưa được thêm vào đội.');
    }
    return s;
  }

  async sendMagicLink(email: string) {
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}/mentor` },
    });
    if (error) throw new ApiError('unknown', error.message);
  }

  async signOut() {
    await this.client.auth.signOut();
  }

  async teamData() {
    const [profiles, levelStates, attempts, answers, timings, contentVersions] = await Promise.all([
      this.select<Profile>('profiles'),
      this.select<LevelState>('level_states'),
      this.select<QuizAttempt>('quiz_attempts'),
      this.select<AnswerVersion>('answer_versions'),
      this.select<SectionTiming>('section_timings'),
      this.select<ContentVersionMeta>('content_versions', 'id, content_version, schema_version, created_at, is_active, uploaded_by'),
    ]);
    return { profiles, levelStates, attempts, answers, timings, contentVersions };
  }

  async contentVersion(id: string) {
    const { data, error } = await this.client.from('content_versions').select('content').eq('id', id).single();
    if (error) throw toApiError(error);
    return (data as { content: CourseContent }).content;
  }

  async uploadContent(content: CourseContent, activate: boolean) {
    const id = await rpc<string>(this.client, 'mentor_upload_content', { p_content: content, p_activate: activate });
    return {
      id,
      contentVersion: content.contentVersion,
      schemaVersion: content.schemaVersion,
      createdAt: new Date().toISOString(),
      isActive: activate,
      uploadedBy: null,
    };
  }

  async activateContent(id: string) {
    await rpc(this.client, 'mentor_activate_content', { p_id: id });
  }

  async createProfile(input: { displayName: string; avatar: string; pin: string }) {
    const id = await rpc<string>(this.client, 'mentor_create_profile', {
      p_name: input.displayName.trim(),
      p_avatar: input.avatar,
      p_pin: input.pin,
    });
    const s = await this.session();
    return {
      id,
      teamId: s?.teamId ?? '',
      displayName: input.displayName.trim(),
      avatar: input.avatar,
      archivedAt: null,
      createdAt: new Date().toISOString(),
    };
  }

  async updateProfile(id: string, input: { displayName?: string; avatar?: string; archived?: boolean }) {
    await rpc(this.client, 'mentor_update_profile', {
      p_id: id,
      p_name: input.displayName?.trim() ?? null,
      p_avatar: input.avatar ?? null,
      p_archived: input.archived ?? null,
    });
  }

  async setPin(id: string, pin: string) {
    await rpc(this.client, 'mentor_set_pin', { p_id: id, p_pin: pin });
  }

  async setLevelControl(ids: string[] | null, levelId: string, change: { override?: 'unlocked' | 'locked' | null; formLocked?: boolean }) {
    await rpc(this.client, 'mentor_set_level_control', { p_ids: ids, p_level: levelId, p_change: change });
  }

  async resetLevel(ids: string[] | null, levelId: string) {
    await rpc(this.client, 'mentor_reset_level', { p_ids: ids, p_level: levelId });
  }

  async deleteProfile(id: string) {
    await rpc(this.client, 'mentor_delete_profile', { p_id: id });
  }

  async deleteTeamData() {
    await rpc(this.client, 'mentor_delete_team_data', {});
  }

  async resetTrialRun() {
    await rpc(this.client, 'mentor_reset_trial', {});
  }

  async settings() {
    return rpc<TeamSettings>(this.client, 'mentor_settings', {});
  }

  async updateSettings(patch: Partial<Omit<TeamSettings, 'dataEpoch'>>) {
    await rpc(this.client, 'mentor_update_settings', { p_patch: patch });
  }

  async listMentors() {
    const rows = await rpc<Row[]>(this.client, 'mentor_list', {});
    return rows.map((r) => ({ userId: r.user_id as string, email: r.email as string }));
  }

  async addMentor(email: string) {
    await rpc(this.client, 'mentor_add', { p_email: email.trim() });
  }

  async errorLog() {
    const { data, error } = await this.client.from('error_log').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) throw toApiError(error);
    return ((data ?? []) as Row[]).map((r) => ({
      id: String(r.id),
      createdAt: r.created_at as string,
      message: r.message as string,
      context: r.context as Record<string, unknown>,
    }));
  }
}
