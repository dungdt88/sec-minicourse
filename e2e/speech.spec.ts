// Read-aloud on cards, quiz and form questions (FR-P-14) and the 🎤 voice typing under a text box
// (FR-P-24), in the real level flow. A test browser has no voices and no microphone, so the
// browser's speech APIs are replaced by stand-ins that record what they were asked to say.
import { expect, test, type Page } from '@playwright/test';
import { enterAs, next, waitSaved } from './helpers';

const HEARD = 'con muốn chơi cùng bạn';

function fakeSpeech(heard: string) {
  const w = window as unknown as Record<string, unknown> & { __said: string[] };
  w.__said = [];
  const voices = [{ lang: 'vi-VN', name: 'Linh', default: true, localService: true, voiceURI: 'Linh' }];
  w.SpeechSynthesisUtterance = function (this: { text: string }, text: string) {
    this.text = text;
  };
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      getVoices: () => voices,
      speak: (u: { text: string }) => w.__said.push(u.text), // never ends by itself: stays "Dừng"
      cancel: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  });
  w.SpeechRecognition = class {
    onresult: ((e: unknown) => void) | null = null;
    onend: (() => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;
    start() {
      setTimeout(() => {
        this.onresult?.({ resultIndex: 0, results: { length: 1, 0: { isFinal: true, 0: { transcript: heard } } } });
        this.onend?.();
      }, 100);
    }
    stop() {
      this.onend?.();
    }
    abort() {
      this.onend?.();
    }
  };
}

const said = (page: Page) => page.evaluate(() => (window as unknown as { __said: string[] }).__said.join(' | '));

test('🔊 reads cards, quiz questions and form questions; 🎤 types what was said and it is saved', async ({ browser }) => {
  const ctx = await browser.newContext();
  await ctx.addInitScript(fakeSpeech, HEARD);
  const page = await ctx.newPage();
  await page.goto('/');
  await enterAs(page, 'An');
  await page.locator('.map-node', { hasText: 'Màn 1:' }).click();
  await page.locator('.bottom-actions .btn').first().click(); // "Bắt đầu" (or "Chơi lại")

  // A card: as before, plus the reading now stops when the child moves on.
  await expect(page.getByText('Thẻ 1/4').first()).toBeVisible();
  await expect(page.locator('.concept-card h2')).toHaveText('Kinh doanh (business) là gì?');
  await page.getByRole('button', { name: 'Đọc to' }).click();
  await expect(page.getByRole('button', { name: 'Dừng' })).toHaveAttribute('aria-pressed', 'true');
  expect(await said(page)).toContain('Kinh doanh | business | là gì?'); // the English word in an English voice
  await next(page);
  await expect(page.getByRole('button', { name: 'Đọc to' })).toHaveAttribute('aria-pressed', 'false');
  for (let i = 1; i < 4; i++) await next(page);

  // A quiz question: the question and its lettered choices; after the answer, why.
  await expect(page.getByText('Câu 1/4').first()).toBeVisible();
  const prompt = (await page.locator('h1.prompt').textContent())!.trim();
  const firstOption = (await page.locator('.option-list .option span:last-child').first().textContent())!.trim();
  await page.getByRole('button', { name: 'Đọc to' }).click();
  expect(await said(page)).toContain(`A. ${firstOption}`);
  expect(await said(page)).toContain(prompt.split(/[.?!]/)[0]);
  await page.locator('.option').first().click();
  await expect(page.getByRole('button', { name: 'Đọc to' })).toHaveAttribute('aria-pressed', 'false'); // answering ends it
  await page.getByRole('button', { name: 'Đọc to' }).click();
  const explanation = (await page.locator('.feedback p').textContent())!.trim();
  expect(await said(page)).toContain(explanation.split(/[.?!]/)[0]);
  await next(page);
  for (let i = 1; i < 4; i++) {
    await page.locator('.option').first().click();
    await next(page);
  }
  await page.locator('.bottom-actions .btn').click(); // quiz end → the form

  // A form question: 🔊 sits beside "Xem lại thẻ"; 🎤 adds the words after what was typed.
  await expect(page.getByText('Từ điển pháp thuật 1/4').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xem lại thẻ' })).toBeVisible();
  await page.getByRole('button', { name: 'Đọc to' }).click();
  expect(await said(page)).toContain((await page.locator('h1.prompt').textContent())!.trim().split(/[.?!]/)[0]);
  await page.locator('textarea').fill('Hôm nay');
  await page.getByRole('button', { name: 'Bấm để nói' }).click();
  await expect(page.locator('textarea')).toHaveValue(`Hôm nay ${HEARD}`);
  await expect(page.getByRole('button', { name: 'Bấm để nói' })).toBeVisible(); // ready for another go
  await expect(page.getByText('🎤 Bố mẹ bấm micro trên bàn phím, con nói là máy gõ.')).toBeVisible(); // the tip stays
  // Saved like typed text: on to the next question, reload, and back.
  await next(page);
  await expect(page.getByText('Từ điển pháp thuật 2/4').first()).toBeVisible();
  await waitSaved(page);
  await page.reload();
  await expect(page.getByText('Từ điển pháp thuật 2/4').first()).toBeVisible();
  await page.getByRole('button', { name: 'Quay lại' }).click();
  await expect(page.locator('textarea')).toHaveValue(`Hôm nay ${HEARD}`);
  await ctx.close();
});

test('without speech support the screens are as before: no 🔊 without a Vietnamese voice, no 🎤', async ({ browser }) => {
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { getVoices: () => [], speak: () => {}, cancel: () => {}, addEventListener: () => {}, removeEventListener: () => {} },
    });
    const w = window as unknown as Record<string, unknown>;
    w.SpeechRecognition = undefined;
    w.webkitSpeechRecognition = undefined;
  });
  const page = await ctx.newPage();
  await page.goto('/');
  await enterAs(page, 'Bình');
  await page.locator('.map-node', { hasText: 'Màn 1:' }).click();
  await page.locator('.bottom-actions .btn').first().click();
  await expect(page.getByText('Thẻ 1/4').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đọc to' })).toHaveCount(0);
  for (let i = 0; i < 4; i++) await next(page);
  await expect(page.getByText('Câu 1/4').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đọc to' })).toHaveCount(0);
  for (let i = 0; i < 4; i++) {
    await page.locator('.option').first().click();
    await next(page);
  }
  await page.locator('.bottom-actions .btn').click();
  await expect(page.locator('textarea')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bấm để nói' })).toHaveCount(0);
  await expect(page.getByText('🎤 Bố mẹ bấm micro trên bàn phím, con nói là máy gõ.')).toBeVisible();
  await ctx.close();
});
