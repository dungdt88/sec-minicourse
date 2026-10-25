// One level: intro → cards → quiz → quiz end → form intro → form → review → complete
// (Appendix A). The position is saved as a pointer after every step, so a child who stops
// anywhere resumes there on any device (FR-P-07).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { remindLevels } from './Home';
import { finishedLevel } from '../domain/team';
import { AvatarRow, useTeamProgress } from './team';
import { Character, levelCharacter } from '../art/Character';
import { Sticker } from '../art/Sticker';
import { byOrder, type Level } from '../content/types';
import { levelStatuses, uuid } from '../domain/progress';
import type { Pointer, Section } from '../api/types';
import { FormQuestionScreen, FormReview } from './Form';
import { QuizQuestionScreen, QuizEnd } from './Quiz';
import { usePlayer } from './session';
import { HintBanner, ReadAloud, RichText, SavePill, StepProgress } from './ui';

function stepsOf(level: Level): Pointer[] {
  const steps: Pointer[] = [{ step: 'intro', index: 0 }];
  byOrder(level.cards).forEach((_, i) => steps.push({ step: 'cards', index: i }));
  byOrder(level.quiz).forEach((_, i) => steps.push({ step: 'quiz', index: i }));
  if (level.quiz.length) steps.push({ step: 'quizEnd', index: 0 });
  if (level.form.questions.length) {
    // The quiz-end screen leads into the form ("Kể về …"); a level without a quiz gets an intro screen.
    if (!level.quiz.length) steps.push({ step: 'formIntro', index: 0 });
    level.form.questions.forEach((_, i) => steps.push({ step: 'form', index: i }));
    steps.push({ step: 'review', index: 0 });
  }
  steps.push({ step: 'complete', index: 0 });
  return steps;
}

const sectionOf = (p: Pointer): Section | null =>
  p.step === 'cards' ? 'cards' : p.step === 'quiz' || p.step === 'quizEnd' ? 'quiz' : p.step === 'form' || p.step === 'review' || p.step === 'formIntro' ? 'form' : null;

const samePos = (a: Pointer, b: Pointer) => a.step === b.step && a.index === b.index;

/** FR-P-10 estimate: about 45 s per card and quiz question, 90 s per form question. */
export const levelMinutes = (level: Level) =>
  level.minutes ?? Math.max(1, Math.round(level.cards.length * 0.75 + level.quiz.length * 0.75 + level.form.questions.length * 1.5));

/** Section start/end timestamps for the mentor dashboard (FR-M-04). */
function useSectionTiming(levelId: string, section: Section | null) {
  const { write } = usePlayer();
  const open = useRef<{ id: string; section: Section; startedAt: string } | null>(null);
  const close = useCallback(() => {
    const o = open.current;
    if (!o) return;
    write({ kind: 'timing', timingId: o.id, levelId, section: o.section, startedAt: o.startedAt, endedAt: new Date().toISOString() });
    open.current = null;
  }, [levelId, write]);

  useEffect(() => {
    if (open.current?.section === section) return;
    close();
    if (section) {
      const startedAt = new Date().toISOString();
      // The same timingId is sent again on close, which fills in endedAt.
      open.current = { id: uuid(), section, startedAt };
      write({ kind: 'timing', timingId: open.current.id, levelId, section, startedAt, endedAt: null });
    }
  }, [section, levelId, write, close]);

  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && close();
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      close();
    };
  }, [close]);
}

/** Keyed by level, so "Chơi tiếp: Màn n+1" starts the next level with fresh state. */
export function LevelPlayer() {
  const { levelId = '' } = useParams();
  return <LevelScreen key={levelId} levelId={levelId} />;
}

function LevelScreen({ levelId }: { levelId: string }) {
  const player = usePlayer();
  const { content, state, levelState, write, base, preview, t, saveStatus, flush } = player;
  const team = useTeamProgress();
  const navigate = useNavigate();
  const level = content.levels.find((l) => l.id === levelId);
  const steps = useMemo(() => (level ? stepsOf(level) : []), [level]);
  const ls = levelState(levelId);
  const returnToReview = useRef(false);

  const [pointer, setPointer] = useState<Pointer>(() => {
    const saved = ls?.pointer;
    if (saved && !ls?.completedAt && steps.some((s) => samePos(s, saved))) return saved;
    return { step: 'intro', index: 0 };
  });

  // Re-reading a card from the worksheet: a side trip that does not move the saved position,
  // replay the quiz or record anything.
  const [peek, setPeek] = useState<number | null>(null);

  useSectionTiming(levelId, sectionOf(pointer));

  const go = useCallback(
    (p: Pointer) => {
      setPointer(p);
      write({ kind: 'pointer', levelId, pointer: p });
      window.scrollTo({ top: 0 });
    },
    [levelId, write],
  );

  if (!level) return <Navigate to={`${base}/home`} replace />;
  const status = levelStatuses(content.levels, state.levels).get(level.id);
  if (status === 'locked' && !preview) return <Navigate to={`${base}/home`} replace />;

  const pos = steps.findIndex((s) => samePos(s, pointer));
  const next = () => {
    if (returnToReview.current && pointer.step === 'form') {
      returnToReview.current = false;
      go({ step: 'review', index: 0 });
    } else go(steps[Math.min(pos + 1, steps.length - 1)]);
  };
  const back = () => go(steps[Math.max(pos - 1, 0)]);
  const home = () => navigate(`${base}/home`);
  const character = levelCharacter(content.characters, level);
  const cards = byOrder(level.cards);
  const quiz = byOrder(level.quiz);
  const formLocked = !!ls?.formLocked && !preview;

  const onWorksheet = pointer.step === 'formIntro' || pointer.step === 'form' || pointer.step === 'review';
  // One calm row: map button, "Màn 1" and where the child is, and the save tick.
  const top = (label: string) => (
    <div className="topbar level-top no-print">
      <button className="map-btn" onClick={home} aria-label={t('backHome')}>
        <span aria-hidden="true">🗺️</span>
      </button>
      <span className="title">
        <span className="level-pill">{t('levelLabel', { n: level.order })}</span>
        {label && (
          <>
            <span className="visually-hidden"> · </span>
            <span className="title-text">{label}</span>
          </>
        )}
      </span>
      {preview ? <span className="save-pill saving">{t('preview')}</span> : <SavePill />}
    </div>
  );
  // On the worksheet the cards stay one tap away (a side trip that saves nothing).
  const reread =
    onWorksheet && peek == null ? (
      <button className="icon-btn small no-print" onClick={() => setPeek(0)}>
        <span aria-hidden="true">📖</span> {t('rereadCards')}
      </button>
    ) : null;

  const cardArticle = (card: (typeof cards)[number]) => (
    <article className="panel concept-card content-col">
      {/* The level's character peeks over the card; it never moves while the child reads (DR-05). */}
      <span className="card-peeker" aria-hidden="true">
        <Character character={character} expression="neutral" size={64} decorative />
      </span>
      <h2>
        <RichText text={card.title} />
      </h2>
      <p>
        <RichText text={card.body} />
      </p>
      {card.bullets && card.bullets.length > 0 && (
        <ul>
          {card.bullets.map((b, i) => (
            <li key={i}>
              <RichText text={b} />
            </li>
          ))}
        </ul>
      )}
      {card.footer && (
        <p className="footer">
          <RichText text={card.footer} />
        </p>
      )}
    </article>
  );

  const cardProgress = (index: number, card: (typeof cards)[number]) => (
    <StepProgress index={index} total={cards.length} label={t('cardOf', { n: index + 1, total: cards.length })} action={<ReadAloud card={card} />} />
  );

  if (peek != null && onWorksheet) {
    const card = cards[peek];
    const last = peek === cards.length - 1;
    return (
      <main className="screen">
        {top(t('cards'))}
        {cardProgress(peek, card)}
        {cardArticle(card)}
        <div className="bottom-actions sticky">
          <button className="btn secondary" onClick={() => (peek === 0 ? setPeek(null) : setPeek(peek - 1))}>
            {peek === 0 ? t('backToForm') : t('back')}
          </button>
          <button className="btn" onClick={() => (last ? setPeek(null) : setPeek(peek + 1))}>
            {last ? t('backToForm') : t('next')}
          </button>
        </div>
      </main>
    );
  }

  switch (pointer.step) {
    case 'intro':
      return (
        <main className="screen">
          {top('')}
          <h1 className="big-title center">{level.title}</h1>
          <div className="hero">
            <Character character={character} expression="happy" size={150} />
          </div>
          {character && (
            <p className="center speech">
              <span className="muted" style={{ fontWeight: 700 }}>
                {t('characterSays', { name: character.name })}
              </span>{' '}
              “{character.catchphrase}”
            </p>
          )}
          {/* FR-P-10: what is in the level and how long it takes */}
          <ul className="chip-row" aria-label={level.name}>
            <li className="info-chip">📖 {t('chipCards', { n: cards.length })}</li>
            {quiz.length > 0 && <li className="info-chip">❓ {t('chipQuiz', { n: quiz.length })}</li>}
            {level.form.questions.length > 0 && <li className="info-chip">✏️ {t('chipForm', { n: level.form.questions.length })}</li>}
            <li className="info-chip">⏱️ {t('chipMinutes', { n: levelMinutes(level) })}</li>
          </ul>
          {level.objectives.length > 0 && (
            <details className="objectives">
              <summary>{t('objectives')}</summary>
              <ul>
                {level.objectives.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </details>
          )}
          <div className="bottom-actions">
            <button className="btn" onClick={next}>
              {status === 'done' ? t('replay') : t('start')}
            </button>
          </div>
        </main>
      );

    case 'cards': {
      const card = cards[pointer.index];
      return (
        <main className="screen">
          {top(t('cards'))}
          {pointer.index === 0 && <HintBanner id="parentReads" text={t('parentReads')} />}
          {cardProgress(pointer.index, card)}
          {cardArticle(card)}
          <div className="bottom-actions sticky">
            <button className="btn secondary" onClick={back}>
              {t('back')}
            </button>
            <button className="btn" onClick={next}>
              {t('next')}
            </button>
          </div>
        </main>
      );
    }

    case 'quiz':
      return (
        <QuizQuestionScreen
          key={quiz[pointer.index].id}
          level={level}
          question={quiz[pointer.index]}
          index={pointer.index}
          total={quiz.length}
          character={character}
          savedAttemptId={pointer.attemptId}
          onAnswered={(attemptId) => {
            const p = { ...pointer, attemptId };
            setPointer(p);
            write({ kind: 'pointer', levelId, pointer: p });
          }}
          onNext={next}
          top={top(t('quiz'))}
        />
      );

    case 'quizEnd':
      return <QuizEnd level={level} character={character} onNext={next} top={top(t('quiz'))} formQuestions={level.form.questions.length} />;

    case 'formIntro':
      return (
        <main className="screen">
          {top('')}
          <h1 className="big-title center">{t('yourTurn')}</h1>
          <div className="hero">
            <Character character={character} expression="thinking" size={130} />
          </div>
          <p className="center content-col" style={{ margin: '0 auto', fontWeight: 700 }}>
            {t('toFormHint', { n: level.form.questions.length })}
          </p>
          {formLocked && <p className="notice lock">{t('formLocked')}</p>}
          <div className="bottom-actions">
            <button className="btn" onClick={next}>
              {t('toForm')}
            </button>
          </div>
        </main>
      );

    case 'form':
      return (
        <FormQuestionScreen
          key={level.form.questions[pointer.index].id}
          level={level}
          question={level.form.questions[pointer.index]}
          index={pointer.index}
          total={level.form.questions.length}
          readOnly={formLocked}
          onBack={back}
          onNext={next}
          // "Từ điển pháp thuật 2/4" by the progress bar names the screen; the header does not repeat it.
          top={top('')}
          reread={reread}
        />
      );

    case 'review':
      return (
        <FormReview
          level={level}
          readOnly={formLocked}
          submitted={!!ls?.submittedAt}
          onEdit={(i) => {
            returnToReview.current = true;
            go({ step: 'form', index: i });
          }}
          onSubmit={() => {
            if (!formLocked) write({ kind: 'submit', levelId });
            go({ step: 'complete', index: 0 });
          }}
          top={top('')}
          reread={reread}
        />
      );

    case 'complete': {
      // FR-P-28 "play on": the next level leads; the map is the quiet way out.
      const nextLevel = byOrder(content.levels).find((l) => l.order > level.order);
      const nextStatus = nextLevel ? levelStatuses(content.levels, state.levels).get(nextLevel.id) : undefined;
      const canPlayOn = !!nextLevel && (preview || nextStatus === 'available' || nextStatus === 'done');
      const remind = content.homework.items.length > 0 && remindLevels(content.homework.remindAfterLevels).includes(level.order);
      const unsaved = !preview && saveStatus !== 'saved';
      return (
        <main className="screen center">
          {top(t('done'))}
          <div className="pop sticker-stage">
            <Sticker order={level.order} image={level.sticker} size={150} label={t('stickerFor', { n: level.order })} />
          </div>
          <h1 className="big-title">{t('levelDone', { n: level.order })}</h1>
          {!nextLevel && <p className="notice">🎉 {t('courseDone', { n: content.levels.length })}</p>}
          {/* the characters cheering */}
          <div className="cheer-row" aria-hidden="true">
            {content.characters.map((c) => (
              <Character key={c.id} character={c} expression="happy" size={72} decorative />
            ))}
          </div>
          {team && (
            <p className="team-news" style={{ margin: 0 }}>
              {t('teamFinishedLevel', { done: finishedLevel(team.friends, level.id).length, total: team.friends.length, n: level.order })}{' '}
              <AvatarRow friends={finishedLevel(team.friends, level.id)} size={30} />
            </p>
          )}
          {canPlayOn && <p style={{ margin: 0 }}>{t('nextOpen', { n: nextLevel.order })}</p>}
          <div className="bottom-actions" style={{ flexDirection: 'column' }}>
            {canPlayOn && (
              <button className="btn big" onClick={() => navigate(`${base}/level/${nextLevel.id}`)}>
                ▶ {t('playOn', { n: nextLevel.order })}
              </button>
            )}
            {unsaved && (
              <button className="btn secondary" onClick={() => void flush()}>
                📤 {t('sendNow')}
              </button>
            )}
            {remind && (
              <>
                <p className="hint" style={{ margin: '4px 0 0' }}>
                  {t('homeworkReminder')}
                </p>
                <button className="btn secondary" onClick={() => navigate(`${base}/homework`)}>
                  🎲 {content.homework.title}
                </button>
              </>
            )}
            <button className={canPlayOn ? 'btn quiet' : 'btn'} onClick={home}>
              {t('backHome')}
            </button>
          </div>
        </main>
      );
    }
  }
}
