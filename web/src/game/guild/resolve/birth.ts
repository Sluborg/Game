// Standardized birth (docs/GLOSSARY.md §Attributes, §Skills): every hero gets
// BIRTH_TOTAL (14) attribute points, each attribute in [BIRTH_MIN, BIRTH_MAX] =
// [2, 4], and a starting skill kit of one skill at 2 and three others at 1.
//
// Algorithm (no positional bias, always terminates): start every attribute at
// BIRTH_MIN (5 × 2 = 10), then place the remaining 4 points one at a time by
// drawing uniformly among the attributes still below BIRTH_MAX. Every attribute
// is equally likely to be the 4; the distribution over exact spreads is not
// uniform, which is fine. A 5 is impossible by construction and the total is
// always exactly 14.

import type { Rng } from "../../battle/rng";
import { ATTR_IDS, type AttrId } from "../content/attributes";
import { SKILL_IDS, type SkillId } from "../content/skills";
import { emptyProgress, type HeroProgress } from "./growth";

export const BIRTH_TOTAL = 14;
export const BIRTH_MIN = 2;
export const BIRTH_MAX = 4;
export const KIT_PRIMARY_LEVEL = 2;
export const KIT_SECONDARY_LEVEL = 1;
export const KIT_SECONDARY_COUNT = 3;

/** Pick an index in [0, n) from the rng. */
function pick(rng: Rng, n: number): number {
  return Math.floor(rng.next() * n);
}

export function birthHero(rng: Rng, primary: SkillId): HeroProgress {
  if (!SKILL_IDS.includes(primary)) throw new Error(`unknown primary skill: ${String(primary)}`);
  const p = emptyProgress();

  for (const a of ATTR_IDS) p.attrs[a] = BIRTH_MIN;
  let remaining = BIRTH_TOTAL - BIRTH_MIN * ATTR_IDS.length;
  while (remaining > 0) {
    const open: AttrId[] = ATTR_IDS.filter((a) => p.attrs[a] < BIRTH_MAX);
    const a = open[pick(rng, open.length)];
    p.attrs[a] += 1;
    remaining -= 1;
  }

  p.skills[primary] = KIT_PRIMARY_LEVEL;
  const pool: SkillId[] = SKILL_IDS.filter((s) => s !== primary);
  for (let i = 0; i < KIT_SECONDARY_COUNT; i++) {
    const idx = pick(rng, pool.length);
    p.skills[pool[idx]] = KIT_SECONDARY_LEVEL;
    pool.splice(idx, 1); // without replacement
  }
  return p;
}
