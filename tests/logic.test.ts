import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { newOptionOrder, seededShuffle } from '../src/domain/shuffle';
import { levelStatuses, todayLevel } from '../src/domain/progress';
import { WriteQueue } from '../src/api/queue';
import { ApiError, type LevelState, type Mutation, type PlayerApi, type TeamData } from '../src/api/types';
import { compareRows } from '../src/mentor/derive';
import { voteSheetText } from '../src/mentor/pages/Compare';
import { makeT } from '../src/content/strings';
import type { CourseContent } from '../src/content/types';
import { homeworkHighlighted, remindLevels } from '../src/player/Home';

const content = JSON.parse(readFileSync('content/course-content.json', 'utf8')) as CourseContent;

describe('quiz shuffle', () => {
  it('is reproducible from the seed', () => {
    expect(seededShuffle(['a', 'b', 'c'], 42)).toEqual(seededShuffle(['a', 'b', 'c'], 42));
  });
  it('never repeats the previous order', () => {
    for (let seed = 0; seed < 500; seed++) {
      const prev = seededShuffle(['a', 'b', 'c'], seed + 1000);
      const { order } = newOptionOrder(['a', 'b', 'c'], prev, seed);
      expect(order.join()).not.toBe(prev.join());
      expect([...order].sort()).toEqual(['a', 'b', 'c']);
    }
  });
  it('puts the correct answer in every position over many plays', () => {
    const seen = new Set<number>();
    for (let seed = 0; seed < 50; seed++) seen.add(newOptionOrder(['a', 'b', 'c'], null, seed).order.indexOf('b'));
    expect(seen.size).toBe(3);
  });
});

const state = (levelId: string, s: Partial<LevelState>): LevelState => ({
  profileId: 'p',
  levelId,
  override: null,
  formLocked: false,
  submittedAt: null,
  completedAt: null,
  resetCount: 0,
  pointer: null,
  updatedAt: '',
  ...s,
});

describe('level statuses', () => {
  const levels = content.levels;
  it('unlocks in order', () => {
    const st = levelStatuses(levels, []);
    expect(st.get('L1')).toBe('available');
    expect(st.get('L2')).toBe('locked');
    const after = levelStatuses(levels, [state('L1', { completedAt: 'x' })]);
    expect(after.get('L1')).toBe('done');
    expect(after.get('L2')).toBe('available');
    expect(todayLevel(levels, after)?.id).toBe('L2');
  });
  it('mentor overrides win', () => {
    const st = levelStatuses(levels, [state('L5', { override: 'unlocked' }), state('L1', { override: 'locked' })]);
    expect(st.get('L5')).toBe('available');
    expect(st.get('L1')).toBe('locked');
  });
  it('the optional playtest is highlighted right after level 3 (content .12)', () => {
    expect(homeworkHighlighted(remindLevels(undefined), [])).toBe(false);
    expect(homeworkHighlighted(remindLevels(undefined), [1, 2])).toBe(false);
    expect(homeworkHighlighted(remindLevels(undefined), [1, 2, 3])).toBe(true);
    expect(homeworkHighlighted(remindLevels(undefined), [1, 2, 3, 4])).toBe(false);
  });
});

describe('write queue', () => {
  const m = (id: string): Mutation => ({ id, epoch: 0, kind: 'submit', levelId: 'L1', contentVersionId: 'c', deviceType: 'phone', at: '' });
  const memory = () => {
    const map = new Map<string, string>();
    return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) } as unknown as Storage;
  };

  it('keeps writes while offline and sends them in order when back', async () => {
    vi.useFakeTimers();
    let online = false;
    const sent: string[] = [];
    const api = { write: async (_t: string, x: Mutation) => { if (!online) throw new ApiError('network'); sent.push(x.id); } } as unknown as PlayerApi;
    const storage = memory();
    const q = new WriteQueue(api, storage);
    q.enqueue('tok', m('1'));
    q.enqueue('tok', m('2'));
    await vi.advanceTimersByTimeAsync(10);
    expect(q.status).toBe('offline');
    expect(q.pending('tok').map((x) => x.id)).toEqual(['1', '2']);
    // A reload in the meantime still has them.
    expect(new WriteQueue(api, storage).pending('tok')).toHaveLength(2);
    online = true;
    await vi.advanceTimersByTimeAsync(5000);
    expect(sent).toEqual(['1', '2']);
    expect(q.status).toBe('saved');
    vi.useRealTimers();
  });

  it('drops a write the server refuses for good and reports it', async () => {
    const api = { write: async () => { throw new ApiError('locked'); } } as unknown as PlayerApi;
    const q = new WriteQueue(api, memory());
    const refused: string[] = [];
    q.onPermanentError = (x, e) => refused.push(`${x.id}:${e.code}`);
    q.enqueue('tok', m('9'));
    await q.drain();
    expect(refused).toEqual(['9:locked']);
    expect(q.size).toBe(0);
  });
});

describe('compare view', () => {
  const answer = (profileId: string, value: unknown) => ({
    id: profileId, teamId: 't', profileId, contentVersionId: 'c', levelId: 'L4', questionId: 'L4F1', partId: 'a',
    value, dontKnow: false, version: 1, editSession: 's', deviceType: 'phone' as const, createdAt: '', updatedAt: '',
  });
  const data = (answers: ReturnType<typeof answer>[]): TeamData => ({
    profiles: ['p1', 'p2'].map((id, i) => ({ id, teamId: 't', displayName: id, avatar: '', archivedAt: null, createdAt: String(i) })),
    levelStates: [], attempts: [], timings: [], contentVersions: [], answers: answers as TeamData['answers'],
  });
  const row = (d: TeamData) => compareRows(content, d).find((r) => r.question.id === 'L4F1' && r.part.id === 'a')!;

  it('flags different choices', () => {
    expect(row(data([answer('p1', { optionId: 'a' }), answer('p2', { optionId: 'b' })])).flagged).toBe(true);
  });
  it('does not flag agreement or a single answer', () => {
    expect(row(data([answer('p1', { optionId: 'a' }), answer('p2', { optionId: 'a' })])).flagged).toBe(false);
    expect(row(data([answer('p1', { optionId: 'a' })])).flagged).toBe(false);
  });
});

describe('Zoom vote sheet as text', () => {
  it('lists each flagged question with its options, who chose them and a blank for votes', () => {
    const answer = (profileId: string, optionId: string) => ({
      id: profileId, teamId: 't', profileId, contentVersionId: 'c', levelId: 'L4', questionId: 'L4F1', partId: 'a',
      value: { optionId }, dontKnow: false, version: 1, editSession: 's', deviceType: 'phone' as const, createdAt: '', updatedAt: '',
    });
    const data: TeamData = {
      profiles: ['An', 'Bình'].map((id, i) => ({ id, teamId: 't', displayName: id, avatar: '', archivedAt: null, createdAt: String(i) })),
      levelStates: [], attempts: [], timings: [], contentVersions: [],
      answers: [answer('An', 'a'), answer('Bình', 'b')] as TeamData['answers'],
    };
    const flagged = compareRows(content, data).filter((r) => r.flagged);
    const text = voteSheetText(flagged, data.profiles, content, makeT(content.ui));
    expect(text).toContain('1. Đội bán gì? Vì sao?');
    expect(text).toContain('- Bộ trò chơi để mang về (An): ___ phiếu');
    expect(text).toContain('- Vé chơi tại chỗ (Bình): ___ phiếu');
    expect(text).toContain('- Cả hai: ___ phiếu');
  });
});

describe('answers for homework items the content no longer has (.12 dropped H1, H3, H4, H5)', () => {
  it('exports and the compare view still work', async () => {
    const { teamCsvFiles } = await import('../src/mentor/exports');
    const old = {
      id: 'x', teamId: 't', profileId: 'p1', contentVersionId: 'gone', levelId: 'HW', questionId: 'H4', partId: 'prices',
      value: { groups: { materials: [{ name: 'Bìa', price: 20 }] } }, dontKnow: false, version: 1, editSession: 's',
      deviceType: 'phone' as const, createdAt: '', updatedAt: '',
    };
    const data: TeamData = {
      profiles: [{ id: 'p1', teamId: 't', displayName: 'An', avatar: '', archivedAt: null, createdAt: '' }],
      levelStates: [], attempts: [], timings: [], contentVersions: [], answers: [old] as TeamData['answers'],
    };
    const files = teamCsvFiles(data, new Map(), content);
    expect(files['answers.csv']).toContain('H4');
    expect(() => compareRows(content, data)).not.toThrow();
  });
});

describe('uuid() outside a secure context', () => {
  it('falls back to getRandomValues when crypto.randomUUID is missing (phones on http://192.168…)', async () => {
    const { uuid } = await import('../src/domain/progress');
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      const ids = new Set(Array.from({ length: 50 }, () => uuid()));
      expect(ids.size).toBe(50);
      for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true });
    }
  });
});
