import type { TextPart } from '../../content/types';
import { current, set, type PartProps } from './types';

export function TextInput({ part, answer, onChange, readOnly, t, labelId }: PartProps<TextPart>) {
  const value = current<string>(answer) ?? '';
  const max = part.maxLength;
  const short = max != null && max <= 120;
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
        placeholder={t('writeHere')}
        onChange={(e) => onChange(set(e.target.value))}
      />
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
