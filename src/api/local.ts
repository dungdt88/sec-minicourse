// In-browser backend: the whole "database" lives in localStorage. Used for development without
// Supabase (`pnpm dev:local`), for demos, and in tests. It mirrors the rules of the SQL functions
// in supabase/migrations: append-only quiz attempts, versioned answers, form locks.
//
// It is NOT secure (anyone with the device can read it) and must never hold real children's data.

import type { CourseContent } from '../content/types';
import { uuid } from '../domain/progress';
import {
  ApiError,
  type ActiveContent,
  type AnswerVersion,
  type ContentVersionMeta,
  type DeviceType,
  type ErrorLogEntry,
  type LevelState,
  type MentorApi,
  type MentorSession,
  type Mutation,
  type PlayerApi,
  type PlayerState,
  type Profile,
  type PublicProfile,
  type QuizAttempt,
  type SectionTiming,
  type TeamData,
  type TeamSettings,
} from './types';

interface LocalDb {
  teamId: string;
  teamName: string;
  contents: (ContentVersionMeta & { content: CourseContent })[];
  profiles: Profile[];
  pins: Record<string, string>;
  sessions: Record<string, string>; // token -> profileId
  pinFailures: Record<string, string[]>; // profileId -> ISO times
  levelStates: LevelState[];
  attempts: QuizAttempt[];
  answers: AnswerVersion[];
  timings: SectionTiming[];
  mentors: { userId: string; email: string }[];
  mentorSession: MentorSession | null;
  errors: ErrorLogEntry[];
  /** Added with RFP v1.1; absent in older saved databases. */
  settings?: { skin?: 'plain' | 'halloween' };
  epoch?: number;
}

const KEY = 'tvt.localdb.v1';
export const LOCAL_MENTOR_PASSWORD = 'mentor';
const DEMO_PROFILES: [string, string, string][] = [
  ['An', '🦊', '1111'],
  ['Bình', '🐼', '2222'],
  ['Chi', '🦄', '3333'],
  ['Dũng', '🐢', '4444'],
];

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`tvt-local:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const now = () => new Date().toISOString();
const clientTime = (at: string | null | undefined) => {
  const t = at ? Date.parse(at) : NaN;
  const limit = Date.now() + 5 * 60_000;
  return new Date(Number.isFinite(t) ? Math.min(t, limit) : Date.now()).toISOString();
};

export class LocalStore {
  private db: LocalDb | null = null;

  constructor(
    private seedContent: () => Promise<CourseContent>,
    private storage: Storage = localStorage,
  ) {}

  async load(): Promise<LocalDb> {
    if (this.db) return this.db;
    const raw = this.storage.getItem(KEY);
    if (raw) {
      this.db = JSON.parse(raw) as LocalDb;
      return this.db;
    }
    const content = await this.seedContent();
    const teamId = uuid();
    const db: LocalDb = {
      teamId,
      teamName: 'Đội Magic',
      contents: [
        {
          id: uuid(),
          contentVersion: content.contentVersion,
          schemaVersion: content.schemaVersion,
          createdAt: now(),
          isActive: true,
          uploadedBy: null,
          content,
        },
      ],
      profiles: [],
      pins: {},
      sessions: {},
      pinFailures: {},
      levelStates: [],
      attempts: [],
      answers: [],
      timings: [],
      mentors: [{ userId: 'local-mentor', email: 'mentor@local' }],
      mentorSession: null,
      errors: [],
    };
    for (const [name, avatar, pin] of DEMO_PROFILES) {
      const id = uuid();
      db.profiles.push({ id, teamId, displayName: name, avatar, archivedAt: null, createdAt: now() });
      db.pins[id] = await hashPin(pin);
    }
    this.db = db;
    this.save();
    return db;
  }

  save() {
    if (this.db) this.storage.setItem(KEY, JSON.stringify(this.db));
  }

  reset() {
    this.storage.removeItem(KEY);
    this.db = null;
  }

  // ---- shared rules

  ensureLevel(db: LocalDb, profileId: string, levelId: string): LevelState {
    let s = db.levelStates.find((x) => x.profileId === profileId && x.levelId === levelId);
    if (!s) {
      s = {
        profileId,
        levelId,
        override: null,
        formLocked: false,
        submittedAt: null,
        completedAt: null,
        resetCount: 0,
        pointer: null,
        updatedAt: now(),
      };
      db.levelStates.push(s);
    }
    return s;
  }

  applyMutation(db: LocalDb, profile: Profile, m: Mutation) {
    // Same rule as player_write: writes from before a trial-run reset are refused for good.
    if ((m.epoch ?? 0) !== (db.epoch ?? 0)) throw new ApiError('stale');
    const cv = db.contents.find((c) => c.id === m.contentVersionId) ?? db.contents.find((c) => c.isActive)!;
    const at = clientTime(m.at);
    switch (m.kind) {
      case 'pointer': {
        const s = this.ensureLevel(db, profile.id, m.levelId);
        s.pointer = m.pointer;
        s.updatedAt = now();
        break;
      }
      case 'quizAttempt': {
        if (db.attempts.some((a) => a.id === m.id)) return;
        const q = cv.content.levels.flatMap((l) => l.quiz).find((x) => x.id === m.questionId);
        const correct = !!q?.options.find((o) => o.id === m.chosenOptionId)?.correct;
        const previous = db.attempts.filter((a) => a.profileId === profile.id && a.questionId === m.questionId);
        db.attempts.push({
          id: m.id,
          teamId: db.teamId,
          profileId: profile.id,
          contentVersionId: cv.id,
          levelId: m.levelId,
          questionId: m.questionId,
          attemptNo: previous.reduce((n, a) => Math.max(n, a.attemptNo), 0) + 1,
          seed: m.seed,
          displayedOrder: m.displayedOrder,
          chosenOptionId: m.chosenOptionId,
          correct,
          shownAt: clientTime(m.shownAt),
          answeredAt: at,
          deviceType: m.deviceType,
        });
        break;
      }
      case 'answer': {
        const s = db.levelStates.find((x) => x.profileId === profile.id && x.levelId === m.levelId);
        if (s?.formLocked) throw new ApiError('locked');
        const versions = db.answers.filter(
          (a) => a.profileId === profile.id && a.questionId === m.questionId && a.partId === m.partId,
        );
        const latest = versions.sort((a, b) => b.version - a.version)[0];
        if (latest && latest.editSession === m.editSession) {
          latest.value = m.value;
          latest.dontKnow = m.dontKnow;
          latest.updatedAt = at < latest.createdAt ? latest.createdAt : at;
          latest.deviceType = m.deviceType;
        } else if (!db.answers.some((a) => a.id === m.id)) {
          db.answers.push({
            id: m.id,
            teamId: db.teamId,
            profileId: profile.id,
            contentVersionId: cv.id,
            levelId: m.levelId,
            questionId: m.questionId,
            partId: m.partId,
            value: m.value,
            dontKnow: m.dontKnow,
            version: (latest?.version ?? 0) + 1,
            editSession: m.editSession,
            deviceType: m.deviceType,
            createdAt: at,
            updatedAt: at,
          });
        }
        break;
      }
      case 'submit': {
        const s = this.ensureLevel(db, profile.id, m.levelId);
        s.submittedAt ??= at;
        s.completedAt ??= at;
        s.updatedAt = now();
        break;
      }
      case 'timing': {
        const t = db.timings.find((x) => x.id === m.timingId);
        if (t) t.endedAt = m.endedAt ? clientTime(m.endedAt) : t.endedAt;
        else
          db.timings.push({
            id: m.timingId,
            teamId: db.teamId,
            profileId: profile.id,
            levelId: m.levelId,
            section: m.section,
            contentVersionId: cv.id,
            startedAt: clientTime(m.startedAt),
            endedAt: m.endedAt ? clientTime(m.endedAt) : null,
          });
        break;
      }
    }
  }
}

export function latestAnswers(answers: AnswerVersion[]): AnswerVersion[] {
  const map = new Map<string, AnswerVersion>();
  for (const a of answers) {
    const key = `${a.profileId}/${a.questionId}/${a.partId}`;
    const cur = map.get(key);
    if (!cur || a.version > cur.version) map.set(key, a);
  }
  return [...map.values()];
}

export class LocalPlayerApi implements PlayerApi {
  constructor(
    private store: LocalStore,
    readonly kind: 'local' | 'preview' = 'local',
  ) {}

  private async profileFor(token: string): Promise<[LocalDb, Profile]> {
    const db = await this.store.load();
    const id = db.sessions[token];
    const profile = db.profiles.find((p) => p.id === id && !p.archivedAt);
    if (!profile) throw new ApiError('unauthorized');
    return [db, profile];
  }

  async listProfiles(): Promise<PublicProfile[]> {
    const db = await this.store.load();
    return db.profiles.filter((p) => !p.archivedAt).map(({ id, displayName, avatar }) => ({ id, displayName, avatar }));
  }

  async login(profileId: string, pin: string, _device: DeviceType): Promise<string> {
    const db = await this.store.load();
    const profile = db.profiles.find((p) => p.id === profileId && !p.archivedAt);
    if (!profile) throw new ApiError('not_found');
    const cutoff = Date.now() - 15 * 60_000;
    const failures = (db.pinFailures[profileId] ?? []).filter((t) => Date.parse(t) > cutoff);
    if (failures.length >= 5) throw new ApiError('rate_limited', undefined, 15);
    if (db.pins[profileId] !== (await hashPin(pin))) {
      db.pinFailures[profileId] = [...failures, now()];
      this.store.save();
      throw new ApiError('wrong_pin');
    }
    db.pinFailures[profileId] = [];
    const token = uuid();
    db.sessions[token] = profileId;
    this.store.save();
    return token;
  }

  async logout(token: string) {
    const db = await this.store.load();
    delete db.sessions[token];
    this.store.save();
  }

  async activeContent(): Promise<ActiveContent> {
    const db = await this.store.load();
    const c = db.contents.find((x) => x.isActive)!;
    return { id: c.id, content: c.content };
  }

  async settings(): Promise<TeamSettings> {
    const db = await this.store.load();
    return { skin: 'halloween', ...db.settings, dataEpoch: db.epoch ?? 0 };
  }

  async state(token: string): Promise<PlayerState> {
    const [db, p] = await this.profileFor(token);
    return {
      dataEpoch: db.epoch ?? 0,
      profile: { id: p.id, displayName: p.displayName, avatar: p.avatar },
      levels: db.levelStates.filter((s) => s.profileId === p.id),
      answers: latestAnswers(db.answers.filter((a) => a.profileId === p.id)),
      attempts: db.attempts.filter((a) => a.profileId === p.id),
    };
  }

  async write(token: string, m: Mutation) {
    const [db, p] = await this.profileFor(token);
    this.store.applyMutation(db, p, m);
    this.store.save();
  }

  async reportError(_token: string | null, message: string, context: Record<string, unknown>) {
    const db = await this.store.load();
    db.errors.unshift({ id: uuid(), createdAt: now(), message: message.slice(0, 500), context });
    db.errors = db.errors.slice(0, 200);
    this.store.save();
  }
}

export class LocalMentorApi implements MentorApi {
  readonly kind = 'local' as const;
  constructor(private store: LocalStore) {}

  private async db(): Promise<LocalDb> {
    const db = await this.store.load();
    if (!db.mentorSession) throw new ApiError('unauthorized');
    return db;
  }

  private targets(db: LocalDb, ids: string[] | null) {
    return db.profiles.filter((p) => !p.archivedAt && (ids == null || ids.includes(p.id)));
  }

  async session() {
    return (await this.store.load()).mentorSession;
  }

  async signIn(email: string, password: string) {
    const db = await this.store.load();
    const mentor = db.mentors.find((m) => m.email === email.trim().toLowerCase());
    if (!mentor || password !== LOCAL_MENTOR_PASSWORD) throw new ApiError('unauthorized', 'Sai email hoặc mật khẩu');
    db.mentorSession = { userId: mentor.userId, email: mentor.email, teamId: db.teamId, teamName: db.teamName };
    this.store.save();
    return db.mentorSession;
  }

  async sendMagicLink() {
    throw new ApiError('invalid', 'Bản chạy thử trên máy không gửi email. Dùng mật khẩu.');
  }

  async signOut() {
    const db = await this.store.load();
    db.mentorSession = null;
    this.store.save();
  }

  async teamData(): Promise<TeamData> {
    const db = await this.db();
    return structuredClone({
      profiles: db.profiles,
      levelStates: db.levelStates,
      attempts: db.attempts,
      answers: db.answers,
      timings: db.timings,
      contentVersions: db.contents.map(({ content: _c, ...meta }) => meta),
    });
  }

  async contentVersion(id: string) {
    const db = await this.db();
    const c = db.contents.find((x) => x.id === id);
    if (!c) throw new ApiError('not_found');
    return structuredClone(c.content);
  }

  async uploadContent(content: CourseContent, activate: boolean) {
    const db = await this.db();
    const { validateContent } = await import('../content/validate');
    const result = validateContent(content);
    if (!result.ok) throw new ApiError('invalid', result.errors.map((e) => `${e.where}: ${e.message}`).join('\n'));
    if (activate) db.contents.forEach((c) => (c.isActive = false));
    const meta: ContentVersionMeta = {
      id: uuid(),
      contentVersion: content.contentVersion,
      schemaVersion: content.schemaVersion,
      createdAt: now(),
      isActive: activate,
      uploadedBy: db.mentorSession!.userId,
    };
    db.contents.push({ ...meta, content });
    this.store.save();
    return meta;
  }

  async activateContent(id: string) {
    const db = await this.db();
    if (!db.contents.some((c) => c.id === id)) throw new ApiError('not_found');
    db.contents.forEach((c) => (c.isActive = c.id === id));
    this.store.save();
  }

  async createProfile(input: { displayName: string; avatar: string; pin: string }) {
    const db = await this.db();
    if (!/^\d{4}$/.test(input.pin)) throw new ApiError('invalid', 'Mã gồm 4 chữ số');
    const p: Profile = {
      id: uuid(),
      teamId: db.teamId,
      displayName: input.displayName.trim(),
      avatar: input.avatar,
      archivedAt: null,
      createdAt: now(),
    };
    db.profiles.push(p);
    db.pins[p.id] = await hashPin(input.pin);
    this.store.save();
    return p;
  }

  async updateProfile(id: string, input: { displayName?: string; avatar?: string; archived?: boolean }) {
    const db = await this.db();
    const p = db.profiles.find((x) => x.id === id);
    if (!p) throw new ApiError('not_found');
    if (input.displayName != null) p.displayName = input.displayName.trim();
    if (input.avatar != null) p.avatar = input.avatar;
    if (input.archived != null) p.archivedAt = input.archived ? (p.archivedAt ?? now()) : null;
    if (input.archived) for (const [t, pid] of Object.entries(db.sessions)) if (pid === id) delete db.sessions[t];
    this.store.save();
  }

  async setPin(id: string, pin: string) {
    const db = await this.db();
    if (!/^\d{4}$/.test(pin)) throw new ApiError('invalid', 'Mã gồm 4 chữ số');
    db.pins[id] = await hashPin(pin);
    db.pinFailures[id] = [];
    for (const [t, pid] of Object.entries(db.sessions)) if (pid === id) delete db.sessions[t];
    this.store.save();
  }

  async setLevelControl(ids: string[] | null, levelId: string, change: { override?: 'unlocked' | 'locked' | null; formLocked?: boolean }) {
    const db = await this.db();
    for (const p of this.targets(db, ids)) {
      const s = this.store.ensureLevel(db, p.id, levelId);
      if ('override' in change) s.override = change.override ?? null;
      if (change.formLocked != null) s.formLocked = change.formLocked;
      s.updatedAt = now();
    }
    this.store.save();
  }

  async resetLevel(ids: string[] | null, levelId: string) {
    const db = await this.db();
    for (const p of this.targets(db, ids)) {
      const s = db.levelStates.find((x) => x.profileId === p.id && x.levelId === levelId);
      if (!s) continue;
      s.submittedAt = null;
      s.completedAt = null;
      s.pointer = null;
      s.resetCount += 1;
      s.updatedAt = now();
    }
    this.store.save();
  }

  async deleteProfile(id: string) {
    const db = await this.db();
    db.profiles = db.profiles.filter((p) => p.id !== id);
    delete db.pins[id];
    delete db.pinFailures[id];
    for (const [t, pid] of Object.entries(db.sessions)) if (pid === id) delete db.sessions[t];
    db.levelStates = db.levelStates.filter((x) => x.profileId !== id);
    db.attempts = db.attempts.filter((x) => x.profileId !== id);
    db.answers = db.answers.filter((x) => x.profileId !== id);
    db.timings = db.timings.filter((x) => x.profileId !== id);
    this.store.save();
  }

  async deleteTeamData() {
    const db = await this.db();
    for (const p of [...db.profiles]) await this.deleteProfile(p.id);
    db.errors = [];
    this.store.save();
  }

  async resetTrialRun() {
    const db = await this.db();
    db.attempts = [];
    db.answers = [];
    db.timings = [];
    for (const s of db.levelStates) {
      s.pointer = null;
      s.submittedAt = null;
      s.completedAt = null;
      s.resetCount = 0;
      s.updatedAt = now();
    }
    db.epoch = (db.epoch ?? 0) + 1;
    this.store.save();
  }

  async settings(): Promise<TeamSettings> {
    const db = await this.db();
    return { skin: 'halloween', ...db.settings, dataEpoch: db.epoch ?? 0 };
  }

  async updateSettings(patch: Partial<Omit<TeamSettings, 'dataEpoch'>>) {
    const db = await this.db();
    db.settings = { ...db.settings, ...patch };
    this.store.save();
  }

  async listMentors() {
    return (await this.db()).mentors;
  }

  async addMentor(email: string) {
    const db = await this.db();
    const e = email.trim().toLowerCase();
    if (!db.mentors.some((m) => m.email === e)) db.mentors.push({ userId: uuid(), email: e });
    this.store.save();
  }

  async errorLog() {
    return (await this.db()).errors;
  }
}
