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

function useEarlierAnswer(item: HomeworkItem): string | null {
  const { content, answer, t } = usePlayer();
  const ref = item.showAnswer;
  if (!ref) return null;
  const part = findQuestion(content, ref.questionId)?.question.parts.find((p) => p.id === ref.partId);
  const a = answer(ref.questionId, ref.partId);
  if (!part || !a || a.dontKnow) return null;
  return formatPart(part, a, content, t) || null;
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
          allowDontKnow={false}
          fallbackLabelId={`hw-${item.id}`}
        />
      ))}
      {!preview && <p className="hint">{t('homeworkSaved')}</p>}
    </div>
  );
}

function ItemCard({ item }: { item: HomeworkItem }) {
  const { content, t } = usePlayer();
  const [open, setOpen] = useState(false);
  const parts = content.homework.capture?.[item.id];
  const earlier = useEarlierAnswer(item);
  return (
    <section className="panel">
      <div className="hw-item">
        <span className="num" aria-hidden="true">
          {item.order}
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0 }} id={`hw-${item.id}`}>
            {item.text}
          </p>
          {earlier && <p className="context-box" style={{ marginTop: 8 }}>{earlier}</p>}
        </div>
      </div>
      {parts && (
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
        <PrintItem key={item.id} item={item} />
      ))}
    </div>
  );
}

function PrintItem({ item }: { item: HomeworkItem }) {
  const { content } = usePlayer();
  const earlier = useEarlierAnswer(item);
  return (
    <section>
      <p style={{ margin: '0 0 4px' }}>
        <strong>{item.order}.</strong> {item.text}
      </p>
      {earlier && (
        <p style={{ margin: '0 0 4px' }}>
          <em>{earlier}</em>
        </p>
      )}
      {(content.homework.capture?.[item.id] ?? []).map((p) => (
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
        <div className="topbar">
          <button className="icon-btn" onClick={() => navigate(`${base}/home`)} aria-label={t('backHome')}>
            🗺️
          </button>
          <span className="title">{hw.title}</span>
          <span className="spacer" />
          {!preview && <SavePill />}
        </div>
        <h1 className="big-title">{hw.title}</h1>
        <p style={{ margin: 0 }}>{hw.intro}</p>
        {hw.printable !== false && (
          <button className="btn secondary" onClick={() => window.print()}>
            🖨️ {t('print')}
          </button>
        )}
        {byOrder(hw.items).map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </main>
      <PrintableSheet name={state.profile.displayName} />
    </>
  );
}
