// Seeded shuffling for quiz options (FR-P-15). The seed and the resulting order are stored with
// each attempt, so the mentor can see exactly what the child saw.

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(xs: readonly T[], seed: number): T[] {
  const out = [...xs];
  const rand = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function randomSeed(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0];
}

/**
 * A fresh order for this play. When the previous order is known it is avoided, so a replay
 * always looks different (with 3 options a plain shuffle repeats 1 time in 6).
 */
export function newOptionOrder(ids: readonly string[], previous?: readonly string[] | null, seed = randomSeed()): { order: string[]; seed: number } {
  let s = seed;
  for (let tries = 0; tries < 20; tries++) {
    const order = seededShuffle(ids, s);
    if (!previous || ids.length < 2 || order.join() !== previous.join()) return { order, seed: s };
    s = (s + 1) >>> 0;
  }
  // Fall back to a rotation, which always differs from `previous` when there are 2+ options.
  const order = [...previous!.slice(1), previous![0]];
  return { order, seed: s };
}
