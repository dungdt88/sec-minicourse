import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkPart, compareKey, formatPart, visibleOptions, type PartAnswer } from '../src/domain/answers';
import { makeT } from '../src/content/strings';
import { findQuestion, type CourseContent, type Part } from '../src/content/types';

const content = JSON.parse(readFileSync('content/course-content.json', 'utf8')) as CourseContent;
const t = makeT(content.ui);
const part = (q: string, p = 'a') => findQuestion(content, q)!.question.parts.find((x) => x.id === p)! as Part;
const ans = (value: PartAnswer['value']): PartAnswer => ({ value, dontKnow: false });
const check = (p: Part, a?: PartAnswer) => checkPart(p, a, t);
const dontKnow: PartAnswer = { value: null, dontKnow: true };

describe('every part type accepts "Chưa biết"', () => {
  const all = content.levels.flatMap((l) => l.form.questions.flatMap((q) => q.parts));
  it.each(all.map((p) => [p.type, p] as const))('%s', (_type, p) => {
    expect(check(p, dontKnow).complete).toBe(true);
    expect(check(p, undefined).complete).toBe(false);
  });
});

describe('text', () => {
  const p = part('L1F1');
  it('needs some text', () => {
    expect(check(p, ans('')).complete).toBe(false);
    expect(check(p, ans('   ')).complete).toBe(false);
    expect(check(p, ans('Trò chơi')).complete).toBe(true);
  });
  it('treats maxLength as soft', () => {
    expect(check(p, ans('x'.repeat(1000))).complete).toBe(true);
  });
});

describe('single_choice', () => {
  const p = part('L1F3');
  it('needs one option', () => {
    expect(check(p, ans({ optionId: 'a' })).complete).toBe(true);
    expect(check(p, ans({ optionId: 'zzz' })).complete).toBe(false);
  });
  it('"Khác" needs its text', () => {
    expect(check(p, ans({ optionId: 'other' })).complete).toBe(false);
    expect(check(p, ans({ optionId: 'other' })).message).toBe(t('writeOther'));
    expect(check(p, ans({ optionId: 'other', text: 'Vui hơn' })).complete).toBe(true);
    expect(formatPart(p, ans({ optionId: 'other', text: 'Vui hơn' }), content, t)).toBe('Khác: Vui hơn');
  });
});

describe('multi_choice', () => {
  it('enforces min and max with a clear message (L6F3a, max 2)', () => {
    const p = part('L6F3');
    expect(check(p, ans({ optionIds: [] })).complete).toBe(false);
    expect(check(p, ans({ optionIds: ['a'] })).complete).toBe(true);
    expect(check(p, ans({ optionIds: ['a', 'b'] })).complete).toBe(true);
    const over = check(p, ans({ optionIds: ['a', 'b', 'c'] }));
    expect(over.complete).toBe(false);
    expect(over.message).toBe('Chọn nhiều nhất 2');
  });
  it('counts options the child added (L7F1 allowAddOwn)', () => {
    const p = part('L7F1');
    expect(check(p, ans({ optionIds: [], own: ['Làm bánh'] })).complete).toBe(true);
    expect(check(p, ans({ optionIds: [], own: ['  '] })).complete).toBe(false);
    expect(formatPart(p, ans({ optionIds: ['a'], own: ['Làm bánh'] }), content, t)).toBe('Vẽ thẻ, bàn cờ; Làm bánh');
  });
  it('"Khác" in a multi choice needs its text (L4F3)', () => {
    const p = part('L4F3');
    expect(check(p, ans({ optionIds: ['other'] })).complete).toBe(false);
    expect(check(p, ans({ optionIds: ['other'], texts: { other: 'x' } })).complete).toBe(true);
  });
});

describe('number', () => {
  it('needs an integer in range', () => {
    const p = part('L4F2');
    expect(check(p, ans(15)).complete).toBe(true);
    expect(check(p, ans(-1)).complete).toBe(false);
    expect(check(p, ans(1.5)).complete).toBe(false);
    expect(check(p, ans(200000)).message).toMatch(/0 đến 100000/);
    expect(formatPart(p, ans(15), content, t)).toBe('15 nghìn');
  });
  it('allows negatives only where min is negative (L5F2)', () => {
    expect(check(part('L5F2'), ans(-3)).complete).toBe(true);
    expect(check(part('L5F1'), ans(-3)).complete).toBe(false);
  });
});

describe('pick_n', () => {
  const p = part('L3F2');
  it('needs exactly n', () => {
    expect(check(p, ans({ optionIds: ['a'] })).complete).toBe(false);
    expect(check(p, ans({ optionIds: ['a', 'c'] })).complete).toBe(true);
    expect(check(p, ans({ optionIds: ['a', 'c', 'e'] })).message).toBe('Chọn đúng 2 câu');
  });
  it('lets the child keep a leading question', () => {
    expect(check(p, ans({ optionIds: ['a', 'b'] })).complete).toBe(true);
  });
});

describe('sdg_picker', () => {
  const p = part('L1F4');
  it('needs one of the 17 goals', () => {
    expect(check(p, ans(3)).complete).toBe(true);
    expect(check(p, ans(18)).complete).toBe(false);
    expect(formatPart(p, ans(3), content, t)).toBe('3. Sức khỏe và có cuộc sống tốt');
  });
});

describe('item_list', () => {
  const p = part('L6F2');
  it('needs at least one named row; price is optional', () => {
    expect(check(p, ans({ groups: {} })).complete).toBe(false);
    expect(check(p, ans({ groups: { materials: [{ name: '' }] } })).complete).toBe(false);
    expect(check(p, ans({ groups: { materials: [{ name: 'Bìa' }] } })).complete).toBe(true);
    expect(check(p, ans({ groups: { materials: [{ name: 'Bìa', price: 20 }] } })).complete).toBe(true);
  });
  it('enforces maxItemsPerGroup', () => {
    const rows = Array.from({ length: 11 }, (_, i) => ({ name: `x${i}` }));
    expect(check(p, ans({ groups: { materials: rows } })).complete).toBe(false);
  });
  it('formats groups and prices', () => {
    expect(formatPart(p, ans({ groups: { materials: [{ name: 'Bìa', price: 20 }], owned: [{ name: 'Kéo' }] } }), content, t)).toBe(
      'Đồ dùng hết: Bìa – 20 nghìn | Nhà con có sẵn, cho đội mượn: Kéo',
    );
  });
});

describe('sum_split (acceptance test 4)', () => {
  const p = part('L6F4');
  it('blocks until the total is exact', () => {
    expect(check(p, ans({ values: { reinvest: 60, good: 30 } }))).toEqual({ complete: false, message: 'Cộng lại phải đúng 100' });
    expect(check(p, ans({ values: { reinvest: 60, good: 50 } })).complete).toBe(false);
    expect(check(p, ans({ values: { reinvest: 50 } })).complete).toBe(false);
    expect(check(p, ans({ values: { reinvest: 50, good: 50 } })).complete).toBe(true);
  });
});

describe('repeat (homework capture)', () => {
  const p = content.homework.capture!.H2[0];
  it('needs the minimum number of rows', () => {
    expect(check(p, ans({ rows: [] })).complete).toBe(false);
    expect(check(p, ans({ rows: [{ laughed: true }] })).complete).toBe(true);
    expect(formatPart(p, ans({ rows: [{ laughed: true, confused: 'luật' }] }), content, t)).toBe('1) Cười, Chỗ nào bị rối: luật');
  });
});

describe('optionsFrom (L7F2 lists what was ticked in L7F1)', () => {
  const p = part('L7F2') as Extract<Part, { type: 'single_choice' }>;
  it('shows all options when L7F1 is unanswered', () => {
    expect(visibleOptions(p, () => undefined)).toHaveLength(p.options.length);
  });
  it('shows ticked and added tasks, then "Khác"', () => {
    const opts = visibleOptions(p, () => ans({ optionIds: ['b', 'e'], own: ['Làm bánh'] }));
    expect(opts.map((o) => o.text)).toEqual(['Cắt, dán', 'Quảng cáo', 'Làm bánh', 'Khác']);
    expect(check(p, ans({ optionId: 'own:0', text: 'Làm bánh' })).complete).toBe(true);
  });
});

describe('compare keys', () => {
  it('flags choices and numbers, never free text', () => {
    expect(compareKey(part('L4F1'), ans({ optionId: 'a' }))).toBe('a');
    expect(compareKey(part('L4F2'), ans(15))).toBe('15');
    expect(compareKey(part('L1F1'), ans('x'))).toBeNull();
    expect(compareKey(part('L4F1'), dontKnow)).toBe('∅');
  });
});
