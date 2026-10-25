import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

export const MENTOR = { email: 'mentor@local.test', password: 'mentor-local-pass' };
export const KIDS = { An: '1111', Bình: '2222', Chi: '3333', Dũng: '4444' } as const;

export async function kidPage(browser: Browser, name: keyof typeof KIDS, device: 'phone' | 'laptop' = 'phone'): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext(device === 'laptop' ? { viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false } : {});
  const page = await ctx.newPage();
  await page.goto('/');
  await page.locator('.profile-tile', { hasText: name }).click();
  for (const d of KIDS[name]) await page.getByRole('button', { name: d, exact: true }).click();
  await expect(page.locator('.map')).toBeVisible();
  return { ctx, page };
}

export async function mentorPage(browser: Browser): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });
  const page = await ctx.newPage();
  await page.goto('/mentor');
  await page.getByLabel('Email').fill(MENTOR.email);
  await page.getByLabel('Mật khẩu').fill(MENTOR.password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page.getByRole('heading', { name: 'Tổng quan' })).toBeVisible();
  return { ctx, page };
}

const title = (page: Page) => page.locator('.topbar .title').first();
export const next = (page: Page) => page.getByRole('button', { name: 'Tiếp', exact: true }).click();

/** From wherever a level resumes: click through cards and quiz (first option each time) and the
 * quiz-end "Kể về …" button, to the form's first question. */
export async function throughToForm(page: Page) {
  for (let guard = 0; guard < 30; guard++) {
    if (await page.getByText(/^Từ điển pháp thuật \d+\/\d+$/).count()) return; // already on the form
    if (await page.getByText('Xong câu đố!').isVisible()) {
      await page.locator('.bottom-actions .btn').click(); // ui.toForm
      await expect(page.locator('h1.prompt')).toBeVisible();
      return;
    }
    const tt = (await title(page).textContent()) ?? '';
    if (/Thẻ truyện|Thẻ khái niệm/.test(tt) || (await page.locator('.info-chip').count())) {
      await page.locator('.bottom-actions .btn:not(.secondary)').click();
    } else if (tt.includes('Câu đố')) {
      const open = page.locator('.option:not([disabled])');
      if (await open.count()) await open.first().click();
      await next(page);
    } else throw new Error(`unexpected screen: ${tt}`);
  }
  throw new Error('did not reach the form');
}

/** From the map: open level n and go to the form's first question. */
export async function playToForm(page: Page, order: number) {
  await page.locator('.map-node', { hasText: `Màn ${order}:` }).click();
  await expect(title(page)).toBeVisible();
  await throughToForm(page);
}

/** Answer the current form question "Chưa biết", then continue. */
export async function dontKnowAndNext(page: Page) {
  await page.locator('.option.dont-know[aria-checked="false"]').click();
  await next(page);
}

export const questionNo = (page: Page, n: number, total: number) =>
  expect(page.getByText(new RegExp(`^(Câu|Từ điển pháp thuật) ${n}/${total}$`)).first()).toBeVisible();

export async function waitSaved(page: Page) {
  await expect(page.locator('.save-pill')).toHaveText(/Đã lưu/, { timeout: 30_000 });
}
