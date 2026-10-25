// Level map (FR-P-05, FR-P-06, FR-P-08, FR-P-09).
import { useNavigate } from 'react-router-dom';
import { Sticker } from '../art/Sticker';
import { Character } from '../art/Character';
import { Candy, Pumpkin } from '../art/Halloween';
import { FINISHED, friendsByLevel, recentNews, teamCandyGoal, type FriendProgress } from '../domain/team';
import { AvatarRow, useTeamProgress } from './team';
import { useSkin } from '../art/skin';
import { sortedLevels } from '../content/types';
import { levelStatuses, todayLevel } from '../domain/progress';
import { switchProfile } from './Entry';
import { usePlayer } from './session';
import { SavePill } from './ui';

/** Levels after which the (optional) homework is suggested; content can override. */
export const remindLevels = (remindAfterLevels: number[] | undefined) => remindAfterLevels ?? [3];

/** The homework button is highlighted right after a level that suggests it (level 3 by default). */
export function homeworkHighlighted(remindAfter: number[], completedOrders: number[]): boolean {
  if (completedOrders.length === 0) return false;
  return remindAfter.includes(Math.max(...completedOrders));
}

export function Home() {
  const { content, state, t, base, preview, levelState } = usePlayer();
  const navigate = useNavigate();
  const skin = useSkin();
  const levels = sortedLevels(content);
  const statuses = levelStatuses(levels, state.levels);
  const today = todayLevel(levels, statuses);
  const completedOrders = levels.filter((l) => statuses.get(l.id) === 'done').map((l) => l.order);
  const hwHighlight = homeworkHighlighted(remindLevels(content.homework.remindAfterLevels), completedOrders);
  const hasHomework = content.homework.items.length > 0;
  const allDone = completedOrders.length === levels.length;
  // Team progress (cooperative): friends on the map, one shared candy jar, friendly news.
  const team = useTeamProgress();
  const here = team ? friendsByLevel(levels, team.friends, state.profile.id) : new Map<string, FriendProgress[]>();
  const news = team ? recentNews(levels, team.friends, state.profile.id) : [];
  const goal = team ? teamCandyGoal(levels, team.friends) : 0;

  return (
    <main className="screen">
      <div className="topbar">
        <span style={{ fontSize: 34 }} aria-hidden="true">
          {state.profile.avatar}
        </span>
        <strong style={{ fontSize: 20 }}>{state.profile.displayName}</strong>
        <span className="spacer" />
        {preview ? <span className="save-pill saving">{t('preview')}</span> : <SavePill />}
      </div>
      <div className="topbar">
        {/* FR-P-09: labelled with the homework title, hidden when the content has none */}
        {hasHomework && (
          <button className={`icon-btn${hwHighlight ? ' highlight' : ''}`} onClick={() => navigate(`${base}/homework`)}>
            <span aria-hidden="true">🎲</span> {content.homework.title}
          </button>
        )}
        <span className="spacer" />
        {!preview && (
          <button className="icon-btn" onClick={() => switchProfile(navigate)}>
            {t('notMe', { name: state.profile.displayName })}
          </button>
        )}
      </div>

      {today && (
        <div className="center">
          <span className="today-tag">{t('today', { n: today.order })}</span>
        </div>
      )}
      {allDone && (
        <p className="notice center" role="status">
          🎉 {t('courseDone', { n: levels.length })}
        </p>
      )}

      {team && (
        <section className="team-card" aria-label={t('teamTitle')}>
          <div className="team-jar-row">
            <Candy size={36} />
            <div style={{ flex: 1 }}>
              <strong>{t('teamJar')}</strong>
              <div className="jar-bar" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={team.teamCandies} aria-label={t('teamJar')}>
                <span style={{ width: `${goal ? Math.min(100, (team.teamCandies / goal) * 100) : 0}%` }} />
              </div>
            </div>
            <strong className="jar-count">{t('teamJarCount', { n: team.teamCandies })}</strong>
          </div>
          <p className="small-text muted" style={{ margin: '4px 0 0' }}>
            {t('teamTogether')}
          </p>
          {news.map((n) => (
            <p className="team-news" key={`${n.friend.id}-${n.level.id}`}>
              <span aria-hidden="true">{n.friend.avatar}</span> 🎉 {t('newsDone', { name: n.friend.displayName, n: n.level.order })}
            </p>
          ))}
        </section>
      )}

      <nav className="map" aria-label={content.title}>
        {levels.map((level, i) => {
          const status = statuses.get(level.id)!;
          const ls = levelState(level.id);
          const isToday = today?.id === level.id;
          const resume = status === 'available' && ls?.pointer && ls.pointer.step !== 'intro';
          // Say why a level is closed: the one before is not finished yet, or the mentor closed it.
          const lockedText =
            ls?.override === 'locked' || i === 0 ? t('lockedByMentor') : t('lockedAfter', { n: levels[i - 1].order });
          const sub = status === 'done' ? t('mapDone') : status === 'locked' ? lockedText : resume ? t('continue') : t('mapOpen');
          return (
            <button
              key={level.id}
              className={`map-node ${status}${isToday ? ' today' : ''}`}
              disabled={status === 'locked'}
              aria-current={isToday ? 'step' : undefined}
              onClick={() => navigate(`${base}/level/${level.id}`)}
            >
              <span className="badge">
                {status === 'done' ? (
                  <Sticker order={level.order} image={level.sticker} size={56} label={t('stickerFor', { n: level.order })} />
                ) : status === 'locked' ? (
                  <span aria-hidden="true">🔒</span>
                ) : isToday && skin === 'halloween' ? (
                  <span className="pumpkin-glow" aria-hidden="true">
                    <Pumpkin size={52} />
                  </span>
                ) : (
                  level.order
                )}
              </span>
              <span className="label">
                <strong>
                  {t('levelLabel', { n: level.order })}: {level.name}
                </strong>
                <span>
                  {status === 'done' ? '✓ ' : ''}
                  {sub}
                </span>
              </span>
              {here.get(level.id) && (
                <span className="friends-here">
                  <AvatarRow friends={here.get(level.id)!} max={3} />
                  <span className="visually-hidden">
                    {t('friendsHere', { names: here.get(level.id)!.map((f) => f.displayName).join(', ') })}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </nav>
      {here.get(FINISHED) && (
        <p className="team-news center">
          🏁 {t('friendsFinished', { n: levels.length })} <AvatarRow friends={here.get(FINISHED)!} />
        </p>
      )}

      <div className="center" aria-hidden="true">
        <span style={{ display: 'inline-flex', gap: 4 }}>
          {content.characters.map((c) => (
            <Character key={c.id} character={c} size={60} expression="happy" decorative />
          ))}
        </span>
      </div>
    </main>
  );
}
