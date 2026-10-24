// FR-M-09 content upload with validation and versions; FR-M-10 preview without recording.
import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { previewSession } from '../../api/preview';
import { WriteQueue } from '../../api/queue';
import type { PlayerApi, PlayerState } from '../../api/types';
import type { CourseContent } from '../../content/types';
import { validateContent, type ContentError } from '../../content/validate';
import { Home } from '../../player/Home';
import { Homework } from '../../player/Homework';
import { LevelPlayer } from '../../player/LevelPlayer';
import { PlayerSessionProvider } from '../../player/session';
import { fmtTime } from '../derive';
import { useMentor } from '../MentorApp';

type Checked = { ok: true; content: CourseContent } | { ok: false; errors: ContentError[] } | null;

export function ContentPage() {
  const { data, active, api, run, notify } = useMentor();
  const [checked, setChecked] = useState<Checked>(null);
  const [fileName, setFileName] = useState('');
  const versions = [...data.contentVersions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const onFile = async (file: File) => {
    setFileName(file.name);
    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch (e) {
      setChecked({ ok: false, errors: [{ where: file.name, id: null, message: `Không đọc được JSON: ${(e as Error).message}` }] });
      return;
    }
    setChecked(validateContent(json));
  };

  const activeLevels = new Set(active.levels.map((l) => l.id));
  const save = async (activate: boolean) => {
    if (!checked?.ok) return;
    if (await run(() => api.uploadContent(checked.content, activate))) {
      notify(activate ? 'Đã lưu và đang dùng nội dung mới.' : 'Đã lưu nội dung mới (chưa dùng).');
      setChecked(null);
      setFileName('');
    }
  };

  return (
    <>
      <h1>Nội dung</h1>
      <p className="lead">
        Đang dùng: <strong>{active.contentVersion}</strong> · {active.levels.length} màn. Tải file <code>course-content.json</code> mới lên để thay. Câu trả lời cũ vẫn giữ phiên bản nội dung lúc con trả lời.
      </p>
      <div className="m-card">
        <label className="m-row">
          <span>Chọn file:</span>
          <input type="file" accept="application/json,.json" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
        {checked && !checked.ok && (
          <div style={{ marginTop: 10 }}>
            <p className="m-error">
              {fileName}: {checked.errors.length} lỗi. File chưa được lưu.
            </p>
            <div className="m-table-wrap">
              <table className="m-table">
                <thead>
                  <tr>
                    <th>Id</th>
                    <th>Ở đâu</th>
                    <th>Lỗi</th>
                  </tr>
                </thead>
                <tbody>
                  {checked.errors.map((e, i) => (
                    <tr key={i}>
                      <td>
                        <strong>{e.id ?? '–'}</strong>
                      </td>
                      <td>{e.where}</td>
                      <td>{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {checked?.ok && (
          <div style={{ marginTop: 10 }}>
            <p>
              <span className="m-tag ok">✓ Hợp lệ</span> {fileName}: phiên bản <strong>{checked.content.contentVersion}</strong>, {checked.content.levels.length} màn
              {(() => {
                const added = checked.content.levels.filter((l) => !activeLevels.has(l.id)).map((l) => l.id);
                return added.length ? ` · màn mới: ${added.join(', ')}` : '';
              })()}
              .
            </p>
            <div className="m-row">
              <button className="m-btn primary" onClick={() => save(true)}>
                Lưu và dùng ngay
              </button>
              <button className="m-btn" onClick={() => save(false)}>
                Lưu, chưa dùng
              </button>
            </div>
          </div>
        )}
      </div>

      <h2>Các phiên bản</h2>
      <div className="m-table-wrap">
        <table className="m-table">
          <thead>
            <tr>
              <th>Phiên bản</th>
              <th>Tải lên</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.id}>
                <td>
                  <strong>{v.contentVersion}</strong> {v.isActive && <span className="m-tag ok">Đang dùng</span>}
                </td>
                <td>{fmtTime(v.createdAt)}</td>
                <td>
                  <div className="m-row">
                    <Link className="m-btn" to={`/mentor/preview/${v.id}/home`}>
                      ▶ Xem thử
                    </Link>
                    {!v.isActive && (
                      <button className="m-btn" onClick={() => run(() => api.activateContent(v.id))}>
                        Dùng bản này
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Plays a content version as a throwaway profile; nothing is recorded (FR-M-10). */
export function PreviewPage() {
  const { versionId = '' } = useParams();
  const { api } = useMentor();
  const [session, setSession] = useState<{ api: PlayerApi; token: string; state: PlayerState; queue: WriteQueue; content: CourseContent } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const content = await api.contentVersion(versionId);
      const s = await previewSession(content);
      const state = await s.api.state(s.token);
      if (alive) setSession({ api: s.api, token: s.token, state, content, queue: new WriteQueue(s.api, s.queueStorage) });
    })().catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [api, versionId]);

  if (error) return <p className="m-error">{error}</p>;
  if (!session) return null;
  const base = `/mentor/preview/${versionId}`;
  return (
    <>
      <div className="m-row m-noprint" style={{ justifyContent: 'center', background: '#3b2f2a', color: '#fff', padding: 6 }}>
        <span>Xem thử – không lưu gì</span>
        <Link className="m-btn" to="/mentor/content">
          Thoát
        </Link>
      </div>
      <PlayerSessionProvider api={session.api} token={session.token} content={{ id: versionId, content: session.content }} initialState={session.state} queue={session.queue} base={base}>
        <Routes>
          <Route path="home" element={<Home />} />
          <Route path="level/:levelId" element={<LevelPlayer />} />
          <Route path="homework" element={<Homework />} />
          <Route path="*" element={<Navigate to={`${base}/home`} replace />} />
        </Routes>
      </PlayerSessionProvider>
    </>
  );
}
