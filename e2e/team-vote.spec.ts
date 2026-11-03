// "Chia tiền lời & Đội mình" end to end on the real database functions: a direct link opens it once
// the child is in; one question per screen, saved as the screen changes and on reload; "Xem lại
// phiếu" and "Gửi", still editable after; a friend never sees the answers; the console tallies the
// vote and copies everything word for word.
import { expect, test, type Page } from '@playwright/test';
import { KIDS, kidPage, mentorPage, next, waitSaved } from './helpers';

const at = async (page: Page, n: number, prompt: string) => {
  await expect(page.getByText(`Câu ${n}/9`).first()).toBeVisible();
  await expect(page.locator('h1.prompt')).toHaveText(prompt);
};
const choose = (page: Page, option: string) => page.getByRole('radio', { name: option, exact: true }).click();
const reviewItem = (page: Page, n: number) => page.locator('.review-item').nth(n - 1);

test('vote and reflection: one question per screen, saved, sent, still editable, secret from friends, tallied and copied', async ({ browser }) => {
  // A direct link: no one is in yet, so the pictures first, then straight to the section's intro.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/play/team-vote');
  await page.locator('.profile-tile', { hasText: 'An' }).click();
  await page.waitForURL(/\/(pin|play)\//);
  if (page.url().includes('/pin/')) for (const d of KIDS.An) await page.getByRole('button', { name: d, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Chia tiền lời & Đội mình' })).toBeVisible();
  await expect(page).toHaveURL(/\/play\/team-vote$/);
  await expect(page.locator('.vote-who')).toContainText('An');
  await expect(page.getByText('Bố mẹ đọc câu hỏi cho con nghe. Con tự trả lời.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Bắt đầu' }).click();

  await at(page, 1, 'Khi bán trò chơi có tiền lời, đội mình chia thế nào?');
  await expect(page.getByText('Phần 1 – Chia tiền lời')).toBeVisible();
  await choose(page, 'D. Ý khác của con:');
  await page.getByRole('textbox').fill('chia đều cho cả đội');
  await next(page);
  await at(page, 2, 'Phần cho từ thiện, con muốn giúp ai?');
  await choose(page, 'B. Động vật bị bỏ rơi');
  // Back keeps what was chosen and written.
  await page.getByRole('button', { name: 'Quay lại' }).click();
  await at(page, 1, 'Khi bán trò chơi có tiền lời, đội mình chia thế nào?');
  await expect(page.getByRole('textbox')).toHaveValue('chia đều cho cả đội');
  await next(page);
  await expect(page.getByRole('radio', { name: 'B. Động vật bị bỏ rơi' })).toHaveAttribute('aria-checked', 'true');
  await next(page);
  await at(page, 3, 'Khi nào đội chia tiền lời?');
  await choose(page, 'C. Chưa biết');
  await next(page);
  await choose(page, 'Có');
  await next(page);
  await at(page, 5, 'Lúc cả đội chọn ý tưởng trò chơi, con thích nhất điều gì?');
  await expect(page.getByText('Phần 2 – Đội mình làm việc cùng nhau')).toBeVisible();
  // Typed and moved on at once: the text is saved as the screen changes.
  await page.getByRole('textbox').fill('Con thích vẽ.\nVà tô màu nữa.');
  await next(page);
  await at(page, 6, 'Có lúc nào con và các bạn không cùng ý với nhau không? Đó là chuyện gì?');
  // A reload stays on the question.
  await waitSaved(page);
  await page.reload();
  await at(page, 6, 'Có lúc nào con và các bạn không cùng ý với nhau không? Đó là chuyện gì?');
  await next(page);
  await next(page);
  await at(page, 8, 'Con học được gì khi làm việc cùng các bạn?');
  await next(page);
  await at(page, 9, 'Lần sau, con muốn đội mình làm tốt hơn điều gì?');
  await page.getByRole('button', { name: 'Xem lại phiếu' }).click();

  // The review: every answer word for word; "Gửi" with questions open says which, then sends.
  await expect(page.getByRole('heading', { name: 'Xem lại phiếu' })).toBeVisible();
  await expect(reviewItem(page, 1).locator('.a')).toHaveText('D. Ý khác của con: chia đều cho cả đội');
  await expect(reviewItem(page, 5).locator('.a')).toHaveText('Con thích vẽ.\nVà tô màu nữa.');
  await expect(reviewItem(page, 6).locator('.a')).toHaveText('(chưa trả lời)');
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Còn câu 6, 7, 8, 9 chưa có câu trả lời.');
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Đã gửi' })).toContainText('Con vẫn sửa được');
  await expect(page.getByRole('button', { name: 'Về bản đồ' }).last()).toBeVisible();
  await waitSaved(page);

  // Still editable after sending: "Sửa" opens the question, and "Xem lại phiếu" comes back.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Xem lại phiếu' })).toBeVisible();
  await page.getByRole('button', { name: 'Sửa 8' }).click();
  await at(page, 8, 'Con học được gì khi làm việc cùng các bạn?');
  await page.getByRole('textbox').fill('Con học được lắng nghe bạn.');
  await page.getByRole('button', { name: 'Xem lại phiếu' }).click();
  await expect(reviewItem(page, 8).locator('.a')).toHaveText('Con học được lắng nghe bạn.');
  await waitSaved(page);
  await page.locator('.bottom-actions').getByRole('button', { name: 'Về bản đồ' }).click();
  await expect(page.locator('.side-quest', { hasText: 'Chia tiền lời & Đội mình' })).toContainText('✓');

  // A friend opens it from the map: nothing of An's, no counts.
  const friend = await kidPage(browser, 'Bình');
  await friend.page.locator('.side-quest', { hasText: 'Chia tiền lời & Đội mình' }).click();
  await friend.page.getByRole('button', { name: 'Bắt đầu' }).click();
  await at(friend.page, 1, 'Khi bán trò chơi có tiền lời, đội mình chia thế nào?');
  await expect(friend.page.locator('[aria-checked="true"]')).toHaveCount(0);
  await choose(friend.page, 'B. Một nửa giữ lại, một nửa cho từ thiện');
  await next(friend.page);
  await friend.page.goto('/play/team-vote?q=review');
  await expect(reviewItem(friend.page, 1).locator('.a')).toHaveText('B. Một nửa giữ lại, một nửa cho từ thiện');
  for (const n of [2, 5, 8]) await expect(reviewItem(friend.page, n).locator('.a')).toHaveText('(chưa trả lời)');
  await expect(friend.page.getByText('chia đều cho cả đội')).toHaveCount(0);
  await waitSaved(friend.page);

  // The console: who has sent, the tally, side by side, and the copy.
  const mentor = await mentorPage(browser);
  await mentor.ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  await mentor.page.getByRole('link', { name: 'Chia tiền lời' }).click();
  await expect(mentor.page.getByRole('heading', { name: 'Chia tiền lời & Đội mình' })).toBeVisible();
  const status = mentor.page.locator('.m-card').first();
  await expect(status.locator('tr', { hasText: 'An' })).toContainText('Đã gửi');
  await expect(status.locator('tr', { hasText: 'An' })).toContainText('có sửa sau khi gửi');
  await expect(status.locator('tr', { hasText: 'An' })).toContainText('6/9 câu');
  await expect(status.locator('tr', { hasText: 'Bình' })).toContainText('Chưa gửi');
  const q1 = mentor.page.locator('.m-card', { hasText: '1. Khi bán trò chơi có tiền lời' });
  await expect(q1.locator('tr', { hasText: 'B. Một nửa giữ lại' })).toContainText('1Bình');
  await expect(q1.locator('tr', { hasText: '“chia đều cho cả đội”' })).toContainText('An');
  await expect(q1.locator('tr', { hasText: 'Chưa trả lời' })).toContainText('2');
  await expect(mentor.page.locator('.m-table-wrap td', { hasText: 'Con thích vẽ.' })).toHaveText('Con thích vẽ.\nVà tô màu nữa.');

  await mentor.page.getByRole('button', { name: '📋 Sao chép tất cả' }).click();
  const copied = await mentor.page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('Đã gửi: An\n');
  expect(copied).toContain('   - B. Một nửa giữ lại, một nửa cho từ thiện: 1 (Bình)');
  expect(copied).toContain('   An: D. Ý khác của con: chia đều cho cả đội');
  expect(copied).toContain('   An: Con thích vẽ.\n       Và tô màu nữa.');
  expect(copied).toContain('   An: Con học được lắng nghe bạn.');

  await ctx.close();
  await friend.ctx.close();
  await mentor.ctx.close();
});
