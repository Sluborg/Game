// Deterministic seed derivation for the guild sim. Every stochastic step draws
// from a seed derived purely from (rngSeed, day, key) so the whole run is
// reproducible and a mid-quest refresh replays identically. NO Date.now() /
// Math.random() anywhere in game/guild/ — that would break replay AND reducer
// purity (guarded by the endDay purity test).

import { mulberry32, type Rng } from "../battle/rng";

/** xmur3-style string hash → 32-bit seed. Small, fast, well-distributed. */
function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Derive a stable numeric seed from the run seed + a set of discriminators. */
export function deriveSeed(rngSeed: number, ...parts: (string | number)[]): number {
  return hashString(`${rngSeed}|${parts.join("|")}`);
}

/** A fresh, independent Rng stream for a given derived key. */
export function rngFor(rngSeed: number, ...parts: (string | number)[]): Rng {
  return mulberry32(deriveSeed(rngSeed, ...parts));
}

/** An integer in [min, max] drawn from an Rng. */
export function rollInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng.next() * (max - min + 1));
}
