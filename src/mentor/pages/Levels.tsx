// FR-M-03: unlock, lock, reset (history kept) and lock the form, per child or for the whole team.
import { sortedLevels } from '../../content/types';
import { levelStatuses } from '../../domain/progress';
import { activeProfiles } from '../derive';
import { useMentor } from '../context';

export function LevelsPage() {
  const { data, active, api, run } = useMentor();
  const profiles = activeProfiles(data);
  const levels = sortedLevels(active);
  const state = (pid: string, lid: string) => data.levelStates.find((s) => s.profileId === pid && s.levelId === lid);

  return (
    <>
      <h1>Mở / khoá màn</h1>
      <p className="lead">
        “Theo thứ tự”: màn mở khi xong màn trước. “Làm lại” mở lại màn từ đầu nhưng giữ mọi câu trả lời cũ. “Khoá phiếu”: con xem được, không sửa được.
      </p>
      {levels.map((l) => (
        <div className="m-card" key={l.id}>
          <div className="m-row">
            <strong style={{ fontSize: 16 }}>
              Màn {l.order}: {l.name}
            </strong>
            <span style={{ flex: 1 }} />
            <span className="muted small-text">Cả đội:</span>
            <button className="m-btn" onClick={() => run(() => api.setLevelControl(null, l.id, { override: 'unlocked' }))}>Mở</button>
            <button className="m-btn" onClick={() => run(() => api.setLevelControl(null, l.id, { override: null }))}>Theo thứ tự</button>
            <button className="m-btn" onClick={() => run(() => api.setLevelControl(null, l.id, { override: 'locked' }))}>Khoá</button>
            <button className="m-btn" onClick={() => run(() => api.setLevelControl(null, l.id, { formLocked: true }))}>Khoá phiếu</button>
            <button className="m-btn" onClick={() => run(() => api.setLevelControl(null, l.id, { formLocked: false }))}>Mở phiếu</button>
          </div>
          <div className="m-table-wrap" style={{ marginTop: 10 }}>
            <table className="m-table">
              <tbody>
                {profiles.map((p) => {
                  const s = state(p.id, l.id);
                  const status = levelStatuses(levels, data.levelStates.filter((x) => x.profileId === p.id)).get(l.id);
                  return (
                    <tr key={p.id}>
                      <td style={{ width: 160 }}>
                        {p.avatar} {p.displayName}
                      </td>
                      <td style={{ width: 110 }}>
                        <span className={`m-tag ${status === 'done' ? 'ok' : status === 'locked' ? '' : 'warn'}`}>
                          {status === 'done' ? '✓ Xong' : status === 'locked' ? '🔒 Khoá' : 'Mở'}
                        </span>
                        {s?.resetCount ? <span className="small-text muted"> · làm lại {s.resetCount}</span> : null}
                      </td>
                      <td>
                        <div className="m-row">
                          <select
                            className="m-select"
                            aria-label={`Mở màn ${l.order} cho ${p.displayName}`}
                            value={s?.override ?? 'auto'}
                            onChange={(e) =>
                              run(() =>
                                api.setLevelControl([p.id], l.id, {
                                  override: e.target.value === 'auto' ? null : (e.target.value as 'unlocked' | 'locked'),
                                }),
                              )
                            }
                          >
                            <option value="auto">Theo thứ tự</option>
                            <option value="unlocked">Mở</option>
                            <option value="locked">Khoá</option>
                          </select>
                          <label className="m-row" style={{ gap: 4 }}>
                            <input type="checkbox" checked={!!s?.formLocked} onChange={(e) => run(() => api.setLevelControl([p.id], l.id, { formLocked: e.target.checked }))} />
                            Khoá phiếu
                          </label>
                          <button className="m-btn" disabled={!s} onClick={() => run(() => api.resetLevel([p.id], l.id))}>
                            Làm lại
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}
