import { useRef } from 'react';
import type { TextPart } from '../../content/types';
import { useDictation, type DictationError } from '../speech';
import { current, set, type PartProps } from './types';

const DICTATION_MESSAGE: Record<DictationError, string> = {
  denied: 'dictateDenied',
  noSpeech: 'dictateNoSpeech',
  failed: 'dictateFailed',
};

export function TextInput({ part, answer, onChange, readOnly, t, labelId }: PartProps<TextPart>) {
  const value = current<string>(answer) ?? '';
  const max = part.maxLength;
  const short = max != null && max <= 120;
  // Voice typing adds what was heard after what is already there, word for word (FR-P-24).
  const latest = useRef(value);
  latest.current = value;
  const dictation = useDictation((heard) => {
    const before = latest.current.trimEnd();
    latest.current = before ? `${before} ${heard}` : heard;
    onChange(set(latest.current));
  });
  return (
    <>
      <textarea
        className={`text-input${short ? ' short' : ''}`}
        aria-labelledby={labelId}
        value={value}
        readOnly={readOnly}
        lang="vi"
        autoComplete="off"
        rows={short ? 2 : 4}
        placeholder={part.placeholder ?? t('writeHere')}
        onChange={(e) => onChange(set(e.target.value))}
      />
      {!readOnly && (dictation.supported || dictation.error) && (
        <div className="dictate-row">
          {dictation.supported && (
            <button
              type="button"
              className={`icon-btn small dictate${dictation.listening ? ' listening' : ''}`}
              aria-pressed={dictation.listening}
              onClick={dictation.listening ? dictation.stop : dictation.start}
            >
              <span aria-hidden="true">{dictation.listening ? '⏹' : '🎤'}</span> {t(dictation.listening ? 'dictateStop' : 'dictate')}
            </button>
          )}
          {dictation.listening ? (
            <span className="dictate-status" aria-live="polite">
              {dictation.interim || t('listening')}
            </span>
          ) : (
            dictation.error && (
              <span className="dictate-status error" role="alert">
                {t(DICTATION_MESSAGE[dictation.error])}
              </span>
            )
          )}
        </div>
      )}
      {max != null && value.length > max * 0.8 && (
        // Soft limit (FR-P-24): a counter, never a blocking error. Shown only near the limit, so a
        // child does not read "0/400" as a length to reach.
        <div className={`counter${value.length > max ? ' over' : ''}`} aria-live="polite">
          {t('tooLong', { n: value.length, max })}
        </div>
      )}
    </>
  );
}
