// "Chia tiền lời & Đội mình" end to end on the real database functions: a direct link opens it once
// the child is in, answers save while typing and after "Gửi", a friend never sees them, and the
// console tallies the vote and copies everything word for word.
import { expect, test, type Page } from '@playwright/test';
import { KIDS, kidPage, mentorPage, waitSaved } from './helpers';

const question = (page: Page, prompt: string) => page.locator('.vote-question', { hasText: prompt });
const choose = (page: Page, prompt: string, option: string) => question(page, prompt).getByRole('radio', { name: option, exact: true }).click();

test('vote and reflection: saved, sent, still editable, secret from friends, tallied and copied for the mentor', async ({ browser }) => {
  // A direct link: no one is in yet, so the pictures first, then straight to the form.
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

  await choose(page, 'đội mình chia thế nào?', 'D. Ý khác của con:');
  await question(page, 'đội mình chia thế nào?').getByRole('textbox').fill('chia đều cho cả đội');
  await choose(page, 'con muốn giúp ai?', 'B. Động vật bị bỏ rơi');
  await choose(page, 'Khi nào đội chia tiền lời?', 'C. Chưa biết');
  await choose(page, 'làm theo ý của nhiều bạn không?', 'Có');
  await question(page, 'con thích nhất điều gì?').getByRole('textbox').fill('Con thích vẽ.\nVà tô màu nữa.');

  // "Gửi" with questions still open says which; a second tap sends anyway.
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Còn câu 6, 7, 8, 9 chưa có câu trả lời.');
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Đã gửi' })).toContainText('Con vẫn sửa được');
  await waitSaved(page);

  // Saved on the server: reload and everything is there; still editable after sending.
  await page.reload();
  await expect(question(page, 'Khi nào đội chia tiền lời?').getByRole('radio', { name: 'C. Chưa biết' })).toHaveAttribute('aria-checked', 'true');
  await expect(question(page, 'đội mình chia thế nào?').getByRole('textbox')).toHaveValue('chia đều cho cả đội');
  await expect(question(page, 'con thích nhất điều gì?').getByRole('textbox')).toHaveValue('Con thích vẽ.\nVà tô màu nữa.');
  await question(page, 'Con học được gì').getByRole('textbox').fill('Con học được lắng nghe bạn.');
  await waitSaved(page);
  await page.getByRole('button', { name: 'Về bản đồ' }).click();
  await expect(page.locator('.side-quest', { hasText: 'Chia tiền lời & Đội mình' })).toContainText('✓');

  // A friend opens it from the map: nothing of An's, no counts.
  const friend = await kidPage(browser, 'Bình');
  await friend.page.locator('.side-quest', { hasText: 'Chia tiền lời & Đội mình' }).click();
  await expect(friend.page.getByRole('heading', { name: 'Chia tiền lời & Đội mình' })).toBeVisible();
  await expect(friend.page.locator('[aria-checked="true"]')).toHaveCount(0);
  for (const box of await friend.page.getByRole('textbox').all()) await expect(box).toHaveValue('');
  await expect(friend.page.getByText('chia đều cho cả đội')).toHaveCount(0);
  await choose(friend.page, 'đội mình chia thế nào?', 'B. Một nửa giữ lại, một nửa cho từ thiện');
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
