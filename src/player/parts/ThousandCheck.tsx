import { useState } from 'react';
import type { Translate } from '../../content/strings';

/** Money fields are in thousands of đồng. True when a field label or unit says so. */
export const inThousands = (unitOrLabel: string | undefined) => !!unitOrLabel && /nghìn/i.test(unitOrLabel);

/**
 * Parents type prices the Vietnamese way ("12.000"), which lands as 12000 in a field that means
 * thousands, i.e. 12 million đồng. Ask once, gently, and fix it with one tap.
 */
export function ThousandCheck({ value, onFix, t, readOnly }: { value: number | null | undefined; onFix: (n: number) => void; t: Translate; readOnly: boolean }) {
  const [keptFor, setKeptFor] = useState<number | null>(null);
  if (readOnly || value == null || Math.abs(value) < 1000 || keptFor === value) return null;
  const k = Math.round(value / 1000);
  return (
    <div className="gentle" role="status">
      <p style={{ margin: '0 0 8px' }}>{t('thousandAsk', { k })}</p>
      <div className="list-row" style={{ flexWrap: 'wrap' }}>
        <button type="button" className="btn small" onClick={() => onFix(Math.sign(value) * Math.abs(k))}>
          {t('thousandYes', { k })}
        </button>
        <button type="button" className="btn secondary small" onClick={() => setKeptFor(value)}>
          {t('thousandNo', { v: value })}
        </button>
      </div>
    </div>
  );
}
