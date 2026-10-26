// Read-aloud with the device's own voices (FR-P-14) and voice typing with the browser's own speech
// recognition (FR-P-24). Neither needs a key or a server: the browser may use its maker's speech
// service, the same one the keyboard's microphone uses. Nothing is recorded or stored here.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

/** "khách hàng (customer)": a bracketed English word in the course text (FR-P-13). */
export const EN_TERM = /(\([A-Za-z][A-Za-z0-9 '’\-/]*\))/g;

export interface Chunk {
  text: string;
  lang: 'vi' | 'en';
}

const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}\u{1F3FB}-\u{1F3FF}]/gu;
/** Some browsers stop a long utterance halfway (Chrome after about 15 seconds). */
const MAX_CHUNK = 180;

/** Sentences, with any longer than MAX_CHUNK cut at a comma or a space. */
function sentences(text: string): string[] {
  // Split after . ! ? … : ; followed by a space, so "10.000" stays whole. No lookbehind: older
  // iPhones would refuse to load the app.
  const bits = text.split(/([.!?…:;])\s+/);
  const out: string[] = [];
  let label = '';
  for (let i = 0; i < bits.length; i += 2) {
    let rest = `${label}${bits[i]}${bits[i + 1] ?? ''}`.trim();
    // A quiz letter ("A.") stays with its answer.
    label = /^\p{L}[.:]$/u.test(rest) && i + 2 < bits.length ? `${rest} ` : '';
    if (label) continue;
    while (rest.length > MAX_CHUNK) {
      const comma = rest.lastIndexOf(', ', MAX_CHUNK);
      const at = comma > 40 ? comma + 1 : rest.lastIndexOf(' ', MAX_CHUNK);
      if (at <= 0) break;
      out.push(rest.slice(0, at).trim());
      rest = rest.slice(at).trim();
    }
    if (rest) out.push(rest);
  }
  return out;
}

/**
 * What to say for the texts on a screen, in order: emoji left out, bracketed English words read in
 * an English voice, the rest in short Vietnamese sentences.
 */
export function speechChunks(texts: (string | null | undefined)[]): Chunk[] {
  const out: Chunk[] = [];
  for (const text of texts) {
    if (!text) continue;
    for (const piece of text.replace(EMOJI, '').split(EN_TERM)) {
      const en = /^\([A-Za-z]/.test(piece);
      const clean = (en ? piece.slice(1, -1) : piece).replace(/\s+/g, ' ').trim();
      if (!/[\p{L}\p{N}]/u.test(clean)) continue;
      if (en) out.push({ text: clean, lang: 'en' });
      else for (const s of sentences(clean)) out.push({ text: s, lang: 'vi' });
    }
  }
  return out;
}

const synth = (): SpeechSynthesis | null => (typeof speechSynthesis === 'undefined' ? null : speechSynthesis);

/**
 * The device's voice for a language. Among Vietnamese voices, Apple's downloadable Enhanced or
 * Premium ones sound best when installed; otherwise the first, as before.
 */
export function pickVoice(lang: 'vi' | 'en'): SpeechSynthesisVoice | null {
  const voices = (synth()?.getVoices() ?? []).filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(lang));
  if (lang === 'en') return voices.find((v) => /en-us/i.test(v.lang.replace('_', '-'))) ?? voices[0] ?? null;
  return voices.find((v) => /premium|enhanced/i.test(v.name)) ?? voices[0] ?? null;
}

// One reading at a time across the app; the button that started it shows "Dừng".
let speakingId: string | null = null;
const listeners = new Set<() => void>();
/** Goes up on every stop, so the late events of a stopped reading are ignored. */
let run = 0;
/** Held while spoken: Chrome can drop the events of an utterance nothing refers to. */
let current: SpeechSynthesisUtterance | null = null;
let watchdog: ReturnType<typeof setTimeout> | undefined;
let player: HTMLAudioElement | null = null;
let listening: { abort: () => void } | null = null;

function emit(id: string | null) {
  speakingId = id;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** The id of what is being read aloud now, if anything. */
export function useSpeaking(): string | null {
  return useSyncExternalStore(subscribe, () => speakingId, () => null);
}

export const currentlySpeaking = () => speakingId;

export function stopSpeaking() {
  run++;
  if (current) current.onend = current.onerror = null; // the cancel below reports an "interrupted" error
  current = null;
  clearTimeout(watchdog);
  player?.pause();
  player = null;
  synth()?.cancel();
  if (speakingId !== null) emit(null);
}

/** Time a sentence may take before the watchdog moves on (about 10 characters a second at 0.9). */
export const sentenceDeadline = (text: string) => 2500 + text.length * 250;

/**
 * Read the chunks aloud as `id`, one sentence at a time: each starts when the one before ends.
 * Browsers keep a queue of utterances unreliably (Safari can drop the rest, Chrome can stall), and
 * a sentence that never reports its end is moved past by a watchdog. `onFail` runs when the
 * device cannot speak; a reading stopped by the child, by leaving the screen or by another reading
 * is not a failure.
 */
export function speak(id: string, chunks: Chunk[], onFail: () => void) {
  stopSpeaking();
  listening?.abort();
  const s = synth();
  if (!s || chunks.length === 0) return;
  const me = run;
  const vi = pickVoice('vi');
  const en = pickVoice('en');

  const say = (i: number) => {
    if (me !== run) return;
    clearTimeout(watchdog);
    if (i >= chunks.length) return stopSpeaking();
    const c = chunks[i];
    const u = new SpeechSynthesisUtterance(c.text);
    const voice = c.lang === 'vi' ? vi : en;
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? (c.lang === 'vi' ? 'vi-VN' : 'en-US');
    u.rate = 0.9;
    let done = false;
    const next = () => {
      if (done || me !== run) return;
      done = true;
      say(i + 1);
    };
    u.onend = next;
    u.onerror = (e) => {
      if (done || me !== run) return;
      stopSpeaking();
      if (e.error !== 'interrupted' && e.error !== 'canceled') onFail();
    };
    current = u;
    s.speak(u);
    watchdog = setTimeout(() => {
      if (done || me !== run) return;
      // Stuck: let go of this sentence and carry on with the next.
      done = true;
      s.cancel();
      say(i + 1);
    }, sentenceDeadline(c.text));
  };

  emit(id);
  say(0);
}

/** Play a recorded file (cards[].audio) as `id`. */
export function playAudio(id: string, src: string, onFail: () => void) {
  stopSpeaking();
  listening?.abort();
  const me = run;
  const a = new Audio(src);
  player = a;
  a.onended = () => {
    if (me === run) stopSpeaking();
  };
  emit(id);
  a.play().catch(() => {
    if (me !== run) return;
    stopSpeaking();
    onFail();
  });
}

// ---------- voice typing

interface RecognitionEvent {
  resultIndex: number;
  results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } };
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  // The microphone needs HTTPS (or localhost); over plain http the button would only fail.
  if (typeof window === 'undefined' || !window.isSecureContext) return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** After one of these, voice typing cannot work on this device: the button goes away. */
const UNAVAILABLE = new Set(['service-not-allowed', 'language-not-supported', 'audio-capture']);
let unavailable = false;

export type DictationError = 'denied' | 'noSpeech' | 'failed';

/**
 * Voice typing for one text box. `onHeard` gets the words as the browser heard them, unchanged;
 * the box stays editable. Hidden where the browser has no Vietnamese recognition (Firefox, an
 * iPhone Home Screen app, plain http), so the keyboard's microphone remains the way there.
 */
export function useDictation(onHeard: (text: string) => void) {
  const [supported, setSupported] = useState(() => !unavailable && recognitionCtor() != null);
  const [active, setActive] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<DictationError | null>(null);
  const rec = useRef<Recognition | null>(null);
  const heard = useRef(onHeard);
  useEffect(() => {
    heard.current = onHeard;
  });
  useEffect(() => () => rec.current?.abort(), []);

  const start = () => {
    const Ctor = recognitionCtor();
    if (!Ctor || rec.current) return;
    stopSpeaking(); // the microphone must not hear the read-aloud
    listening?.abort(); // another box was listening
    const r = new Ctor();
    r.lang = 'vi-VN';
    r.interimResults = true;
    r.continuous = false; // one go per tap: it stops by itself after a pause
    r.maxAlternatives = 1;
    let pending = '';
    r.onresult = (e) => {
      let final = '';
      pending = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) final += res[0].transcript;
        else pending += res[0].transcript;
      }
      if (final.trim()) heard.current(final.trim());
      setInterim(pending.trim());
    };
    r.onerror = (e) => {
      pending = '';
      if (e.error === 'aborted') return;
      if (UNAVAILABLE.has(e.error)) {
        unavailable = true;
        setSupported(false);
      }
      setError(e.error === 'not-allowed' ? 'denied' : e.error === 'no-speech' ? 'noSpeech' : 'failed');
    };
    r.onend = () => {
      // Safari can end without marking the last words final: keep them.
      if (pending.trim()) heard.current(pending.trim());
      pending = '';
      if (listening === handle) listening = null;
      rec.current = null;
      setActive(false);
      setInterim('');
    };
    const handle = { abort: () => r.abort() };
    setError(null);
    try {
      r.start();
    } catch {
      setError('failed');
      return;
    }
    rec.current = r;
    listening = handle;
    setActive(true);
  };

  const stop = () => rec.current?.stop();

  return { supported, listening: active, interim, error, start, stop };
}
