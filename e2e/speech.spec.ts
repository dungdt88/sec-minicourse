// Read-aloud on cards, quiz and form questions (FR-P-14) and the 🎤 voice typing under a text box
// (FR-P-24), in the real level flow. A test browser has no voices and no microphone, so the
// browser's speech APIs are replaced by stand-ins that record what they were asked to say and end
// each sentence a moment later, as a real voice does.
import { expect, test, type Page } from '@playwright/test';
import { enterAs, next, waitSaved } from './helpers';

const HEARD = 'con muốn chơi cùng bạn';

function fakeSpeech(heard: string) {
  const w = window as unknown as Record<string, unknown> & { __said: string[]; __hold: boolean; __release: () => void };
  w.__said = [];
  w.__hold = false; // true: the next sentence keeps "speaking" until __release()
  const voices = [{ lang: 'vi-VN', name: 'Linh', default: true, localService: true, voiceURI: 'Linh' }];
  type U = { text: string; onend: (() => void) | null };
  let timer: ReturnType<typeof setTimeout> | null = null;
  let held: U | null = null;
  w.SpeechSynthesisUtterance = function (this: U, text: string) {
    this.text = text;
  };
  w.__release = () => {
    const u = held;
    held = null;
    u?.onend?.();
  };
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      get speaking() {
        return timer != null || held != null;
      },
      getVoices: () => voices,
      speak: (u: U) => {
        w.__said.push(u.text);
        if (w.__hold) held = u;
        else
          timer = setTimeout(() => {
            timer = null;
            u.onend?.();
          }, 20);
      },
      cancel: () => {
        if (timer) clearTimeout(timer);
        timer = null;
        held = null;
      },
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
const hold = (page: Page, on: boolean) => page.evaluate((v) => ((window as unknown as { __hold: boolean }).__hold = v), on);

test('🔊 reads cards, quiz questions and form questions; 🎤 types what was said and it is saved', async ({ browser }) => {
  const ctx = await browser.newContext();
  await ctx.addInitScript(fakeSpeech, HEARD);
  const page = await ctx.newPage();
  await page.goto('/');
  await enterAs(page, 'An');
  await page.locator('.map-node', { hasText: 'Màn 1:' }).click();
  await page.locator('.bottom-actions .btn').first().click(); // "Bắt đầu" (or "Chơi lại")

  // A card, read one sentence at a time to the end; the button says "Dừng" meanwhile.
  await expect(page.getByText('Thẻ 1/4').first()).toBeVisible();
  await expect(page.locator('.concept-card h2')).toHaveText('Kinh doanh (business) là gì?');
  await hold(page, true);
  await page.getByRole('button', { name: 'Đọc to' }).click();
  await expect(page.getByRole('button', { name: 'Dừng' })).toHaveAttribute('aria-pressed', 'true');
  expect(await said(page)).toBe('Kinh doanh'); // the next sentence waits for this one to end
  await hold(page, false);
  await page.evaluate(() => (window as unknown as { __release: () => void }).__release());
  await expect(page.getByRole('button', { name: 'Đọc to' })).toHaveAttribute('aria-pressed', 'false'); // finished by itself
  expect(await said(page)).toMatch(/^Kinh doanh \| business \| là gì\? \| Sóc, Gấu, Thỏ và Cú Mèo mở một tiệm nhỏ\. \|/); // English in an English voice
  expect(await said(page)).toContain('Việc làm giúp gọi là dịch vụ.'); // the last sentence too
  // Moving on stops a reading.
  await hold(page, true);
  await page.getByRole('button', { name: 'Đọc to' }).click();
  await expect(page.getByRole('button', { name: 'Dừng' })).toBeVisible();
  await next(page);
  await expect(page.getByText('Thẻ 2/4').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đọc to' })).toHaveAttribute('aria-pressed', 'false');
  await hold(page, false);
  for (let i = 1; i < 4; i++) await next(page);

  // A quiz question: the question and its lettered choices; after the answer, why.
  await expect(page.getByText('Câu 1/4').first()).toBeVisible();
  const prompt = (await page.locator('h1.prompt').textContent())!.trim();
  const firstOption = (await page.locator('.option-list .option span:last-child').first().textContent())!.trim();
  await page.getByRole('button', { name: 'Đọc to' }).click();
  await expect.poll(() => said(page)).toContain(`${prompt} | A. ${firstOption}`);
  await hold(page, true);
  await page.getByRole('button', { name: 'Đọc to' }).click();
  await expect(page.getByRole('button', { name: 'Dừng' })).toBeVisible();
  await page.locator('.option').first().click();
  await expect(page.getByRole('button', { name: 'Đọc to' })).toHaveAttribute('aria-pressed', 'false'); // answering ends it
  await hold(page, false);
  await page.getByRole('button', { name: 'Đọc to' }).click();
  const explanation = (await page.locator('.feedback p').textContent())!.trim();
  await expect.poll(() => said(page)).toContain(explanation.split(/[.?!]/)[0]);
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
  const formPrompt = (await page.locator('h1.prompt').textContent())!.trim();
  await expect.poll(() => said(page)).toContain(formPrompt.split(/[.?!]/)[0]);
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
