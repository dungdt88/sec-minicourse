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
        placeholder={t('parentTypes')}
        onChange={(e) => onChange(set(e.target.value))}
      />
      {max != null && (
        // Soft limit (FR-P-24): a counter, never a blocking error.
        <div className={`counter${value.length > max ? ' over' : ''}`} aria-live="polite">
          {value.length}/{max}
        </div>
      )}
    </>
  );
}
