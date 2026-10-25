// Homework sheet (FR-P-26) with optional in-app capture (FR-P-27). The printable A4 version is
// built from the same `capture` definitions: checkboxes become tick boxes, tallies become tally
// columns, item lists become tables with blank rows.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { findQuestion, HOMEWORK_LEVEL_ID, byOrder, type HomeworkItem, type Part } from '../content/types';
import { formatPart } from '../domain/answers';
import { useAutosave } from './Form';
import { PartField } from './parts';
import { usePlayer } from './session';
import { SavePill } from './ui';

/**
 * The earlier answer an item shows (e.g. H2 ← the two questions picked in L3F2), numbered so
 * "Trả lời câu hỏi 1/2" in the capture fields match. Before it exists: which level it comes from.
 */
function useEarlierAnswer(item: HomeworkItem): { lines: string[] } | { fromLevel: number } | null {
  const { content, answer, t } = usePlayer();
  const ref = item.showAnswer;
  if (!ref) return null;
  const found = findQuestion(content, ref.questionId);
  const part = found?.question.parts.find((p) => p.id === ref.partId);
  if (!found || !part) return null;
  const a = answer(ref.questionId, ref.partId);
  if (!a || a.dontKnow || a.value == null) return { fromLevel: found.level.order };
  const ids = (a.value as { optionIds?: string[] }).optionIds;
  if (ids && 'options' in part) return { lines: ids.map((id) => part.options.find((o) => o.id === id)?.text ?? id) };
  return { lines: [formatPart(part, a, content, t)] };
}

/**
 * Capture parts for an item, with repeat fields that carry `pickIndex` kept only when the earlier
 * answer (showAnswer) has that pick, and labelled with it (H2: one answer box per L3F2 question).
 */
function usePartsWithPicks(item: HomeworkItem, parts: Part[]): Part[] {
  const earlier = useEarlierAnswer(item);
  const picks = earlier && 'lines' in earlier ? earlier.lines : [];
  return parts.map((p) =>
    p.type !== 'repeat'
      ? p
      : {
          ...p,
          fields: p.fields
            .filter((f) => !f.pickIndex || picks[f.pickIndex - 1])
            .map((f) => (f.pickIndex ? { ...f, label: `${f.label}: ${picks[f.pickIndex - 1]}` } : f)),
        },
  );
}

function EarlierAnswer({ item, print }: { item: HomeworkItem; print?: boolean }) {
  const { t } = usePlayer();
  const earlier = useEarlierAnswer(item);
  if (!earlier) return null;
  if ('fromLevel' in earlier)
    return print ? null : <p className="hint" style={{ marginTop: 8 }}>{t('earlierLater', { n: earlier.fromLevel })}</p>;
  const list = earlier.lines.length > 1 ? (
    <ol style={{ margin: '4px 0 0', paddingLeft: '1.4em' }}>
      {earlier.lines.map((l, i) => (
        <li key={i}>{l}</li>
      ))}
    </ol>
  ) : (
    <strong> {earlier.lines[0]}</strong>
  );
  return print ? (
    <div style={{ margin: '0 0 4px' }}>
      {t('youChose')} {list}
    </div>
  ) : (
    <div className="context-box" style={{ marginTop: 8 }}>
      {t('youChose')} {list}
    </div>
  );
}

function Capture({ item, parts }: { item: HomeworkItem; parts: Part[] }) {
  const { content, t, answer, preview } = usePlayer();
  const { drafts, change } = useAutosave(HOMEWORK_LEVEL_ID, item.id, parts, false);
  return (
    <div className="part" style={{ marginTop: 8 }}>
      {parts.map((part) => (
        <PartField
          key={part.id}
          part={part}
          answer={drafts[part.id]}
          onChange={(a) => change(part, a)}
          readOnly={false}
          t={t}
          content={content}
          lookup={(q, p) => answer(q, p)}
          fallbackLabelId={`hw-${item.id}`}
        />
      ))}
      {!preview && <p className="hint">{t('homeworkSaved')}</p>}
    </div>
  );
}

function ItemCard({ item, single }: { item: HomeworkItem; single: boolean }) {
  const { content, t } = usePlayer();
  const [open, setOpen] = useState(false);
  const raw = content.homework.capture?.[item.id];
  const parts = usePartsWithPicks(item, raw ?? []);
  return (
    <section className="panel">
      <div className="hw-item">
        {/* FR-P-26: no number badge when there is only one item */}
        {!single && (
          <span className="num" aria-hidden="true">
            {item.order}
          </span>
        )}
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0 }} id={`hw-${item.id}`}>
            {item.text}
          </p>
          <EarlierAnswer item={item} />
        </div>
      </div>
      {raw && (
        <>
          <button className="btn secondary small" style={{ marginTop: 12 }} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? t('close') : `✏️ ${t('capture')}`}
          </button>
          {open && <Capture item={item} parts={parts} />}
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- print

function PrintPart({ part }: { part: Part }) {
  switch (part.type) {
    case 'repeat': {
      const rows = Math.max(part.max ?? 3, part.min ?? 1);
      const hasTally = part.fields.some((f) => f.type === 'tally');
      return (
        <table>
          <thead>
            <tr>
              <th>{part.label}</th>
              {part.fields.map((f) => (
                <th key={f.id}>{f.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, i) => (
              <tr key={i} style={hasTally ? { height: 48 } : undefined}>
                <td>{i + 1}</td>
                {part.fields.map((f) => (
                  <td key={f.id} style={f.type === 'text' ? { minWidth: 90 } : { textAlign: 'center' }}>
                    {f.type === 'checkbox' ? <span className="tick" /> : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    case 'item_list':
      return (
        <>
          {part.groups.map((g) => (
            <table key={g.id}>
              <thead>
                <tr>
                  <th colSpan={part.fields.length}>{g.label}</th>
                </tr>
                <tr>
                  {part.fields.map((f) => (
                    <th key={f.id}>{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 4 }, (_, i) => (
                  <tr key={i}>
                    {part.fields.map((f) => (
                      <td key={f.id} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </>
      );
    case 'number':
      return (
        <p>
          {part.label}: ________ {part.unit}
        </p>
      );
    default:
      return (
        <div>
          {part.label && <p style={{ margin: '4px 0' }}>{part.label}</p>}
          <div className="write-line" />
          <div className="write-line" />
          <div className="write-line" />
        </div>
      );
  }
}

function PrintableSheet({ name }: { name: string }) {
  const { content } = usePlayer();
  const hw = content.homework;
  return (
    <div className="print-only print-sheet">
      <h1>{hw.title}</h1>
      <p style={{ margin: '0 0 6px' }}>
        <strong>{name}</strong> · {content.title}
      </p>
      <p style={{ margin: '0 0 10px' }}>{hw.intro}</p>
      {byOrder(hw.items).map((item) => (
        <PrintItem key={item.id} item={item} single={hw.items.length === 1} />
      ))}
    </div>
  );
}

function PrintItem({ item, single }: { item: HomeworkItem; single: boolean }) {
  const { content } = usePlayer();
  const parts = usePartsWithPicks(item, content.homework.capture?.[item.id] ?? []);
  return (
    <section>
      <p style={{ margin: '0 0 4px' }}>
        {!single && <strong>{item.order}. </strong>}
        {item.text}
      </p>
      <EarlierAnswer item={item} print />
      {parts.map((p) => (
        <PrintPart key={p.id} part={p} />
      ))}
    </section>
  );
}

export function Homework() {
  const { content, t, base, state, preview } = usePlayer();
  const navigate = useNavigate();
  const hw = content.homework;
  return (
    <>
      <main className="screen no-print">
        <div className="topbar level-top">
          <button className="map-btn" onClick={() => navigate(`${base}/home`)} aria-label={t('backHome')}>
            <span aria-hidden="true">🗺️</span>
          </button>
          {/* the big title below names the page */}
          <span className="title" />
          {!preview && <SavePill />}
        </div>
        <div className="title-row">
          <h1 className="big-title">{hw.title}</h1>
          {/* Printing is for the parent, so it is a small button beside the title. */}
          {hw.printable !== false && (
            <button className="icon-btn small" onClick={() => window.print()}>
              <span aria-hidden="true">🖨️</span> {t('print')}
            </button>
          )}
        </div>
        <p style={{ margin: 0 }}>{hw.intro}</p>
        {byOrder(hw.items).map((item) => (
          <ItemCard key={item.id} item={item} single={hw.items.length === 1} />
        ))}
      </main>
      <PrintableSheet name={state.profile.displayName} />
    </>
  );
}
