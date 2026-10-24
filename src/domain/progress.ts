// Level status on the map (FR-P-05) and the "today" highlight (FR-P-06).
import type { Level } from '../content/types';
import type { LevelState } from '../api/types';

export type LevelStatus = 'done' | 'available' | 'locked';

export function levelStatuses(levels: Level[], states: LevelState[]): Map<string, LevelStatus> {
  const byLevel = new Map(states.map((s) => [s.levelId, s]));
  const out = new Map<string, LevelStatus>();
  let previousDone = true;
  for (const level of [...levels].sort((a, b) => a.order - b.order)) {
    const s = byLevel.get(level.id);
    let status: LevelStatus;
    if (s?.override === 'locked') status = 'locked';
    else if (s?.completedAt) status = 'done';
    else if (s?.override === 'unlocked' || previousDone) status = 'available';
    else status = 'locked';
    out.set(level.id, status);
    previousDone = !!s?.completedAt;
  }
  return out;
}

/** The first level that is available and not yet done. */
export function todayLevel(levels: Level[], statuses: Map<string, LevelStatus>): Level | null {
  return [...levels].sort((a, b) => a.order - b.order).find((l) => statuses.get(l.id) === 'available') ?? null;
}

export function deviceType(): 'phone' | 'tablet' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'tablet';
  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return 'tablet';
  if (/Mobi|iPhone|Android/i.test(ua)) return 'phone';
  return 'desktop';
}

export function uuid(): string {
  return crypto.randomUUID();
}
