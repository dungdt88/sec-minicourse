// Level map (FR-P-05, FR-P-06, FR-P-08, FR-P-09).
import { Fragment } from 'react';
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

  // Only the first closed level says why; the ones after it stay quiet (screen readers still hear it).
  const firstLocked = levels.find((l) => statuses.get(l.id) === 'locked')?.id;
  // The homework sits on the trail after the level that suggests it (FR-P-09).
  const homeworkAfter = Math.min(...remindLevels(content.homework.remindAfterLevels));

  const homeworkStop = (trailDone: boolean) => (
    <div className={`map-side${trailDone ? ' trail-done' : ''}`}>
      <button className={`side-quest${hwHighlight ? ' highlight' : ''}`} onClick={() => navigate(`${base}/homework`)}>
        <span aria-hidden="true">🎲</span> {content.homework.title}
      </button>
    </div>
  );

  return (
    <main className="screen">
      <header className="home-head">
        <span className="home-avatar" aria-hidden="true">
          {state.profile.avatar}
        </span>
        <div className="home-hello">
          <strong>{t('hello', { name: state.profile.displayName })}</strong>
          {!preview && (
            <button className="link-btn" onClick={() => switchProfile(navigate)}>
              {t('notMe', { name: state.profile.displayName })}
            </button>
          )}
        </div>
        <span className="spacer" />
        {preview ? <span className="save-pill saving">{t('preview')}</span> : <SavePill />}
      </header>

      {team && (
        <section className="team-card" aria-label={t('teamTitle')}>
          <div className="team-jar-row">
            <Candy size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="team-jar-head">
                <strong>{t('teamJar')}</strong>
                <strong className="jar-count">{t('teamJarCount', { n: team.teamCandies })}</strong>
              </div>
              <div
                className="jar-bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={goal}
                aria-valuenow={team.teamCandies}
                aria-label={t('teamJar')}
              >
                <span
                  style={{
                    width: `${goal ? Math.min(100, (team.teamCandies / goal) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
          <p className="team-help">{t('teamTogether')}</p>
          {news.map((n) => (
            <p className="team-news" key={`${n.friend.id}-${n.level.id}`}>
              <span aria-hidden="true">{n.friend.avatar}</span> 🎉 {t('newsDone', { name: n.friend.displayName, n: n.level.order })}
            </p>
          ))}
        </section>
      )}

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

      <nav className="map" aria-label={content.title}>
        {levels.map((level, i) => {
          const status = statuses.get(level.id)!;
          const ls = levelState(level.id);
          const isToday = today?.id === level.id;
          const resume = status === 'available' && ls?.pointer && ls.pointer.step !== 'intro';
          // Say why a level is closed: the one before is not finished yet, or the mentor closed it.
          const lockedText = ls?.override === 'locked' || i === 0 ? t('lockedByMentor') : t('lockedAfter', { n: levels[i - 1].order });
          const sub = status === 'done' ? t('mapDone') : status === 'locked' ? lockedText : resume ? t('continue') : t('mapOpen');
          const quiet = status === 'locked' && level.id !== firstLocked && ls?.override !== 'locked';
          const friendsHere = here.get(level.id);
          // The trail into this stop is coloured once the level before it is done.
          const trailDone = i > 0 && statuses.get(levels[i - 1].id) === 'done';
          return (
            <Fragment key={level.id}>
              <div className={`map-stop${trailDone ? ' trail-done' : ''}`}>
                <button
                  className={`map-node ${status}${isToday ? ' today' : ''}`}
                  disabled={status === 'locked'}
                  aria-current={isToday ? 'step' : undefined}
                  onClick={() => navigate(`${base}/level/${level.id}`)}
                >
                  <span className="badge">
                    {status === 'done' ? (
                      <Sticker order={level.order} image={level.sticker} size={60} label={t('stickerFor', { n: level.order })} />
                    ) : status === 'locked' ? (
                      <>
                        <span className="badge-no" aria-hidden="true">
                          {level.order}
                        </span>
                        <span className="badge-lock" aria-hidden="true">
                          🔒
                        </span>
                      </>
                    ) : isToday && skin === 'halloween' ? (
                      <span className="pumpkin-glow" aria-hidden="true">
                        <Pumpkin size={54} />
                      </span>
                    ) : (
                      level.order
                    )}
                  </span>
                  <span className="label">
                    <strong>
                      {t('levelLabel', { n: level.order })}: {level.name}
                    </strong>
                    <span className={quiet ? 'visually-hidden' : 'sub'}>
                      {status === 'done' ? '✓ ' : ''}
                      {sub}
                    </span>
                    {friendsHere && (
                      <span className="friends-here">
                        <AvatarRow friends={friendsHere} max={4} size={28} />
                        <span className="visually-hidden">
                          {t('friendsHere', {
                            names: friendsHere.map((f) => f.displayName).join(', '),
                          })}
                        </span>
                      </span>
                    )}
                  </span>
                  {status === 'available' && (
                    <span className="go" aria-hidden="true">
                      ▶
                    </span>
                  )}
                </button>
              </div>
              {hasHomework && level.order === homeworkAfter && homeworkStop(status === 'done')}
            </Fragment>
          );
        })}
        {hasHomework && !levels.some((l) => l.order === homeworkAfter) && homeworkStop(allDone)}
        <div className={`map-finish${allDone ? ' trail-done' : ''}`} aria-hidden="true">
          <div className="shop">
            {content.characters.map((c) => (
              <Character key={c.id} character={c} size={56} expression="happy" decorative />
            ))}
          </div>
        </div>
      </nav>
      {here.get(FINISHED) && (
        <p className="team-news center">
          🏁 {t('friendsFinished', { n: levels.length })} <AvatarRow friends={here.get(FINISHED)!} />
        </p>
      )}
    </main>
  );
}
