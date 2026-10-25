// FR-M-16: the children's latest answers grouped by the sections of the competition template, from
// the content's `submission` map, so the mentor can write one section at a time. Printable.
import { findQuestion, type Part } from '../../content/types';
import { formatPart, withColon } from '../../domain/answers';
import { activeProfiles, answerHistory, asPartAnswer, latest } from '../derive';
import { useMentor } from '../context';

export function SubmissionPage() {
  const { data, active, contents, t } = useMentor();
  const profiles = activeProfiles(data);
  const history = answerHistory(data.answers);
  const sections = active.submission ?? [];

  const answerCells = (questionId: string, parts: Part[]) =>
    profiles.map((p) => {
      const lines = parts
        .map((part) => {
          const a = latest(history, p.id, questionId, part.id);
          const text = a ? formatPart(part, asPartAnswer(a), contents.get(a.contentVersionId) ?? active, t) : '';
          return text ? (part.label && parts.length > 1 ? `${withColon(part.label)} ${text}` : text) : null;
        })
        .filter(Boolean);
      return (
        <td key={p.id} style={{ whiteSpace: 'pre-wrap' }}>
          {lines.length ? lines.join('\n') : <span className="muted">–</span>}
        </td>
      );
    });

  return (
    <>
      <div className="m-row m-noprint" style={{ justifyContent: 'space-between' }}>
        <h1>Bài nộp</h1>
        <button className="m-btn primary" onClick={() => window.print()}>
          🖨️ In
        </button>
      </div>
      <p className="lead">
        Câu trả lời mới nhất của các con, xếp theo từng mục của mẫu bài thi. Người lớn viết bài từ ý của các con, không thêm ý mới.
      </p>
      {sections.length === 0 && <p>Nội dung đang dùng chưa có bảng “submission”.</p>}
      {sections.map((s, i) => (
        <section className="m-card" key={i}>
          <div className="small-text muted">{s.part}</div>
          <h2 style={{ marginTop: 2 }}>{s.section}</h2>
          {s.note && <p className="small-text">📝 {s.note}</p>}
          <div className="m-table-wrap">
            <table className="m-table">
              <thead>
                <tr>
                  <th>Câu</th>
                  {profiles.map((p) => (
                    <th key={p.id}>
                      {p.avatar} {p.displayName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.questionIds.map((qid) => {
                  const q = findQuestion(active, qid)?.question;
                  if (!q) return null;
                  return (
                    <tr key={qid}>
                      <td style={{ maxWidth: 280 }}>
                        <strong>{qid}</strong> {q.prompt}
                      </td>
                      {answerCells(qid, q.parts)}
                    </tr>
                  );
                })}
                {(s.homeworkIds ?? []).map((hid) => {
                  const item = active.homework.items.find((h) => h.id === hid);
                  const parts = active.homework.capture?.[hid] ?? [];
                  if (!item) return null;
                  return (
                    <tr key={hid}>
                      <td style={{ maxWidth: 280 }}>
                        <strong>{hid}</strong> {item.text}
                      </td>
                      {answerCells(hid, parts)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <details className="m-card">
        <summary>
          <strong>17 Mục tiêu Toàn cầu (SDG)</strong>: người hướng dẫn chọn từ câu trả lời Màn 1
        </summary>
        <ol>
          {[...active.sdg]
            .sort((a, b) => a.number - b.number)
            .map((g) => (
              <li key={g.number} value={g.number}>
                <strong>{g.title}</strong>: {g.kidCaption}
              </li>
            ))}
        </ol>
      </details>
    </>
  );
}
