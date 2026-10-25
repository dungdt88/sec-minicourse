// Mentors of the team, the error log (NFR-12) and deleting all team data (FR-M-13).
import { useEffect, useRef, useState } from 'react';
import type { ErrorLogEntry, TeamSettings } from '../../api/types';
import { useSetSkin } from '../../art/skin';
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
  const resetDialog = useRef<HTMLDialogElement>(null);
  const [resetExported, setResetExported] = useState(false);
  const [settings, setSettings] = useState<TeamSettings | null>(null);
  const setSkin = useSetSkin();

  const load = () => {
    api.listMentors().then(setMentors, () => {});
    api.errorLog().then(setErrors, () => {});
    api.settings().then(setSettings, () => {});
  };
  const skinOn = (settings?.skin ?? 'halloween') === 'halloween';
  const teamOn = settings?.teamProgress !== false;
  const pinOn = !!settings?.requirePin;
  useEffect(load, [api]);

  return (
    <>
      <h1>Cài đặt</h1>
      <h2>Giao diện mùa lễ</h2>
      <div className="m-card">
        <label className="m-row" style={{ gap: 8 }}>
          <input
            type="checkbox"
            checked={skinOn}
            disabled={!settings}
            onChange={async (e) => {
              const skin = e.target.checked ? 'halloween' : 'plain';
              if (await run(() => api.updateSettings({ skin }))) {
                setSettings((s) => (s ? { ...s, skin } : s));
                setSkin(skin);
                notify(skin === 'halloween' ? 'Đã bật giao diện Halloween.' : 'Đã tắt giao diện Halloween.');
              }
            }}
          />
          <strong>Halloween</strong>: Drắc Nhí, kẹo, bí ngô, các con vật hoá trang
        </label>
        <p className="small-text muted">Tắt thì dùng giao diện sáng bình thường, cùng bố cục. Máy của các con đổi theo khi mở lại ứng dụng.</p>
      </div>

      <h2>Mã của các con</h2>
      <div className="m-card">
        <label className="m-row" style={{ gap: 8 }}>
          <input
            type="checkbox"
            checked={pinOn}
            disabled={!settings}
            onChange={async (e) => {
              const requirePin = e.target.checked;
              if (await run(() => api.updateSettings({ requirePin }))) {
                setSettings((s) => (s ? { ...s, requirePin } : s));
                notify(requirePin ? 'Các con cần nhập mã 4 số khi vào.' : 'Các con chạm vào hình là vào, không cần mã.');
              }
            }}
          />
          <strong>Cần mã khi vào</strong>
        </label>
        <p className="small-text muted">
          Tắt (mặc định): con chạm vào hình của mình là vào. Ai dùng máy cũng chọn được bất kỳ bạn nào, nên chỉ hợp khi máy ở nhà hoặc trong lớp. Bật: con nhập
          mã 4 số đặt ở “Các con”; máy đã vào rồi thì không phải nhập lại.
        </p>
      </div>

      <h2>Tiến độ cả đội</h2>
      <div className="m-card">
        <label className="m-row" style={{ gap: 8 }}>
          <input
            type="checkbox"
            checked={teamOn}
            disabled={!settings}
            onChange={async (e) => {
              const teamProgress = e.target.checked;
              if (await run(() => api.updateSettings({ teamProgress }))) {
                setSettings((s) => (s ? { ...s, teamProgress } : s));
                notify(teamProgress ? 'Các con thấy tiến độ của cả đội.' : 'Đã ẩn tiến độ cả đội.');
              }
            }}
          />
          <strong>Cho các con thấy cả đội đang ở đâu</strong>
        </label>
        <p className="small-text muted">
          Trên bản đồ: hình của các bạn bên cạnh màn các bạn đang chơi, một hũ kẹo chung của cả đội, và tin “Bình vừa xong Màn 2!”. Không có bảng xếp hạng,
          không có điểm riêng từng con, và không bao giờ cho xem câu trả lời của bạn khác.
        </p>
      </div>

      <h2>Xoá kết quả chạy thử</h2>
      <div className="m-card">
        <p>
          Xoá mọi câu trả lời, lượt đố và thời gian, và đưa các con về đầu khoá. Giữ lại hồ sơ, mã, các màn đã mở/khoá, phiếu đã khoá và cài đặt.
          Máy nào còn câu trả lời cũ chưa gửi sẽ không gửi lại nữa.
        </p>
        <button className="m-btn danger" onClick={() => resetDialog.current?.showModal()}>
          Xoá kết quả chạy thử…
        </button>
      </div>
      <dialog ref={resetDialog} className="m-dialog" onClose={() => setResetExported(false)}>
        <h2 style={{ marginTop: 0 }}>Xoá kết quả chạy thử?</h2>
        <p>Không lấy lại được. Hãy tải bản sao trước.</p>
        <button
          className="m-btn"
          onClick={() => {
            exportJson(data);
            setResetExported(true);
          }}
        >
          1. Tải bản sao (JSON)
        </button>
        <div className="m-row" style={{ marginTop: 12 }}>
          <button
            className="m-btn danger"
            disabled={!resetExported}
            onClick={async () => {
              if (await run(() => api.resetTrialRun())) {
                notify('Đã xoá kết quả chạy thử. Các con bắt đầu lại từ Màn 1.');
                resetDialog.current?.close();
                load();
              }
            }}
          >
            2. Xoá kết quả
          </button>
          <button className="m-btn" onClick={() => resetDialog.current?.close()}>
            Thôi
          </button>
        </div>
      </dialog>
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
