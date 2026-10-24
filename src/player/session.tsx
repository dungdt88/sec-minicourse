// Player session: content + PIN session + an optimistic local mirror of the child's state.
// Every write is applied to the mirror immediately (instant screens, NFR-02) and queued for the
// server (src/api/queue.ts). On reload, writes still in the queue are re-applied to the mirror.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { CourseContent } from '../content/types';
import { makeT, type Translate } from '../content/strings';
import type { PartAnswer } from '../domain/answers';
import { deviceType, uuid } from '../domain/progress';
import { WriteQueue, type SaveStatus } from '../api/queue';
import {
  ApiError,
  type ActiveContent,
  type LevelState,
  type Mutation,
  type MutationInput,
  type PlayerApi,
  type PlayerState,
} from '../api/types';

// ---------------------------------------------------------------- device memory

const TOKENS_KEY = 'tvt.tokens';
const CONTENT_CACHE_KEY = 'tvt.content.cache';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / full: the app still works for this session */
  }
}

/** PIN sessions remembered on this device, per profile (FR-P-02). */
export const deviceTokens = {
  get: (profileId: string): string | null => readJson<Record<string, string>>(TOKENS_KEY, {})[profileId] ?? null,
  set: (profileId: string, token: string) => writeJson(TOKENS_KEY, { ...readJson(TOKENS_KEY, {}), [profileId]: token }),
  remove: (profileId: string) => {
    const all = readJson<Record<string, string>>(TOKENS_KEY, {});
    delete all[profileId];
    writeJson(TOKENS_KEY, all);
  },
};

/** Content is cached on the device so the first screen shows without waiting for the network. */
export async function loadContent(api: PlayerApi, onFresh?: (c: ActiveContent) => void): Promise<ActiveContent> {
  const cached = api.kind === 'preview' ? null : readJson<ActiveContent | null>(CONTENT_CACHE_KEY, null);
  const fresh = api.activeContent().then((c) => {
    if (api.kind !== 'preview') writeJson(CONTENT_CACHE_KEY, c);
    if (cached && cached.id !== c.id) onFresh?.(c);
    return c;
  });
  if (cached) {
    fresh.catch(() => {});
    return cached;
  }
  return fresh;
}

// ---------------------------------------------------------------- local mirror

export function applyLocal(state: PlayerState, m: Mutation, content: CourseContent): PlayerState {
  const level = (id: string): LevelState =>
    state.levels.find((l) => l.levelId === id) ?? {
      profileId: state.profile.id,
      levelId: id,
      override: null,
      formLocked: false,
      submittedAt: null,
      completedAt: null,
      resetCount: 0,
      pointer: null,
      updatedAt: m.at,
    };
  const withLevel = (l: LevelState) => ({ ...state, levels: [...state.levels.filter((x) => x.levelId !== l.levelId), l] });

  switch (m.kind) {
    case 'pointer':
      return withLevel({ ...level(m.levelId), pointer: m.pointer });
    case 'submit': {
      const l = level(m.levelId);
      return withLevel({ ...l, submittedAt: l.submittedAt ?? m.at, completedAt: l.completedAt ?? m.at });
    }
    case 'quizAttempt': {
      if (state.attempts.some((a) => a.id === m.id)) return state;
      const q = content.levels.flatMap((l) => l.quiz).find((x) => x.id === m.questionId);
      const prev = state.attempts.filter((a) => a.questionId === m.questionId);
      return {
        ...state,
        attempts: [
          ...state.attempts,
          {
            id: m.id,
            teamId: '',
            profileId: state.profile.id,
            contentVersionId: m.contentVersionId,
            levelId: m.levelId,
            questionId: m.questionId,
            attemptNo: prev.length + 1,
            seed: m.seed,
            displayedOrder: m.displayedOrder,
            chosenOptionId: m.chosenOptionId,
            correct: !!q?.options.find((o) => o.id === m.chosenOptionId)?.correct,
            shownAt: m.shownAt,
            answeredAt: m.at,
            deviceType: m.deviceType,
          },
        ],
      };
    }
    case 'answer': {
      const others = state.answers.filter((a) => !(a.questionId === m.questionId && a.partId === m.partId));
      const prev = state.answers.find((a) => a.questionId === m.questionId && a.partId === m.partId);
      return {
        ...state,
        answers: [
          ...others,
          {
            id: m.id,
            teamId: '',
            profileId: state.profile.id,
            contentVersionId: m.contentVersionId,
            levelId: m.levelId,
            questionId: m.questionId,
            partId: m.partId,
            value: m.value,
            dontKnow: m.dontKnow,
            version: prev && prev.editSession === m.editSession ? prev.version : (prev?.version ?? 0) + 1,
            editSession: m.editSession,
            deviceType: m.deviceType,
            createdAt: prev?.editSession === m.editSession ? prev.createdAt : m.at,
            updatedAt: m.at,
          },
        ],
      };
    }
    case 'timing':
      return state;
  }
}

// ---------------------------------------------------------------- context

interface PlayerContextValue {
  api: PlayerApi;
  token: string;
  content: CourseContent;
  contentVersionId: string;
  t: Translate;
  state: PlayerState;
  base: string;
  preview: boolean;
  saveStatus: SaveStatus;
  /** Applies a write locally and queues it; returns the mutation id (= quiz attempt id). */
  write: (m: MutationInput) => string;
  answer: (questionId: string, partId: string) => PartAnswer | undefined;
  levelState: (levelId: string) => LevelState | undefined;
  /** Waits for queued writes; false if some are still unsaved (offline). */
  flush: () => Promise<boolean>;
  notice: string | null;
  clearNotice: () => void;
}

const Ctx = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePlayer outside PlayerSessionProvider');
  return v;
}

interface ProviderProps {
  api: PlayerApi;
  token: string;
  content: ActiveContent;
  initialState: PlayerState;
  queue: WriteQueue;
  base: string;
  children: React.ReactNode;
}

export function PlayerSessionProvider({ api, token, content, initialState, queue, base, children }: ProviderProps) {
  const [state, setState] = useState(() =>
    queue.pending(token).reduce((s, m) => applyLocal(s, m, content.content), initialState),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const device = useRef(deviceType()).current;
  const saveStatus = useSyncExternalStore(
    (fn) => queue.subscribe(fn),
    () => queue.status,
  );
  const t = useMemo(() => makeT(content.content.ui), [content]);

  useEffect(() => {
    queue.onPermanentError = (m: Mutation, e: ApiError) => {
      if (e.code === 'locked') setNotice(t('formLocked'));
      else if (e.code === 'unauthorized') setNotice(t('offlineStart'));
      // Only the kind and level go to the log, never the answer itself (NFR-12).
      void api.reportError(token, `write rejected: ${e.code}`, { kind: m.kind, levelId: m.levelId }).catch(() => {});
    };
  }, [api, queue, t, token]);

  const write = useCallback(
    (input: MutationInput) => {
      const m = { ...input, id: uuid(), contentVersionId: content.id, deviceType: device, at: new Date().toISOString() } as Mutation;
      setState((s) => applyLocal(s, m, content.content));
      queue.enqueue(token, m);
      return m.id;
    },
    [content, device, queue, token],
  );

  const value = useMemo<PlayerContextValue>(
    () => ({
      api,
      token,
      content: content.content,
      contentVersionId: content.id,
      t,
      state,
      base,
      preview: api.kind === 'preview',
      saveStatus,
      write,
      answer: (q, p) => {
        const a = state.answers.find((x) => x.questionId === q && x.partId === p);
        return a ? { value: a.value, dontKnow: a.dontKnow } : undefined;
      },
      levelState: (id) => state.levels.find((l) => l.levelId === id),
      flush: () => queue.drain(),
      notice,
      clearNotice: () => setNotice(null),
    }),
    [api, token, content, t, state, base, saveStatus, write, queue, notice],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { ApiError };
