// Team progress on the child's screens (cooperative, see src/domain/team.ts).
import { useEffect, useState } from 'react';
import type { FriendProgress, TeamProgress } from '../domain/team';
import { usePlayer } from './session';

/**
 * Friends' progress for this team, or null (loading, offline, preview, or switched off by the
 * mentor). The child's own levels come from the local state, so a level finished a moment ago
 * counts before the server has it.
 */
export function useTeamProgress(): { friends: FriendProgress[]; teamCandies: number } | null {
  const { api, token, state, preview } = usePlayer();
  const [data, setData] = useState<TeamProgress | null>(null);

  useEffect(() => {
    if (preview) return;
    let alive = true;
    const load = () =>
      api.teamProgress(token).then(
        (d) => alive && setData(d),
        () => {}, // offline: simply show nothing
      );
    void load();
    const onVisible = () => document.visibilityState === 'visible' && void load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [api, token, preview]);

  if (!data?.enabled || !data.friends) return null;
  const mine = state.levels.filter((l) => l.completedAt).map((l) => ({ levelId: l.levelId, completedAt: l.completedAt! }));
  const friends = data.friends.map((f) => (f.id === state.profile.id ? { ...f, completed: mine } : f));
  if (friends.length < 2) return null; // nobody to share with
  return { friends, teamCandies: data.teamCandies ?? 0 };
}

/** A row of friend avatars, with a readable label for screen readers. */
export function AvatarRow({ friends, max = 4, size = 26 }: { friends: FriendProgress[]; max?: number; size?: number }) {
  const shown = friends.slice(0, max);
  const extra = friends.length - shown.length;
  return (
    <span className="avatar-row" aria-label={friends.map((f) => f.displayName).join(', ')}>
      {shown.map((f) => (
        <span key={f.id} className="avatar-bubble" style={{ fontSize: size * 0.7, width: size, height: size }} title={f.displayName} aria-hidden="true">
          {f.avatar}
        </span>
      ))}
      {extra > 0 && (
        <span className="avatar-bubble more" style={{ width: size, height: size }} aria-hidden="true">
          +{extra}
        </span>
      )}
    </span>
  );
}
