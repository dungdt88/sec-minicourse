// Records shared by the player app, the mentor console and both backends (Supabase and the
// in-browser local backend). Field names follow FR-C-04.
import type { PartValue } from '../domain/answers';
import type { CourseContent } from '../content/types';
import type { TeamProgress } from '../domain/team';

export type DeviceType = 'phone' | 'tablet' | 'desktop';
export type Section = 'cards' | 'quiz' | 'form';

/** Where the child is inside a level, so they resume at the same card or question (FR-P-07). */
export interface Pointer {
  step: 'intro' | 'cards' | 'quiz' | 'quizEnd' | 'formIntro' | 'form' | 'review' | 'complete';
  index: number;
  /** On a quiz step: the attempt already given here, so a reload shows the feedback, not a new try. */
  attemptId?: string;
}

export interface PublicProfile {
  id: string;
  displayName: string;
  avatar: string;
  /** false: created without a code; with codes on, the child needs the mentor to set one. */
  pinSet?: boolean;
}

export interface Profile extends PublicProfile {
  teamId: string;
  archivedAt: string | null;
  createdAt: string;
}

export interface LevelState {
  profileId: string;
  levelId: string;
  /** Mentor override: force open or closed. null = follow the normal order. */
  override: 'unlocked' | 'locked' | null;
  formLocked: boolean;
  submittedAt: string | null;
  completedAt: string | null;
  resetCount: number;
  pointer: Pointer | null;
  updatedAt: string;
}

export interface QuizAttempt {
  id: string;
  teamId: string;
  profileId: string;
  contentVersionId: string;
  levelId: string;
  questionId: string;
  attemptNo: number;
  seed: number;
  displayedOrder: string[];
  chosenOptionId: string;
  correct: boolean;
  shownAt: string;
  answeredAt: string;
  deviceType: DeviceType;
}

/** One row per version of a part's answer. The latest version is the current answer. */
export interface AnswerVersion {
  id: string;
  teamId: string;
  profileId: string;
  contentVersionId: string;
  levelId: string;
  questionId: string;
  partId: string;
  value: PartValue | null;
  dontKnow: boolean;
  version: number;
  /** Edits in the same visit to a question update one version instead of creating many. */
  editSession: string;
  deviceType: DeviceType;
  createdAt: string;
  updatedAt: string;
}

export interface SectionTiming {
  id: string;
  teamId: string;
  profileId: string;
  levelId: string;
  section: Section;
  contentVersionId: string;
  startedAt: string;
  endedAt: string | null;
}

export interface ContentVersionMeta {
  id: string;
  contentVersion: string;
  schemaVersion: string;
  createdAt: string;
  isActive: boolean;
  uploadedBy: string | null;
}

export interface ActiveContent {
  id: string;
  content: CourseContent;
}

/** Team settings (DR-08 skin) plus the data epoch, which a trial-run reset bumps (FR-M-15). */
export interface TeamSettings {
  skin?: 'plain' | 'halloween';
  /** Friends' progress and the shared candy jar on the child's map (default on). */
  teamProgress?: boolean;
  /** Children enter with their 4-digit code (default off: tap the picture). */
  requirePin?: boolean;
  dataEpoch: number;
}

/** Everything the player needs after unlocking a profile. */
export interface PlayerState {
  /** Writes must carry this epoch; older ones (from before a reset) are refused. */
  dataEpoch: number;
  profile: PublicProfile;
  levels: LevelState[];
  answers: AnswerVersion[]; // latest version per (question, part)
  attempts: QuizAttempt[]; // all attempts of this profile
}

// ---- Player writes. They go through the offline queue (src/api/queue.ts) and are idempotent by id.

interface MutationBase {
  id: string;
  /** Data epoch the write belongs to (FR-M-15). */
  epoch: number;
  contentVersionId: string;
  deviceType: DeviceType;
  at: string;
}

export type Mutation = MutationBase &
  (
    | { kind: 'pointer'; levelId: string; pointer: Pointer }
    | {
        kind: 'quizAttempt';
        levelId: string;
        questionId: string;
        seed: number;
        displayedOrder: string[];
        chosenOptionId: string;
        shownAt: string;
      }
    | {
        kind: 'answer';
        levelId: string;
        questionId: string;
        partId: string;
        value: PartValue | null;
        dontKnow: boolean;
        editSession: string;
      }
    | { kind: 'submit'; levelId: string }
    /** Sent once when a section opens and again (same timingId) when it closes. */
    | { kind: 'timing'; timingId: string; levelId: string; section: Section; startedAt: string; endedAt: string | null }
  );

/** Distributive Omit, so callers can build a Mutation without the queue-filled fields. */
export type MutationInput = Mutation extends infer M ? (M extends Mutation ? Omit<M, 'id' | 'epoch' | 'contentVersionId' | 'deviceType' | 'at'> : never) : never;

export class ApiError extends Error {
  constructor(
    public code: 'wrong_pin' | 'rate_limited' | 'not_found' | 'unauthorized' | 'locked' | 'invalid' | 'stale' | 'network' | 'unknown',
    message?: string,
    public retryAfterMinutes?: number,
  ) {
    super(message ?? code);
  }
  /** Errors that will not fix themselves on retry; the queue drops these. */
  get permanent() {
    return this.code !== 'network' && this.code !== 'unknown';
  }
}

export interface PlayerApi {
  readonly kind: 'supabase' | 'local' | 'preview';
  listProfiles(): Promise<PublicProfile[]>;
  login(profileId: string, pin: string, device: DeviceType): Promise<string>;
  logout(token: string): Promise<void>;
  activeContent(): Promise<ActiveContent>;
  settings(): Promise<TeamSettings>;
  state(token: string): Promise<PlayerState>;
  /** Friends' levels and the team candy total; never answers. */
  teamProgress(token: string): Promise<TeamProgress>;
  write(token: string, m: Mutation): Promise<void>;
  reportError(token: string | null, message: string, context: Record<string, unknown>): Promise<void>;
}

export interface MentorSession {
  userId: string;
  email: string;
  teamId: string;
  teamName: string;
}

/** Everything the console shows. At this scale (a few profiles) loading it all is cheap. */
export interface TeamData {
  profiles: Profile[];
  levelStates: LevelState[];
  attempts: QuizAttempt[];
  answers: AnswerVersion[]; // every version
  timings: SectionTiming[];
  contentVersions: ContentVersionMeta[];
}

export interface ErrorLogEntry {
  id: string;
  createdAt: string;
  message: string;
  context: Record<string, unknown>;
}

export interface MentorApi {
  readonly kind: 'supabase' | 'local';
  session(): Promise<MentorSession | null>;
  signIn(email: string, password: string): Promise<MentorSession>;
  sendMagicLink(email: string): Promise<void>;
  signOut(): Promise<void>;

  teamData(): Promise<TeamData>;
  contentVersion(id: string): Promise<CourseContent>;
  uploadContent(content: CourseContent, activate: boolean): Promise<ContentVersionMeta>;
  activateContent(id: string): Promise<void>;

  createProfile(input: { displayName: string; avatar: string; pin: string }): Promise<Profile>;
  updateProfile(id: string, input: { displayName?: string; avatar?: string; archived?: boolean }): Promise<void>;
  setPin(id: string, pin: string): Promise<void>;

  /** profileIds = null applies to every non-archived profile of the team. */
  setLevelControl(
    profileIds: string[] | null,
    levelId: string,
    change: { override?: 'unlocked' | 'locked' | null; formLocked?: boolean },
  ): Promise<void>;
  resetLevel(profileIds: string[] | null, levelId: string): Promise<void>;

  deleteProfile(id: string): Promise<void>;
  deleteTeamData(): Promise<void>;
  /** FR-M-15: clear answers, attempts, timings and progress; keep profiles, PINs, locks, settings. */
  resetTrialRun(): Promise<void>;
  settings(): Promise<TeamSettings>;
  updateSettings(patch: Partial<Omit<TeamSettings, 'dataEpoch'>>): Promise<void>;

  listMentors(): Promise<{ userId: string; email: string }[]>;
  addMentor(email: string): Promise<void>;
  errorLog(): Promise<ErrorLogEntry[]>;
}
