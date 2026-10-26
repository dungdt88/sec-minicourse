// Read-aloud (FR-P-14) and voice typing (FR-P-24), with the browser's speech APIs faked.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeT } from '../src/content/strings';
import type { TextPart } from '../src/content/types';
import type { PartAnswer } from '../src/domain/answers';
import { TextInput } from '../src/player/parts/TextInput';
import { currentlySpeaking, englishParts, pickVoice, sentenceDeadline, speak, speechChunks, START_TIMEOUT, stopSpeaking } from '../src/player/speech';

const t = makeT(undefined);

describe('what read-aloud says', () => {
  it('reads bracketed English words in an English voice and leaves emoji out', () => {
    expect(speechChunks(['🎤 Ai là khách hàng (customer) của đội?'])).toEqual([
      { text: 'Ai là khách hàng', lang: 'vi' },
      { text: 'customer', lang: 'en' },
      { text: 'của đội?', lang: 'vi' },
    ]);
  });

  it('splits sentences, but not inside a price', () => {
    expect(speechChunks(['Giá 10.000đ. Rẻ quá! Mua không?']).map((c) => c.text)).toEqual(['Giá 10.000đ.', 'Rẻ quá!', 'Mua không?']);
  });

  it('cuts a very long sentence at a comma, so no browser stops halfway', () => {
    const long = `${'một hai ba bốn năm '.repeat(8)}, ${'sáu bảy tám chín mười '.repeat(6)}`;
    const chunks = speechChunks([long]);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.text.length <= 180)).toBe(true);
    expect(chunks.map((c) => c.text).join(' ').replace(/\s+/g, ' ')).toBe(long.replace(/\s+/g, ' ').trim());
  });

  it('keeps a quiz letter with its answer', () => {
    expect(speechChunks(['A. Sóc tết vòng.', 'B. Mua vòng.']).map((c) => c.text)).toEqual(['A. Sóc tết vòng.', 'B. Mua vòng.']);
  });

  it('a Vietnamese text in brackets stays Vietnamese, on screen and read aloud', () => {
    expect(englishParts('(Bố mẹ giúp con nhé.) Khách hàng (customer)')).toEqual([
      { piece: '(Bố mẹ giúp con nhé.) Khách hàng ', en: false },
      { piece: '(customer)', en: true },
      { piece: '', en: false },
    ]);
    expect(speechChunks(['(Bố mẹ giúp con nhé.)'])).toEqual([{ text: '(Bố mẹ giúp con nhé.)', lang: 'vi' }]);
  });

  it('skips empty and missing texts', () => {
    expect(speechChunks([undefined, null, '', ' 🎃 ', 'Xong!'])).toEqual([{ text: 'Xong!', lang: 'vi' }]);
  });
});

// ---------- a fake speechSynthesis

interface FakeUtterance {
  text: string;
  voice: { lang: string; name: string } | null;
  lang: string;
  rate: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

let spoken: FakeUtterance[];
let voices: { lang: string; name: string }[];

beforeEach(() => {
  spoken = [];
  voices = [
    { lang: 'en-GB', name: 'Daniel' },
    { lang: 'en-US', name: 'Samantha' },
    { lang: 'vi-VN', name: 'Linh' },
  ];
  vi.stubGlobal('SpeechSynthesisUtterance', function (this: FakeUtterance, text: string) {
    Object.assign(this, { text, voice: null, lang: '', rate: 1, onstart: null, onend: null, onerror: null });
  });
  vi.stubGlobal('speechSynthesis', {
    getVoices: () => voices,
    speak: (u: FakeUtterance) => spoken.push(u),
    cancel: vi.fn(),
    addEventListener: () => {},
    removeEventListener: () => {},
  });
});

afterEach(() => {
  stopSpeaking();
  cleanup();
  vi.unstubAllGlobals();
});

describe('read-aloud with the device voice', () => {
  it('picks a Vietnamese voice, and an Enhanced one when installed', () => {
    expect(pickVoice('vi')?.name).toBe('Linh');
    expect(pickVoice('en')?.name).toBe('Samantha');
    voices.push({ lang: 'vi_VN', name: 'Linh (Enhanced)' });
    expect(pickVoice('vi')?.name).toBe('Linh (Enhanced)');
  });

  it('says one sentence at a time with the right voice, each after the one before ends', () => {
    const fail = vi.fn();
    speak('L1C1', speechChunks(['Khách hàng (customer) là ai?']), fail);
    expect(currentlySpeaking()).toBe('L1C1');
    // Not queued up front: Safari can drop queued utterances and Chrome can stall on them.
    expect(spoken.map((u) => [u.text, u.voice?.name])).toEqual([['Khách hàng', 'Linh']]);
    spoken[0].onend?.();
    spoken[0].onend?.(); // a repeated end event does not skip a sentence
    expect(spoken.map((u) => [u.text, u.voice?.name])).toEqual([
      ['Khách hàng', 'Linh'],
      ['customer', 'Samantha'],
    ]);
    spoken[1].onend?.();
    expect(spoken[2].text).toBe('là ai?');
    expect(currentlySpeaking()).toBe('L1C1');
    spoken[2].onend?.();
    expect(currentlySpeaking()).toBeNull();
    expect(spoken).toHaveLength(3);
    expect(fail).not.toHaveBeenCalled();
  });

  it('moves past a sentence that started but never ends, timed from its start', () => {
    vi.useFakeTimers();
    try {
      const fail = vi.fn();
      speak('L1C1', speechChunks(['Có. Bốn năm.']), fail);
      expect(spoken.map((u) => u.text)).toEqual(['Có.']);
      // A slow first word (an iPhone's Enhanced voice) is not cut: the clock starts with speech.
      vi.advanceTimersByTime(3000);
      spoken[0].onstart?.();
      vi.advanceTimersByTime(sentenceDeadline('Có.') - 1);
      expect(spoken).toHaveLength(1);
      vi.advanceTimersByTime(1);
      expect(spoken.map((u) => u.text)).toEqual(['Có.', 'Bốn năm.']);
      spoken[0].onend?.(); // a late end of the stuck sentence changes nothing
      expect(spoken).toHaveLength(2);
      spoken[1].onstart?.();
      spoken[1].onend?.();
      expect(currentlySpeaking()).toBeNull();
      expect(fail).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('a sentence that never starts means the device cannot read: the parent is told', () => {
    vi.useFakeTimers();
    try {
      const fail = vi.fn();
      speak('L1C1', speechChunks(['Một. Hai. Ba.']), fail);
      vi.advanceTimersByTime(START_TIMEOUT - 1);
      expect(fail).not.toHaveBeenCalled();
      expect(currentlySpeaking()).toBe('L1C1');
      vi.advanceTimersByTime(1);
      expect(fail).toHaveBeenCalledTimes(1);
      expect(currentlySpeaking()).toBeNull(); // not "Dừng" for the length of the whole card
      expect(spoken).toHaveLength(1); // the rest is not tried in silence
    } finally {
      vi.useRealTimers();
    }
  });

  it('a reading stopped by the child or by leaving the screen is not a failure', () => {
    const fail = vi.fn();
    speak('L1C1', speechChunks(['Một. Hai.']), fail);
    // Chrome reports cancel() as an "interrupted" error on the utterance being spoken.
    spoken[0].onerror?.({ error: 'interrupted' });
    expect(fail).not.toHaveBeenCalled();
    expect(currentlySpeaking()).toBeNull();
    // Late events of a stopped reading change nothing.
    speak('L1C2', speechChunks(['Ba. Bốn.']), fail);
    const stopped = spoken[0];
    stopSpeaking();
    stopped.onerror?.({ error: 'synthesis-failed' });
    stopped.onend?.();
    expect(fail).not.toHaveBeenCalled();
    expect(spoken.map((u) => u.text)).toEqual(['Một.', 'Ba.']);
    expect(currentlySpeaking()).toBeNull();
  });

  it('a device that cannot speak reports it once', () => {
    const fail = vi.fn();
    speak('L1Q1:ask', speechChunks(['Câu hỏi? Câu nữa.']), fail);
    spoken[0].onerror?.({ error: 'synthesis-failed' });
    expect(fail).toHaveBeenCalledTimes(1);
    expect(currentlySpeaking()).toBeNull();
    expect(spoken).toHaveLength(1); // nothing more is tried
  });
});

// ---------- a fake speech recognition

class FakeRecognition {
  static last: FakeRecognition | null = null;
  lang = '';
  interimResults = false;
  continuous = true;
  maxAlternatives = 0;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  started = false;
  constructor() {
    FakeRecognition.last = this;
  }
  start() {
    this.started = true;
  }
  stop() {
    this.onend?.();
  }
  abort() {
    this.onerror?.({ error: 'aborted' });
    this.onend?.();
  }
  hear(transcript: string, isFinal: boolean) {
    this.onresult?.({ resultIndex: 0, results: { length: 1, 0: { isFinal, 0: { transcript } } } });
  }
}

const part: TextPart = { id: 'a', type: 'text', maxLength: 400 };

function Box({ initial, readOnly = false, onChange }: { initial: string; readOnly?: boolean; onChange: (a: PartAnswer) => void }) {
  return (
    <TextInput
      part={part}
      answer={{ value: initial, dontKnow: false }}
      onChange={onChange}
      readOnly={readOnly}
      t={t}
      content={{} as never}
      lookup={() => undefined}
      labelId="q"
    />
  );
}

describe('voice typing (🎤 under a text box)', () => {
  beforeEach(() => {
    FakeRecognition.last = null;
    vi.stubGlobal('isSecureContext', true);
    vi.stubGlobal('webkitSpeechRecognition', FakeRecognition);
  });

  it('adds what was heard after what is already in the box, word for word', () => {
    const onChange = vi.fn();
    render(<Box initial="Con thích " onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bấm để nói' }));
    const rec = FakeRecognition.last!;
    expect(rec.started).toBe(true);
    expect([rec.lang, rec.interimResults, rec.continuous]).toEqual(['vi-VN', true, false]);
    expect(screen.getByRole('button', { name: 'Nói xong' })).toBeTruthy();

    act(() => rec.hear('chơi cùng', false));
    expect(screen.getByText('chơi cùng')).toBeTruthy(); // shown while listening, not saved yet
    expect(onChange).not.toHaveBeenCalled();

    act(() => rec.hear('chơi cùng bạn bè', true));
    expect(onChange).toHaveBeenLastCalledWith({ value: 'Con thích chơi cùng bạn bè', dontKnow: false });
    act(() => rec.stop());
    expect(screen.getByRole('button', { name: 'Bấm để nói' })).toBeTruthy();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('keeps the last words when the browser ends without marking them final (Safari)', () => {
    const onChange = vi.fn();
    render(<Box initial="" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bấm để nói' }));
    act(() => FakeRecognition.last!.hear('bốn bạn', false));
    act(() => FakeRecognition.last!.stop());
    expect(onChange).toHaveBeenLastCalledWith({ value: 'bốn bạn', dontKnow: false });
  });

  it('says what to do when the microphone is refused or nothing was heard', () => {
    render(<Box initial="" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bấm để nói' }));
    act(() => {
      FakeRecognition.last!.onerror?.({ error: 'not-allowed' });
      FakeRecognition.last!.onend?.();
    });
    expect(screen.getByRole('alert').textContent).toBe(t('dictateDenied'));
    fireEvent.click(screen.getByRole('button', { name: 'Bấm để nói' }));
    act(() => {
      FakeRecognition.last!.onerror?.({ error: 'no-speech' });
      FakeRecognition.last!.onend?.();
    });
    expect(screen.getByRole('alert').textContent).toBe(t('dictateNoSpeech'));
  });

  it('stops listening when the question is left, and nothing heard later reaches it', () => {
    const onChange = vi.fn();
    const { unmount } = render(<Box initial="" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bấm để nói' }));
    const rec = FakeRecognition.last!;
    act(() => rec.hear('bốn bạn', false));
    // A browser that ends without an "aborted" error, and then delivers a late result.
    const abort = vi.spyOn(rec, 'abort').mockImplementation(function (this: FakeRecognition) {
      this.onend?.();
    });
    unmount();
    expect(abort).toHaveBeenCalled();
    rec.onresult?.({ resultIndex: 0, results: { length: 1, 0: { isFinal: true, 0: { transcript: 'muộn' } } } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a busy microphone (a phone call) gives a message and keeps 🎤', () => {
    render(<Box initial="" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bấm để nói' }));
    act(() => {
      FakeRecognition.last!.onerror?.({ error: 'audio-capture' });
      FakeRecognition.last!.onend?.();
    });
    expect(screen.getByRole('alert').textContent).toBe(t('dictateFailed'));
    expect(screen.getByRole('button', { name: 'Bấm để nói' })).toBeTruthy();
  });

  it('has no 🎤 in an iPhone Home Screen app, where recognition does not work', () => {
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    try {
      render(<Box initial="" onChange={vi.fn()} />);
      expect(screen.queryByRole('button')).toBeNull();
    } finally {
      delete (navigator as { standalone?: boolean }).standalone;
    }
  });

  it('has no button on a locked form, over plain http, or without recognition', () => {
    const { unmount } = render(<Box initial="" readOnly onChange={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
    unmount();
    vi.stubGlobal('isSecureContext', false);
    const second = render(<Box initial="" onChange={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
    second.unmount();
    vi.stubGlobal('isSecureContext', true);
    vi.stubGlobal('webkitSpeechRecognition', undefined);
    render(<Box initial="" onChange={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('textbox')).toBeTruthy(); // typing is unchanged
  });

  // Last: after this the button stays hidden for the rest of the visit (module state).
  it('hides every 🎤 on the screen for good when the device has no Vietnamese recognition', () => {
    render(
      <>
        <Box initial="" onChange={vi.fn()} />
        <Box initial="" onChange={vi.fn()} />
      </>,
    );
    expect(screen.getAllByRole('button', { name: 'Bấm để nói' })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'Bấm để nói' })[0]);
    act(() => {
      FakeRecognition.last!.onerror?.({ error: 'language-not-supported' });
      FakeRecognition.last!.onend?.();
    });
    expect(screen.queryAllByRole('button')).toHaveLength(0); // the other box too
    expect(screen.getByRole('alert').textContent).toBe(t('dictateFailed'));
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
  });
});
