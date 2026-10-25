// FR-M-04: per child, levels done, last activity, and time per level split into cards / quiz / form.
import { Link } from 'react-router-dom';
import { sortedLevels } from '../../content/types';
import { levelStatuses } from '../../domain/progress';
import { activeProfiles, fmtTime, lastActivity, minutes, timeSpent } from '../derive';
import { useMentor } from '../context';

export function Dashboard() {
  const { data, active } = useMentor();
  const profiles = activeProfiles(data);
  const levels = sortedLevels(active);
  const time = timeSpent(data);
  return (
    <>
      <h1>Tổng quan</h1>
      <p className="lead">
        Mỗi ô: trạng thái màn, rồi thời gian Thẻ · Đố · Phiếu (phút). Nội dung đang dùng: {active.contentVersion}.
      </p>
      {profiles.length === 0 && (
        <p>
          Chưa có bạn nào. <Link to="/mentor/profiles">Thêm các con</Link>.
        </p>
      )}
      <div className="m-table-wrap">
        <table className="m-table">
          <thead>
            <tr>
              <th>Con</th>
              <th>Xong</th>
              <th>Hoạt động gần nhất</th>
              {levels.map((l) => (
                <th key={l.id} title={l.name}>
                  Màn {l.order}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => {
              const states = data.levelStates.filter((s) => s.profileId === p.id);
              const statuses = levelStatuses(levels, states);
              const done = levels.filter((l) => statuses.get(l.id) === 'done').length;
              return (
                <tr key={p.id}>
                  <td>
                    <span aria-hidden="true">{p.avatar}</span> <strong>{p.displayName}</strong>
                  </td>
                  <td className="num">
                    {done}/{levels.length}
                  </td>
                  <td>{fmtTime(lastActivity(data, p.id))}</td>
                  {levels.map((l) => {
                    const st = statuses.get(l.id);
                    const ls = states.find((s) => s.levelId === l.id);
                    const tm = time.get(p.id)?.get(l.id);
                    const label = st === 'done' ? 'Xong' : st === 'locked' ? 'Khoá' : ls?.pointer ? 'Đang làm' : 'Mở';
                    return (
                      <td key={l.id}>
                        <span className={`m-tag ${st === 'done' ? 'ok' : st === 'locked' ? '' : 'warn'}`}>
                          {st === 'done' ? '✓ ' : st === 'locked' ? '🔒 ' : ''}
                          {label}
                        </span>
                        {ls?.formLocked && <span className="m-tag" title="Phiếu đã khoá"> 🔏</span>}
                        <div className="small-text muted" style={{ whiteSpace: 'nowrap' }}>
                          {tm ? `${minutes(tm.cards)} · ${minutes(tm.quiz)} · ${minutes(tm.form)}` : ''}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
