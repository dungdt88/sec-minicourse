// Answer values and validation for every form part type. Pure functions: the screens, the
// mentor console and the exports all go through here, and tests/answers.test.ts covers each type.
//
// Adding a part type: add its value shape to PartValue, a case to checkPart() and to
// formatPart(), and a component in src/player/parts/. TypeScript's exhaustiveness check
// (the `never` defaults) points at every place that needs it.

import type { CourseContent, ItemListPart, Part, RepeatPart, SumSplitPart } from '../content/types';

export interface ChoiceValue {
  optionId: string;
  /** Text for an option with allowText ("Khác"). */
  text?: string;
}

export interface MultiValue {
  optionIds: string[];
  /** Text per allowText option id. */
  texts?: Record<string, string>;
  /** Options the child added themselves (allowAddOwn). */
  own?: string[];
}

export interface PickValue {
  optionIds: string[];
}

export type ListRow = Record<string, string | number | null>;
export interface ItemListValue {
  groups: Record<string, ListRow[]>;
}

export interface SumSplitValue {
  values: Record<string, number | null>;
  texts?: Record<string, string>;
}

export type RepeatRow = Record<string, string | number | boolean | null>;
export interface RepeatValue {
  rows: RepeatRow[];
}

export type PartValue =
  | string // text
  | number // number, sdg_picker
  | ChoiceValue
  | MultiValue
  | PickValue
  | ItemListValue
  | SumSplitValue
  | RepeatValue;

export interface PartAnswer {
  value: PartValue | null;
  dontKnow: boolean;
}

export interface PartCheck {
  /** The part is answered well enough to continue. */
  complete: boolean;
  /** Shown under the input when the child tried something not allowed (never for "just empty"). */
  message?: string;
}

/** Strings used by validation; resolved from content.ui with fallbacks (see strings.ts). */
export type T = (key: string, params?: Record<string, string | number>) => string;

const isBlank = (s: unknown) => typeof s !== 'string' || s.trim() === '';

export function checkPart(part: Part, answer: PartAnswer | undefined, t: T): PartCheck {
  if (!answer) return { complete: false };
  if (answer.dontKnow) return { complete: true };
  const v = answer.value;
  if (v == null) return { complete: false };

  switch (part.type) {
    case 'text':
      return { complete: !isBlank(v) };

    case 'single_choice': {
      const c = v as ChoiceValue;
      const opt = part.options.find((o) => o.id === c.optionId) ?? (c.optionId?.startsWith('own:') ? { allowText: false } : null);
      if (!opt) return { complete: false };
      if (opt.allowText && isBlank(c.text)) return { complete: false, message: t('writeOther') };
      return { complete: true };
    }

    case 'multi_choice': {
      const m = v as MultiValue;
      const count = m.optionIds.length + (m.own?.filter((s) => !isBlank(s)).length ?? 0);
      const min = part.min ?? 1;
      if (part.max != null && count > part.max) return { complete: false, message: t('pickAtMost', { n: part.max }) };
      if (count < min) return { complete: false, message: count > 0 ? t('pickAtLeast', { n: min }) : undefined };
      const missingText = m.optionIds.some((id) => part.options.find((o) => o.id === id)?.allowText && isBlank(m.texts?.[id]));
      if (missingText) return { complete: false, message: t('writeOther') };
      return { complete: true };
    }

    case 'number': {
      if (typeof v !== 'number' || !Number.isFinite(v)) return { complete: false };
      if (!Number.isInteger(v)) return { complete: false, message: t('wholeNumber') };
      if ((part.min != null && v < part.min) || (part.max != null && v > part.max))
        return { complete: false, message: t('numberRange', { min: part.min ?? 0, max: part.max ?? '' }) };
      return { complete: true };
    }

    case 'pick_n': {
      const count = (v as PickValue).optionIds.length;
      if (count === part.n) return { complete: true };
      return { complete: false, message: count > part.n ? t('pickN', { n: part.n }) : undefined };
    }

    case 'sdg_picker':
      return { complete: typeof v === 'number' && v >= 1 && v <= 17 };

    case 'item_list':
      return checkItemList(part, v as ItemListValue, t);

    case 'sum_split': {
      const s = sumSplitTotal(part, v as SumSplitValue);
      if (s.missing) return { complete: false };
      if (s.sum !== part.total) return { complete: false, message: t('mustEqual', { total: part.total }) };
      return { complete: true };
    }

    case 'repeat': {
      const rows = (v as RepeatValue).rows ?? [];
      return { complete: rows.length >= (part.min ?? 1) };
    }

    default: {
      const never: never = part;
      return never;
    }
  }
}

function checkItemList(part: ItemListPart, v: ItemListValue, t: T): PartCheck {
  let named = 0;
  for (const g of part.groups) {
    const rows = v.groups?.[g.id] ?? [];
    if (part.maxItemsPerGroup && rows.length > part.maxItemsPerGroup)
      return { complete: false, message: t('tooManyRows', { n: part.maxItemsPerGroup }) };
    for (const row of rows) {
      const hasName = part.fields.some((f) => f.type === 'text' && !isBlank(row[f.id]));
      if (!hasName) continue;
      for (const f of part.fields) {
        const cell = row[f.id];
        if (f.type === 'number' && cell != null && cell !== '' && (typeof cell !== 'number' || cell < 0))
          return { complete: false, message: t('wholeNumber') };
      }
      named++;
    }
  }
  return { complete: named > 0 };
}

export function sumSplitTotal(part: SumSplitPart, v: SumSplitValue | null | undefined): { sum: number; missing: boolean } {
  let sum = 0;
  let missing = false;
  for (const f of part.fields) {
    const n = v?.values?.[f.id];
    if (typeof n === 'number' && Number.isFinite(n)) sum += n;
    else if (!f.optional) missing = true;
  }
  return { sum, missing };
}

/** Sum of the number fields of named rows, for item lists with showTotal (e.g. start-up money). */
export function itemListTotal(part: ItemListPart, v: ItemListValue | null | undefined): number {
  let total = 0;
  for (const g of part.groups) {
    if (g.noPrice) continue;
    for (const row of v?.groups?.[g.id] ?? []) {
      if (!part.fields.some((f) => f.type === 'text' && !isBlank(row[f.id]))) continue;
      for (const f of part.fields) if (f.type === 'number' && typeof row[f.id] === 'number') total += row[f.id] as number;
    }
  }
  return total;
}

/** Single-choice options after optionsFrom filtering. */
export function visibleOptions(
  part: Extract<Part, { type: 'single_choice' }>,
  lookup: (questionId: string, partId: string) => PartAnswer | undefined,
): { id: string; text: string; allowText?: boolean }[] {
  if (!part.optionsFrom) return part.options;
  const src = lookup(part.optionsFrom.questionId, part.optionsFrom.partId);
  const m = src && !src.dontKnow ? (src.value as MultiValue | null) : null;
  const chosen = new Set(m?.optionIds ?? []);
  const own = (m?.own ?? []).filter((s) => !isBlank(s));
  if (chosen.size === 0 && own.length === 0) return part.options;
  const base = part.options.filter((o) => chosen.has(o.id) && !o.allowText);
  const added = own.map((text, i) => ({ id: `own:${i}`, text }));
  return [...base, ...added, ...part.options.filter((o) => o.allowText)];
}

/** One-line plain-text rendering of an answer, for review, compare view and exports. */
export function formatPart(part: Part, answer: PartAnswer | undefined, content: CourseContent, t: T): string {
  if (!answer) return '';
  if (answer.dontKnow) return t('dontKnow');
  const v = answer.value;
  if (v == null) return '';
  switch (part.type) {
    case 'text':
      return String(v);
    case 'single_choice': {
      const c = v as ChoiceValue;
      const opt = part.options.find((o) => o.id === c.optionId);
      const text = opt?.text ?? c.text ?? c.optionId;
      return opt?.allowText && c.text ? `${text}: ${c.text}` : text;
    }
    case 'multi_choice': {
      const m = v as MultiValue;
      const picked = m.optionIds.map((id) => {
        const o = part.options.find((x) => x.id === id);
        const text = o?.text ?? id;
        return o?.allowText && m.texts?.[id] ? `${text}: ${m.texts[id]}` : text;
      });
      return [...picked, ...(m.own ?? []).filter((s) => !isBlank(s))].join('; ');
    }
    case 'number':
      return part.unit ? `${v} ${part.unit}` : String(v);
    case 'pick_n':
      return (v as PickValue).optionIds.map((id) => part.options.find((o) => o.id === id)?.text ?? id).join('; ');
    case 'sdg_picker': {
      const s = content.sdg.find((x) => x.number === v);
      return s ? `${s.number}. ${s.title}` : String(v);
    }
    case 'item_list': {
      const iv = v as ItemListValue;
      return part.groups
        .map((g) => {
          const rows = (iv.groups?.[g.id] ?? []).filter((r) => part.fields.some((f) => f.type === 'text' && !isBlank(r[f.id])));
          if (!rows.length) return null;
          const items = rows.map((r) =>
            part.fields
              .map((f) => (r[f.id] == null || r[f.id] === '' ? null : f.type === 'number' ? `${r[f.id]} nghìn` : String(r[f.id])))
              .filter(Boolean)
              .join(' – '),
          );
          return `${g.label}: ${items.join('; ')}`;
        })
        .filter(Boolean)
        .join(' | ');
    }
    case 'sum_split': {
      const s = v as SumSplitValue;
      return part.fields
        .filter((f) => !(f.optional && s.values?.[f.id] == null))
        .map((f) => {
          const extra = f.allowText && s.texts?.[f.id] ? ` (${s.texts[f.id]})` : '';
          return `${f.label}${extra}: ${s.values?.[f.id] ?? '–'}${part.unit ? ' ' + part.unit : ''}`;
        })
        .join('; ');
    }
    case 'repeat':
      return formatRepeat(part, v as RepeatValue);
    default: {
      const never: never = part;
      return never;
    }
  }
}

function formatRepeat(part: RepeatPart, v: RepeatValue): string {
  return (v.rows ?? [])
    .map((row, i) => {
      const cells = part.fields
        .map((f) => {
          const cell = row[f.id];
          if (f.type === 'checkbox') return cell ? f.label : null;
          if (cell == null || cell === '') return null;
          return `${f.label}: ${cell}`;
        })
        .filter(Boolean);
      return `${i + 1}) ${cells.join(', ') || '–'}`;
    })
    .join(' | ');
}

/**
 * A comparable key for the compare view: two children "agree" on a choice or number part when
 * their keys are equal. Free text has no key (it is never flagged).
 */
export function compareKey(part: Part, answer: PartAnswer | undefined): string | null {
  if (!answer) return null;
  if (answer.dontKnow) return '∅';
  const v = answer.value;
  if (v == null) return null;
  switch (part.type) {
    case 'single_choice':
      return (v as ChoiceValue).optionId;
    case 'multi_choice':
      return [...(v as MultiValue).optionIds].sort().join(',');
    case 'pick_n':
      return [...(v as PickValue).optionIds].sort().join(',');
    case 'number':
    case 'sdg_picker':
      return String(v);
    case 'sum_split': {
      const s = v as SumSplitValue;
      return part.fields.map((f) => s.values?.[f.id] ?? '').join('/');
    }
    default:
      return null;
  }
}

export const isComparable = (part: Part) =>
  ['single_choice', 'multi_choice', 'pick_n', 'number', 'sdg_picker', 'sum_split'].includes(part.type);

/** "Chọn một hình" → "Chọn một hình:"; "Vì sao?" stays as is. Used where a label precedes an answer. */
export const withColon = (label: string) => (/[?:：]$/.test(label.trim()) ? label : `${label}:`);
