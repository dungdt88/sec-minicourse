// "Đến lượt đội con": one question per screen with autosave, then a review screen (FR-P-20 … FR-P-25).
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormQuestion, Level, Part } from '../content/types';
import { findQuestion } from '../content/types';
import { checkPart, checkQuestion, formatPart, pickedTexts, withColon, type PartAnswer } from '../domain/answers';
import { uuid } from '../domain/progress';
import { PartField } from './parts';
import { usePlayer } from './session';
import { HintBanner, RichText, StepProgress } from './ui';

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
  /** "Xem lại thẻ", shown on the right of the progress row. */
  reread?: React.ReactNode;
}

export function FormQuestionScreen({ level, question, index, total, readOnly, onBack, onNext, top, reread }: QuestionProps) {
  const { content, t, answer, notice, clearNotice } = usePlayer();
  const { drafts, change, flushAll } = useAutosave(level.id, question.id, question.parts, readOnly);
  const lookup = (q: string, p: string) => (q === question.id ? drafts[p] : answer(q, p));
  const promptId = `prompt-${question.id}`;
  const check = checkQuestion(question, (id) => drafts[id], t);
  // "Tiếp" stays tappable; a tap on an unfinished question says what is missing instead of
  // silently doing nothing. Messages about a part wait for that first tap.
  const [attempted, setAttempted] = useState(false);
  // Empty "Vì sao…" parts already nudged once: the next tap goes through (Appendix B).
  const [nudged, setNudged] = useState<Set<string>>(new Set());

  const scrollTo = (partId: string | undefined) => {
    if (partId) document.getElementById(`part-${question.id}-${partId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  // One "Chưa biết" per question. It covers what is not answered yet, so a child who knows the
  // choice but not the rest keeps their choice. Tapping it again takes it back.
  const anyDontKnow = question.parts.some((p) => drafts[p.id]?.dontKnow);
  const toggleDontKnow = () => {
    if (anyDontKnow) {
      for (const p of question.parts) if (drafts[p.id]?.dontKnow) change(p, { value: null, dontKnow: false });
      return;
    }
    const unanswered = question.parts.filter((p) => !checkPart(p, drafts[p.id], t).complete);
    for (const p of unanswered.length ? unanswered : question.parts) change(p, { value: null, dontKnow: true });
  };

  const tryNext = () => {
    flushAll();
    if (readOnly) return onNext();
    if (!check.complete) {
      setAttempted(true);
      scrollTo(check.blocking[0] ?? question.parts[0]?.id);
      return;
    }
    const pending = check.nudge.filter((id) => !nudged.has(id));
    if (pending.length) {
      setNudged(new Set([...nudged, ...pending]));
      scrollTo(pending[0]);
      return;
    }
    onNext();
  };

  const contextRows = (question.context ?? []).map((ref) => {
    const found = findQuestion(content, ref.questionId);
    const part = found?.question.parts.find((p) => p.id === ref.partId);
    const label = part?.label ?? found?.question.prompt ?? ref.questionId;
    // All picks, joined with " · "; a link with nothing picked (or "Chưa biết") shows no line.
    const value = part ? pickedTexts(part, answer(ref.questionId, ref.partId), content, t).join(' · ') : '';
    const chose = !!part && ['single_choice', 'multi_choice', 'pick_n', 'sdg_picker'].includes(part.type);
    return { key: `${ref.questionId}/${ref.partId}`, label, value, chose };
  }).filter((r) => r.value);
  const firstTextPart = question.parts.find((p) => p.type === 'text')?.id;

  return (
    <main className="screen">
      {top}
      <StepProgress index={index} total={total} label={t('formOf', { label: t('yourTurn'), n: index + 1, total })} action={reread} />
      {/* The level's own intro line (L1), once, now that the quiz-end screen leads straight here. */}
      {index === 0 && level.form.intro && (
        <p className="muted small-text" style={{ margin: 0 }}>
          {level.form.intro}
        </p>
      )}
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
      {contextRows.length === 1 && (
        <p className="context-box" style={{ margin: 0 }}>
          {t(contextRows[0].chose ? 'earlierChose' : 'earlierWrote')} <strong>{contextRows[0].value}</strong>
        </p>
      )}
      {contextRows.length > 1 && (
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
        <Fragment key={part.id}>
          <PartField
            part={part}
            answer={drafts[part.id]}
            onChange={(a) => change(part, a)}
            readOnly={readOnly}
            t={t}
            content={content}
            lookup={lookup}
            domId={`part-${question.id}-${part.id}`}
            missing={attempted && check.blocking.includes(part.id)}
            ruleInHint={!!question.hint && !part.label}
            nudge={nudged.has(part.id) && check.nudge.includes(part.id)}
            fallbackLabelId={promptId}
          />
          {/* FR-P-24: under the first text field, a tip about the keyboard's microphone. */}
          {!readOnly && part.id === firstTextPart && <HintBanner id="dictation" text={t('dictationTip')} line />}
        </Fragment>
      ))}
      {question.allowDontKnow && (
        <button type="button" className="option dont-know" role="checkbox" aria-checked={anyDontKnow} disabled={readOnly} onClick={toggleDontKnow}>
          <span className="mark" aria-hidden="true">
            {anyDontKnow ? '✓' : '?'}
          </span>
          <span>{t('dontKnow')}</span>
        </button>
      )}
      {attempted && !check.complete && !readOnly && (
        <p className="gentle" role="alert">
          {check.textOnlyEmpty ? t('textOnlyMissing') : t('missingHint')}
        </p>
      )}
      <div className="bottom-actions sticky">
        <button
          className="btn secondary"
          onClick={() => {
            flushAll();
            onBack();
          }}
        >
          {t('back')}
        </button>
        <button className="btn" onClick={tryNext}>
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
  reread?: React.ReactNode;
}

export function FormReview({ level, readOnly, submitted, onEdit, onSubmit, top, reread }: ReviewProps) {
  const { content, t, answer, flush, saveStatus } = usePlayer();
  const [busy, setBusy] = useState(false);
  const rows = level.form.questions.map((q) => {
    // Empty optional parts are left out of the review rather than shown as "chưa trả lời".
    const parts = q.parts
      .map((p) => ({ label: p.label, text: formatPart(p, answer(q.id, p.id), content, t) }))
      .filter((p, i) => p.text || q.parts.length === 1 || i === 0);
    return { q, parts, complete: checkQuestion(q, (id) => answer(q.id, id), t).complete };
  });
  const allComplete = rows.every((r) => r.complete);

  return (
    <main className="screen">
      {top}
      <div className="title-row">
        <h1 className="big-title">{t('review')}</h1>
        {reread}
      </div>
      {readOnly ? <p className="notice lock">{t('formLocked')}</p> : submitted && <p className="notice">{t('submitted')}</p>}
      <div className="review-list">
        {rows.map(({ q, parts, complete }, i) => (
          <section className="review-item" key={q.id}>
            <div className="row">
              <p className="q">
                <span className="q-no">{i + 1}.</span> <RichText text={q.prompt} />
              </p>
              {!readOnly && (
                <button className="icon-btn small edit-btn" onClick={() => onEdit(i)} aria-label={`${t('edit')} ${i + 1}`}>
                  ✏️ {t('edit')}
                </button>
              )}
            </div>
            {parts.map((p, j) => (
              <p className="a" key={j}>
                {p.label && <span className="muted">{withColon(p.label)} </span>}
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
      <div className="bottom-actions sticky">
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
