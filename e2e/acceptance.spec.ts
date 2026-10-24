// The client's acceptance tests (RFP section 12), automated where a browser can check them.
// Tests share one database and run in order. Numbers refer to the RFP list.
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { dontKnowAndNext, kidPage, mentorPage, next, playToForm, waitSaved } from './helpers';

test.describe.configure({ mode: 'serial' });

const L1Q1_CORRECT = 'Sóc tết vòng rồi bán cho các bạn trong trường.';
let firstOrder: string[] = [];

const optionTexts = (page: Page) => page.locator('.option-list .option span:last-child').allTextContents();

async function setLevel(page: Page, order: number, kid: string, value: 'unlocked' | 'locked' | 'auto') {
  await page.goto('/mentor/levels');
  const card = page.locator('.m-card', { hasText: `Màn ${order}:` });
  await card.getByLabel(`Mở màn ${order} cho ${kid}`).selectOption(value);
  await expect(page.locator('.m-toast')).toHaveCount(0);
}

test('1, 6: a child completes level 1 on a phone', async ({ browser }) => {
  const { ctx, page } = await kidPage(browser, 'An');
  await expect(page.getByText('Hôm nay: Màn 1')).toBeVisible();
  await page.locator('.map-node', { hasText: 'Màn 1:' }).click();
  await page.getByRole('button', { name: 'Bắt đầu' }).click();
  await expect(page.getByText('Bố mẹ đọc thẻ cho con nghe nhé')).toBeVisible();
  for (let i = 0; i < 4; i++) {
    await expect(page.getByText(`Thẻ ${i + 1}/4`).first()).toBeVisible();
    await next(page);
  }
  // Q1: answer wrongly on purpose and see the explanation.
  firstOrder = await optionTexts(page);
  await page.locator('.option', { hasNotText: L1Q1_CORRECT }).first().click();
  await expect(page.getByText('Chưa đúng. Xem này:')).toBeVisible();
  await expect(page.locator('.option[disabled]')).toHaveCount(3); // locked after the first tap
  await next(page);
  for (let i = 1; i < 4; i++) {
    await page.locator('.option').first().click();
    await next(page);
  }
  await expect(page.getByText('Xong câu đố!')).toBeVisible();
  await next(page);
  await page.getByRole('button', { name: 'Bắt đầu' }).click();

  // L1F1 text
  await expect(page.getByRole('button', { name: 'Tiếp', exact: true })).toBeDisabled();
  await page.locator('textarea').fill('Trò Magic: tung xúc xắc, ai về đích trước thì thắng. Phiên bản 1.');
  await next(page);
  // L1F2 "Chưa biết" on a text question (6)
  await page.locator('.option.dont-know').click();
  await next(page);
  // L1F3 "Khác" reveals a text field
  await page.getByRole('radio', { name: 'Khác' }).click();
  await expect(page.getByRole('button', { name: 'Tiếp', exact: true })).toBeDisabled();
  await page.getByPlaceholder('Ghi thêm một chút nhé.').fill('Vui hơn');
  await next(page);
  // L1F4 SDG + why
  await page.locator('.sdg-tile').nth(2).click();
  await expect(page.getByText('Ai cũng khỏe mạnh và vui vẻ.')).toBeVisible();
  await page.locator('textarea').fill('Chơi cùng nhau thì vui');
  await next(page);

  await expect(page.getByRole('heading', { name: 'Xem lại phiếu' })).toBeVisible();
  await expect(page.getByText('Chưa biết')).toBeVisible();
  await page.getByRole('button', { name: 'Nộp phiếu' }).click();
  await expect(page.getByText('Xong Màn 1! Hẹn mai nhé.')).toBeVisible();
  await expect(page.getByText('Nhớ Bài về nhà nhé')).toBeVisible();
  await waitSaved(page);
  await page.locator('.btn', { hasText: 'Về bản đồ' }).click();
  await expect(page.getByText('Lần sau: Màn 2')).toBeVisible(); // finished a level today
  await expect(page.locator('.map-node', { hasText: 'Màn 3:' })).toContainText('Xong Màn 2 thì mở');
  await expect(page.locator('.map-node', { hasText: 'Màn 1:' })).toContainText('Chơi lại');
  await ctx.close();
});

test('2: stop mid-quiz on the phone, continue on a laptop', async ({ browser }) => {
  const phone = await kidPage(browser, 'Bình');
  await phone.page.locator('.map-node', { hasText: 'Màn 1:' }).click();
  await phone.page.getByRole('button', { name: 'Bắt đầu' }).click();
  for (let i = 0; i < 4; i++) await next(phone.page);
  await phone.page.locator('.option').first().click();
  await next(phone.page);
  const prompt = await phone.page.locator('h1.prompt').textContent();
  await waitSaved(phone.page);
  await phone.ctx.close();

  const laptop = await kidPage(browser, 'Bình', 'laptop');
  await expect(laptop.page.locator('.map-node', { hasText: 'Màn 1:' })).toContainText('Chơi tiếp');
  await laptop.page.locator('.map-node', { hasText: 'Màn 1:' }).click();
  await expect(laptop.page.locator('h1.prompt')).toHaveText(prompt!);
  await expect(laptop.page.getByText('Câu 2/4').first()).toBeVisible();
  await laptop.ctx.close();
});

test('3, 7: replay keeps the first attempt and shuffles again; an edit is kept as a version', async ({ browser }) => {
  const { ctx, page } = await kidPage(browser, 'An');
  await page.locator('.map-node', { hasText: 'Màn 1:' }).click();
  await page.getByRole('button', { name: 'Chơi lại' }).click();
  for (let i = 0; i < 4; i++) await next(page);
  const replayOrder = await optionTexts(page);
  expect(replayOrder.sort()).toEqual([...firstOrder].sort());
  expect(replayOrder.join('|')).not.toEqual(firstOrder.join('|'));
  await page.locator('.option', { hasText: L1Q1_CORRECT }).click();
  await next(page);
  for (let i = 1; i < 4; i++) {
    await page.locator('.option').first().click();
    await next(page);
  }
  await next(page); // quiz end
  await page.getByRole('button', { name: 'Bắt đầu' }).click();
  // The child's own answers are back; change the first one.
  await expect(page.locator('textarea')).toHaveValue(/Phiên bản 1/);
  await page.locator('textarea').fill('Trò Magic: phiên bản 2, ai gom đủ 3 thẻ phép thuật thì thắng.');
  for (let i = 0; i < 4; i++) await next(page);
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
  await expect(m.page.locator('tr', { hasText: 'L1F1' })).toContainText('phiên bản 2');
  await m.ctx.close();
});

test('5: a leading question gets gentle feedback once', async ({ browser }) => {
  const m = await mentorPage(browser);
  await setLevel(m.page, 3, 'Chi', 'unlocked');
  await m.ctx.close();

  const { ctx, page } = await kidPage(browser, 'Chi');
  await playToForm(page, 3);
  await dontKnowAndNext(page); // L3F1
  await page.getByRole('checkbox', { name: /Trò của tụi mình hay đúng không/ }).click();
  await expect(page.getByText(/gợi ý sẵn câu trả lời/)).toBeVisible();
  await page.getByRole('checkbox', { name: /Trò của tụi mình hay đúng không/ }).click();
  await page.getByRole('checkbox', { name: /Giờ ra chơi bạn thích làm gì/ }).click();
  await expect(page.getByText(/gợi ý sẵn câu trả lời/)).toHaveCount(0);
  await page.getByRole('checkbox', { name: /Bạn đã chơi board game nào chưa/ }).click();
  await expect(page.getByRole('button', { name: 'Tiếp', exact: true })).toBeEnabled();
  await next(page);
  await ctx.close();
});

test('4, 6: L6F4 must add up to 100; "Chưa biết" on a number question', async ({ browser }) => {
  const m = await mentorPage(browser);
  await setLevel(m.page, 6, 'Chi', 'unlocked');
  await m.ctx.close();

  const { ctx, page } = await kidPage(browser, 'Chi');
  await playToForm(page, 6);
  await expect(page.locator('.num-input').first()).toBeVisible(); // L6F1 has a number part
  await dontKnowAndNext(page); // L6F1 number + text
  await dontKnowAndNext(page); // L6F2
  await dontKnowAndNext(page); // L6F3
  const keep = page.getByLabel('Giữ lại để làm tiếp');
  const good = page.getByLabel('Cho trường hoặc việc tốt');
  await keep.fill('60');
  await good.fill('30');
  await expect(page.getByText('Cộng lại phải đúng 100')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tiếp', exact: true })).toBeDisabled();
  await keep.fill('50');
  await good.fill('50');
  await expect(page.getByRole('button', { name: 'Tiếp', exact: true })).toBeEnabled();
  await next(page);
  await expect(page.getByRole('heading', { name: 'Xem lại phiếu' })).toBeVisible();
  await waitSaved(page);
  await ctx.close();
});

test('13: answers given offline are saved when the network returns', async ({ browser }) => {
  const { ctx, page } = await kidPage(browser, 'Dũng');
  await playToForm(page, 1);
  await ctx.setOffline(true);
  await page.locator('textarea').fill('Viết lúc mất mạng, câu một');
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
  await card.locator('tr', { hasText: 'Dũng' }).getByLabel('Khoá phiếu').click(); // the box follows the server, so no .check()
  await expect(card.locator('tr', { hasText: 'Dũng' }).getByLabel('Khoá phiếu')).toBeChecked();
  await m.ctx.close();

  const { ctx, page } = await kidPage(browser, 'Dũng');
  await playToForm(page, 2);
  await expect(page.getByText('Phiếu này đã khoá').first()).toBeVisible();
  await expect(page.locator('.option.dont-know').first()).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Tiếp', exact: true })).toBeEnabled();
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
  await expect(node).toContainText('Xong Màn 7 thì mở');
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
