// Preview mode (FR-M-10): play any content version as a throwaway "Thử" profile. Everything lives
// in memory and disappears when the tab closes; nothing reaches the server.
import type { CourseContent } from '../content/types';
import { LocalPlayerApi, LocalStore } from './local';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
}

export async function previewSession(content: CourseContent) {
  const store = new LocalStore(async () => content, new MemoryStorage());
  const api = new LocalPlayerApi(store, 'preview');
  const db = await store.load();
  // Every level open, one throwaway profile.
  const first = db.profiles[0];
  db.profiles = [{ ...first, displayName: 'Thử' }];
  for (const level of content.levels) store.ensureLevel(db, first.id, level.id).override = 'unlocked';
  const token = await api.login(first.id, '1111', 'desktop');
  return { api, token, queueStorage: new MemoryStorage() };
}
