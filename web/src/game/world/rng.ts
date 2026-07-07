// A SERIALIZABLE seeded RNG for the guild world-state.
//
// Deliberately a small copy of battle/rng.ts's mulberry32 — world/ must not
// import from the frozen combat core (battle/), and unlike the engine's closure
// RNG this one exposes its cursor as a plain number so it can live in the
// serialized WorldState. Persisting the cursor (not just the original seed) is
// what makes an End Day reproducible across a save→reload (a reload must not
// re-roll from the run's start). The endDay reducer threads one cursor through
// all its draws and writes the advanced cursor back into the next state.

/** A mutable cursor. `s` is the full serializable RNG state (a uint32). */
export interface RngCursor {
  s: number;
}

export function makeCursor(seed: number): RngCursor {
  return { s: seed >>> 0 };
}

/** Advances the cursor and returns a float in [0, 1). mulberry32. */
export function nextFloat(c: RngCursor): number {
  let a = c.s | 0;
  a = (a + 0x6d2b79f5) | 0;
  c.s = a >>> 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Integer in [lo, hi] inclusive, drawn from the cursor. */
export function nextInt(c: RngCursor, lo: number, hi: number): number {
  return lo + Math.floor(nextFloat(c) * (hi - lo + 1));
}
