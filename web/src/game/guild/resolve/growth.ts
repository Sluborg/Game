// Grow-from-use (docs/CHALLENGE_SYSTEM.md §Progression and Feats). Numbers grow
// from what a hero is sent to do: the tested Skill gains XP on every use, its
// governing Attribute only on a Success or Triumph, and each level costs more.
//
//   skill level n → n+1 costs SKILL_XP_PER_LEVEL × max(n, 1)   (5n; 0 → 1 costs 5)
//   attr  level n → n+1 costs ATTR_XP_PER_LEVEL × max(n, 1)    (20n)
//   skill XP per use: SKILL_XP_USE (1), or SKILL_XP_SUCCESS (2) on Success/Triumph
//   attr  XP per use: ATTR_XP_SUCCESS (1) on Success/Triumph, else 0
//
// Caps are independent: a Skill at 20 still feeds its Attribute; XP at a cap is
// discarded. Pure: applyUse returns a new HeroProgress, never mutates.

import { ATTR_IDS, ATTR_MAX, type AttrId } from "../content/attributes";
import { SKILL_ATTR, SKILL_IDS, SKILL_MAX, type SkillId } from "../content/skills";
import type { ResultId } from "../content/ladder";

export const SKILL_XP_PER_LEVEL = 5;
export const ATTR_XP_PER_LEVEL = 20;
export const SKILL_XP_USE = 1;
export const SKILL_XP_SUCCESS = 2;
export const ATTR_XP_SUCCESS = 1;
/** A supporting member's skill XP on a Success or Triumph. */
export const SKILL_XP_SUPPORT = 1;

export interface HeroProgress {
  attrs: Record<AttrId, number>;
  skills: Record<SkillId, number>;
  /** XP banked toward the NEXT level of each attribute / skill. */
  xp: { attrs: Record<AttrId, number>; skills: Record<SkillId, number> };
}

export interface UseOutcome {
  progress: HeroProgress;
  /** Levels gained on the skill this use (0 when none). */
  skillUp: number;
  /** Levels gained on the governing attribute this use (0 when none). */
  attrUp: number;
}

/** An untrained (0) skill is not free: 0 → 1 costs the same as 1 → 2. */
export function skillXpToNext(level: number): number {
  return SKILL_XP_PER_LEVEL * Math.max(1, level);
}

export function attrXpToNext(level: number): number {
  return ATTR_XP_PER_LEVEL * Math.max(1, level);
}

/** Total XP from level `from` to level `to` (sum of per-level costs). */
export function skillXpBetween(from: number, to: number): number {
  let sum = 0;
  for (let n = from; n < to; n++) sum += skillXpToNext(n);
  return sum;
}

export function attrXpBetween(from: number, to: number): number {
  let sum = 0;
  for (let n = from; n < to; n++) sum += attrXpToNext(n);
  return sum;
}

export function isSuccess(result: ResultId): boolean {
  return result === "success" || result === "triumph";
}

function cloneProgress(p: HeroProgress): HeroProgress {
  return {
    attrs: { ...p.attrs },
    skills: { ...p.skills },
    xp: { attrs: { ...p.xp.attrs }, skills: { ...p.xp.skills } },
  };
}

/** Bank XP, then level up while the bank covers the next cost (remainder carries).
 * At the cap the bank is discarded (stays 0). Returns [level, bank, levelsGained]. */
function advance(level: number, bank: number, gain: number, cap: number, cost: (n: number) => number): [number, number, number] {
  if (level >= cap) return [cap, 0, 0];
  let b = bank + gain;
  let l = level;
  let gained = 0;
  while (l < cap && b >= cost(l)) {
    b -= cost(l);
    l += 1;
    gained += 1;
  }
  if (l >= cap) b = 0;
  return [l, b, gained];
}

/** One use of a skill with the check's result. */
export function applyUse(progress: HeroProgress, skill: SkillId, result: ResultId): UseOutcome {
  if (!SKILL_IDS.includes(skill)) throw new Error(`unknown skill: ${String(skill)}`);
  const next = cloneProgress(progress);
  const success = isSuccess(result);
  const attr = SKILL_ATTR[skill];

  const [sl, sb, skillUp] = advance(
    next.skills[skill],
    next.xp.skills[skill],
    success ? SKILL_XP_SUCCESS : SKILL_XP_USE,
    SKILL_MAX,
    skillXpToNext,
  );
  next.skills[skill] = sl;
  next.xp.skills[skill] = sb;

  const [al, ab, attrUp] = advance(next.attrs[attr], next.xp.attrs[attr], success ? ATTR_XP_SUCCESS : 0, ATTR_MAX, attrXpToNext);
  next.attrs[attr] = al;
  next.xp.attrs[attr] = ab;

  return { progress: next, skillUp, attrUp };
}

export interface SupportOutcome {
  progress: HeroProgress;
  skillUp: number;
}

/** A SUPPORTING party member's share of an encounter someone else led: +1 skill XP
 * on a Success or Triumph, nothing on anything else, and never attribute XP. (Wire B:
 * differentiates the party without letting the best member pull away alone.) */
export function applySupport(progress: HeroProgress, skill: SkillId, result: ResultId): SupportOutcome {
  if (!SKILL_IDS.includes(skill)) throw new Error(`unknown skill: ${String(skill)}`);
  const next = cloneProgress(progress);
  if (!isSuccess(result)) return { progress: next, skillUp: 0 };
  const [sl, sb, skillUp] = advance(next.skills[skill], next.xp.skills[skill], SKILL_XP_SUPPORT, SKILL_MAX, skillXpToNext);
  next.skills[skill] = sl;
  next.xp.skills[skill] = sb;
  return { progress: next, skillUp };
}

/** An all-zero progress record (a blank slate; birth.ts fills the real kit). */
export function emptyProgress(): HeroProgress {
  const attrs = Object.fromEntries(ATTR_IDS.map((a) => [a, 0])) as Record<AttrId, number>;
  const skills = Object.fromEntries(SKILL_IDS.map((s) => [s, 0])) as Record<SkillId, number>;
  return { attrs, skills, xp: { attrs: { ...attrs }, skills: { ...skills } } };
}
