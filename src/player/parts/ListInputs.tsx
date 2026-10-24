import type { ItemListPart, RepeatPart, SumSplitPart } from '../../content/types';
import { sumSplitTotal, type ItemListValue, type ListRow, type RepeatRow, type RepeatValue, type SumSplitValue } from '../../domain/answers';
import { current, set, type PartProps } from './types';

const digits = (s: string) => s.replace(/[^0-9]/g, '').slice(0, 9);
const toNum = (s: string) => (s === '' ? null : parseInt(s, 10));

export function ItemListInput({ part, answer, onChange, readOnly, t }: PartProps<ItemListPart>) {
  const value = current<ItemListValue>(answer) ?? { groups: {} };
  const rowsOf = (g: string): ListRow[] => value.groups?.[g]?.length ? value.groups[g] : [{}];
  const update = (g: string, rows: ListRow[]) => onChange(set({ groups: { ...value.groups, [g]: rows } }));
  return (
    <>
      {part.groups.map((g) => {
        const rows = rowsOf(g.id);
        const full = part.maxItemsPerGroup != null && rows.length >= part.maxItemsPerGroup;
        return (
          <fieldset key={g.id} className="list-group">
            <legend className="part-label">{g.label}</legend>
            {g.hint && <p className="hint" style={{ marginTop: -6 }}>{g.hint}</p>}
            {rows.map((row, i) => (
              <div className="list-row" key={i}>
                {part.fields.map((f) =>
                  f.type === 'number' ? (
                    <input
                      key={f.id}
                      className="num-input"
                      aria-label={`${f.label} ${i + 1}`}
                      placeholder={f.label.replace(/\s*\(.*\)\s*/, '')}
                      inputMode="numeric"
                      autoComplete="off"
                      readOnly={readOnly}
                      value={row[f.id] == null ? '' : String(row[f.id])}
                      onChange={(e) => update(g.id, rows.map((r, j) => (j === i ? { ...r, [f.id]: toNum(digits(e.target.value)) } : r)))}
                    />
                  ) : (
                    <input
                      key={f.id}
                      className="text-input"
                      aria-label={`${f.label} ${i + 1}`}
                      placeholder={f.label}
                      maxLength={f.maxLength}
                      lang="vi"
                      autoComplete="off"
                      readOnly={readOnly}
                      value={(row[f.id] as string) ?? ''}
                      onChange={(e) => update(g.id, rows.map((r, j) => (j === i ? { ...r, [f.id]: e.target.value } : r)))}
                    />
                  ),
                )}
                {!readOnly && rows.length > 1 && (
                  <button type="button" className="icon-btn" aria-label={`${t('remove')} ${i + 1}`} onClick={() => update(g.id, rows.filter((_, j) => j !== i))}>
                    ✕
                  </button>
                )}
              </div>
            ))}
            {!readOnly && !full && (
              <button type="button" className="btn secondary small" onClick={() => update(g.id, [...rows, {}])}>
                + {t('addRow')}
              </button>
            )}
          </fieldset>
        );
      })}
    </>
  );
}

export function SumSplitInput({ part, answer, onChange, readOnly, t }: PartProps<SumSplitPart>) {
  const value = current<SumSplitValue>(answer) ?? { values: {} };
  const { sum, missing } = sumSplitTotal(part, value);
  const ok = !missing && sum === part.total;
  const unit = part.unit === 'nghìn' ? 'nghìn' : (part.unit ?? '');
  return (
    <>
      {part.fields.map((f) => (
        <div key={f.id} className="part">
          <label className="part-label" htmlFor={`ss-${f.id}`}>
            {f.label}
          </label>
          <div className="num-row">
            <input
              id={`ss-${f.id}`}
              className="num-input"
              inputMode="numeric"
              autoComplete="off"
              readOnly={readOnly}
              value={value.values?.[f.id] ?? ''}
              onChange={(e) => onChange(set({ ...value, values: { ...value.values, [f.id]: toNum(digits(e.target.value)) } }))}
            />
            <span className="unit">{unit}</span>
          </div>
          {f.allowText && (
            <input
              className="text-input short"
              aria-label={f.textLabel ?? f.label}
              placeholder={f.textLabel}
              lang="vi"
              autoComplete="off"
              maxLength={120}
              readOnly={readOnly}
              value={value.texts?.[f.id] ?? ''}
              onChange={(e) => onChange(set({ ...value, texts: { ...value.texts, [f.id]: e.target.value } }))}
            />
          )}
        </div>
      ))}
      <div className={`sum-total${ok ? ' ok' : ''}`} role="status" aria-live="polite">
        <span>{t('total')}</span>
        <span>
          {ok ? '✓ ' : ''}
          {sum} / {part.total} {unit}
        </span>
      </div>
    </>
  );
}

/** Homework capture: repeated rows of checkboxes, tallies, text and numbers. */
export function RepeatInput({ part, answer, onChange, readOnly, t }: PartProps<RepeatPart>) {
  const value = current<RepeatValue>(answer);
  const min = Math.max(part.min ?? 1, 1);
  const rows: RepeatRow[] = value?.rows?.length ? value.rows : Array.from({ length: min }, () => ({}));
  const update = (next: RepeatRow[]) => onChange(set({ rows: next }));
  const setCell = (i: number, id: string, v: RepeatRow[string]) => update(rows.map((r, j) => (j === i ? { ...r, [id]: v } : r)));
  return (
    <>
      <div className="part-label">{part.label}</div>
      {rows.map((row, i) => (
        <fieldset className="list-group" key={i}>
          <legend className="part-label">{t('rowN', { n: i + 1 })}</legend>
          {part.fields.map((f) => {
            if (f.type === 'checkbox')
              return (
                <button key={f.id} type="button" role="checkbox" aria-checked={!!row[f.id]} className="option" disabled={readOnly} onClick={() => setCell(i, f.id, !row[f.id])}>
                  <span className="mark" aria-hidden="true">{row[f.id] ? '✓' : ''}</span>
                  <span>{f.label}</span>
                </button>
              );
            if (f.type === 'tally') {
              const n = Number(row[f.id] ?? 0);
              return (
                <div key={f.id} className="list-row" style={{ justifyContent: 'space-between' }}>
                  <span>{f.label}</span>
                  <span className="num-row">
                    <button type="button" className="icon-btn" aria-label={`${t('untally')}: ${f.label}`} disabled={readOnly || n === 0} onClick={() => setCell(i, f.id, n - 1)}>−</button>
                    <strong aria-live="polite" style={{ minWidth: 32, textAlign: 'center', fontSize: 22 }}>{n}</strong>
                    <button type="button" className="icon-btn" aria-label={`${t('tally')}: ${f.label}`} disabled={readOnly} onClick={() => setCell(i, f.id, n + 1)}>+</button>
                  </span>
                </div>
              );
            }
            if (f.type === 'number')
              return (
                <input key={f.id} className="num-input" aria-label={f.label} placeholder={f.label} inputMode="numeric" readOnly={readOnly}
                  value={row[f.id] == null ? '' : String(row[f.id])} onChange={(e) => setCell(i, f.id, toNum(digits(e.target.value)))} />
              );
            return (
              <input key={f.id} className="text-input short" aria-label={f.label} placeholder={f.label} lang="vi" autoComplete="off" maxLength={f.maxLength} readOnly={readOnly}
                value={(row[f.id] as string) ?? ''} onChange={(e) => setCell(i, f.id, e.target.value)} />
            );
          })}
          {!readOnly && rows.length > min && (
            <button type="button" className="btn quiet small" onClick={() => update(rows.filter((_, j) => j !== i))}>
              {t('remove')}
            </button>
          )}
        </fieldset>
      ))}
      {!readOnly && (part.max == null || rows.length < part.max) && (
        <button type="button" className="btn secondary small" onClick={() => update([...rows, {}])}>
          + {t('addPerson')}
        </button>
      )}
    </>
  );
}
