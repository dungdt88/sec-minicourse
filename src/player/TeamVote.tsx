// "Chia tiền lời & Đội mình" (src/content/teamVote.ts): the parent reads each question, the child
// answers, the parent writes the child's words. Saved while typing like a level's form; "Gửi"
// marks it sent and the child can still change it. Only this child's own answers are shown here.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FormQuestion } from '../content/types';
import { TEAM_VOTE_INTRO, TEAM_VOTE_LEVEL_ID, TEAM_VOTE_QUESTIONS, TEAM_VOTE_SECTIONS, TEAM_VOTE_TITLE, teamVoteText } from '../content/teamVote';
import type { PartAnswer } from '../domain/answers';
import { switchProfile } from './Entry';
import { useAutosave } from './Form';
import { PartField } from './parts';
import { usePlayer } from './session';
import { HintBanner, SavePill } from './ui';

interface Entry {
  flush: () => void;
  current: () => PartAnswer | undefined;
}

function VoteQuestion(props: { question: FormQuestion; n: number; tip: boolean; register: (id: string, e: Entry | null) => void }) {
  const { question, n, tip, register } = props;
  const { content, t, answer } = usePlayer();
  const { drafts, change, flushAll } = useAutosave(TEAM_VOTE_LEVEL_ID, question.id, question.parts, false);
  const part = question.parts[0];
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  useEffect(() => {
    register(question.id, { flush: flushAll, current: () => draftsRef.current[part.id] });
    return () => register(question.id, null);
  }, [register, question.id, part.id, flushAll]);
  const labelId = `vote-${question.id}`;
  return (
    <section className="panel vote-question">
      <h3 className="prompt" id={labelId}>
        {n}. {question.prompt}
      </h3>
      {tip && <HintBanner id="dictation" text={t('dictationTip')} line />}
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
    </section>
  );
}

export function TeamVote() {
  const { t, base, state, preview, write, flush, levelState } = usePlayer();
  const navigate = useNavigate();
  const entries = useRef(new Map<string, Entry>());
  const register = useCallback((id: string, e: Entry | null) => {
    if (e) entries.current.set(id, e);
    else entries.current.delete(id);
  }, []);
  // First tap with unanswered questions says which; the next tap sends anyway.
  const [missing, setMissing] = useState<number[] | null>(null);
  const [sending, setSending] = useState(false);
  const [offline, setOffline] = useState(false);
  const submittedAt = levelState(TEAM_VOTE_LEVEL_ID)?.submittedAt;

  const send = async () => {
    entries.current.forEach((e) => e.flush());
    const open = TEAM_VOTE_QUESTIONS.flatMap((q, i) => (teamVoteText(q, entries.current.get(q.id)?.current()) == null ? [i + 1] : []));
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

  // The voice-typing tip once, above the first text box (FR-P-24).
  const firstText = TEAM_VOTE_QUESTIONS.find((q) => q.parts[0].type === 'text')?.id;
  let n = 0;
  return (
    <main className="screen">
      <div className="topbar level-top">
        <button className="map-btn" onClick={() => navigate(`${base}/home`)} aria-label={t('backHome')}>
          <span aria-hidden="true">🗺️</span>
        </button>
        {/* the big title below names the page */}
        <span className="title" />
        {!preview && <SavePill />}
      </div>
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
      {TEAM_VOTE_SECTIONS.map((section) => (
        <section key={section.title} className="vote-section" aria-label={section.title}>
          <h2>{section.title}</h2>
          {section.questions.map((q) => (
            <VoteQuestion key={q.id} question={q} n={++n} tip={q.id === firstText} register={register} />
          ))}
        </section>
      ))}
      {missing && (
        <p className="gentle" role="alert">
          Còn câu {missing.join(', ')} chưa có câu trả lời. Nếu con chưa biết thì chọn hoặc ghi "chưa biết". Bấm <strong>Gửi</strong> lần nữa để gửi luôn.
        </p>
      )}
      {submittedAt && !missing && (
        <p className="notice vote-sent" role="status">
          ✓ Đã gửi. Con vẫn sửa được, máy tự lưu.
        </p>
      )}
      {offline && <p className="gentle">{t('unsaved')}</p>}
      <div className="bottom-actions">
        <button className="btn" onClick={() => void send()} disabled={sending}>
          Gửi
        </button>
      </div>
    </main>
  );
}
