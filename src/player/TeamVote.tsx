// "Chia tiền lời & Đội mình" (src/content/teamVote.ts): the parent reads each question, the child
// answers, the parent writes the child's words. Like a level's form: an intro, one question per
// screen (saved while typing), then "Xem lại phiếu" with every answer and "Gửi". The child can
// still change answers after sending. Only this child's own answers are shown here.
import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { FormQuestion } from '../content/types';
import {
  TEAM_VOTE_INTRO,
  TEAM_VOTE_LEVEL_ID,
  TEAM_VOTE_PART,
  TEAM_VOTE_QUESTIONS,
  TEAM_VOTE_SECTIONS,
  TEAM_VOTE_TITLE,
  teamVoteText,
} from '../content/teamVote';
import { switchProfile } from './Entry';
import { useAutosave } from './Form';
import { PartField } from './parts';
import { usePlayer } from './session';
import { HintBanner, ReadAloud, SavePill, StepProgress } from './ui';

const TOTAL = TEAM_VOTE_QUESTIONS.length;
/** Steps: 0 the intro, 1…TOTAL the questions, REVIEW the answers and "Gửi". Kept in ?q= for a reload. */
const REVIEW = TOTAL + 1;
const sectionOf = (q: FormQuestion) => TEAM_VOTE_SECTIONS.find((s) => s.questions.includes(q))!;
// The voice-typing tip once, under the first text box (FR-P-24).
const FIRST_TEXT = TEAM_VOTE_QUESTIONS.find((q) => q.parts[0].type === 'text')?.id;

function stepFrom(q: string | null): number {
  if (q === 'review') return REVIEW;
  const n = Number(q);
  return Number.isInteger(n) && n >= 1 && n <= TOTAL ? n : 0;
}

/** One question; its answer is saved while typing and flushed when the screen changes. */
function VoteQuestion({ question }: { question: FormQuestion }) {
  const { content, t, answer } = usePlayer();
  const { drafts, change } = useAutosave(TEAM_VOTE_LEVEL_ID, question.id, question.parts, false);
  const part = question.parts[0];
  const labelId = `vote-${question.id}`;
  const spoken = [question.prompt, ...(part.type === 'single_choice' ? part.options.map((o) => o.text) : [])];
  return (
    <>
      <div className="prompt-row">
        <h1 className="prompt content-col" id={labelId}>
          {question.prompt}
        </h1>
        <ReadAloud id={question.id} text={spoken} compact />
      </div>
      <PartField
        part={part}
        answer={drafts[part.id]}
        onChange={(a) => change(part, a)}
        readOnly={false}
        t={t}
        content={content}
        lookup={(q, p) => (q === question.id ? drafts[p] : answer(q, p))}
        fallbackLabelId={labelId}
      />
      {question.id === FIRST_TEXT && <HintBanner id="dictation" text={t('dictationTip')} line />}
    </>
  );
}

export function TeamVote() {
  const { t, base, state, preview, write, flush, levelState, answer } = usePlayer();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const step = stepFrom(params.get('q'));
  // After "Sửa" on the review, "Tiếp" goes back to it rather than on through the questions.
  const returnToReview = useRef(false);
  // First "Gửi" with unanswered questions says which; the next tap sends anyway.
  const [missing, setMissing] = useState<number[] | null>(null);
  const [sending, setSending] = useState(false);
  const [offline, setOffline] = useState(false);
  const submittedAt = levelState(TEAM_VOTE_LEVEL_ID)?.submittedAt;
  const texts = TEAM_VOTE_QUESTIONS.map((q) => teamVoteText(q, answer(q.id, TEAM_VOTE_PART)));
  const open = texts.flatMap((text, i) => (text == null ? [i + 1] : []));

  const go = (s: number) => {
    if (s !== REVIEW) setMissing(null);
    setParams(s === 0 ? {} : { q: s === REVIEW ? 'review' : String(s) }, { replace: true });
    window.scrollTo({ top: 0 });
  };
  const home = () => navigate(`${base}/home`);

  const send = async () => {
    if (open.length && !missing) {
      setMissing(open);
      return;
    }
    setMissing(null);
    write({ kind: 'submit', levelId: TEAM_VOTE_LEVEL_ID });
    setSending(true);
    const ok = await flush();
    setSending(false);
    setOffline(!ok);
  };

  const top = (
    <div className="topbar level-top">
      <button className="map-btn" onClick={home} aria-label={t('backHome')}>
        <span aria-hidden="true">🗺️</span>
      </button>
      <span className="title">{step > 0 && <span className="title-text">{TEAM_VOTE_TITLE}</span>}</span>
      {preview ? <span className="save-pill saving">{t('preview')}</span> : <SavePill />}
    </div>
  );
  const sent = submittedAt && (
    <p className="notice vote-sent" role="status">
      ✓ Đã gửi. Con vẫn sửa được, máy tự lưu.
    </p>
  );

  if (step === 0) {
    const started = open.length < TOTAL;
    return (
      <main className="screen">
        {top}
        <h1 className="big-title">{TEAM_VOTE_TITLE}</h1>
        {/* Whose answers these are, so a parent on a shared phone writes for the right child. */}
        <p className="vote-who">
          <span aria-hidden="true">{state.profile.avatar}</span> <strong>{state.profile.displayName}</strong>
          {!preview && (
            <button className="link-btn" onClick={() => switchProfile(navigate, `${base}/team-vote`)}>
              {t('notMe', { name: state.profile.displayName })}
            </button>
          )}
        </p>
        <p className="notice">{TEAM_VOTE_INTRO}</p>
        {sent}
        <div className="bottom-actions">
          <button className="btn" onClick={() => go(submittedAt || !open.length ? REVIEW : started ? open[0] : 1)}>
            {submittedAt ? 'Xem lại câu trả lời' : started ? 'Làm tiếp' : 'Bắt đầu'}
          </button>
        </div>
      </main>
    );
  }

  if (step === REVIEW) {
    let n = 0;
    return (
      <main className="screen">
        {top}
        <h1 className="big-title">{t('review')}</h1>
        {sent}
        <div className="review-list">
          {TEAM_VOTE_SECTIONS.map((section) => (
            <section key={section.title} className="vote-section" aria-label={section.title}>
              <h2>{section.title}</h2>
              {section.questions.map((q) => {
                const no = ++n;
                const text = texts[no - 1];
                return (
                  <div className="review-item" key={q.id}>
                    <div className="row">
                      <p className="q">
                        <span className="q-no">{no}.</span> {q.prompt}
                      </p>
                      <button
                        className="icon-btn small edit-btn"
                        onClick={() => {
                          returnToReview.current = true;
                          go(no);
                        }}
                        aria-label={`${t('edit')} ${no}`}
                      >
                        ✏️ {t('edit')}
                      </button>
                    </div>
                    <p className="a">
                      {text ?? <em className="muted">{t('noAnswer')}</em>}
                    </p>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
        {missing && (
          <p className="gentle" role="alert">
            Còn câu {missing.join(', ')} chưa có câu trả lời. Nếu con chưa biết thì chọn hoặc ghi "chưa biết". Bấm <strong>Gửi</strong> lần nữa để gửi luôn.
          </p>
        )}
        {offline && <p className="gentle">{t('unsaved')}</p>}
        <div className="bottom-actions sticky">
          {submittedAt && !sending ? (
            <button className="btn" onClick={home}>
              {t('backHome')}
            </button>
          ) : (
            <button className="btn" onClick={() => void send()} disabled={sending}>
              Gửi
            </button>
          )}
        </div>
      </main>
    );
  }

  const question = TEAM_VOTE_QUESTIONS[step - 1];
  const toReview = returnToReview.current || step === TOTAL;
  return (
    <main className="screen">
      {top}
      <StepProgress index={step - 1} total={TOTAL} label={t('questionOf', { n: step, total: TOTAL })} />
      <p className="vote-part">{sectionOf(question).title}</p>
      {/* A new screen per question: the answer is saved (flushed) as this one goes. */}
      <VoteQuestion key={question.id} question={question} />
      <div className="bottom-actions sticky">
        <button className="btn secondary" onClick={() => go(step - 1)}>
          {t('back')}
        </button>
        <button
          className="btn"
          onClick={() => {
            if (toReview) returnToReview.current = false;
            go(toReview ? REVIEW : step + 1);
          }}
        >
          {toReview ? t('review') : t('next')}
        </button>
      </div>
    </main>
  );
}
