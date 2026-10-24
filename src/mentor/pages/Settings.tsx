// Mentors of the team, the error log (NFR-12) and deleting all team data (FR-M-13).
import { useEffect, useRef, useState } from 'react';
import type { ErrorLogEntry } from '../../api/types';
import { fmtTime } from '../derive';
import { exportJson } from '../exports';
import { useMentor } from '../MentorApp';

export function SettingsPage() {
  const { api, run, data, notify, session } = useMentor();
  const [mentors, setMentors] = useState<{ userId: string; email: string }[]>([]);
  const [errors, setErrors] = useState<ErrorLogEntry[]>([]);
  const [email, setEmail] = useState('');
  const [exported, setExported] = useState(false);
  const [typed, setTyped] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);

  const load = () => {
    api.listMentors().then(setMentors, () => {});
    api.errorLog().then(setErrors, () => {});
  };
  useEffect(load, [api]);

  return (
    <>
      <h1>Cài đặt</h1>
      <h2>Người hướng dẫn</h2>
      <div className="m-card">
        <ul>
          {mentors.map((m) => (
            <li key={m.userId}>{m.email}</li>
          ))}
        </ul>
        <p className="small-text muted">
          {api.kind === 'supabase'
            ? 'Người mới cần có tài khoản trước (mời qua Supabase → Authentication → Invite user), rồi thêm email ở đây.'
            : 'Bản chạy thử: mật khẩu chung là “mentor”.'}
        </p>
        <form
          className="m-row"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await run(() => api.addMentor(email))) {
              setEmail('');
              load();
            }
          }}
        >
          <input className="m-input" type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email người hướng dẫn" />
          <button className="m-btn primary" disabled={!email}>
            Thêm
          </button>
        </form>
      </div>

      <h2>Lỗi gần đây</h2>
      <div className="m-card">
        {errors.length === 0 ? (
          <p className="muted">Không có lỗi nào.</p>
        ) : (
          <div className="m-table-wrap">
            <table className="m-table">
              <tbody>
                {errors.slice(0, 50).map((e) => (
                  <tr key={e.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtTime(e.createdAt)}</td>
                    <td>{e.message}</td>
                    <td className="small-text muted">{JSON.stringify(e.context)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h2>Xoá toàn bộ dữ liệu của đội</h2>
      <div className="m-card">
        <p>Xoá mọi hồ sơ, câu trả lời, lượt đố và thời gian. Nội dung khoá học và tài khoản người hướng dẫn được giữ lại.</p>
        <button className="m-btn danger" onClick={() => dialog.current?.showModal()}>
          Xoá toàn bộ…
        </button>
      </div>
      <dialog ref={dialog} className="m-dialog">
        <h2 style={{ marginTop: 0 }}>Xoá toàn bộ dữ liệu của đội?</h2>
        <p>Không lấy lại được. Hãy tải bản sao trước.</p>
        <button
          className="m-btn"
          onClick={() => {
            exportJson(data);
            setExported(true);
          }}
        >
          1. Tải bản sao (JSON)
        </button>
        <p>
          <label>
            2. Gõ “XOÁ” để xác nhận
            <br />
            <input className="m-input" value={typed} disabled={!exported} onChange={(e) => setTyped(e.target.value)} />
          </label>
        </p>
        <div className="m-row">
          <button
            className="m-btn danger"
            disabled={!exported || typed.trim().toUpperCase() !== 'XOÁ'}
            onClick={async () => {
              if (await run(() => api.deleteTeamData())) {
                notify(`Đã xoá dữ liệu của đội ${session.teamName}.`);
                dialog.current?.close();
              }
            }}
          >
            3. Xoá hẳn
          </button>
          <button className="m-btn" onClick={() => dialog.current?.close()}>
            Thôi
          </button>
        </div>
      </dialog>
    </>
  );
}
