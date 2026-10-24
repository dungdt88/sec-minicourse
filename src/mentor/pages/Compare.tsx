// FR-M-07 compare view and FR-M-11 Zoom vote sheet.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPart, isComparable } from '../../domain/answers';
import { activeProfiles, asPartAnswer, compareRows, voteLines } from '../derive';
import { useMentor } from '../MentorApp';

export function ComparePage() {
  const { data, active, contents, t } = useMentor();
  const profiles = activeProfiles(data);
  const rows = compareRows(active, data);
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const shown = onlyFlagged ? rows.filter((r) => r.flagged) : rows;
  const flaggedCount = rows.filter((r) => r.flagged).length;

  return (
    <>
      <h1>So sánh</h1>
      <p className="lead">Câu trả lời mới nhất của từng con. Câu chọn và câu số được đánh dấu khi các con trả lời khác nhau.</p>
      <div className="m-row m-noprint" style={{ marginBottom: 12 }}>
        <button className={`m-btn${onlyFlagged ? ' primary' : ''}`} onClick={() => setOnlyFlagged(!onlyFlagged)}>
          ⚑ Chỉ câu khác nhau ({flaggedCount})
        </button>
        <Link className="m-btn" to="/mentor/zoom">
          🖨️ Tờ bỏ phiếu Zoom
        </Link>
      </div>
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
            {shown.map((r) => (
              <tr key={`${r.question.id}/${r.part.id}`} className={r.flagged ? 'flag' : ''}>
                <td style={{ maxWidth: 320 }}>
                  {r.flagged && <span className="m-tag warn">⚑ Khác nhau</span>}{' '}
                  <strong>{r.question.id}</strong> {r.question.prompt}
                  {r.part.label && <div className="small-text muted">{r.part.label}</div>}
                  {!isComparable(r.part) && <div className="small-text muted">(câu viết, không so)</div>}
                </td>
                {profiles.map((p) => {
                  const a = r.answers.get(p.id);
                  const c = (a && contents.get(a.contentVersionId)) || active;
                  return (
                    <td key={p.id} style={{ whiteSpace: 'pre-wrap' }}>
                      {a ? formatPart(r.part, asPartAnswer(a), c, t) : <span className="muted">–</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function ZoomSheetPage() {
  const { data, active, t } = useMentor();
  const profiles = activeProfiles(data);
  const flagged = compareRows(active, data).filter((r) => r.flagged);
  return (
    <main className="m-main" style={{ maxWidth: 820, margin: '0 auto' }}>
      <div className="m-row m-noprint" style={{ marginBottom: 12 }}>
        <Link className="m-btn" to="/mentor/compare">
          ← So sánh
        </Link>
        <button className="m-btn primary" onClick={() => window.print()}>
          🖨️ In
        </button>
      </div>
      <h1>Tờ bỏ phiếu</h1>
      <p className="lead">
        {flagged.length} câu các con trả lời khác nhau. Mỗi bạn nói ý mình trước, rồi giơ tay bỏ phiếu; ghi số phiếu và chụp màn hình.
      </p>
      {flagged.length === 0 && <p>Các con đang trả lời giống nhau, chưa có câu nào cần bỏ phiếu.</p>}
      {flagged.map((r, i) => (
        <section className="m-card" key={`${r.question.id}/${r.part.id}`}>
          <strong>
            {i + 1}. {r.question.prompt}
          </strong>
          {r.part.label && <span className="muted"> · {r.part.label}</span>}
          <table className="m-table" style={{ marginTop: 6 }}>
            <thead>
              <tr>
                <th>Lựa chọn</th>
                <th>Ai đã chọn</th>
                <th style={{ width: 110 }}>Số phiếu</th>
              </tr>
            </thead>
            <tbody>
              {voteLines(r, profiles, active, t).map((line, j) => (
                <tr className="vote-line" key={j}>
                  <td>{line.label}</td>
                  <td className="small-text">{line.who.join(', ')}</td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </main>
  );
}
