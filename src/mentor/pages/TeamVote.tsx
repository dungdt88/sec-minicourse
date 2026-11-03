// "Chia tiền lời & Đội mình": who has sent, the tally of the vote questions (1–4), each child's
// answers side by side, and a plain-text copy of everything for the milestone write-up.
import { TEAM_VOTE_QUESTIONS, TEAM_VOTE_TALLIED, TEAM_VOTE_TITLE } from '../../content/teamVote';
import { fmtTime } from '../derive';
import { useMentor } from '../context';
import { teamVoteChildren, teamVoteCopyText, teamVoteTally } from '../teamVote';

export function TeamVotePage() {
  const { data, notify } = useMentor();
  const children = teamVoteChildren(data);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(teamVoteCopyText(children));
      notify('Đã sao chép. Dán vào tài liệu hoặc Zalo.');
    } catch {
      notify('Trình duyệt không cho sao chép. Hãy chọn và sao chép bằng tay.');
    }
  };

  return (
    <>
      <h1>{TEAM_VOTE_TITLE}</h1>
      <p className="lead">
        Phiếu bầu chia tiền lời và lời các con kể về đội. Ghi đúng lời con. Các con không thấy câu trả lời hay số phiếu của nhau. Bấm ↻ Làm mới để xem câu trả lời mới.
      </p>
      <div className="m-row m-noprint" style={{ marginBottom: 12 }}>
        <button className="m-btn primary" onClick={() => void copy()}>
          📋 Sao chép tất cả
        </button>
      </div>

      <section className="m-card">
        <h2 style={{ marginTop: 0 }}>Đã gửi</h2>
        <table className="m-table">
          <tbody>
            {children.map((c) => (
              <tr key={c.profile.id}>
                <td>
                  <span aria-hidden="true">{c.profile.avatar}</span> <strong>{c.profile.displayName}</strong>
                </td>
                <td>
                  {c.submittedAt ? <span className="m-tag ok">✓ Đã gửi {fmtTime(c.submittedAt)}</span> : <span className="m-tag warn">Chưa gửi</span>}
                  {c.editedAfter && <span className="small-text muted"> · có sửa sau khi gửi</span>}
                </td>
                <td className="num">
                  {c.answered}/{TEAM_VOTE_QUESTIONS.length} câu
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <h2>Kết quả bỏ phiếu</h2>
      {TEAM_VOTE_TALLIED.map((q, i) => {
        const { lines, unanswered } = teamVoteTally(q, children);
        return (
          <section className="m-card" key={q.id}>
            <strong>
              {i + 1}. {q.prompt}
            </strong>
            <table className="m-table" style={{ marginTop: 6 }}>
              <thead>
                <tr>
                  <th>Lựa chọn</th>
                  <th style={{ width: 80 }}>Số phiếu</th>
                  <th>Ai chọn</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, j) =>
                  l.own ? (
                    <tr key={j}>
                      <td style={{ paddingLeft: 24, whiteSpace: 'pre-wrap' }}>“{l.label}”</td>
                      <td />
                      <td className="small-text">{l.who.join(', ')}</td>
                    </tr>
                  ) : (
                    <tr key={j}>
                      <td>{l.label}</td>
                      <td className="num">
                        <strong>{l.who.length}</strong>
                      </td>
                      <td className="small-text">{l.who.join(', ')}</td>
                    </tr>
                  ),
                )}
                {unanswered.length > 0 && (
                  <tr>
                    <td className="muted">Chưa trả lời</td>
                    <td className="num muted">{unanswered.length}</td>
                    <td className="small-text muted">{unanswered.join(', ')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        );
      })}

      <h2>Câu trả lời của từng con</h2>
      <div className="m-table-wrap">
        <table className="m-table">
          <thead>
            <tr>
              <th>Câu</th>
              {children.map((c) => (
                <th key={c.profile.id}>
                  {c.profile.avatar} {c.profile.displayName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TEAM_VOTE_QUESTIONS.map((q, i) => (
              <tr key={q.id}>
                <td style={{ maxWidth: 280 }}>
                  <strong>{i + 1}.</strong> {q.prompt}
                </td>
                {children.map((c) => {
                  const text = c.answers.get(q.id);
                  return (
                    <td key={c.profile.id} style={{ whiteSpace: 'pre-wrap' }}>
                      {text ?? <span className="muted">–</span>}
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
