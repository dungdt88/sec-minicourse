// FR-M-05: first-attempt result and chosen option per child and question, with a team tally.
import { byOrder, sortedLevels } from '../../content/types';
import { activeProfiles, firstAttempt } from '../derive';
import { useMentor } from '../context';

export function QuizPage() {
  const { data, active, contents } = useMentor();
  const profiles = activeProfiles(data);
  return (
    <>
      <h1>Câu đố</h1>
      <p className="lead">Chỉ tính lần trả lời đầu tiên. Đáp án con chọn cho thấy con đang hiểu nhầm chỗ nào.</p>
      {sortedLevels(active).map((level) => (
        <section key={level.id}>
          <h2>{level.title}</h2>
          <div className="m-table-wrap">
            <table className="m-table">
              <thead>
                <tr>
                  <th>Câu</th>
                  <th>Cả đội</th>
                  {profiles.map((p) => (
                    <th key={p.id}>
                      {p.avatar} {p.displayName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byOrder(level.quiz).map((q) => {
                  const firsts = profiles.map((p) => firstAttempt(data.attempts, p.id, q.id));
                  const answered = firsts.filter(Boolean);
                  const wrong = answered.filter((a) => !a!.correct).length;
                  return (
                    <tr key={q.id} className={wrong > 0 && wrong * 2 >= answered.length ? 'flag' : ''}>
                      <td style={{ maxWidth: 320 }}>
                        <strong>{q.id}</strong> {q.prompt}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{answered.length ? `${wrong}/${answered.length} sai` : '–'}</td>
                      {firsts.map((a, i) => {
                        if (!a) return <td key={i} className="muted">–</td>;
                        const c = contents.get(a.contentVersionId) ?? active;
                        const opt = c.levels.flatMap((l) => l.quiz).find((x) => x.id === q.id)?.options.find((o) => o.id === a.chosenOptionId);
                        const attempts = data.attempts.filter((x) => x.profileId === a.profileId && x.questionId === q.id).length;
                        return (
                          <td key={i}>
                            <span className={`m-tag ${a.correct ? 'ok' : 'bad'}`}>{a.correct ? '✓ Đúng' : '✗ Sai'}</span>
                            <div className="small-text">{opt?.text ?? a.chosenOptionId}</div>
                            {attempts > 1 && <div className="small-text muted">{attempts} lượt</div>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
