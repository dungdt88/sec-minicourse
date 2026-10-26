// Small shared pieces of the player screens.
import { useEffect, useState } from 'react';
import { Ghost } from '../art/Halloween';
import { useSkin } from '../art/skin';
import { usePlayer } from './session';
import { currentlySpeaking, englishParts, playAudio, speak, speechChunks, stopSpeaking, useHasVietnameseVoice, useSpeaking } from './speech';

/** "khách hàng (customer)": the bracketed English word renders as-is, a little lighter (FR-P-13). */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {englishParts(text).map(({ piece, en }, i) =>
        en ? (
          <span key={i} className="en-term" lang="en">
            {piece}
          </span>
        ) : (
          piece
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

/**
 * Read-aloud (FR-P-14) for what a screen shows: a card, a quiz question and its answers, a form
 * question. A recorded file when the content names one (cards[].audio), otherwise the device's own
 * Vietnamese voice; hidden when neither is available. `compact` shows only 🔊, for a crowded row.
 */
export function ReadAloud({ id, text, audio, compact }: { id: string; text: (string | null | undefined)[]; audio?: string; compact?: boolean }) {
  const { t } = usePlayer();
  const voice = useHasVietnameseVoice();
  const speaking = useSpeaking();
  // A failure belongs to one card or question: the next one offers 🔊 again (one card's audio file
  // may be missing, or a one-off error).
  const [failedId, setFailedId] = useState<string | null>(null);
  const failed = failedId === id;
  const playing = speaking === id;

  // Leaving the card or question (or answering it) ends its reading.
  useEffect(
    () => () => {
      if (currentlySpeaking() === id) stopSpeaking();
    },
    [id],
  );

  if (!audio && !voice) return null;

  const play = () => {
    const fail = () => setFailedId(id);
    if (audio) playAudio(id, `/${audio}`, fail);
    else speak(id, speechChunks(text), fail);
  };

  if (failed) {
    return (
      <span className={`small-text muted${compact ? ' read-failed' : ''}`} role="status" style={compact ? undefined : { maxWidth: 220, textAlign: 'right' }}>
        {t('readAloudFailed')}
      </span>
    );
  }
  const label = playing ? t('pause') : t('readAloud');
  return (
    <button
      type="button"
      className={`icon-btn${compact ? ' small' : ''}`}
      onClick={playing ? stopSpeaking : play}
      aria-pressed={playing}
      aria-label={compact ? label : undefined}
      title={compact ? label : undefined}
    >
      <span aria-hidden="true">{playing ? '⏸' : '🔊'}</span>
      {!compact && ` ${label}`}
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
