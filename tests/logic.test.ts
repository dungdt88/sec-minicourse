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
import { finishedToday, homeworkHighlighted } from '../src/player/Home';

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
  it('says "Lần sau" only when a level was finished today (local time)', () => {
    const now = new Date(2026, 9, 26, 19, 0);
    expect(finishedToday([new Date(2026, 9, 26, 8, 30).toISOString()], now)).toBe(true);
    expect(finishedToday([new Date(2026, 9, 25, 20, 0).toISOString(), null], now)).toBe(false);
    expect(finishedToday([], now)).toBe(false);
  });
  it('homework is highlighted on day 1 and after level 3', () => {
    expect(homeworkHighlighted([1, 3], [])).toBe(true);
    expect(homeworkHighlighted([1, 3], [1, 2])).toBe(false);
    expect(homeworkHighlighted([1, 3], [1, 2, 3])).toBe(true);
  });
});

describe('write queue', () => {
  const m = (id: string): Mutation => ({ id, kind: 'submit', levelId: 'L1', contentVersionId: 'c', deviceType: 'phone', at: '' });
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
