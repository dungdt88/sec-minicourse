// FR-M-06: one child's answers with timestamps and the full version history.
import { useState } from 'react';
import { HOMEWORK_LEVEL_ID, byOrder, sortedLevels, type Part } from '../../content/types';
import { formatPart } from '../../domain/answers';
import { activeProfiles, answerHistory, asPartAnswer, fmtTime } from '../derive';
import { useMentor } from '../MentorApp';

export function AnswersPage() {
  const { data, active, contents, t } = useMentor();
  const profiles = activeProfiles(data);
  const [pid, setPid] = useState(profiles[0]?.id ?? '');
  const history = answerHistory(data.answers);

  const rows = (questionId: string, parts: Part[]) =>
    parts.map((part) => {
      const versions = history.get(`${pid}/${questionId}/${part.id}`) ?? [];
      const last = versions[versions.length - 1];
      const fmt = (v: (typeof versions)[number]) => formatPart(part, asPartAnswer(v), contents.get(v.contentVersionId) ?? active, t);
      return (
        <div key={part.id} style={{ margin: '4px 0 8px' }}>
          {part.label && <span className="muted">{part.label} </span>}
          {last ? <strong style={{ whiteSpace: 'pre-wrap' }}>{fmt(last) || '–'}</strong> : <em className="muted">chưa trả lời</em>}
          {last && (
            <div className="small-text muted">
              lần đầu {fmtTime(versions[0].createdAt)} · cập nhật {fmtTime(last.updatedAt)} · {last.deviceType}
              {versions.length > 1 ? ` · sửa ${versions.length - 1} lần` : ''}
            </div>
          )}
          {versions.length > 1 && (
            <details className="m-versions">
              <summary>Xem các phiên bản</summary>
              <ol>
                {versions.map((v) => (
                  <li key={v.id}>
                    {fmtTime(v.updatedAt)}: {fmt(v) || '–'}
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>
      );
    });

  return (
    <>
      <h1>Phiếu trả lời</h1>
      <div className="m-row" style={{ marginBottom: 12 }}>
        {profiles.map((p) => (
          <button key={p.id} className={`m-btn${p.id === pid ? ' primary' : ''}`} onClick={() => setPid(p.id)}>
            {p.avatar} {p.displayName}
          </button>
        ))}
      </div>
      {sortedLevels(active).map((level) => {
        const ls = data.levelStates.find((s) => s.profileId === pid && s.levelId === level.id);
        return (
          <section key={level.id} className="m-card">
            <div className="m-row">
              <h2 style={{ margin: 0 }}>{level.title}</h2>
              {ls?.submittedAt && <span className="m-tag ok">Nộp {fmtTime(ls.submittedAt)}</span>}
              {ls?.formLocked && <span className="m-tag">🔏 Đã khoá</span>}
            </div>
            {level.form.questions.map((q, i) => (
              <div key={q.id} style={{ marginTop: 10 }}>
                <div>
                  {i + 1}. {q.prompt} <span className="muted small-text">({q.id})</span>
                </div>
                {rows(q.id, q.parts)}
              </div>
            ))}
          </section>
        );
      })}
      <section className="m-card">
        <h2 style={{ margin: 0 }}>{active.homework.title}</h2>
        {byOrder(active.homework.items).map((item) => {
          const parts = active.homework.capture?.[item.id] ?? [];
          if (!parts.length) return null;
          return (
            <div key={item.id} style={{ marginTop: 10 }}>
              <div>
                {item.order}. {item.text}
              </div>
              {rows(item.id, parts)}
            </div>
          );
        })}
        {!data.answers.some((a) => a.profileId === pid && a.levelId === HOMEWORK_LEVEL_ID) && <p className="muted">Chưa ghi kết quả trong ứng dụng.</p>}
      </section>
    </>
  );
}
