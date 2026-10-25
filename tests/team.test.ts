import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { CourseContent } from '../src/content/types';
import { FINISHED, finishedLevel, friendsByLevel, positionOf, recentNews, teamCandyGoal, type FriendProgress } from '../src/domain/team';

const content = JSON.parse(readFileSync('content/course-content.json', 'utf8')) as CourseContent;
const levels = content.levels;
const done = (...ids: string[]) => ids.map((levelId, i) => ({ levelId, completedAt: new Date(Date.UTC(2026, 9, 26, 8 + i)).toISOString() }));
const f = (id: string, ...ids: string[]): FriendProgress => ({ id, displayName: id, avatar: '🐼', completed: done(...ids) });

describe('team progress (cooperative)', () => {
  it('places each friend on the first level they have not finished', () => {
    expect(positionOf(levels, [])).toBe('L1');
    expect(positionOf(levels, ['L1', 'L2'])).toBe('L3');
    expect(positionOf(levels, levels.map((l) => l.id))).toBe(FINISHED);
  });
  it('groups friends by level and leaves the child out', () => {
    const map = friendsByLevel(levels, [f('me', 'L1'), f('An', 'L1'), f('Bình'), f('Chi', ...levels.map((l) => l.id))], 'me');
    expect(map.get('L2')?.map((x) => x.id)).toEqual(['An']);
    expect(map.get('L1')?.map((x) => x.id)).toEqual(['Bình']);
    expect(map.get(FINISHED)?.map((x) => x.id)).toEqual(['Chi']);
    expect([...map.values()].flat().some((x) => x.id === 'me')).toBe(false);
  });
  it('news: friends who finished a level recently, newest first, never the child', () => {
    const now = Date.UTC(2026, 9, 26, 20);
    const news = recentNews(levels, [f('me', 'L1'), f('An', 'L1', 'L2')], 'me', now);
    expect(news.map((n) => `${n.friend.id}:${n.level.id}`)).toEqual(['An:L2', 'An:L1']);
    expect(recentNews(levels, [f('An', 'L1')], 'me', now + 3 * 86400_000)).toEqual([]);
  });
  it('one shared jar that grows with the team: everyone’s quiz questions up to the furthest level reached', () => {
    expect(teamCandyGoal(levels, [f('a'), f('b'), f('c'), f('d')])).toBe(4 * 4); // all on Level 1
    expect(teamCandyGoal(levels, [f('a', 'L1'), f('b'), f('c'), f('d')])).toBe(4 * 8); // someone on Level 2
    expect(teamCandyGoal(levels, [f('a', ...levels.map((l) => l.id)), f('b')])).toBe(2 * 28);
  });
  it('counts who has finished a level', () => {
    expect(finishedLevel([f('An', 'L1'), f('Bình'), f('Chi', 'L1')], 'L1').map((x) => x.id)).toEqual(['An', 'Chi']);
  });
});
