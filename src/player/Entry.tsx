// Profile picker, PIN entry and the session gate around the player screens (FR-P-01, FR-P-02).
import { useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { playerApi } from '../api';
import { WriteQueue } from '../api/queue';
import { ApiError, mentorLabelOf, type ActiveContent, type PlayerApi, type PlayerState, type PublicProfile } from '../api/types';
import { makeT } from '../content/strings';
import { DEFAULT_SKIN, useSetSkin } from '../art/skin';
import { Character } from '../art/Character';
import { deviceType } from '../domain/progress';
import { PlayerSessionProvider, deviceTokens, loadContent } from './session';

const CURRENT_KEY = 'tvt.currentProfile';

function useBoot() {
  const setSkin = useSetSkin();
  // requirePin: whether children need their code (a team setting, off unless the mentor turns it on).
  // mentorLabel: what the children call the mentor ("bố Trí"), for kid-facing text.
  const [boot, setBoot] = useState<{ api: PlayerApi; content: ActiveContent; requirePin: boolean; mentorLabel: string } | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setError(false);
    (async () => {
      const api = await playerApi();
      const settingsP = api.settings().catch(() => null);
      void settingsP.then((s) => s && alive && setSkin(s.skin ?? DEFAULT_SKIN));
      let requirePin = false;
      let mentorLabel = mentorLabelOf(null);
      const content = await loadContent(api, (fresh) => alive && setBoot({ api, content: fresh, requirePin, mentorLabel }));
      const settings = await settingsP;
      requirePin = !!settings?.requirePin;
      mentorLabel = mentorLabelOf(settings);
      if (alive) setBoot({ api, content, requirePin, mentorLabel });
    })().catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [attempt]);
  return { boot, error, retry: () => setAttempt((n) => n + 1) };
}

function Offline({ retry }: { retry: () => void }) {
  const t = makeT(undefined);
  return (
    <main className="screen center">
      <p className="big-title" style={{ marginTop: '30vh' }}>
        📶
      </p>
      <p>{t('offlineStart')}</p>
      <button className="btn" onClick={retry}>
        {t('retry')}
      </button>
    </main>
  );
}

function Loading() {
  return (
    <main className="screen center" aria-busy="true">
      <p style={{ marginTop: '35vh' }} className="muted">
        {makeT(undefined)('loading')}
      </p>
    </main>
  );
}

export function ProfilePicker() {
  const { boot, error, retry } = useBoot();
  const [profiles, setProfiles] = useState<PublicProfile[] | null>(null);
  const navigate = useNavigate();
  const t = useMemo(() => makeT(boot?.content.content.ui), [boot]);

  useEffect(() => {
    if (!boot) return;
    boot.api.listProfiles().then(setProfiles, () => setProfiles([]));
  }, [boot]);

  if (error) return <Offline retry={retry} />;
  if (!boot || !profiles) return <Loading />;

  const pick = (p: PublicProfile) => {
    if (deviceTokens.get(p.id)) {
      localStorage.setItem(CURRENT_KEY, p.id);
      navigate('/play/home');
    } else if (boot.requirePin) navigate(`/pin/${p.id}`);
    else enterWithoutCode(boot.api, p.id, navigate);
  };

  return (
    <main className="screen">
      {/* The four shop friends greet the children (decorative). */}
      <div className="picker-hero" aria-hidden="true">
        {boot.content.content.characters.map((c) => (
          <Character key={c.id} character={c} size={64} expression="happy" decorative />
        ))}
      </div>
      <h1 className="big-title center">{t('chooseProfile')}</h1>
      <p className="center muted small-text" style={{ margin: 0 }}>
        {boot.content.content.title}
      </p>
      <div className="profile-grid">
        {profiles.map((p, i) => (
          <button key={p.id} className={`profile-tile tint-${i % 4}`} onClick={() => pick(p)}>
            <span className="avatar" aria-hidden="true">
              {p.avatar}
            </span>
            <span className="name">{p.displayName}</span>
          </button>
        ))}
      </div>
      <p className="center small-text" style={{ marginTop: 'auto' }}>
        <a href="/mentor">Dành cho người hướng dẫn</a>
      </p>
    </main>
  );
}

/** No code needed: tap the picture and go in. Falls back to the code screen if the server asks for one. */
function enterWithoutCode(api: PlayerApi, profileId: string, navigate: (to: string, o?: { replace?: boolean }) => void) {
  api.login(profileId, '', deviceType()).then(
    (token) => {
      deviceTokens.set(profileId, token);
      localStorage.setItem(CURRENT_KEY, profileId);
      navigate('/play/home', { replace: true });
    },
    () => navigate(`/pin/${profileId}`),
  );
}

export function PinEntry() {
  const { profileId = '' } = useParams();
  const { boot, error, retry } = useBoot();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const t = useMemo(() => makeT(boot?.content.content.ui), [boot]);

  useEffect(() => {
    if (!boot) return;
    if (!boot.requirePin) {
      enterWithoutCode(boot.api, profileId, navigate);
      return;
    }
    boot.api.listProfiles().then((ps) => setProfile(ps.find((p) => p.id === profileId) ?? null));
  }, [boot, profileId]);

  useEffect(() => {
    if (pin.length !== 4 || !boot || busy) return;
    setBusy(true);
    boot.api
      .login(profileId, pin, deviceType())
      .then((token) => {
        deviceTokens.set(profileId, token);
        localStorage.setItem(CURRENT_KEY, profileId);
        navigate('/play/home', { replace: true });
      })
      .catch((e: unknown) => {
        const err = e instanceof ApiError ? e : new ApiError('unknown');
        setMessage(
          err.code === 'wrong_pin'
            ? t('wrongPin')
            : err.code === 'rate_limited'
              ? t('tooManyTries', { min: err.retryAfterMinutes ?? 15 })
              : t('offlineStart'),
        );
        setPin('');
      })
      .finally(() => setBusy(false));
  }, [pin, boot, busy, profileId, navigate, t]);

  if (error) return <Offline retry={retry} />;
  if (!boot) return <Loading />;

  const press = (d: string) => {
    setMessage(null);
    setPin((p) => (p.length < 4 ? p + d : p));
  };

  // Codes are on but the mentor never set one for this child: say so, no keypad.
  if (profile && profile.pinSet === false)
    return (
      <main className="screen center">
        <div className="topbar">
          <button className="icon-btn" onClick={() => navigate('/')}>
            ← {t('back')}
          </button>
        </div>
        <div className="pin-avatar" aria-hidden="true">
          {profile.avatar}
        </div>
        <h1 className="big-title">{profile.displayName}</h1>
        <p className="notice">{t('noCodeYet', { mentor: boot.mentorLabel })}</p>
      </main>
    );

  return (
    <main className="screen">
      <div className="topbar">
        <button className="icon-btn" onClick={() => navigate('/')}>
          ← {t('back')}
        </button>
      </div>
      <div className="center">
        <div className="pin-avatar" aria-hidden="true">
          {profile?.avatar}
        </div>
        <h1 className="big-title">{profile?.displayName}</h1>
        <p style={{ margin: '8px 0 0' }}>{t('enterCode')}</p>
      </div>
      <div className="pin-dots" aria-label={`${t('pin')}: ${pin.length}/4`} role="status">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i < pin.length ? 'filled' : ''} />
        ))}
      </div>
      <p className="error-text" role="alert" style={{ minHeight: 28 }}>
        {message}
      </p>
      <div className="pin-pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} onClick={() => press(d)} disabled={busy}>
            {d}
          </button>
        ))}
        <span />
        <button onClick={() => press('0')} disabled={busy}>
          0
        </button>
        <button onClick={() => setPin((p) => p.slice(0, -1))} aria-label={t('delete')} disabled={busy}>
          ⌫
        </button>
      </div>
    </main>
  );
}

/** Loads the child's state for the remembered profile, then renders the player routes. */
export function SessionGate() {
  const { boot, error, retry } = useBoot();
  const navigate = useNavigate();
  const profileId = localStorage.getItem(CURRENT_KEY);
  const token = profileId ? deviceTokens.get(profileId) : null;
  const [state, setState] = useState<PlayerState | null>(null);
  const [loadError, setLoadError] = useState(false);
  const queue = useMemo(() => (boot ? new WriteQueue(boot.api) : null), [boot]);

  useEffect(() => {
    if (!token || !profileId) {
      navigate('/', { replace: true });
      return;
    }
    if (!boot) return;
    boot.api.state(token).then(setState, (e: unknown) => {
      if (e instanceof ApiError && e.code === 'unauthorized') {
        // PIN changed or profile archived: ask for the PIN again.
        deviceTokens.remove(profileId);
        navigate(`/pin/${profileId}`, { replace: true });
      } else setLoadError(true);
    });
  }, [boot, token, profileId, navigate]);

  if (error || loadError) return <Offline retry={retry} />;
  if (!boot || !state || !token || !queue) return <Loading />;

  return (
    <PlayerSessionProvider api={boot.api} token={token} content={boot.content} initialState={state} queue={queue} base="/play">
      <Outlet />
    </PlayerSessionProvider>
  );
}

export function switchProfile(navigate: (to: string) => void) {
  localStorage.removeItem(CURRENT_KEY);
  navigate('/');
}
