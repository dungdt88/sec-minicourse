import { useEffect, useState } from 'react';
import type { ItemListPart, RepeatPart, SumSplitPart } from '../../content/types';
import { itemListTotal, sumSplitTotal, type ItemListValue, type ListRow, type RepeatRow, type RepeatValue, type SumSplitValue } from '../../domain/answers';
import { ThousandCheck, inThousands } from './ThousandCheck';
import { current, set, type PartProps } from './types';

const digits = (s: string) => s.replace(/[^0-9]/g, '').slice(0, 9);
const toNum = (s: string) => (s === '' ? null : parseInt(s, 10));

const cellEmpty = (v: ListRow[string] | undefined) => v == null || (typeof v === 'string' && v.trim() === '');
const rowEmpty = (r: ListRow) => Object.values(r).every(cellEmpty);

/**
 * Grouped rows (Appendix B). `minRows` rows show from the start; rows with extra text fields are
 * numbered cards ("Thứ 1"); empty rows stay on screen while the child works but are never saved,
 * so the stored list has no gaps. `copyFrom` offers the child's own homework rows (H4 prices).
 */
export function ItemListInput({ part, answer, onChange, readOnly, t, lookup }: PartProps<ItemListPart>) {
  const value = current<ItemListValue>(answer) ?? { groups: {} };
  const minRows = Math.max(part.minRows ?? 1, 1);
  const pad = (rows: ListRow[] | undefined) => {
    const r = [...(rows ?? [])];
    while (r.length < minRows) r.push({});
    return r;
  };
  const [shown, setShown] = useState<Record<string, ListRow[]>>(() =>
    Object.fromEntries(part.groups.map((g) => [g.id, pad(value.groups?.[g.id])])),
  );
  const [copied, setCopied] = useState<number | null>(null);
  useEffect(() => {
    // "Chưa biết" cleared the answer: start again from empty rows.
    if (answer?.dontKnow) setShown(Object.fromEntries(part.groups.map((g) => [g.id, pad(undefined)])));
  }, [answer?.dontKnow]);

  const emit = (next: Record<string, ListRow[]>) => {
    setShown(next);
    onChange(set({ groups: Object.fromEntries(Object.entries(next).map(([g, rows]) => [g, rows.filter((r) => !rowEmpty(r))])) }));
  };
  const update = (g: string, rows: ListRow[]) => emit({ ...shown, [g]: rows });
  const setCell = (g: string, rows: ListRow[], i: number, id: string, v: ListRow[string]) =>
    update(g, rows.map((r, j) => (j === i ? { ...r, [id]: v } : r)));

  const textFields = part.fields.filter((f) => f.type === 'text');
  const asCards = textFields.length > 1;

  // copyFrom: rows from a homework list, into empty rows of the target group; never overwrites.
  const cf = part.copyFrom;
  const source = cf ? ((lookup(cf.homeworkId, cf.fieldId)?.value as ItemListValue | null)?.groups?.[cf.groupId] ?? []).filter((r) => !rowEmpty(r)) : [];
  const copyRows = () => {
    if (!cf) return;
    const target = [...(shown[cf.toGroupId] ?? [])];
    const have = new Set(target.map((r) => String(r.name ?? '').trim().toLowerCase()).filter(Boolean));
    const ids = new Set(part.fields.map((f) => f.id));
    let n = 0;
    for (const src of source) {
      const key = String(src.name ?? '').trim().toLowerCase();
      if (key && have.has(key)) continue;
      const row = Object.fromEntries(Object.entries(src).filter(([k]) => ids.has(k)));
      const slot = target.findIndex(rowEmpty);
      if (slot >= 0) target[slot] = row;
      else if (part.maxItemsPerGroup == null || target.length < part.maxItemsPerGroup) target.push(row);
      else break;
      have.add(key);
      n++;
    }
    update(cf.toGroupId, target);
    setCopied(n);
  };

  return (
    <>
      {part.groups.map((g) => {
        const rows = shown[g.id] ?? pad(undefined);
        const full = part.maxItemsPerGroup != null && rows.length >= part.maxItemsPerGroup;
        // Groups like "Nhà con có sẵn" have nothing to pay, so no price box.
        const fields = g.noPrice ? part.fields.filter((f) => f.type !== 'number') : part.fields;
        return (
          <fieldset key={g.id} className="list-group">
            <legend className="part-label">{g.label}</legend>
            {g.hint && <p className="hint" style={{ marginTop: -6 }}>{g.hint}</p>}
            {cf && cf.toGroupId === g.id && source.length > 0 && !readOnly && (
              <div className="part" style={{ gap: 6 }}>
                <button type="button" className="btn secondary small" onClick={copyRows}>
                  📋 {t('copyFromHomework')}
                </button>
                {copied != null && (
                  <p className="hint" role="status">
                    {copied ? t('copiedRows', { n: copied }) : t('copiedNone')}
                  </p>
                )}
              </div>
            )}
            {rows.map((row, i) => (
              <div className={`list-item${asCards ? ' card-row' : ''}`} key={i}>
                {asCards && <div className="part-label">{t('rowItem', { n: i + 1 })}</div>}
                {fields.map((f) => {
                  const short = f.label.replace(/\s*\(.*\)\s*/, '');
                  if (f.type === 'number') {
                    const money = inThousands(f.label);
                    const n = row[f.id] == null ? null : Number(row[f.id]);
                    return (
                      <div key={f.id} className="part" style={{ gap: 6 }}>
                        <div className="num-row">
                          <input
                            className="num-input"
                            aria-label={`${f.label} ${i + 1}`}
                            placeholder={short}
                            inputMode="numeric"
                            autoComplete="off"
                            readOnly={readOnly}
                            value={n == null ? '' : String(n)}
                            onChange={(e) => setCell(g.id, rows, i, f.id, toNum(digits(e.target.value)))}
                          />
                          {money && <span className="unit">nghìn đồng</span>}
                        </div>
                        {money && <ThousandCheck value={n} t={t} readOnly={readOnly} onFix={(k) => setCell(g.id, rows, i, f.id, k)} />}
                      </div>
                    );
                  }
                  return (
                    <input
                      key={f.id}
                      className="text-input short"
                      aria-label={`${f.label} ${i + 1}`}
                      placeholder={short}
                      maxLength={f.maxLength}
                      lang="vi"
                      autoComplete="off"
                      readOnly={readOnly}
                      value={(row[f.id] as string) ?? ''}
                      onChange={(e) => setCell(g.id, rows, i, f.id, e.target.value)}
                    />
                  );
                })}
                {!readOnly && rows.length > minRows && (
                  <button type="button" className="btn quiet small" style={{ alignSelf: 'flex-start' }} onClick={() => update(g.id, rows.filter((_, j) => j !== i))}>
                    ✕ {t('remove')}
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
      {part.showTotal && (
        <div className="sum-total" role="status" aria-live="polite">
          <span>{part.totalLabel ?? t('total')}</span>
          <span>{itemListTotal(part, value)} nghìn</span>
        </div>
      )}
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
          <legend className="part-label">{part.rowLabel ? part.rowLabel.replaceAll('{n}', String(i + 1)) : t('rowN', { n: i + 1 })}</legend>
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
            // A visible label above the box (a placeholder is cut off on a phone and gone once a
            // parent types); the playtest answer boxes get a short starter instead.
            if (f.type === 'number')
              return (
                <label key={f.id} className="field">
                  <span className="field-label">{f.label}</span>
                  <input className="num-input" inputMode="numeric" readOnly={readOnly}
                    value={row[f.id] == null ? '' : String(row[f.id])} onChange={(e) => setCell(i, f.id, toNum(digits(e.target.value)))} />
                </label>
              );
            return (
              <label key={f.id} className="field">
                <span className="field-label">{f.label}</span>
                <input className="text-input short" placeholder={f.pickIndex ? t('friendAnswered') : undefined} lang="vi" autoComplete="off" maxLength={f.maxLength} readOnly={readOnly}
                  value={(row[f.id] as string) ?? ''} onChange={(e) => setCell(i, f.id, e.target.value)} />
              </label>
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
