// Team progress: friendly, cooperative, never a ranking. A child sees where friends are on the map,
// one shared candy jar for the whole team, and short news when a friend finishes a level.
// No per-child scores, no order of who is ahead, and never anyone's answers (FR-P-25).
import type { Level } from '../content/types';

export interface FriendProgress {
  id: string;
  displayName: string;
  avatar: string;
  completed: { levelId: string; completedAt: string }[];
}

export interface TeamProgress {
  /** The mentor can switch team progress off; then the player shows none of it. */
  enabled: boolean;
  friends?: FriendProgress[];
  /** Team total of quiz questions right on the first try (each one is a candy). */
  teamCandies?: number;
}

export const FINISHED = '__finished__';

const sorted = (levels: Level[]) => [...levels].sort((a, b) => a.order - b.order);

/** The level a child is on: the first one (by order) not completed yet, or FINISHED. */
export function positionOf(levels: Level[], completed: Iterable<string>): string {
  const done = new Set(completed);
  return sorted(levels).find((l) => !done.has(l.id))?.id ?? FINISHED;
}

/** Friends (not the child) grouped by the level they are on. */
export function friendsByLevel(levels: Level[], friends: FriendProgress[], selfId: string): Map<string, FriendProgress[]> {
  const out = new Map<string, FriendProgress[]>();
  for (const f of friends) {
    if (f.id === selfId) continue;
    const at = positionOf(levels, f.completed.map((c) => c.levelId));
    out.set(at, [...(out.get(at) ?? []), f]);
  }
  return out;
}

/** Friends' level completions in the last `hours`, newest first: "Bình vừa xong Màn 2!". */
export function recentNews(
  levels: Level[],
  friends: FriendProgress[],
  selfId: string,
  now = Date.now(),
  hours = 48,
  max = 3,
): { friend: FriendProgress; level: Level; at: string }[] {
  const byId = new Map(levels.map((l) => [l.id, l]));
  const since = now - hours * 3600_000;
  return friends
    .filter((f) => f.id !== selfId)
    .flatMap((friend) =>
      friend.completed
        .filter((c) => byId.has(c.levelId) && Date.parse(c.completedAt) >= since)
        .map((c) => ({ friend, level: byId.get(c.levelId)!, at: c.completedAt })),
    )
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, max);
}

/**
 * The jar's size grows with the team: every member's quiz questions in the levels the furthest
 * friend has reached. Early on it is a small jar that fills, not a huge one that looks empty.
 */
export function teamCandyGoal(levels: Level[], friends: FriendProgress[]): number {
  const ordered = sorted(levels);
  const reach = friends.reduce((max, f) => {
    const at = positionOf(levels, f.completed.map((c) => c.levelId));
    const idx = at === FINISHED ? ordered.length - 1 : ordered.findIndex((l) => l.id === at);
    return Math.max(max, idx);
  }, 0);
  return friends.length * ordered.slice(0, reach + 1).reduce((n, l) => n + l.quiz.length, 0);
}

/** Who has finished a level (for "Cả đội: 2/4 bạn đã xong Màn 1"). */
export const finishedLevel = (friends: FriendProgress[], levelId: string) =>
  friends.filter((f) => f.completed.some((c) => c.levelId === levelId));
