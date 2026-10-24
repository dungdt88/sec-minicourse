// "Đến lượt đội con": one question per screen with autosave, then a review screen (FR-P-20 … FR-P-25).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormQuestion, Level, Part } from '../content/types';
import { findQuestion } from '../content/types';
import { checkPart, formatPart, type PartAnswer } from '../domain/answers';
import { uuid } from '../domain/progress';
import { PartField } from './parts';
import { usePlayer } from './session';
import { RichText } from './ui';

const TEXT_DEBOUNCE_MS = 600;

/**
 * Drafts for the parts of one question. Changes show at once and are written after a short pause
 * (typing) or immediately (taps). All writes from one visit share an edit session, so the server
 * keeps one version per visit rather than one per keystroke.
 */
export function useAutosave(levelId: string, questionId: string, parts: Part[], readOnly: boolean) {
  const { answer, write } = usePlayer();
  const editSession = useMemo(() => uuid(), []);
  const [drafts, setDrafts] = useState<Record<string, PartAnswer | undefined>>(() =>
    Object.fromEntries(parts.map((p) => [p.id, answer(questionId, p.id)])),
  );
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pending = useRef<Record<string, PartAnswer>>({});

  const send = useCallback(
    (partId: string) => {
      const a = pending.current[partId];
      if (!a) return;
      delete pending.current[partId];
      clearTimeout(timers.current[partId]);
      write({ kind: 'answer', levelId, questionId, partId, value: a.value, dontKnow: a.dontKnow, editSession });
    },
    [write, levelId, questionId, editSession],
  );

  const flushAll = useCallback(() => Object.keys(pending.current).forEach(send), [send]);
  useEffect(() => flushAll, [flushAll]); // unmount: nothing typed is lost

  const change = (part: Part, a: PartAnswer) => {
    if (readOnly) return;
    setDrafts((d) => ({ ...d, [part.id]: a }));
    pending.current[part.id] = a;
    clearTimeout(timers.current[part.id]);
    const typing = !a.dontKnow && (typeof a.value === 'string' || part.type === 'item_list' || part.type === 'sum_split' || part.type === 'number' || part.type === 'repeat');
    if (typing) timers.current[part.id] = setTimeout(() => send(part.id), TEXT_DEBOUNCE_MS);
    else send(part.id);
  };

  return { drafts, change, flushAll };
}

interface QuestionProps {
  level: Level;
  question: FormQuestion;
  index: number;
  total: number;
  readOnly: boolean;
  onBack: () => void;
  onNext: () => void;
  top: React.ReactNode;
}

export function FormQuestionScreen({ level, question, index, total, readOnly, onBack, onNext, top }: QuestionProps) {
  const { content, t, answer, notice, clearNotice } = usePlayer();
  const { drafts, change, flushAll } = useAutosave(level.id, question.id, question.parts, readOnly);
  const lookup = (q: string, p: string) => (q === question.id ? drafts[p] : answer(q, p));
  const complete = question.parts.every((p) => checkPart(p, drafts[p.id], t).complete);
  const promptId = `prompt-${question.id}`;

  const contextRows = (question.context ?? []).map((ref) => {
    const found = findQuestion(content, ref.questionId);
    const part = found?.question.parts.find((p) => p.id === ref.partId);
    const label = part?.label ?? found?.question.prompt ?? ref.questionId;
    const value = part ? formatPart(part, answer(ref.questionId, ref.partId), content, t) : '';
    return { key: `${ref.questionId}/${ref.partId}`, label, value: value || t('noAnswer') };
  });

  return (
    <main className="screen">
      {top}
      <div className="progress-dots" aria-label={t('questionOf', { n: index + 1, total })}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`dot${i <= index ? ' on' : ''}`} />
        ))}
        <span style={{ marginLeft: 6 }}>{t('questionOf', { n: index + 1, total })}</span>
      </div>
      <div>
        <h1 className="prompt content-col" id={promptId}>
          <RichText text={question.prompt} />
        </h1>
        {question.hint && <p className="hint">{question.hint}</p>}
      </div>
      {readOnly && <p className="notice lock">{t('formLocked')}</p>}
      {notice && (
        <p className="notice lock" role="alert" onClick={clearNotice}>
          {notice}
        </p>
      )}
      {contextRows.length > 0 && (
        <div className="context-box">
          {t('earlierAnswers')}
          <dl>
            {contextRows.map((r) => (
              <div key={r.key}>
                <dt>{r.label}</dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {question.parts.map((part) => (
        <PartField
          key={part.id}
          part={part}
          answer={drafts[part.id]}
          onChange={(a) => change(part, a)}
          readOnly={readOnly}
          t={t}
          content={content}
          lookup={lookup}
          allowDontKnow={question.allowDontKnow}
          compactDontKnow={question.parts.length > 1}
          fallbackLabelId={promptId}
        />
      ))}
      <div className="bottom-actions">
        <button
          className="btn secondary"
          onClick={() => {
            flushAll();
            onBack();
          }}
        >
          {t('back')}
        </button>
        <button
          className="btn"
          disabled={!complete && !readOnly}
          onClick={() => {
            flushAll();
            onNext();
          }}
        >
          {t('next')}
        </button>
      </div>
    </main>
  );
}

interface ReviewProps {
  level: Level;
  readOnly: boolean;
  submitted: boolean;
  onEdit: (index: number) => void;
  onSubmit: () => void;
  top: React.ReactNode;
}

export function FormReview({ level, readOnly, submitted, onEdit, onSubmit, top }: ReviewProps) {
  const { content, t, answer, flush, saveStatus } = usePlayer();
  const [busy, setBusy] = useState(false);
  const rows = level.form.questions.map((q) => {
    const parts = q.parts.map((p) => ({
      label: p.label,
      text: formatPart(p, answer(q.id, p.id), content, t),
      complete: checkPart(p, answer(q.id, p.id), t).complete,
    }));
    return { q, parts, complete: parts.every((p) => p.complete) };
  });
  const allComplete = rows.every((r) => r.complete);

  return (
    <main className="screen">
      {top}
      <h1 className="big-title">{t('review')}</h1>
      {readOnly ? <p className="notice lock">{t('formLocked')}</p> : submitted && <p className="notice">{t('submitted')}</p>}
      <div className="review-list">
        {rows.map(({ q, parts, complete }, i) => (
          <section className="review-item" key={q.id}>
            <div className="row">
              <p className="q">
                {i + 1}. <RichText text={q.prompt} />
              </p>
              {!readOnly && (
                <button className="icon-btn" onClick={() => onEdit(i)} aria-label={`${t('edit')} ${i + 1}`}>
                  ✏️ {t('edit')}
                </button>
              )}
            </div>
            {parts.map((p, j) => (
              <p className="a" key={j}>
                {p.label && <span className="muted">{p.label} </span>}
                {p.text || <em className="muted">{t('noAnswer')}</em>}
              </p>
            ))}
            {!complete && !readOnly && <p className="part-message">{t('noAnswer')}</p>}
          </section>
        ))}
      </div>
      {level.form.note && (
        <p className="notice small-text">
          <strong>{t('forParent')}: </strong>
          {level.form.note}
        </p>
      )}
      <div className="bottom-actions">
        <button
          className="btn"
          disabled={(!allComplete && !readOnly) || busy}
          onClick={async () => {
            setBusy(true);
            await flush(); // try to land every answer before the "done" screen
            setBusy(false);
            onSubmit();
          }}
        >
          {readOnly ? t('next') : submitted ? t('done') : t('submit')}
        </button>
      </div>
      {saveStatus === 'offline' && <p className="save-pill offline">{t('unsaved')}</p>}
    </main>
  );
}
