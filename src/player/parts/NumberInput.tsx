import { useEffect, useState } from 'react';
import type { NumberPart } from '../../content/types';
import { current, set, type PartProps } from './types';

/** Integer input with the phone's number pad. A ± button appears only where min is negative. */
export function NumberInput({ part, answer, onChange, readOnly, labelId }: PartProps<NumberPart>) {
  const value = current<number>(answer);
  const allowNegative = part.min != null && part.min < 0;
  const [text, setText] = useState(value == null ? '' : String(Math.abs(value)));
  const [negative, setNegative] = useState(value != null && value < 0);

  useEffect(() => {
    // Follow external resets (e.g. "Chưa biết" cleared the value).
    if (value == null) setText('');
  }, [value]);

  const emit = (digits: string, neg: boolean) => {
    if (digits === '') onChange(set(null));
    else onChange(set((neg ? -1 : 1) * parseInt(digits, 10)));
  };

  return (
    <div className="num-row">
      {allowNegative && (
        <button
          type="button"
          className="icon-btn"
          aria-pressed={negative}
          aria-label="Số âm"
          disabled={readOnly}
          onClick={() => {
            setNegative(!negative);
            emit(text, !negative);
          }}
        >
          {negative ? '−' : '+'}
        </button>
      )}
      <input
        className="num-input"
        aria-labelledby={labelId}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        readOnly={readOnly}
        value={text}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '').slice(0, 9);
          setText(digits);
          emit(digits, negative);
        }}
      />
      {part.unit && <span className="unit">{part.unit === 'nghìn' ? 'nghìn đồng' : part.unit}</span>}
    </div>
  );
}
