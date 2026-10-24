// Level map (FR-P-05, FR-P-06, FR-P-08, FR-P-09).
import { useNavigate } from 'react-router-dom';
import { Sticker } from '../art/Sticker';
import { Character } from '../art/Character';
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

export function Home() {
  const { content, state, t, base, preview, levelState } = usePlayer();
  const navigate = useNavigate();
  const levels = sortedLevels(content);
  const statuses = levelStatuses(levels, state.levels);
  const today = todayLevel(levels, statuses);
  const completedOrders = levels.filter((l) => statuses.get(l.id) === 'done').map((l) => l.order);
  const remindAfter = content.homework.remindAfterLevels ?? [1, 3];
  const hwHighlight = homeworkHighlighted(remindAfter, completedOrders);

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
            {t('switchProfile')}
          </button>
        )}
      </div>

      {today && (
        <div className="center">
          <span className="today-tag">{t('today', { n: today.order })}</span>
        </div>
      )}

      <nav className="map" aria-label={content.title}>
        {levels.map((level) => {
          const status = statuses.get(level.id)!;
          const ls = levelState(level.id);
          const isToday = today?.id === level.id;
          const resume = status === 'available' && ls?.pointer && ls.pointer.step !== 'intro';
          const sub =
            status === 'done' ? t('replay') : status === 'locked' ? t('locked') : resume ? t('continue') : t('start');
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
