// Mentor console (section 8). Every page sits behind the login gate (FR-M-01); data is loaded
// once into a context and refreshed after each change.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { mentorApi } from '../api';
import { ApiError, type MentorApi, type MentorSession, type TeamData } from '../api/types';
import type { CourseContent } from '../content/types';
import { makeT, type Translate } from '../content/strings';
import './mentor.css';
import { ComparePage, ZoomSheetPage } from './pages/Compare';
import { ContentPage, PreviewPage } from './pages/Content';
import { Dashboard } from './pages/Dashboard';
import { AnswersPage } from './pages/Answers';
import { ExportsPage } from './pages/Exports';
import { LevelsPage } from './pages/Levels';
import { ProfilesPage } from './pages/Profiles';
import { QuizPage } from './pages/Quiz';
import { SettingsPage } from './pages/Settings';

interface MentorCtx {
  api: MentorApi;
  session: MentorSession;
  data: TeamData;
  /** Content of every version referenced by data, plus the active one. */
  contents: Map<string, CourseContent>;
  active: CourseContent;
  activeId: string;
  t: Translate;
  refresh: () => Promise<void>;
  /** Runs a change, shows its error if any, then reloads. */
  run: (fn: () => Promise<unknown>) => Promise<boolean>;
  /** Shows a short message at the top of the page. */
  notify: (message: string) => void;
}

const Ctx = createContext<MentorCtx | null>(null);
export const useMentor = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useMentor outside provider');
  return v;
};

async function loadAll(api: MentorApi) {
  const data = await api.teamData();
  const activeMeta = data.contentVersions.find((c) => c.isActive) ?? data.contentVersions[0];
  const ids = new Set<string>([
    ...(activeMeta ? [activeMeta.id] : []),
    ...data.answers.map((a) => a.contentVersionId),
    ...data.attempts.map((a) => a.contentVersionId),
  ]);
  const contents = new Map<string, CourseContent>();
  await Promise.all([...ids].map(async (id) => contents.set(id, await api.contentVersion(id))));
  return { data, contents, activeId: activeMeta?.id ?? '' };
}

function Login({ api, onDone }: { api: MentorApi; onDone: (s: MentorSession) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <main className="m-login">
      <h1>Người hướng dẫn</h1>
      <p className="muted">Đăng nhập để xem phiếu của các con.</p>
      <form
        className="m-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage(null);
          try {
            onDone(await api.signIn(email, password));
          } catch (err) {
            setMessage(err instanceof ApiError && err.message !== err.code ? err.message : 'Sai email hoặc mật khẩu.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <p>
          <label>
            Email
            <br />
            <input className="m-input" style={{ width: '100%' }} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
        </p>
        <p>
          <label>
            Mật khẩu
            <br />
            <input className="m-input" style={{ width: '100%' }} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
        </p>
        {message && <p className="m-error">{message}</p>}
        <div className="m-row">
          <button className="m-btn primary" disabled={busy}>
            Đăng nhập
          </button>
          <button
            type="button"
            className="m-btn"
            disabled={busy || !email}
            onClick={async () => {
              setBusy(true);
              try {
                await api.sendMagicLink(email);
                setMessage('Đã gửi đường link đăng nhập vào email.');
              } catch (err) {
                setMessage((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Gửi link qua email
          </button>
        </div>
      </form>
      {api.kind === 'local' && <p className="muted small-text">Bản chạy thử: mentor@local / mentor</p>}
      <p className="small-text">
        <a href="/">← Về màn chọn bạn</a>
      </p>
    </main>
  );
}

const NAV: [string, string][] = [
  ['', 'Tổng quan'],
  ['profiles', 'Các con'],
  ['levels', 'Mở / khoá màn'],
  ['quiz', 'Câu đố'],
  ['answers', 'Phiếu trả lời'],
  ['compare', 'So sánh'],
  ['exports', 'Xuất dữ liệu'],
  ['content', 'Nội dung'],
  ['settings', 'Cài đặt'],
];

function Shell({ children }: { children: React.ReactNode }) {
  const { session, api, refresh } = useMentor();
  return (
    <div className="m-shell">
      <nav className="m-nav" aria-label="Mentor">
        <div className="brand">🧶 {session.teamName || 'Đội'}</div>
        {NAV.map(([path, label]) => (
          <NavLink key={path} to={`/mentor/${path}`} end={path === ''}>
            {label}
          </NavLink>
        ))}
        <button className="m-btn" style={{ margin: '8px 10px 0', alignSelf: 'flex-start' }} onClick={() => void refresh()}>
          ↻ Làm mới
        </button>
        <div className="who">
          {session.email}
          <br />
          <button
            className="m-btn"
            style={{ marginTop: 6 }}
            onClick={async () => {
              await api.signOut();
              location.href = '/mentor';
            }}
          >
            Đăng xuất
          </button>
        </div>
      </nav>
      <main className="m-main">{children}</main>
    </div>
  );
}

export default function MentorApp() {
  const [api, setApi] = useState<MentorApi | null>(null);
  const [session, setSession] = useState<MentorSession | null | undefined>(undefined);
  const [loaded, setLoaded] = useState<Awaited<ReturnType<typeof loadAll>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    mentorApi()
      .then(async (a) => {
        setApi(a);
        setSession(await a.session());
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const refresh = useCallback(async () => {
    if (!api) return;
    try {
      setLoaded(await loadAll(api));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [api]);

  useEffect(() => {
    if (session) void refresh();
  }, [session, refresh]);

  // The console is not live: reload when the mentor comes back to the tab (e.g. after the
  // children played), and from the "Làm mới" button.
  useEffect(() => {
    if (!session) return;
    const onVisible = () => document.visibilityState === 'visible' && void refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [session, refresh]);

  if (error) return <main className="m-login"><p className="m-error">{error}</p></main>;
  if (!api || session === undefined) return <main className="m-login"><p className="muted">Đang tải…</p></main>;
  if (!session) return <Login api={api} onDone={setSession} />;
  if (!loaded) return <main className="m-login"><p className="muted">Đang tải…</p></main>;

  const active = loaded.contents.get(loaded.activeId)!;
  const value: MentorCtx = {
    api,
    session,
    data: loaded.data,
    contents: loaded.contents,
    active,
    activeId: loaded.activeId,
    t: makeT(active?.ui),
    refresh,
    run: async (fn) => {
      try {
        await fn();
        await refresh();
        return true;
      } catch (e) {
        setToast(errorText(e));
        return false;
      }
    },
    notify: setToast,
  };

  return (
    <Ctx.Provider value={value}>
      {toast && (
        <div className="m-toast" role="alert" onClick={() => setToast(null)}>
          {toast}
        </div>
      )}
      <Routes>
        <Route path="preview/:versionId/*" element={<PreviewPage />} />
        <Route path="zoom" element={<ZoomSheetPage />} />
        <Route
          path="*"
          element={
            <Shell>
              <Routes>
                <Route index element={<Dashboard />} />
                <Route path="profiles" element={<ProfilesPage />} />
                <Route path="levels" element={<LevelsPage />} />
                <Route path="quiz" element={<QuizPage />} />
                <Route path="answers" element={<AnswersPage />} />
                <Route path="compare" element={<ComparePage />} />
                <Route path="exports" element={<ExportsPage />} />
                <Route path="content" element={<ContentPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/mentor" replace />} />
              </Routes>
            </Shell>
          }
        />
      </Routes>
    </Ctx.Provider>
  );
}

export function errorText(e: unknown): string {
  return e instanceof ApiError ? (e.message !== e.code ? e.message : `Lỗi: ${e.code}`) : String((e as Error)?.message ?? e);
}
