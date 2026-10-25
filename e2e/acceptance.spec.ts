// The client's acceptance tests (RFP v1.1 section 12, content 2026-10-25.10), automated where a
// browser can check them. Tests share one database and run in order. Numbers refer to the RFP list.
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { dontKnowAndNext, kidPage, mentorPage, next, playToForm, questionNo, throughToForm, waitSaved } from './helpers';

test.describe.configure({ mode: 'serial' });

const L1Q1_CORRECT = 'Sóc tết vòng bán cho các bạn.';
let firstOrder: string[] = [];

const optionTexts = (page: Page) => page.locator('.option-list .option span:last-child').allTextContents();

async function setLevel(page: Page, order: number, kid: string, value: 'unlocked' | 'locked' | 'auto') {
  await page.goto('/mentor/levels');
  const card = page.locator('.m-card', { hasText: `Màn ${order}:` });
  await card.getByLabel(`Mở màn ${order} cho ${kid}`).selectOption(value);
  await expect(page.locator('.m-toast')).toHaveCount(0);
}

test('1, 6, 16: a child completes level 1 on a phone', async ({ browser }) => {
  const { ctx, page } = await kidPage(browser, 'An');
  await expect(page.getByText('Hôm nay mình chơi: Màn 1')).toBeVisible();
  await page.locator('.map-node', { hasText: 'Màn 1:' }).click();
  await expect(page.locator('.info-chip', { hasText: 'phút' })).toBeVisible(); // FR-P-10
  await page.locator('.bottom-actions .btn').click();
  await expect(page.getByText('Bố mẹ đọc thẻ cho con nghe nhé')).toBeVisible();
  for (let i = 0; i < 4; i++) {
    await expect(page.getByText(`Thẻ ${i + 1}/4`).first()).toBeVisible();
    await next(page);
  }
  // Q1: answer wrongly on purpose and see the explanation.
  firstOrder = await optionTexts(page);
  await page.locator('.option', { hasNotText: L1Q1_CORRECT }).first().click();
  await expect(page.locator('.feedback.bad h3')).not.toBeEmpty();
  await expect(page.locator('.option[disabled]')).toHaveCount(3); // locked after the first tap
  await next(page);
  for (let i = 1; i < 4; i++) {
    await page.locator('.option').first().click();
    await next(page);
  }
  await expect(page.getByText('Xong câu đố! Thu kẹo nào!')).toBeVisible();
  await expect(page.locator('.candies svg')).toHaveCount(4); // FR-P-19: one candy or wrapper per question
  await expect(page.getByText('Giờ con kể về từ điển pháp thuật của đội nhé: 4 câu.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Kể về từ điển pháp thuật' }).click(); // ui.toForm
  await expect(page.getByText('Từ điển pháp thuật 1/4').first()).toBeVisible();

  // L1F2: a question of only text cannot be passed empty
  await next(page);
  await expect(page.getByText('Con trả lời một chút, hoặc bấm “Chưa biết” nhé.')).toBeVisible();
  await questionNo(page, 1, 4);
  await page.locator('textarea').fill('Hôm thứ Hai, con thấy bạn Minh ngồi một mình.');
  await next(page);
  // L1F3 (multi choice since .11): "Khác" reveals a text field; the message only after trying to continue
  await page.getByRole('checkbox', { name: 'Có thêm bạn mới' }).click();
  await page.getByRole('checkbox', { name: 'Khác' }).click();
  await expect(page.locator('.part-message')).toHaveCount(0);
  await next(page);
  await expect(page.locator('.part-message')).toHaveText('Ghi thêm một chút nhé.');
  await page.getByPlaceholder('Ghi thêm một chút nhé.').fill('Vui hơn');
  await next(page);
  // L1F4: every L1F3 pick is shown as context; "Chưa biết" on a text question (6)
  await expect(page.locator('.context-box')).toContainText('Ở câu trước con chọn: Có thêm bạn mới · Khác: Vui hơn');
  await page.locator('.option.dont-know').click();
  await next(page);
  // L1F1 (16): players chosen, required text empty → asked for the text
  await page.getByRole('radio', { name: '3–4 người' }).click();
  await next(page);
  await expect(page.locator('.part-message')).toHaveText('Phần này con chưa trả lời.');
  await questionNo(page, 4, 4);
  await page.locator('textarea').fill('Trò Magic: tung xúc xắc, ai về đích trước thì thắng. Phiên bản 1.');
  await next(page);

  await expect(page.getByRole('heading', { name: 'Xem lại phiếu' })).toBeVisible();
  await expect(page.getByText('Chưa biết')).toBeVisible();
  await page.locator('.bottom-actions .btn').click(); // "Nộp phiếu thôi!"
  await expect(page.getByRole('heading', { name: 'Hú hú! Xong Màn 1!' })).toBeVisible();
  // FR-P-28: play on — the next level leads, the map is the quiet way out
  await expect(page.getByText('Màn 2 đã mở. Chơi tiếp luôn, hay để mai cũng được!')).toBeVisible();
  await expect(page.locator('.bottom-actions .btn').first()).toHaveText(/Chơi tiếp: Màn 2/);
  await waitSaved(page);
  await page.getByRole('button', { name: /Chơi tiếp: Màn 2/ }).click();
  await expect(page.locator('h1.big-title')).toContainText('Màn 2');
  await expect(page.locator('.info-chip').first()).toBeVisible(); // a fresh intro, not the done screen
  await page.getByRole('button', { name: 'Về bản đồ' }).first().click();
  await expect(page.getByText('Hôm nay mình chơi: Màn 2')).toBeVisible();
  await expect(page.locator('.map-node', { hasText: 'Màn 3:' })).toContainText('Cửa này còn khóa! Con xong Màn 2 là mở nha.');
  await ctx.close();
});

test('2: stop mid-quiz on the phone, continue on a laptop', async ({ browser }) => {
  const phone = await kidPage(browser, 'Bình');
  await phone.page.locator('.map-node', { hasText: 'Màn 1:' }).click();
  await phone.page.locator('.bottom-actions .btn').click();
  for (let i = 0; i < 4; i++) await next(phone.page);
  await phone.page.locator('.option').first().click();
  await next(phone.page);
  const prompt = await phone.page.locator('h1.prompt').textContent();
  await waitSaved(phone.page);
  await phone.ctx.close();

  const laptop = await kidPage(browser, 'Bình', 'laptop');
  await expect(laptop.page.locator('.map-node', { hasText: 'Màn 1:' })).toContainText('Chơi tiếp nào!');
  await laptop.page.locator('.map-node', { hasText: 'Màn 1:' }).click();
  await expect(laptop.page.locator('h1.prompt')).toHaveText(prompt!);
  await expect(laptop.page.getByText('Câu 2/4').first()).toBeVisible();
  await laptop.ctx.close();
});

test('21: team progress — a friend’s avatar, news and the shared jar; no answers or scores; the mentor can hide it', async ({ browser }) => {
  // An finished Level 1 in test 1. The jar holds the team's first-try right answers.
  const m = await mentorPage(browser);
  await m.page.goto('/mentor/exports');
  const [json] = await Promise.all([m.page.waitForEvent('download'), m.page.getByRole('button', { name: 'JSON' }).click()]);
  const data = JSON.parse(readFileSync((await json.path())!, 'utf8')) as { attempts: { attemptNo: number; correct: boolean }[] };
  const candies = data.attempts.filter((a) => a.attemptNo === 1 && a.correct).length;

  const { ctx, page } = await kidPage(browser, 'Bình');
  const card = page.locator('.team-card');
  await expect(card).toContainText('Hũ kẹo của cả đội');
  await expect(card.locator('.jar-count')).toHaveText(`${candies} kẹo`);
  await expect(page.locator('.team-news', { hasText: 'An vừa xong Màn 1!' })).toBeVisible();
  await expect(page.locator('.map-node', { hasText: 'Màn 2:' }).locator('.friends-here')).toContainText('🦊');
  await expect(page.getByText(/Bình đang ở màn này/)).toHaveCount(0); // never the child themself
  await expect(page.getByText('Hôm thứ Hai, con thấy bạn Minh ngồi một mình.')).toHaveCount(0); // never answers
  await expect(page.getByText(/\d+\/4 câu|điểm/)).toHaveCount(0); // no per-child scores
  await ctx.close();

  // Off in the console: gone for both children.
  await m.page.goto('/mentor/settings');
  await m.page.getByLabel('Cho các con thấy cả đội đang ở đâu').click(); // follows the server
  await expect(m.page.locator('.m-toast')).toContainText('Đã ẩn tiến độ cả đội');
  for (const kid of ['Bình', 'An'] as const) {
    const k = await kidPage(browser, kid);
    await expect(k.page.locator('.map')).toBeVisible();
    await expect(k.page.locator('.team-card')).toHaveCount(0);
    await expect(k.page.locator('.friends-here')).toHaveCount(0);
    await k.ctx.close();
  }
  await m.page.getByLabel('Cho các con thấy cả đội đang ở đâu').click();
  await expect(m.page.locator('.m-toast')).toContainText('tiến độ của cả đội');
  await m.ctx.close();
});

test('3, 7: replay keeps the first attempt and shuffles again; an edit is kept as a version', async ({ browser }) => {
  const { ctx, page } = await kidPage(browser, 'An');
  await page.locator('.map-node', { hasText: 'Màn 1:' }).click();
  await page.locator('.bottom-actions .btn').click(); // "Chơi lại"
  for (let i = 0; i < 4; i++) await next(page);
  const replayOrder = await optionTexts(page);
  expect([...replayOrder].sort()).toEqual([...firstOrder].sort());
  expect(replayOrder.join('|')).not.toEqual(firstOrder.join('|'));
  await page.locator('.option', { hasText: L1Q1_CORRECT }).click();
  await next(page);
  for (let i = 1; i < 4; i++) {
    await page.locator('.option').first().click();
    await next(page);
  }
  await page.locator('.bottom-actions .btn').click(); // quiz end → "Kể về từ điển pháp thuật"
  for (let i = 0; i < 3; i++) await next(page); // the child's own answers are back
  await expect(page.locator('textarea')).toHaveValue(/Phiên bản 1/);
  await page.locator('textarea').fill('Trò Magic: phiên bản 2, ai gom đủ 3 thẻ phép thuật thì thắng.');
  await next(page);
  await expect(page.getByText('Đã nộp. Con vẫn sửa được.')).toBeVisible();
  await waitSaved(page);
  await ctx.close();

  const m = await mentorPage(browser);
  await m.page.goto('/mentor/quiz');
  const row = m.page.locator('tr', { hasText: 'L1Q1' });
  await expect(row).toContainText('✗ Sai'); // the first attempt, unchanged
  await expect(row).toContainText('2 lượt');
  await m.page.goto('/mentor/answers');
  const q = m.page.locator('.m-card', { hasText: 'Màn 1' });
  await expect(q).toContainText('phiên bản 2');
  await expect(q).toContainText('sửa 1 lần');
  await q.getByText('Xem các phiên bản').first().click();
  await expect(q.locator('.m-versions ol li')).toHaveCount(2);
  await m.page.goto('/mentor/compare');
  await expect(m.page.locator('tr', { hasText: 'L1F1' }).first()).toContainText('phiên bản 2');
  await m.ctx.close();
});

test('5, 17: a leading question gets gentle feedback once; L3F3 rows without gaps', async ({ browser }) => {
  const m = await mentorPage(browser);
  await setLevel(m.page, 3, 'Chi', 'unlocked');
  await m.ctx.close();

  const { ctx, page } = await kidPage(browser, 'Chi');
  await playToForm(page, 3);
  await dontKnowAndNext(page); // L3F1
  await page.getByRole('checkbox', { name: /Trò của tụi mình hay đúng không/ }).click();
  await expect(page.getByText(/gợi ý sẵn câu trả lời|chờ sẵn|gật đầu/).first()).toBeVisible();
  await page.getByRole('checkbox', { name: /Trò của tụi mình hay đúng không/ }).click();
  await page.getByRole('checkbox', { name: /Giờ ra chơi bạn thích làm gì/ }).click();
  await expect(page.locator('.gentle')).toHaveCount(0);
  await page.getByRole('checkbox', { name: /Bạn đã chơi board game nào chưa/ }).click();
  await next(page);
  // 17: three numbered rows show without "Thêm dòng"; fill rows 1 and 3 only
  await questionNo(page, 3, 4);
  await expect(page.locator('.card-row')).toHaveCount(3);
  await expect(page.locator('.card-row').first()).toContainText('Thứ 1');
  await page.getByLabel('Tên 1', { exact: true }).fill('Cờ vua');
  await page.getByLabel('Hay ở chỗ… 1', { exact: true }).fill('vui');
  await page.getByLabel('Chưa hay ở chỗ… 1').fill('lâu');
  await page.getByLabel('Tên 3', { exact: true }).fill('Trốn tìm');
  await page.getByLabel('Hay ở chỗ… 3', { exact: true }).fill('chạy nhảy');
  await page.getByRole('checkbox', { name: 'Chơi cùng bạn bè được' }).click();
  await next(page);
  await questionNo(page, 4, 4);
  await page.locator('textarea').first().fill('Đội mình giỏi vẽ.');
  await next(page);
  const review = page.locator('.review-item', { hasText: 'Nếu không chơi trò của đội' });
  await expect(review).toContainText('1) Cờ vua (Hay ở chỗ… vui; Chưa hay ở chỗ… lâu) 2) Trốn tìm (Hay ở chỗ… chạy nhảy)');
  await expect(review).not.toContainText('3)');
  await waitSaved(page);
  await ctx.close();
});

test('FR-P-26/27: the one optional playtest; answer boxes only for the questions picked in L3F2', async ({ browser }) => {
  // Chi picked two questions in L3F2 (test 5 above).
  const chi = await kidPage(browser, 'Chi');
  await chi.page.getByRole('button', { name: 'Chơi thử với bạn' }).click();
  await expect(chi.page.locator('.hw-item .num')).toHaveCount(0); // a single item has no number badge
  await expect(chi.page.locator('.context-box')).toContainText('Giờ ra chơi bạn thích làm gì?');
  await chi.page.getByRole('button', { name: /Ghi kết quả/ }).click();
  await expect(chi.page.getByLabel(/Trả lời câu hỏi 1: .*Giờ ra chơi bạn thích làm gì/)).toBeVisible();
  await expect(chi.page.getByLabel(/Trả lời câu hỏi 2: .*board game/)).toBeVisible();
  await expect(chi.page.getByRole('checkbox', { name: 'Cười' })).toBeVisible();
  await chi.ctx.close();
  // Dũng has not reached Level 3: ticks show, answer boxes do not.
  const dung = await kidPage(browser, 'Dũng');
  await dung.page.getByRole('button', { name: 'Chơi thử với bạn' }).click();
  await dung.page.getByRole('button', { name: /Ghi kết quả/ }).click();
  await expect(dung.page.getByRole('checkbox', { name: 'Cười' })).toBeVisible();
  await expect(dung.page.getByLabel(/Trả lời câu hỏi/)).toHaveCount(0);
  await dung.ctx.close();
});

test('4, 6, 18: L6F4 adds up to 100 and nudges "Vì sao" once; L5F3 amount is optional', async ({ browser }) => {
  const m = await mentorPage(browser);
  await setLevel(m.page, 5, 'Chi', 'unlocked');
  await setLevel(m.page, 6, 'Chi', 'unlocked');
  await m.ctx.close();

  const { ctx, page } = await kidPage(browser, 'Chi');
  // 18: tick one option, leave the amount empty, continue
  await playToForm(page, 5);
  await dontKnowAndNext(page); // L5F1
  await dontKnowAndNext(page); // L5F2
  await page.getByRole('checkbox', { name: 'In tờ quảng cáo' }).click();
  await next(page);
  await expect(page.getByRole('heading', { name: 'Xem lại phiếu' })).toBeVisible();
  await waitSaved(page);
  await page.goto('/play/home');

  await playToForm(page, 6);
  await expect(page.locator('.num-input').first()).toBeVisible(); // L6F1 has a number part
  await dontKnowAndNext(page); // L6F1 number + text (6)
  await dontKnowAndNext(page); // L6F2
  await dontKnowAndNext(page); // L6F3
  const keep = page.getByLabel('Giữ lại để làm tiếp');
  const good = page.getByLabel('Cho trường hoặc việc tốt');
  await keep.fill('60');
  await good.fill('30');
  await next(page);
  await expect(page.getByText('Cộng lại phải đúng 100')).toBeVisible();
  await questionNo(page, 4, 4);
  await keep.fill('50');
  await good.fill('50');
  await next(page);
  await expect(page.getByText('Con nói thêm vì sao không?')).toBeVisible(); // one gentle nudge
  await questionNo(page, 4, 4);
  await next(page); // second tap goes through
  await expect(page.getByRole('heading', { name: 'Xem lại phiếu' })).toBeVisible();
  await waitSaved(page);
  await ctx.close();
});

test('19: L7F2 lists only the tasks ticked in L7F1; "how often" keeps its options', async ({ browser }) => {
  const m = await mentorPage(browser);
  await setLevel(m.page, 7, 'Chi', 'unlocked');
  await m.ctx.close();
  const { ctx, page } = await kidPage(browser, 'Chi');
  await playToForm(page, 7);
  await page.getByRole('checkbox', { name: 'Cắt, dán' }).click();
  await page.getByRole('checkbox', { name: 'Quảng cáo' }).click();
  await next(page);
  await questionNo(page, 2, 4);
  await expect(page.getByRole('radio', { name: 'Cắt, dán' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Quảng cáo' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Vẽ thẻ, bàn cờ' })).toHaveCount(0);
  for (const o of ['Mỗi ngày', 'Mỗi tuần', 'Mỗi tháng', 'Chỉ một lần']) await expect(page.getByRole('radio', { name: o })).toBeVisible();
  await ctx.close();
});

test('20: the mascot pop-up respects reduced motion and never blocks a tap', async ({ browser }) => {
  // Reduced motion: no pop-up, explanation at once.
  const reduced = await browser.newContext({ reducedMotion: 'reduce' });
  const rp = await reduced.newPage();
  await rp.goto('/');
  await rp.locator('.profile-tile', { hasText: 'Dũng' }).click();
  for (const d of '4444') await rp.getByRole('button', { name: d, exact: true }).click();
  await rp.locator('.map-node', { hasText: 'Màn 1:' }).click();
  await rp.locator('.bottom-actions .btn').click();
  for (let i = 0; i < 4; i++) await next(rp);
  await rp.locator('.option').first().click();
  await expect(rp.locator('.feedback')).toBeVisible();
  await expect(rp.locator('.mascot-pop')).toHaveCount(0);
  await waitSaved(rp);
  await reduced.close();

  // Normal motion: the pop-up appears, finishes within 2 s, and "Tiếp" works while it plays.
  const { ctx, page } = await kidPage(browser, 'Dũng');
  await page.locator('.map-node', { hasText: 'Màn 1:' }).click();
  await next(page); // resumes on the answered Q1
  await page.locator('.option').first().click();
  await expect(page.locator('.mascot-pop')).toBeVisible();
  const prompt = await page.locator('h1.prompt').textContent();
  await next(page); // tapped during the pop-up
  await expect(page.locator('h1.prompt')).not.toHaveText(prompt!);
  await page.locator('.option').first().click();
  await expect(page.locator('.mascot-pop')).toBeVisible();
  await expect(page.locator('.mascot-pop')).toHaveCount(0, { timeout: 2500 });
  await expect(page.locator('.feedback p')).toBeVisible();
  await ctx.close();
});

test('13: answers given offline are saved when the network returns', async ({ browser }) => {
  const { ctx, page } = await kidPage(browser, 'Dũng');
  await page.locator('.map-node', { hasText: 'Màn 1:' }).click();
  await throughToForm(page);
  await ctx.setOffline(true);
  await page.locator('textarea').fill('Viết lúc mất mạng, câu một');
  await next(page);
  await page.getByRole('checkbox', { name: 'Có thêm bạn mới' }).click();
  await next(page);
  await page.locator('textarea').fill('Viết lúc mất mạng, câu hai');
  await next(page);
  await expect(page.locator('.save-pill')).toHaveText(/Chưa lưu được/, { timeout: 20_000 });
  await ctx.setOffline(false);
  await waitSaved(page);
  await ctx.close();

  const m = await mentorPage(browser);
  await m.page.goto('/mentor/answers');
  await m.page.getByRole('button', { name: /Dũng/ }).click();
  await expect(m.page.getByText('Viết lúc mất mạng, câu một')).toBeVisible();
  await expect(m.page.getByText('Viết lúc mất mạng, câu hai')).toBeVisible();
  await m.ctx.close();
});

test('12: a locked form can be read but not edited', async ({ browser }) => {
  const m = await mentorPage(browser);
  await setLevel(m.page, 2, 'Dũng', 'unlocked');
  const card = m.page.locator('.m-card', { hasText: 'Màn 2:' });
  await card.locator('tr', { hasText: 'Dũng' }).getByLabel('Khoá phiếu').click(); // the box follows the server
  await expect(card.locator('tr', { hasText: 'Dũng' }).getByLabel('Khoá phiếu')).toBeChecked();
  await m.ctx.close();

  const { ctx, page } = await kidPage(browser, 'Dũng');
  await playToForm(page, 2);
  await expect(page.getByText('Phiếu này đã khoá').first()).toBeVisible();
  await expect(page.locator('.option.dont-know').first()).toBeDisabled();
  await next(page);
  await questionNo(page, 2, 4); // read-only: Tiếp goes on
  await ctx.close();
});

test('8: different answers on L4F1 are flagged for the Zoom vote', async ({ browser }) => {
  const m = await mentorPage(browser);
  await m.page.goto('/mentor/levels');
  await m.page.locator('.m-card', { hasText: 'Màn 4:' }).getByRole('button', { name: 'Mở', exact: true }).click();
  await expect(m.page.locator('.m-card', { hasText: 'Màn 4:' }).locator('tr', { hasText: 'An' }).locator('select')).toHaveValue('unlocked');

  for (const [kid, choice] of [['An', 'Bộ trò chơi để mang về'], ['Bình', 'Vé chơi tại chỗ']] as const) {
    const { ctx, page } = await kidPage(browser, kid);
    await playToForm(page, 4);
    await page.getByRole('radio', { name: choice }).click();
    await page.locator('textarea').fill('Vì các bạn thích');
    await next(page);
    await waitSaved(page);
    await ctx.close();
  }

  await m.page.goto('/mentor/compare');
  await expect(m.page.locator('tr', { hasText: 'L4F1' }).first()).toContainText('Khác nhau');
  await m.page.getByRole('button', { name: /Chỉ câu khác nhau/ }).click();
  await expect(m.page.locator('tr', { hasText: 'L4F1' }).first()).toBeVisible();
  await m.page.goto('/mentor/zoom');
  await expect(m.page.getByText('Đội bán gì? Vì sao?')).toBeVisible();
  // FR-M-16: the submission view groups answers by template section
  await m.page.goto('/mentor/submission');
  await expect(m.page.getByRole('heading', { name: '3. Your idea' })).toBeVisible();
  await expect(m.page.locator('section', { hasText: '3. Your idea' })).toContainText('Bộ trò chơi để mang về');
  await m.ctx.close();
});

test('9, 10: exports — PDF per child, CSV and JSON without PINs', async ({ browser }) => {
  const m = await mentorPage(browser);
  await m.page.goto('/mentor/exports');

  const [json] = await Promise.all([m.page.waitForEvent('download'), m.page.getByRole('button', { name: 'JSON' }).click()]);
  const data = JSON.parse(readFileSync((await json.path())!, 'utf8'));
  expect(JSON.stringify(data)).not.toMatch(/pin/i);
  expect(data.answers.length).toBeGreaterThan(5);
  expect(data.attempts.length).toBeGreaterThan(5);

  const csvs: string[] = [];
  m.page.on('download', (d) => csvs.push(d.suggestedFilename()));
  await m.page.getByRole('button', { name: /CSV/ }).click();
  await expect.poll(() => csvs.length).toBe(5);

  const [pdf] = await Promise.all([m.page.waitForEvent('download'), m.page.getByRole('button', { name: /An/ }).click()]);
  const bytes = readFileSync((await pdf.path())!);
  expect(bytes.subarray(0, 4).toString()).toBe('%PDF');
  writeFileSync(join(tmpdir(), 'tvt-an.pdf'), bytes);
  await m.ctx.close();
});

test('11: content upload is validated; a new level 8 appears locked', async ({ browser }) => {
  const content = JSON.parse(readFileSync('content/course-content.json', 'utf8'));
  const bad = structuredClone(content);
  bad.levels[4].quiz[2].options.forEach((o: { correct: boolean }) => (o.correct = true));
  const badPath = join(tmpdir(), 'tvt-bad.json');
  writeFileSync(badPath, JSON.stringify(bad));

  const good = structuredClone(content);
  const l8 = JSON.parse(JSON.stringify(good.levels[6]).replace(/L7/g, 'L8').replace(/Màn 7/g, 'Màn 8'));
  l8.order = 8;
  l8.name = 'Ra mắt';
  good.levels.push(l8);
  good.contentVersion = '2026-11-03';
  const goodPath = join(tmpdir(), 'tvt-l8.json');
  writeFileSync(goodPath, JSON.stringify(good));

  const m = await mentorPage(browser);
  await m.page.goto('/mentor/content');
  await m.page.locator('input[type=file]').setInputFiles(badPath);
  await expect(m.page.getByText('File chưa được lưu')).toBeVisible();
  await expect(m.page.locator('td', { hasText: 'L5Q3' }).first()).toBeVisible();
  await m.page.locator('input[type=file]').setInputFiles(goodPath);
  await expect(m.page.getByText('màn mới: L8')).toBeVisible();
  await m.page.getByRole('button', { name: 'Lưu và dùng ngay' }).click();
  await expect(m.page.getByText('Đang dùng: 2026-11-03')).toBeVisible();
  await m.ctx.close();

  const { ctx, page } = await kidPage(browser, 'Chi');
  const node = page.locator('.map-node', { hasText: 'Màn 8:' });
  await expect(node).toBeVisible();
  await expect(node).toBeDisabled();
  await expect(node).toContainText('Cửa này còn khóa! Con xong Màn 7 là mở nha.');
  await ctx.close();
});

test('15: deleting a profile offers an export first and removes the data', async ({ browser }) => {
  const m = await mentorPage(browser);
  await m.page.goto('/mentor/profiles');
  await m.page.getByLabel('Tên gọi').fill('Tạm');
  await m.page.getByLabel('Mã 4 số').fill('9999');
  await m.page.getByRole('button', { name: 'Thêm', exact: true }).click();
  const row = m.page.locator('.m-card', { hasText: 'Tạm' }).first();
  await row.getByRole('button', { name: 'Xoá…' }).click();
  const dialog = m.page.locator('dialog[open]');
  await expect(dialog.getByRole('button', { name: '3. Xoá hẳn' })).toBeDisabled();
  await Promise.all([m.page.waitForEvent('download'), dialog.getByRole('button', { name: /Tải bản sao/ }).click()]);
  await dialog.getByRole('textbox').fill('Tạm');
  await dialog.getByRole('button', { name: '3. Xoá hẳn' }).click();
  await expect(m.page.locator('.m-card', { hasText: 'Tạm' })).toHaveCount(0);
  await m.ctx.close();

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.locator('.profile-tile')).toHaveCount(4);
  await ctx.close();
});

test('FR-M-15: a trial-run reset clears answers and old devices cannot re-upload them', async ({ browser }) => {
  // A device with a write queued offline before the reset…
  const { ctx, page } = await kidPage(browser, 'Bình');
  await page.locator('.map-node', { hasText: 'Màn 1:' }).click();
  // Walk to an open quiz question wherever the level resumes.
  const open = page.locator('.option-list .option:not([disabled])');
  await expect(page.locator('.topbar .title').first()).toContainText('Màn 1');
  for (let guard = 0; guard < 10 && !(await open.count()); guard++) {
    await page.locator('.bottom-actions .btn:not(.secondary):not([disabled])').click();
    await page.waitForTimeout(100);
  }
  await ctx.setOffline(true);
  await open.first().click();
  await expect(page.locator('.save-pill').first()).toHaveText(/Chưa lưu được/, { timeout: 20_000 });

  const m = await mentorPage(browser);
  await m.page.goto('/mentor/settings');
  await m.page.getByRole('button', { name: 'Xoá kết quả chạy thử…' }).click();
  const dialog = m.page.locator('dialog[open]');
  await expect(dialog.getByRole('button', { name: '2. Xoá kết quả' })).toBeDisabled();
  await Promise.all([m.page.waitForEvent('download'), dialog.getByRole('button', { name: /Tải bản sao/ }).click()]);
  await dialog.getByRole('button', { name: '2. Xoá kết quả' }).click();
  await expect(m.page.locator('.m-toast')).toContainText('Đã xoá kết quả chạy thử');

  // …comes back online: its old write is refused and the app reloads the fresh state.
  await ctx.setOffline(false);
  await waitSaved(page);
  await page.goto('/play/home');
  await expect(page.getByText('Hôm nay mình chơi: Màn 1')).toBeVisible();
  await ctx.close();

  await m.page.goto('/mentor/exports');
  const [json] = await Promise.all([m.page.waitForEvent('download'), m.page.getByRole('button', { name: 'JSON' }).click()]);
  const data = JSON.parse(readFileSync((await json.path())!, 'utf8'));
  expect(data.answers).toHaveLength(0);
  expect(data.attempts).toHaveLength(0);
  expect(data.profiles.length).toBe(4);
  await m.ctx.close();
});
