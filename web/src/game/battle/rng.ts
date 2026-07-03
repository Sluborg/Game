// Deterministic, seedable RNG so fights are reproducible (and unit-testable).
// The engine never calls Math.random directly — it takes an Rng, so tests can
// inject a fixed stream and assert exact outcomes.

export interface Rng {
  /** Returns a float in [0, 1). */
  next(): number;
}

/** mulberry32 — tiny, fast, good-enough PRNG for game feel. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** A constant stream — handy for deterministic tests (e.g. constantRng(0.99)). */
export function constantRng(value: number): Rng {
  return { next: () => value };
}
