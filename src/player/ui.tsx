// Small shared pieces of the player screens.
import { useEffect, useRef, useState } from 'react';
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
  const label = saveStatus === 'saved' ? `✓ ${t('saved')}` : saveStatus === 'saving' ? t('saving') : t('unsaved');
  return (
    <span className={`save-pill ${saveStatus}`} role="status" aria-live="polite">
      {label}
    </span>
  );
}

/** Dismissible one-line hint; dismissal is remembered on this device (FR-P-12). */
export function HintBanner({ id, text }: { id: string; text: string }) {
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
  return (
    <div className="hint-banner" role="note">
      <span aria-hidden="true">👨‍👩‍👧</span>
      <p>{text}</p>
      <button
        className="icon-btn"
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(key, '1');
          } catch {
            /* ignore */
          }
        }}
      >
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
      void audio.current.play();
    } else if (voice) {
      const text = [card.title, card.body, ...(card.bullets ?? []), card.footer ?? ''].join('. ');
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = 0.9;
      u.onend = () => setPlaying(false);
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    }
    setPlaying(true);
  };

  return (
    <button className="icon-btn" onClick={playing ? stop : play} aria-pressed={playing}>
      <span aria-hidden="true">{playing ? '⏸' : '🔊'}</span> {playing ? t('pause') : t('readAloud')}
    </button>
  );
}

export function Stars({ n, total }: { n: number; total: number }) {
  return (
    <div className="stars" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <svg key={i} width="44" height="44" viewBox="0 0 24 24">
          <path
            d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z"
            fill={i < n ? '#f2b632' : '#eadcc6'}
            stroke={i < n ? '#c98f0f' : '#cbbba3'}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </div>
  );
}
