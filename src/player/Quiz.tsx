// Quiz question and quiz end (FR-P-15 … FR-P-19).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Character } from '../art/Character';
import type { Character as CharacterData, Level, QuizQuestion } from '../content/types';
import { newOptionOrder } from '../domain/shuffle';
import { usePlayer } from './session';
import { Candy, Mascot } from '../art/Halloween';
import { prefersReducedMotion, useSkin } from '../art/skin';
import { MascotPopup } from './MascotPopup';
import { ReadAloud, RichText, StepProgress } from './ui';

interface QuestionProps {
  level: Level;
  question: QuizQuestion;
  index: number;
  total: number;
  character: CharacterData | undefined;
  savedAttemptId?: string;
  onAnswered: (attemptId: string) => void;
  onNext: () => void;
  top: React.ReactNode;
}

export function QuizQuestionScreen({ level, question, index, total, character, savedAttemptId, onAnswered, onNext, top }: QuestionProps) {
  const { state, write, t, content } = usePlayer();
  const skin = useSkin();
  const attempts = state.attempts.filter((a) => a.questionId === question.id);
  const saved = savedAttemptId ? attempts.find((a) => a.id === savedAttemptId) : undefined;

  // Fresh shuffle for every play, different from the last order this child saw (FR-P-15).
  const { order, seed } = useMemo(() => {
    if (saved) return { order: saved.displayedOrder, seed: saved.seed };
    const ids = question.options.map((o) => o.id);
    if (question.shuffleOptions === false) return { order: ids, seed: 0 };
    const last = [...attempts].sort((a, b) => b.attemptNo - a.attemptNo)[0];
    return newOptionOrder(ids, last?.displayedOrder);
  }, [question.id, saved?.id]);
  const [shownAt] = useState(() => new Date().toISOString());
  const [chosen, setChosen] = useState<string | null>(saved?.chosenOptionId ?? null);

  const options = order.map((id) => question.options.find((o) => o.id === id)!).filter(Boolean);
  const correctId = question.options.find((o) => o.correct)?.id;
  const answered = chosen != null;
  const right = chosen === correctId;
  // FR-P-16: one funny heading picked once per answer (a re-render must not change it).
  const line = (ok: boolean) => (content.ui[ok ? 'correctLines' : 'wrongLines'] ? t(ok ? 'correctLines' : 'wrongLines') : t(ok ? 'correct' : 'wrong'));
  const [heading, setHeading] = useState(() => (saved ? line(saved.correct) : ''));
  const [fresh, setFresh] = useState(false); // answered on this screen just now (not a reload)
  // On a phone the explanation lands below the fold: bring it into view once, right after the
  // answer (the attempt is saved by then, so this keys on `fresh`, not on the saved attempt).
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (fresh) feedbackRef.current?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [fresh]);

  const choose = (id: string) => {
    if (answered) return; // locked after the first tap (FR-P-16)
    setChosen(id);
    setHeading(line(id === correctId));
    setFresh(true);
    const attemptId = write({
      kind: 'quizAttempt',
      levelId: level.id,
      questionId: question.id,
      seed,
      displayedOrder: order,
      chosenOptionId: id,
      shownAt,
    });
    onAnswered(attemptId);
  };

  return (
    <main className="screen">
      {top}
      {/* Before the answer: the question and its choices; after it, why (FR-P-14 for the quiz). */}
      <StepProgress
        index={index}
        total={total}
        label={t('questionOf', { n: index + 1, total })}
        action={
          <ReadAloud
            id={`${question.id}:${answered ? 'why' : 'ask'}`}
            text={answered ? [heading, question.explanation] : [question.prompt, ...options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o.text}`)]}
          />
        }
      />
      <h1 className="prompt content-col">
        <RichText text={question.prompt} />
      </h1>
      <div className="option-list" role="group" aria-label={question.prompt}>
        {options.map((o, i) => {
          const isChosen = chosen === o.id;
          // After the answer, the options that are neither picked nor right step back.
          const cls =
            (!answered ? '' : o.id === correctId ? ' correct' : isChosen ? ' wrong' : ' faded') +
            (fresh && isChosen ? (right ? ' bounce' : ' wobble') : '');
          return (
            <button
              key={o.id}
              className={`option${cls}`}
              disabled={answered}
              aria-pressed={isChosen}
              onClick={() => choose(o.id)}
            >
              <span className="mark" aria-hidden="true">
                {answered && o.id === correctId ? '✓' : answered && isChosen ? '✗' : String.fromCharCode(65 + i)}
              </span>
              <span>
                <RichText text={o.text} />
              </span>
            </button>
          );
        })}
      </div>
      {answered && (
        <div
          className={`feedback ${right ? 'good' : 'bad'} pop`}
          role="status"
          aria-live="polite"
          ref={feedbackRef}
        >
          {skin === 'halloween' ? (
            <Mascot expression={right ? 'happy' : 'oops'} size={64} />
          ) : (
            <Character character={character} expression={right ? 'happy' : 'oops'} size={64} decorative />
          )}
          <div>
            <h3>{heading}</h3>
            <p>
              <RichText text={question.explanation} />
            </p>
          </div>
        </div>
      )}
      {fresh && skin === 'halloween' && <MascotPopup right={right} word={t(right ? 'cheers' : 'oops')} key={chosen} />}
      <div className="bottom-actions sticky">
        <button className="btn" onClick={onNext} disabled={!answered}>
          {t('next')}
        </button>
      </div>
    </main>
  );
}

export function QuizEnd({
  level,
  character,
  onNext,
  top,
  formQuestions,
}: {
  level: Level;
  character: CharacterData | undefined;
  onNext: () => void;
  top: React.ReactNode;
  /** Questions in the level's form: the button then leads into it ("Kể về từ điển pháp thuật"). */
  formQuestions: number;
}) {
  const { state, t } = usePlayer();
  const skin = useSkin();
  // Stars count first tries only, as encouragement, never pass/fail (FR-P-19).
  const firstTryRight = level.quiz.filter((q) => {
    const first = state.attempts.filter((a) => a.questionId === q.id).sort((a, b) => a.attemptNo - b.attemptNo)[0];
    return first?.correct;
  }).length;
  return (
    <main className="screen center">
      {top}
      <h1 className="big-title" style={{ marginTop: 24 }}>
        {t('quizDone')}
      </h1>
      <div className="hero">
        {skin === 'halloween' ? <Mascot expression="happy" size={130} /> : <Character character={character} expression="happy" size={130} />}
      </div>
      {/* FR-P-19: one candy per question right first time, an empty wrapper otherwise. */}
      <div className="candies" role="img" aria-label={t('candyLabel', { n: firstTryRight, total: level.quiz.length })}>
        {level.quiz.map((q, i) => (
          <span key={q.id} className="candy-pop" style={{ animationDelay: `${i * 120}ms` }}>
            <Candy empty={i >= firstTryRight} size={48} />
          </span>
        ))}
      </div>
      <p className="content-col" style={{ margin: '0 auto' }}>
        {firstTryRight === level.quiz.length
          ? t('quizAllRight')
          : firstTryRight > 0
            ? t('quizSomeRight', { n: firstTryRight, total: level.quiz.length })
            : t('quizNoneRight', { total: level.quiz.length })}
      </p>
      {formQuestions > 0 && (
        <p className="notice content-col" style={{ margin: '0 auto' }}>
          {t('toFormHint', { n: formQuestions })}
        </p>
      )}
      <div className="bottom-actions">
        <button className="btn" onClick={onNext}>
          {formQuestions > 0 ? t('toForm') : t('next')}
        </button>
      </div>
    </main>
  );
}
