import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkPart, checkQuestion, compareKey, formatPart, itemListTotal, pickedTexts, visibleOptions, withColon, type ItemListValue, type PartAnswer } from '../src/domain/answers';
import { inThousands } from '../src/player/parts/ThousandCheck';
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
  const p = part('L7F2'); // part a: tasks plus "Khác"

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

describe('sdg_picker (kept as a Could; not used by content .10)', () => {
  const p: Part = { id: 'a', type: 'sdg_picker' };
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

describe('content 2026-10-25.3 fields', () => {
  it('L6F4: the debt line is optional and counts as 0', () => {
    const p = part('L6F4');
    expect(check(p, ans({ values: { reinvest: 50, good: 50 } })).complete).toBe(true);
    expect(check(p, ans({ values: { debt: 20, reinvest: 30, good: 50 } })).complete).toBe(true);
    expect(check(p, ans({ values: { debt: 20, reinvest: 50, good: 50 } })).message).toBe('Cộng lại phải đúng 100');
    expect(check(p, ans({ values: { debt: 20, reinvest: 80 } })).complete).toBe(false); // good is not optional
    expect(formatPart(p, ans({ values: { reinvest: 50, good: 50 } }), content, t)).not.toMatch(/Trả nợ/);
  });
  it('L6F2: the start-up total skips the "already at home" group', () => {
    const p = part('L6F2') as Extract<Part, { type: 'item_list' }>;
    const v: ItemListValue = { groups: { equipment: [{ name: 'Kéo', price: 25 }], materials: [{ name: 'Bìa', price: 20 }, { name: '', price: 99 }], owned: [{ name: 'Bút', price: 5 }] } };
    expect(itemListTotal(p, v)).toBe(45);
  });
});

describe('labels and units', () => {
  it('adds a colon unless the label is a question', () => {
    expect(withColon('Chọn một hình')).toBe('Chọn một hình:');
    expect(withColon('Vì sao?')).toBe('Vì sao?');
  });
  it('knows which fields are in thousands of đồng', () => {
    expect(inThousands('nghìn')).toBe(true);
    expect(inThousands('Giá (nghìn đồng)')).toBe(true);
    expect(inThousands('bộ hoặc vé')).toBe(false);
    expect(inThousands(undefined)).toBe(false);
  });
});

describe('question rules (Appendix B, RFP v1.1)', () => {
  const q = (id: string) => findQuestion(content, id)!.question;
  const run = (id: string, a: Record<string, PartAnswer>) => checkQuestion(q(id), (p) => a[p], t);

  it('a text-only question cannot be passed empty (L1F2)', () => {
    expect(run('L1F2', {})).toMatchObject({ complete: false, textOnlyEmpty: true });
    expect(run('L1F2', { a: ans('Hôm thứ Hai…') }).complete).toBe(true);
    expect(run('L1F2', { a: dontKnow }).complete).toBe(true);
  });
  it('L1F1: a players choice with the required text empty asks for the text (test 16)', () => {
    expect(run('L1F1', { b: ans({ optionId: 'b' }) })).toMatchObject({ complete: false, blocking: ['a'] });
    expect(run('L1F1', { a: ans('Ai về đích trước thì thắng'), b: ans({ optionId: 'b' }) }).complete).toBe(true);
    // "Chưa biết" on the question covers the required part too
    expect(run('L1F1', { a: dontKnow, b: ans({ optionId: 'b' }) }).complete).toBe(true);
  });
  it('choice and number parts block unless optional; L5F3 amount is optional (test 18)', () => {
    expect(run('L5F3', {}).blocking).toEqual(['a']);
    expect(run('L5F3', { a: ans({ optionIds: ['a'] }) }).complete).toBe(true);
  });
  it('L6F4: sum must be 100, then an empty "Vì sao…" gets one nudge (test 4)', () => {
    expect(run('L6F4', { a: ans({ values: { reinvest: 60, good: 30 } }) }).complete).toBe(false);
    const ok = run('L6F4', { a: ans({ values: { reinvest: 50, good: 50 } }) });
    expect(ok.complete).toBe(true);
    expect(ok.nudge).toEqual(['b']);
    expect(run('L6F4', { a: ans({ values: { reinvest: 50, good: 50 } }), b: ans('Vì trường mình cần sách') }).nudge).toEqual([]);
  });
  it('an optional text without "Vì sao" in a mixed question neither blocks nor nudges (L2F1)', () => {
    const first = (q('L2F1').parts[0] as Extract<Part, { type: 'single_choice' }>).options[0].id;
    expect(run('L2F1', { a: ans({ optionId: first }) })).toMatchObject({ complete: true, nudge: [] });
  });
  it('L3F3: the list and the "hơn ở chỗ nào" choice are both needed (test 17)', () => {
    const list = ans({ groups: { alt: [{ name: 'Cờ vua', good: 'vui', bad: 'lâu' }, { name: 'Bóng đá', good: 'khoẻ' }] } });
    expect(run('L3F3', { list }).blocking).toEqual(['edge']);
    expect(run('L3F3', { list, edge: ans({ optionIds: ['b'] }) }).complete).toBe(true);
    const p = q('L3F3').parts[0];
    expect(formatPart(p, list, content, t)).toBe('Thứ các bạn có thể chơi thay: 1) Cờ vua (Hay ở chỗ… vui; Chưa hay ở chỗ… lâu) 2) Bóng đá (Hay ở chỗ… khoẻ)');
  });
});

describe('L1F3 became a multi choice in content 2026-10-25.11', () => {
  const p = part('L1F3');
  it('allows 1 to 3 picks', () => {
    expect(check(p, ans({ optionIds: [] })).complete).toBe(false);
    expect(check(p, ans({ optionIds: ['a', 'c', 'h'] })).complete).toBe(true);
    expect(check(p, ans({ optionIds: ['a', 'b', 'c', 'd'] })).message).toBe('Chọn nhiều nhất 3');
  });
  it('still reads an answer saved in the old single-choice shape', () => {
    const old = ans({ optionId: 'other', text: 'Vui hơn' });
    expect(check(p, old).complete).toBe(true);
    expect(formatPart(p, old, content, t)).toBe('Khác: Vui hơn');
    expect(compareKey(p, old)).toBe('other');
  });
  it('L1F4 context lists every pick, and nothing when nothing is picked', () => {
    expect(pickedTexts(p, ans({ optionIds: ['a', 'other'], texts: { other: 'Vui hơn' } }), content, t).join(' · ')).toBe('Có thêm bạn mới · Khác: Vui hơn');
    expect(pickedTexts(p, ans({ optionIds: [] }), content, t)).toEqual([]);
    expect(pickedTexts(p, dontKnow, content, t)).toEqual([]);
  });
});
