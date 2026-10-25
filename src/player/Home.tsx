// Level map (FR-P-05, FR-P-06, FR-P-08, FR-P-09).
import { useNavigate } from 'react-router-dom';
import { Sticker } from '../art/Sticker';
import { Character } from '../art/Character';
import { Pumpkin } from '../art/Halloween';
import { useSkin } from '../art/skin';
import { sortedLevels } from '../content/types';
import { levelStatuses, todayLevel } from '../domain/progress';
import { switchProfile } from './Entry';
import { usePlayer } from './session';
import { SavePill } from './ui';

export function homeworkHighlighted(remindAfter: number[], completedOrders: number[]): boolean {
  if (completedOrders.length === 0) return true; // day 1
  const latest = Math.max(...completedOrders);
  return remindAfter.includes(latest);
}

const localDay = (iso: string) => new Date(iso).toDateString();

/** True if any level was finished today (local time): the map then says "Lần sau", not "Hôm nay". */
export function finishedToday(completedAt: (string | null)[], now = new Date()): boolean {
  return completedAt.some((c) => c != null && localDay(c) === now.toDateString());
}

export function Home() {
  const { content, state, t, base, preview, levelState } = usePlayer();
  const navigate = useNavigate();
  const skin = useSkin();
  const levels = sortedLevels(content);
  const statuses = levelStatuses(levels, state.levels);
  const today = todayLevel(levels, statuses);
  const completedOrders = levels.filter((l) => statuses.get(l.id) === 'done').map((l) => l.order);
  const remindAfter = content.homework.remindAfterLevels ?? [1, 3];
  const hwHighlight = homeworkHighlighted(remindAfter, completedOrders);
  const allDone = completedOrders.length === levels.length;
  const playedToday = finishedToday(state.levels.map((s) => s.completedAt));

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
        <button className={`icon-btn${hwHighlight ? ' highlight' : ''}`} onClick={() => navigate(`${base}/homework`)}>
          <span aria-hidden="true">📝</span> {t('homework')}
        </button>
        <span className="spacer" />
        {!preview && (
          <button className="icon-btn" onClick={() => switchProfile(navigate)}>
            {t('notMe', { name: state.profile.displayName })}
          </button>
        )}
      </div>

      {today && (
        <div className="center">
          <span className="today-tag">{t(playedToday ? 'nextTime' : 'today', { n: today.order })}</span>
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
            </button>
          );
        })}
      </nav>

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
