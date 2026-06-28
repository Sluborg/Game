// Seeded RNG for the guild layer.
//
// The combat resolver (combat.ts) is already deterministic — it contains no
// randomness — so the only stochastic parts of the guild sim are encounter
// rolls and fidelity/distortion. We make those reproducible with a small
// splitmix32 / mulberry32 PRNG so any turn can be replayed from its seed.

export interface Rng {
  /** Next float in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** True with probability p (0..1). */
  chance(p: number): boolean;
  /** Pick one element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
}

/** mulberry32 — tiny, fast, good enough for a game. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (items) => items[Math.floor(next() * items.length)],
  };
}

/**
 * Deterministically combine a base seed with sub-keys, so independent streams
 * (turn N, dispatch D, event E) never share a sequence. Order-independent only
 * across distinct key tuples; same tuple => same value.
 */
export function deriveSeed(base: number, ...keys: number[]): number {
  let h = base >>> 0;
  for (const k of keys) {
    h ^= k + 0x9e3779b9 + ((h << 6) >>> 0) + (h >>> 2);
    h >>>= 0;
  }
  return h >>> 0;
}

/** Stable 32-bit hash of a string (for turning ids into seed components). */
export function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
