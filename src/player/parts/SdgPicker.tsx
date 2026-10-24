import type { SdgPickerPart } from '../../content/types';
import { SdgIcon } from '../../art/SdgIcon';
import { current, set, type PartProps } from './types';

/**
 * The 17 goals as a list: icon, number and title, and the one-line kid caption on every row, so a
 * child can read them without tapping each one (the official titles alone are adult wording).
 */
export function SdgPicker({ answer, onChange, readOnly, t, content, labelId }: PartProps<SdgPickerPart>) {
  const value = current<number>(answer);
  const sorted = [...content.sdg].sort((a, b) => a.number - b.number);
  return (
    <>
      <p className="hint">{t('sdgPick')}</p>
      <div className="sdg-list" role="radiogroup" aria-labelledby={labelId}>
        {sorted.map((s) => (
          <button
            key={s.number}
            type="button"
            role="radio"
            aria-checked={value === s.number}
            className="sdg-row"
            disabled={readOnly}
            onClick={() => onChange(set(s.number))}
          >
            <span className="sdg-tile" aria-hidden="true">
              <SdgIcon sdg={s} compact />
            </span>
            <span className="sdg-text">
              <strong>
                {s.number}. {s.title}
              </strong>
              <span>{s.kidCaption}</span>
            </span>
            {value === s.number && (
              <span className="sdg-check" aria-hidden="true">
                ✓
              </span>
            )}
          </button>
        ))}
      </div>
      {/* UN guidelines: credit and disclaimer with the icons. Small and last, for the parent. */}
      <p className="hint" style={{ fontSize: 13 }}>{t('sdgCredit')}</p>
    </>
  );
}
