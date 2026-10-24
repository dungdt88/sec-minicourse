import type { ErrorObject } from 'ajv/dist/2020';
// Precompiled from schema/course-content.schema.json (scripts/build-validator.ts): no runtime
// code generation, so it runs under the production Content-Security-Policy.
import { validate as validateSchemaFn } from './schema-validator.generated.js';
import type { CourseContent, Part } from './types';

export interface ContentError {
  /** Human-readable location built from ids, e.g. "L5 › L5Q3". */
  where: string;
  /** The innermost id at the error location, so the mentor can search the file for it. */
  id: string | null;
  message: string;
}

export type ValidationResult = { ok: true; content: CourseContent } | { ok: false; errors: ContentError[] };

const validateSchema = validateSchemaFn;

/** Walk a JSON pointer through the data, collecting the `id` (or sdg `number`) of every object passed. */
function locate(data: unknown, instancePath: string): { where: string; id: string | null } {
  const segments = instancePath.split('/').slice(1).map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'));
  const trail: string[] = [];
  let node: unknown = data;
  let lastKey = '';
  for (const seg of segments) {
    if (node == null || typeof node !== 'object') break;
    node = (node as Record<string, unknown>)[seg];
    if (node && typeof node === 'object' && !Array.isArray(node)) {
      const obj = node as Record<string, unknown>;
      if (typeof obj.id === 'string') trail.push(obj.id);
      else if (typeof obj.number === 'number') trail.push(`SDG ${obj.number}`);
      else if (!/^\d+$/.test(seg)) trail.push(seg);
    } else if (!Array.isArray(node)) {
      lastKey = seg;
    }
  }
  // Report the innermost course-wide id (L6F4, L5Q3, H2…), not a part or option id like "a",
  // which is only unique inside its question.
  const ids = trail.filter((x) => /^[A-Z]/.test(x));
  const id = ids.length ? ids[ids.length - 1] : trail.length ? trail[trail.length - 1] : null;
  const where = [...trail, lastKey].filter(Boolean).join(' › ') || '(gốc)';
  return { where, id };
}

function ajvMessage(e: ErrorObject): string {
  switch (e.keyword) {
    case 'required':
      return `thiếu trường "${(e.params as { missingProperty: string }).missingProperty}"`;
    case 'additionalProperties':
      return `trường lạ "${(e.params as { additionalProperty: string }).additionalProperty}"`;
    case 'enum':
      return `giá trị không hợp lệ, phải là một trong: ${(e.params as { allowedValues: unknown[] }).allowedValues.join(', ')}`;
    case 'type':
      return `sai kiểu, cần ${(e.params as { type: string }).type}`;
    case 'minItems':
      return `cần ít nhất ${(e.params as { limit: number }).limit} mục`;
    case 'maxItems':
      return `nhiều nhất ${(e.params as { limit: number }).limit} mục`;
    case 'minLength':
      return 'không được để trống';
    case 'pattern':
      return `không đúng dạng (${(e.params as { pattern: string }).pattern})`;
    default:
      return e.message ?? e.keyword;
  }
}

export function validateContent(data: unknown): ValidationResult {
  const errors: ContentError[] = [];
  if (!validateSchema(data)) {
    for (const e of validateSchema.errors ?? []) {
      // if/then wrappers repeat the inner error; keep only the concrete ones.
      if (e.keyword === 'if') continue;
      errors.push({ ...locate(data, e.instancePath), message: ajvMessage(e) });
    }
    return { ok: false, errors: dedupe(errors) };
  }
  const content = data as unknown as CourseContent;
  semanticChecks(content, errors);
  return errors.length ? { ok: false, errors } : { ok: true, content };
}

function dedupe(errors: ContentError[]): ContentError[] {
  const seen = new Set<string>();
  return errors.filter((e) => {
    const key = `${e.where}|${e.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Rules a JSON schema cannot express: uniqueness, exactly-one-correct, cross references. */
function semanticChecks(c: CourseContent, errors: ContentError[]) {
  const err = (where: string, id: string | null, message: string) => errors.push({ where, id, message });
  const globalIds = new Map<string, string>();
  const claim = (id: string, where: string) => {
    const prev = globalIds.get(id);
    if (prev) err(where, id, `id "${id}" bị trùng (đã dùng ở ${prev})`);
    else globalIds.set(id, where);
  };

  const characterIds = new Set(c.characters.map((ch) => ch.id));
  if (characterIds.size !== c.characters.length) err('characters', null, 'id nhân vật bị trùng');

  const sdgNumbers = new Set(c.sdg.map((s) => s.number));
  if (sdgNumbers.size !== 17) err('sdg', null, 'cần đủ 17 mục tiêu, số 1 đến 17, không trùng');

  const orders = new Set<number>();
  for (const level of c.levels) {
    claim(level.id, level.id);
    if (orders.has(level.order)) err(level.id, level.id, `order ${level.order} bị trùng với màn khác`);
    orders.add(level.order);
    if (level.character && !characterIds.has(level.character)) err(level.id, level.id, `không có nhân vật "${level.character}"`);

    const cardOrders = new Set<number>();
    for (const card of level.cards) {
      claim(card.id, `${level.id} › ${card.id}`);
      if (cardOrders.has(card.order)) err(`${level.id} › ${card.id}`, card.id, `order ${card.order} bị trùng`);
      cardOrders.add(card.order);
    }

    for (const q of level.quiz) {
      const where = `${level.id} › ${q.id}`;
      claim(q.id, where);
      const correct = q.options.filter((o) => o.correct).length;
      if (correct !== 1) err(where, q.id, `câu đố phải có đúng 1 đáp án đúng, đang có ${correct}`);
      uniqueIds(q.options, where, q.id, 'lựa chọn', err);
    }

    for (const fq of level.form.questions) {
      const where = `${level.id} › ${fq.id}`;
      claim(fq.id, where);
      uniqueIds(fq.parts, where, fq.id, 'phần', err);
      for (const part of fq.parts) checkPart(part, `${where} › ${part.id}`, fq.id, err);
    }
  }

  // Cross references need every question known first.
  const partIndex = new Map<string, Part>();
  for (const level of c.levels)
    for (const fq of level.form.questions) for (const p of fq.parts) partIndex.set(`${fq.id}/${p.id}`, p);
  for (const level of c.levels) {
    for (const fq of level.form.questions) {
      for (const ref of fq.context ?? []) {
        if (!partIndex.has(`${ref.questionId}/${ref.partId}`))
          err(`${level.id} › ${fq.id}`, fq.id, `context trỏ tới ${ref.questionId}/${ref.partId} không tồn tại`);
      }
      for (const p of fq.parts) {
        if (p.type === 'single_choice' && p.optionsFrom) {
          const src = partIndex.get(`${p.optionsFrom.questionId}/${p.optionsFrom.partId}`);
          if (!src || src.type !== 'multi_choice')
            err(`${level.id} › ${fq.id}`, fq.id, `optionsFrom phải trỏ tới một câu multi_choice`);
        }
      }
    }
  }

  for (const item of c.homework.items) {
    const ref = item.showAnswer;
    if (ref && !partIndex.has(`${ref.questionId}/${ref.partId}`))
      err(`homework › ${item.id}`, item.id, `showAnswer trỏ tới ${ref.questionId}/${ref.partId} không tồn tại`);
  }
  const hwIds = new Set(c.homework.items.map((i) => i.id));
  uniqueIds(c.homework.items, 'homework', null, 'việc', err);
  for (const [key, parts] of Object.entries(c.homework.capture ?? {})) {
    if (!hwIds.has(key)) err(`homework › capture › ${key}`, key, `không có việc "${key}" trong homework.items`);
    uniqueIds(parts, `homework › ${key}`, key, 'phần', err);
    for (const p of parts) checkPart(p, `homework › ${key} › ${p.id}`, key, err);
  }
}

function uniqueIds(
  xs: { id: string }[],
  where: string,
  id: string | null,
  what: string,
  err: (where: string, id: string | null, message: string) => void,
) {
  const seen = new Set<string>();
  for (const x of xs) {
    if (seen.has(x.id)) err(where, id, `${what} "${x.id}" bị trùng`);
    seen.add(x.id);
  }
}

function checkPart(
  p: Part,
  where: string,
  ownerId: string,
  err: (where: string, id: string | null, message: string) => void,
) {
  switch (p.type) {
    case 'single_choice':
    case 'pick_n':
      uniqueIds(p.options, where, ownerId, 'lựa chọn', err);
      if (p.type === 'pick_n' && p.n > p.options.length) err(where, ownerId, `n = ${p.n} lớn hơn số lựa chọn`);
      break;
    case 'multi_choice':
      uniqueIds(p.options, where, ownerId, 'lựa chọn', err);
      if (p.min != null && p.max != null && p.min > p.max) err(where, ownerId, 'min lớn hơn max');
      if (p.max != null && p.max > p.options.length && !p.allowAddOwn) err(where, ownerId, 'max lớn hơn số lựa chọn');
      break;
    case 'number':
      if (p.min != null && p.max != null && p.min > p.max) err(where, ownerId, 'min lớn hơn max');
      break;
    case 'item_list':
      uniqueIds(p.groups, where, ownerId, 'nhóm', err);
      uniqueIds(p.fields, where, ownerId, 'ô', err);
      break;
    case 'sum_split':
      uniqueIds(p.fields, where, ownerId, 'ô', err);
      break;
    case 'repeat':
      uniqueIds(p.fields, where, ownerId, 'ô', err);
      if (p.min != null && p.max != null && p.min > p.max) err(where, ownerId, 'min lớn hơn max');
      break;
    default:
      break;
  }
}
