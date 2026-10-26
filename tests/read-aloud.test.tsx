// The 🔊 button (FR-P-14): its failure belongs to one card, and the app looks for a Vietnamese voice
// once rather than on every screen.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeT } from '../src/content/strings';

const t = makeT(undefined);
vi.mock('../src/player/session', () => ({ usePlayer: () => ({ t }) }));

const { ReadAloud } = await import('../src/player/ui');
const { stopSpeaking } = await import('../src/player/speech');

interface FakeUtterance {
  text: string;
  onerror: ((e: { error: string }) => void) | null;
}
let spoken: FakeUtterance[];
let getVoices: ReturnType<typeof vi.fn>;
let addListener: ReturnType<typeof vi.fn>;

beforeEach(() => {
  spoken = [];
  getVoices = vi.fn(() => [{ lang: 'vi-VN', name: 'Linh' }]);
  addListener = vi.fn();
  vi.stubGlobal('SpeechSynthesisUtterance', function (this: FakeUtterance, text: string) {
    Object.assign(this, { text, onerror: null });
  });
  vi.stubGlobal('speechSynthesis', { getVoices, speak: (u: FakeUtterance) => spoken.push(u), cancel: () => {}, addEventListener: addListener, removeEventListener: () => {} });
});

afterEach(() => {
  stopSpeaking();
  cleanup();
  vi.unstubAllGlobals();
});

describe('🔊 Đọc to', () => {
  // First: the app starts looking for voices on the first screen with 🔊 (module state).
  it('listens for the device voices once for the whole app, not once per screen', () => {
    for (let i = 0; i < 3; i++) {
      const { unmount } = render(<ReadAloud id={`L1Q${i}:ask`} text={['Câu hỏi?']} />);
      expect(screen.getByRole('button', { name: 'Đọc to' })).toBeTruthy();
      unmount();
    }
    expect(addListener.mock.calls.filter(([type]) => type === 'voiceschanged')).toHaveLength(1);
  });

  it('a failure on one card does not hide 🔊 on the next', () => {
    const { rerender } = render(<ReadAloud id="L1C1" text={['Thẻ một.']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Đọc to' }));
    act(() => spoken[0].onerror?.({ error: 'synthesis-failed' }));
    expect(screen.getByRole('status').textContent).toBe(t('readAloudFailed'));
    rerender(<ReadAloud id="L1C2" text={['Thẻ hai.']} />); // same component, next card
    expect(screen.getByRole('button', { name: 'Đọc to' })).toBeTruthy();
    rerender(<ReadAloud id="L1C1" text={['Thẻ một.']} />);
    expect(screen.getByRole('status').textContent).toBe(t('readAloudFailed')); // still that card's
  });
});
