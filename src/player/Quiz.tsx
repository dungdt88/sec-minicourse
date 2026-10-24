// Quiz question and quiz end (FR-P-15 … FR-P-19).
import { useMemo, useState } from 'react';
import { Character } from '../art/Character';
import type { Character as CharacterData, Level, QuizQuestion } from '../content/types';
import { newOptionOrder } from '../domain/shuffle';
import { usePlayer } from './session';
import { RichText, Stars } from './ui';

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
  const { state, write, t } = usePlayer();
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

  const choose = (id: string) => {
    if (answered) return; // locked after the first tap (FR-P-16)
    setChosen(id);
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
      <div className="progress-dots" aria-label={t('questionOf', { n: index + 1, total })}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`dot${i <= index ? ' on' : ''}`} />
        ))}
        <span style={{ marginLeft: 6 }}>{t('questionOf', { n: index + 1, total })}</span>
      </div>
      <h1 className="prompt content-col">
        <RichText text={question.prompt} />
      </h1>
      <div className="option-list" role="group" aria-label={question.prompt}>
        {options.map((o, i) => {
          const isChosen = chosen === o.id;
          const cls = !answered ? '' : o.id === correctId ? ' correct' : isChosen ? ' wrong' : '';
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
          ref={(el) => {
            // On a phone the explanation lands below the fold; bring it into view once.
            if (el && !saved) el.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
          }}
        >
          <Character character={character} expression={right ? 'happy' : 'oops'} size={64} decorative />
          <div>
            <h3>{right ? t('correct') : t('wrong')}</h3>
            <p>
              <RichText text={question.explanation} />
            </p>
          </div>
        </div>
      )}
      <div className="bottom-actions">
        <button className="btn" onClick={onNext} disabled={!answered}>
          {t('next')}
        </button>
      </div>
    </main>
  );
}

export function QuizEnd({ level, character, onNext, top }: { level: Level; character: CharacterData | undefined; onNext: () => void; top: React.ReactNode }) {
  const { state, t } = usePlayer();
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
      <Character character={character} expression="happy" size={130} />
      {/* No row of grey stars when nothing was right first time: that reads as a failed score. */}
      {firstTryRight > 0 && <Stars n={firstTryRight} total={level.quiz.length} />}
      <p className="content-col" style={{ margin: '0 auto' }}>
        {firstTryRight === level.quiz.length
          ? t('quizAllRight')
          : firstTryRight > 0
            ? t('quizSomeRight', { n: firstTryRight, total: level.quiz.length })
            : t('quizNoneRight', { total: level.quiz.length })}
      </p>
      <div className="bottom-actions">
        <button className="btn" onClick={onNext}>
          {t('next')}
        </button>
      </div>
    </main>
  );
}
