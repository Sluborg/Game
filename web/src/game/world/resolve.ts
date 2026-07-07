// Seeded probability resolver. Slice 1 resolves a quest as a single seeded roll
// whose odds read the party's ground-truth quality — NOT a per-hit combat sim
// (that, and the §11 D1a engine seam it would need, arrive with Slice 2). The
// roll is drawn from the world RNG cursor so an End Day is reproducible.

import { RESOLVE, type QuestTier } from "./economy";
import { nextFloat, type RngCursor } from "./rng";

/** Success probability for a tier given mean party quality (0..1). */
export function successChance(tier: QuestTier, quality: number): number {
  if (tier === "road") {
    return clamp01(RESOLVE.roadBase + RESOLVE.roadQualityBonus * quality);
  }
  // Ruins: 0.50..0.75 by party quality — the growth gamble where reading CVs pays.
  return clamp(
    RESOLVE.ruinsFloor + RESOLVE.ruinsQualitySpan * quality,
    RESOLVE.ruinsFloor,
    RESOLVE.ruinsFloor + RESOLVE.ruinsQualitySpan,
  );
}

/** Rolls the outcome, advancing the cursor. */
export function rollSuccess(tier: QuestTier, quality: number, c: RngCursor): boolean {
  return nextFloat(c) < successChance(tier, quality);
}

function clamp01(x: number): number {
  return clamp(x, 0, 1);
}
function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
