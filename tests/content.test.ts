import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateContent } from '../src/content/validate';
import type { CourseContent } from '../src/content/types';

const original = JSON.parse(readFileSync('content/course-content.json', 'utf8')) as CourseContent;
const copy = () => structuredClone(original);
const errorsOf = (data: unknown) => {
  const r = validateContent(data);
  return r.ok ? [] : r.errors;
};

describe('content validation', () => {
  it('accepts the supplied content file', () => {
    const r = validateContent(original);
    expect(r.ok ? [] : r.errors).toEqual([]);
  });

  it('matches the counts in the RFP', () => {
    expect(original.levels).toHaveLength(7);
    expect(original.levels.flatMap((l) => l.cards)).toHaveLength(28);
    expect(original.levels.flatMap((l) => l.quiz)).toHaveLength(28);
    expect(original.levels.flatMap((l) => l.form.questions)).toHaveLength(27);
    expect(original.homework.items).toHaveLength(5);
    expect(original.sdg).toHaveLength(17);
  });

  it('rejects a quiz question with two correct options and names it', () => {
    const c = copy();
    c.levels[4].quiz[2].options.forEach((o) => (o.correct = true));
    const errors = errorsOf(c);
    expect(errors).toHaveLength(1);
    expect(errors[0].id).toBe('L5Q3');
    expect(errors[0].message).toMatch(/đúng 1 đáp án đúng/);
  });

  it('rejects a quiz question with no correct option', () => {
    const c = copy();
    c.levels[0].quiz[0].options.forEach((o) => (o.correct = false));
    expect(errorsOf(c)[0].id).toBe('L1Q1');
  });

  it('rejects a quiz question without exactly 3 options', () => {
    const c = copy();
    c.levels[0].quiz[1].options.pop();
    expect(errorsOf(c).some((e) => e.id === 'L1Q2')).toBe(true);
  });

  it('rejects duplicate ids across the course', () => {
    const c = copy();
    c.levels[1].cards[0].id = 'L1C1';
    expect(errorsOf(c).some((e) => e.id === 'L1C1' && /trùng/.test(e.message))).toBe(true);
  });

  it('rejects an unknown part type with the question id', () => {
    const c = copy();
    const q = c.levels[0].form.questions[0];
    (q.parts[0] as { type: string }).type = 'slider';
    const errors = errorsOf(c);
    expect(errors.some((e) => e.id === q.id && e.where.includes(q.id))).toBe(true);
  });

  it('rejects a part missing its required fields', () => {
    const c = copy();
    delete (c.levels[5].form.questions[3].parts[0] as { total?: number }).total;
    expect(errorsOf(c).some((e) => e.id === 'L6F4' && /total/.test(e.message))).toBe(true);
  });

  it('rejects context and optionsFrom references that do not exist', () => {
    const c = copy();
    c.levels[4].form.questions[1].context = [{ questionId: 'L9F9', partId: 'a' }];
    expect(errorsOf(c).some((e) => e.id === 'L5F2')).toBe(true);
  });

  it('rejects homework capture for an item that does not exist', () => {
    const c = copy();
    c.homework.capture!.H9 = c.homework.capture!.H5;
    expect(errorsOf(c).some((e) => e.id === 'H9')).toBe(true);
  });

  it('rejects unknown top-level keys and wrong types', () => {
    expect(errorsOf({ ...copy(), extra: 1 }).some((e) => /extra/.test(e.message))).toBe(true);
    const c = copy() as unknown as { levels: { order: unknown }[] };
    c.levels[0].order = 'one';
    expect(errorsOf(c).some((e) => e.id === 'L1')).toBe(true);
  });

  it('accepts a new level 8 without code changes', () => {
    const c = copy();
    const l8 = JSON.parse(JSON.stringify(c.levels[6]).replace(/L7/g, 'L8'));
    l8.order = 8;
    c.levels.push(l8);
    expect(validateContent(c).ok).toBe(true);
  });

  it('rejects duplicate level order', () => {
    const c = copy();
    c.levels[1].order = 1;
    expect(errorsOf(c).some((e) => e.id === 'L2')).toBe(true);
  });
});

describe('precompiled schema validator', () => {
  it('is up to date with schema/course-content.schema.json (run `pnpm gen:validator`)', async () => {
    const { generate, GENERATED } = await import('../scripts/build-validator');
    expect(readFileSync(GENERATED, 'utf8')).toBe(generate());
  });
});

describe('quiz text and shuffled options', () => {
  it('rejects an explanation that names options by letter', () => {
    const c = copy();
    c.levels[2].quiz[1].explanation = 'Câu A và C đã gợi ý sẵn câu trả lời. Câu B để các bạn tự kể.';
    expect(errorsOf(c).some((e) => e.id === 'L3Q2' && /A\/B\/C/.test(e.message))).toBe(true);
  });
  it('allows letters when the question is not shuffled', () => {
    const c = copy();
    c.levels[2].quiz[1].explanation = 'Câu A và C đã gợi ý sẵn câu trả lời.';
    c.levels[2].quiz[1].shuffleOptions = false;
    expect(validateContent(c).ok).toBe(true);
  });
  it('does not flag ordinary words', () => {
    const c = copy();
    c.levels[0].quiz[0].explanation = 'Vitamin C và cách bán vòng. Ý của bạn A là gì?';
    expect(validateContent(c).ok).toBe(true);
  });
});
