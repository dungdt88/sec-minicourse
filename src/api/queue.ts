// Offline-safe write queue (NFR-03). Every player write is stored in localStorage first, then sent
// in order. Network failures retry with backoff and on the browser's "online" event; the UI shows
// "Đang lưu…" / "Chưa lưu được" from `status`. Mutations are idempotent by id, so a write that
// reached the server but whose reply was lost is safe to resend.

import { ApiError, type Mutation, type PlayerApi } from './types';

export type SaveStatus = 'saved' | 'saving' | 'offline';

interface Item {
  token: string;
  m: Mutation;
}

const KEY = 'tvt.queue.v1';
const BACKOFF_MS = [1000, 3000, 8000, 15000, 30000];

export class WriteQueue {
  private items: Item[] = [];
  private running = false;
  private failures = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();
  status: SaveStatus = 'saved';
  /** Called when the server refuses a write for good (e.g. the form was locked); it is dropped. */
  onPermanentError: (m: Mutation, e: ApiError) => void = () => {};

  constructor(
    private api: PlayerApi,
    private storage: Storage | null = typeof localStorage === 'undefined' ? null : localStorage,
  ) {
    try {
      this.items = JSON.parse(this.storage?.getItem(KEY) ?? '[]') as Item[];
    } catch {
      this.items = [];
    }
    if (typeof window !== 'undefined') window.addEventListener('online', () => this.flush());
    if (this.items.length) this.setStatus('saving');
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Writes not yet confirmed by the server for this token, oldest first. */
  pending(token: string): Mutation[] {
    return this.items.filter((i) => i.token === token).map((i) => i.m);
  }

  /** Drops this token's writes from another data epoch (queued before a trial-run reset). */
  purge(token: string, epoch: number) {
    const before = this.items.length;
    this.items = this.items.filter((i) => i.token !== token || (i.m.epoch ?? 0) === epoch);
    if (this.items.length !== before) this.persist();
  }

  get size() {
    return this.items.length;
  }

  enqueue(token: string, m: Mutation) {
    this.items.push({ token, m });
    this.persist();
    this.setStatus(this.status === 'offline' ? 'offline' : 'saving');
    void this.flush();
  }

  /** Resolves when the queue is empty (or immediately gives up if offline). */
  async drain(): Promise<boolean> {
    await this.flush();
    return this.items.length === 0;
  }

  async flush(): Promise<void> {
    if (this.running) return;
    this.running = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    try {
      while (this.items.length) {
        const item = this.items[0];
        try {
          await this.api.write(item.token, item.m);
          this.failures = 0;
        } catch (err) {
          const e = err instanceof ApiError ? err : new ApiError('unknown', String(err));
          if (e.permanent) {
            this.onPermanentError(item.m, e);
          } else {
            this.failures++;
            this.setStatus('offline');
            const delay = BACKOFF_MS[Math.min(this.failures - 1, BACKOFF_MS.length - 1)];
            this.timer = setTimeout(() => void this.flush(), delay);
            return;
          }
        }
        this.items.shift();
        this.persist();
      }
      this.setStatus('saved');
    } finally {
      this.running = false;
    }
  }

  private persist() {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.items));
    } catch {
      // Storage full or blocked: the in-memory queue still works for this session.
    }
  }

  private setStatus(s: SaveStatus) {
    if (s === this.status) return;
    this.status = s;
    this.listeners.forEach((fn) => fn());
  }
}
