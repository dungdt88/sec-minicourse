// FR-M-02 / FR-M-13: create, rename, avatar, PIN, archive; delete only after an export.
import { useEffect, useRef, useState } from 'react';
import type { Profile } from '../../api/types';
import { AVATARS } from '../../content/avatars';
import { childPdf, download, profileJson } from '../exports';
import { useMentor } from '../context';

function AvatarPick({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="m-row m-avatar-pick" role="group" aria-label="Hình đại diện">
      {AVATARS.map((a) => (
        <button key={a} type="button" aria-pressed={value === a} onClick={() => onChange(a)}>
          {a}
        </button>
      ))}
    </div>
  );
}

const validPin = (s: string) => /^\d{4}$/.test(s);

function DeleteDialog({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const { data, contents, active, api, run, notify } = useMentor();
  const [exported, setExported] = useState(false);
  const [typed, setTyped] = useState('');
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <dialog ref={(el) => { ref.current = el; if (el && !el.open) el.showModal(); }} className="m-dialog" onClose={onClose}>
      <h2 style={{ marginTop: 0 }}>Xoá hẳn dữ liệu của {profile.displayName}?</h2>
      <p>Mọi câu trả lời, lượt đố và thời gian của con sẽ bị xoá vĩnh viễn. Hãy tải bản sao trước.</p>
      <div className="m-row">
        <button
          className="m-btn"
          onClick={async () => {
            download(`${profile.displayName}-du-lieu.json`, profileJson(data, profile.id), 'application/json');
            try {
              download(`${profile.displayName}-phieu.pdf`, await childPdf(data, profile.id, contents, active));
            } catch (e) {
              notify(`Không tạo được PDF: ${(e as Error).message}`);
            }
            setExported(true);
          }}
        >
          1. Tải bản sao (JSON + PDF)
        </button>
      </div>
      <p>
        <label>
          2. Gõ tên “{profile.displayName}” để xác nhận
          <br />
          <input className="m-input" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={!exported} />
        </label>
      </p>
      <div className="m-row">
        <button
          className="m-btn danger"
          disabled={!exported || typed.trim() !== profile.displayName}
          onClick={async () => {
            if (await run(() => api.deleteProfile(profile.id))) {
              notify(`Đã xoá dữ liệu của ${profile.displayName}.`);
              ref.current?.close();
            }
          }}
        >
          3. Xoá hẳn
        </button>
        <button className="m-btn" onClick={() => ref.current?.close()}>
          Thôi
        </button>
      </div>
    </dialog>
  );
}

function ProfileRow({ p, requirePin }: { p: Profile; requirePin: boolean }) {
  const { api, run, notify } = useMentor();
  const [name, setName] = useState(p.displayName);
  const [avatar, setAvatar] = useState(p.avatar);
  const [pin, setPin] = useState('');
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="m-card">
      <div className="m-row">
        <span style={{ fontSize: 28 }} aria-hidden="true">
          {p.avatar}
        </span>
        <strong style={{ fontSize: 17 }}>{p.displayName}</strong>
        {p.archivedAt && <span className="m-tag">Đã ẩn</span>}
        {p.pinSet === false && (
          <span className={`m-tag ${requirePin ? 'bad' : 'warn'}`} title="Tạo không có mã">
            {requirePin ? '⚠️ Chưa có mã: con chưa vào được, hãy đặt mã' : 'Chưa có mã'}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <button className="m-btn" onClick={() => setEditing(!editing)}>
          {editing ? 'Đóng' : 'Sửa'}
        </button>
        <button className="m-btn" onClick={() => run(() => api.updateProfile(p.id, { archived: !p.archivedAt }))}>
          {p.archivedAt ? 'Hiện lại' : 'Ẩn'}
        </button>
        <button className="m-btn danger" onClick={() => setDeleting(true)}>
          Xoá…
        </button>
      </div>
      {editing && (
        <div style={{ marginTop: 12 }}>
          <div className="m-row">
            <input className="m-input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-label="Tên" />
            <button className="m-btn primary" disabled={!name.trim()} onClick={() => run(() => api.updateProfile(p.id, { displayName: name, avatar }))}>
              Lưu tên và hình
            </button>
          </div>
          <AvatarPick value={avatar} onChange={setAvatar} />
          <div className="m-row" style={{ marginTop: 8 }}>
            <input className="m-input" inputMode="numeric" maxLength={4} placeholder="Mã mới (4 số)" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} aria-label="Mã mới" />
            <button
              className="m-btn"
              disabled={!validPin(pin)}
              onClick={async () => {
                if (await run(() => api.setPin(p.id, pin))) {
                  setPin('');
                  notify(`Đã đổi mã của ${p.displayName}. Các máy đang mở sẽ phải nhập mã mới.`);
                }
              }}
            >
              Đặt mã mới
            </button>
          </div>
        </div>
      )}
      {deleting && <DeleteDialog profile={p} onClose={() => setDeleting(false)} />}
    </div>
  );
}

export function ProfilesPage() {
  const { data, api, run } = useMentor();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [pin, setPin] = useState('');
  const profiles = [...data.profiles].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const [requirePin, setRequirePin] = useState(false);
  useEffect(() => {
    api.settings().then((s) => setRequirePin(!!s.requirePin), () => {});
  }, [api]);
  return (
    <>
      <h1>Các con</h1>
      <p className="lead">Chỉ lưu tên gọi và hình đại diện. Không ngày sinh, không ảnh, không liên lạc.</p>
      {profiles.map((p) => (
        <ProfileRow key={p.id} p={p} requirePin={requirePin} />
      ))}
      <h2>Thêm một bạn</h2>
      <form
        className="m-card"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run(() => api.createProfile({ displayName: name, avatar, pin }))) {
            setName('');
            setPin('');
          }
        }}
      >
        <div className="m-row">
          <input className="m-input" placeholder="Tên gọi" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-label="Tên gọi" />
          <input className="m-input" placeholder="Mã 4 số (không bắt buộc)" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} aria-label="Mã 4 số" />
          <button className="m-btn primary" disabled={!name.trim() || (pin !== '' && !validPin(pin))}>
            Thêm
          </button>
        </div>
        <AvatarPick value={avatar} onChange={setAvatar} />
      </form>
    </>
  );
}
