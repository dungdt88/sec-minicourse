// Small shared pieces of the player screens.
import { useEffect, useRef, useState } from 'react';
import { Ghost } from '../art/Halloween';
import { useSkin } from '../art/skin';
import { usePlayer } from './session';
import type { Card } from '../content/types';

/** "khách hàng (customer)": the bracketed English word renders as-is, a little lighter (FR-P-13). */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\([A-Za-z][A-Za-z0-9 '’\-/]*\))/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\([A-Za-z]/.test(p) ? (
          <span key={i} className="en-term" lang="en">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </>
  );
}

export function SavePill() {
  const { saveStatus, t } = usePlayer();
  // Saved is the usual state, so it is a quiet green tick; saving and offline spell it out.
  if (saveStatus === 'saved')
    return (
      <span className="save-pill saved" role="status" aria-live="polite" title={t('saved')}>
        <span aria-hidden="true">✓</span>
        <span className="visually-hidden">{t('saved')}</span>
      </span>
    );
  return (
    <span className={`save-pill ${saveStatus}`} role="status" aria-live="polite">
      {saveStatus === 'saving' ? t('saving') : t('unsaved')}
    </span>
  );
}

/** Dismissible one-line hint; dismissal is remembered on this device (FR-P-12). */
export function HintBanner({ id, text, line }: { id: string; text: string; /** one small line (FR-P-24) */ line?: boolean }) {
  const { t } = usePlayer();
  const key = `tvt.hint.${id}`;
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  });
  if (hidden) return null;
  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(key, '1');
    } catch {
      /* ignore */
    }
  };
  if (line)
    return (
      <p className="tip-line" role="note">
        <span>{text}</span>
        <button type="button" aria-label={t('hideHint')} onClick={dismiss}>
          ✕
        </button>
      </p>
    );
  return (
    <div className="hint-banner" role="note">
      <span aria-hidden="true">👨‍👩‍👧</span>
      <p>{text}</p>
      <button className="icon-btn" onClick={dismiss}>
        {t('hideHint')}
      </button>
    </div>
  );
}

function vietnameseVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null;
  return speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('vi')) ?? null;
}

/**
 * Read-aloud for a card (FR-P-14): the card's recorded audio if the content names one, otherwise
 * the device's own Vietnamese voice. Hidden when neither is available.
 */
export function ReadAloud({ card }: { card: Card }) {
  const { t } = usePlayer();
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(vietnameseVoice);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return;
    const update = () => setVoice(vietnameseVoice());
    speechSynthesis.addEventListener('voiceschanged', update);
    return () => speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);

  useEffect(
    () => () => {
      audio.current?.pause();
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    },
    [card.id],
  );

  if (!card.audio && !voice) return null;

  const stop = () => {
    audio.current?.pause();
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    setPlaying(false);
  };

  const play = () => {
    if (card.audio) {
      audio.current ??= new Audio(`/${card.audio}`);
      audio.current.onended = () => setPlaying(false);
      audio.current.currentTime = 0;
      audio.current.play().catch(() => {
        setPlaying(false);
        setFailed(true);
      });
    } else if (voice) {
      const text = [card.title, card.body, ...(card.bullets ?? []), card.footer ?? ''].join('. ');
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = 0.9;
      u.onend = () => setPlaying(false);
      u.onerror = () => {
        setPlaying(false);
        setFailed(true);
      };
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    }
    setPlaying(true);
  };

  if (failed) {
    return (
      <span className="small-text muted" role="status" style={{ maxWidth: 220, textAlign: 'right' }}>
        {t('readAloudFailed')}
      </span>
    );
  }
  return (
    <button className="icon-btn" onClick={playing ? stop : play} aria-pressed={playing}>
      <span aria-hidden="true">{playing ? '⏸' : '🔊'}</span> {playing ? t('pause') : t('readAloud')}
    </button>
  );
}

/**
 * "Thẻ 2/4" / "Câu 2/4" with a short progress bar; with the Halloween skin a small ghost rides the
 * end of the bar (DR-08). `action` sits on the right of the row (read aloud, re-read the cards).
 */
export function StepProgress({ index, total, label, action }: { index: number; total: number; label: string; action?: React.ReactNode }) {
  const skin = useSkin();
  const pct = total ? Math.round(((index + 1) / total) * 100) : 0;
  return (
    <div className="step-row">
      <div className="step-progress" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={index + 1} aria-valuetext={label}>
        <span className="step-track" aria-hidden="true">
          <span className="step-fill" style={{ width: `${pct}%` }} />
          <span className="step-rider" style={{ left: `${pct}%` }}>
            {skin === 'halloween' ? <Ghost size={26} /> : <span className="step-knob" />}
          </span>
        </span>
        <span className="step-label">{label}</span>
      </div>
      {action}
    </div>
  );
}
