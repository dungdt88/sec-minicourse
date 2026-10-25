import { useState } from 'react';
import type { MultiChoicePart, PickNPart, SingleChoicePart } from '../../content/types';
import { asMultiValue, visibleOptions, type ChoiceValue, type MultiValue, type PickValue } from '../../domain/answers';
import { RichText } from '../ui';
import { current, set, type PartProps } from './types';

function Tile(props: {
  role: 'radio' | 'checkbox';
  checked: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" role={props.role} aria-checked={props.checked} className="option" disabled={props.disabled} onClick={props.onClick}>
      <span className="mark" aria-hidden="true">
        {props.checked ? '✓' : ''}
      </span>
      <span>{props.children}</span>
    </button>
  );
}

export function SingleChoiceInput({ part, answer, onChange, readOnly, t, lookup, labelId }: PartProps<SingleChoicePart>) {
  const value = current<ChoiceValue>(answer);
  const options = visibleOptions(part, lookup);
  const selected = options.find((o) => o.id === value?.optionId);
  return (
    <>
      <div className="option-list" role="radiogroup" aria-labelledby={labelId}>
        {options.map((o) => (
          <Tile
            key={o.id}
            role="radio"
            checked={value?.optionId === o.id}
            disabled={readOnly}
            onClick={() =>
              onChange(set(o.id.startsWith('own:') ? { optionId: o.id, text: o.text } : { optionId: o.id, text: o.allowText ? value?.text : undefined }))
            }
          >
            <RichText text={o.text} />
          </Tile>
        ))}
      </div>
      {selected?.allowText && (
        <input
          className="text-input short"
          aria-label={selected.text}
          placeholder={t('writeOther')}
          value={value?.text ?? ''}
          maxLength={120}
          readOnly={readOnly}
          lang="vi"
          autoComplete="off"
          onChange={(e) => onChange(set({ optionId: selected.id, text: e.target.value }))}
        />
      )}
    </>
  );
}

export function MultiChoiceInput({ part, answer, onChange, readOnly, t, labelId }: PartProps<MultiChoicePart>) {
  const value = asMultiValue(current<MultiValue>(answer));
  const own = value.own ?? [];
  const count = value.optionIds.length + own.filter((s) => s.trim()).length;
  const [blocked, setBlocked] = useState(false);

  const update = (v: MultiValue) => {
    setBlocked(false);
    onChange(set(v));
  };
  const [ownDraft, setOwnDraft] = useState('');
  const addOwn = () => {
    const text = ownDraft.trim();
    if (!text) return;
    if (part.max != null && count >= part.max) {
      setBlocked(true);
      return;
    }
    update({ ...value, own: [...own, text] });
    setOwnDraft('');
  };
  const toggle = (id: string) => {
    if (value.optionIds.includes(id)) update({ ...value, optionIds: value.optionIds.filter((x) => x !== id) });
    else if (part.max != null && count >= part.max) setBlocked(true);
    else update({ ...value, optionIds: [...value.optionIds, id] });
  };

  return (
    <>
      {part.max != null && <p className="hint">{t('pickAtMost', { n: part.max })}</p>}
      <div className="option-list" role="group" aria-labelledby={labelId}>
        {part.options.map((o) => (
          <div key={o.id} className="part">
            <Tile role="checkbox" checked={value.optionIds.includes(o.id)} disabled={readOnly} onClick={() => toggle(o.id)}>
              <RichText text={o.text} />
            </Tile>
            {o.allowText && value.optionIds.includes(o.id) && (
              <input
                className="text-input short"
                aria-label={o.text}
                placeholder={t('writeOther')}
                value={value.texts?.[o.id] ?? ''}
                maxLength={120}
                readOnly={readOnly}
                lang="vi"
                autoComplete="off"
                onChange={(e) => update({ ...value, texts: { ...value.texts, [o.id]: e.target.value } })}
              />
            )}
          </div>
        ))}
        {part.allowAddOwn && (
          // The child's own options, as removable chips (Appendix B).
          <div className="part" style={{ gap: 8 }}>
            {own.length > 0 && (
              <div className="chips">
                {own.map((text, i) => (
                  <span className="chip" key={i}>
                    {text}
                    {!readOnly && (
                      <button type="button" aria-label={`${t('remove')}: ${text}`} onClick={() => update({ ...value, own: own.filter((_, j) => j !== i) })}>
                        ✕
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
            {!readOnly && (
              <div className="list-row">
                <input
                  className="text-input short"
                  aria-label={t('addOwn')}
                  placeholder={t('addOwn')}
                  value={ownDraft}
                  maxLength={80}
                  lang="vi"
                  autoComplete="off"
                  onChange={(e) => setOwnDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addOwn()}
                />
                <button type="button" className="btn secondary small" disabled={!ownDraft.trim()} onClick={addOwn}>
                  + {t('add')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {blocked && part.max != null && (
        <p className="part-message" role="alert">
          {t('pickAtMost', { n: part.max })}
        </p>
      )}
    </>
  );
}

/** Tick exactly n. Leading options get their feedback once, gently; the child may keep them. */
export function PickNInput({ part, answer, onChange, readOnly, t, labelId }: PartProps<PickNPart>) {
  const value = current<PickValue>(answer) ?? { optionIds: [] };
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  const toggle = (id: string) => {
    setBlocked(false);
    if (value.optionIds.includes(id)) {
      setFeedback(null);
      onChange(set({ optionIds: value.optionIds.filter((x) => x !== id) }));
      return;
    }
    if (value.optionIds.length >= part.n) {
      setBlocked(true);
      return;
    }
    const o = part.options.find((x) => x.id === id);
    if (o?.leading && o.feedback && !shown.has(id)) {
      setFeedback(o.feedback);
      setShown(new Set(shown).add(id));
    } else setFeedback(null);
    onChange(set({ optionIds: [...value.optionIds, id] }));
  };

  return (
    <>
      <p className="hint">{t('pickN', { n: part.n })}</p>
      <div className="option-list" role="group" aria-labelledby={labelId}>
        {part.options.map((o) => (
          <Tile key={o.id} role="checkbox" checked={value.optionIds.includes(o.id)} disabled={readOnly} onClick={() => toggle(o.id)}>
            <RichText text={o.text} />
          </Tile>
        ))}
      </div>
      {feedback && (
        <div className="gentle pop" role="status">
          <span aria-hidden="true">🦉 </span>
          {feedback}
        </div>
      )}
      {blocked && (
        <p className="part-message" role="alert">
          {t('pickN', { n: part.n })}
        </p>
      )}
    </>
  );
}
