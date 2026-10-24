import type { SdgPickerPart } from '../../content/types';
import { SdgIcon } from '../../art/SdgIcon';
import { current, set, type PartProps } from './types';

/** 17 icons; tapping one selects it and shows its number, title and kid caption. */
export function SdgPicker({ answer, onChange, readOnly, t, content, labelId }: PartProps<SdgPickerPart>) {
  const value = current<number>(answer);
  const chosen = content.sdg.find((s) => s.number === value);
  const sorted = [...content.sdg].sort((a, b) => a.number - b.number);
  return (
    <>
      <p className="hint">{t('sdgPick')}</p>
      <div className="sdg-grid" role="radiogroup" aria-labelledby={labelId}>
        {sorted.map((s) => (
          <button
            key={s.number}
            type="button"
            role="radio"
            aria-checked={value === s.number}
            aria-pressed={value === s.number}
            className="sdg-tile"
            disabled={readOnly}
            onClick={() => onChange(set(s.number))}
          >
            <SdgIcon sdg={s} />
          </button>
        ))}
      </div>
      <p className="hint" style={{ fontSize: 13 }}>{t('sdgCredit')}</p>
      {chosen && (
        <div className="panel sdg-detail pop" aria-live="polite">
          <div className="sdg-tile" aria-hidden="true">
            <SdgIcon sdg={chosen} />
          </div>
          <div>
            <strong>
              {chosen.number}. {chosen.title}
            </strong>
            <p style={{ margin: '4px 0 0' }}>{chosen.kidCaption}</p>
            <p className="hint">✓ {t('chosen')}</p>
          </div>
        </div>
      )}
    </>
  );
}
