// The Skills v3 resolution check (docs/CHALLENGE_SYSTEM.md §Check formula,
// §Difficulty and presentation, §Result language). Pure and deterministic:
//
//   Score = round((Attribute + Skill) × (1 + modifierPercent)) + 2d6
//   Target = 6 + 0.30 × Difficulty            (Difficulty on the visible 0–100 scale)
// modifierPercent is clamped to ±MOD_CAP and quantised to whole percent, so the
// capability product is exact in floating point before it is rounded.
//   Result = the RESULT_LADDER band that Score/Target × 100 falls in
//
// Design intent (Stefan, 2026-09-30): the 2d6 is a tight wobble; capability and
// modifiers decide the check. The unmodified ceiling is Attr 10 + Skill 20 + 12 =
// 42, so Triumph at the top of the difficulty scale needs modifiers — on purpose.
//
// ENGINE ONLY. Nothing in the live v1 sim (resolver.ts) imports this yet; the
// wire slice does that once heroes carry v3 attributes and skills.

import type { Rng } from "../../battle/rng";
import { ATTR_MAX } from "../content/attributes";
import { SKILL_MAX } from "../content/skills";
import { RESULT_LADDER, type ResultId } from "../content/ladder";

/** Target = TARGET_BASE + TARGET_PER_DIFFICULTY × difficulty, computed as
 * TARGET_BASE + round(TARGET_PER_DIFFICULTY_PCT × d / 100) in integer math so the
 * rounding is exact, never a float artefact. */
export const TARGET_BASE = 6;
export const TARGET_PER_DIFFICULTY_PCT = 30;
export const TARGET_PER_DIFFICULTY = TARGET_PER_DIFFICULTY_PCT / 100;
/** The summed percentage modifier is clamped to ±MOD_CAP of capability. */
export const MOD_CAP = 0.3;
/** Difficulty's visible scale. */
export const DIFFICULTY_MIN = 0;
export const DIFFICULTY_MAX = 100;

export interface CheckInput {
  /** Governing attribute value (0..ATTR_MAX). */
  attr: number;
  /** Skill value (0..SKILL_MAX). */
  skill: number;
  /** Summed percentage modifier as a fraction (+0.1 = +10%). Clamped to ±MOD_CAP. */
  modPct?: number;
  /** Visible 0–100 difficulty; rounded + clamped. */
  difficulty: number;
}

export interface CheckResult {
  dice: [number, number];
  /** round((attr + skill) × (1 + clampedMod)) — an integer. */
  capability: number;
  /** capability + dice total — an integer. */
  score: number;
  /** The integer target the score was measured against. */
  target: number;
  /** score / target × 100, for display only (bands are decided in integer math). */
  pct: number;
  result: ResultId;
  /** The ladder's contribution value (−3 / −1 / 0 / +1 / +3). */
  value: number;
}

function finite(n: number, name: string): number {
  if (typeof n !== "number" || !Number.isFinite(n)) throw new Error(`${name} must be a finite number, got ${n}`);
  return n;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Normalise an input into the engine's domain (throw on non-finite, clamp the rest). */
export function normalizeInput(input: CheckInput): Required<CheckInput> {
  return {
    attr: clamp(Math.round(finite(input.attr, "attr")), 0, ATTR_MAX),
    skill: clamp(Math.round(finite(input.skill, "skill")), 0, SKILL_MAX),
    // Whole percent: 0.1 becomes 10/100 exactly, so (A+S) × (100 + pct) / 100 is exact.
    modPct: Math.round(clamp(finite(input.modPct ?? 0, "modPct"), -MOD_CAP, MOD_CAP) * 100) / 100,
    difficulty: clamp(Math.round(finite(input.difficulty, "difficulty")), DIFFICULTY_MIN, DIFFICULTY_MAX),
  };
}

/** Visible difficulty → integer check target. Exact: 6 + round(3d / 10). */
export function targetFor(difficulty: number): number {
  const d = clamp(Math.round(finite(difficulty, "difficulty")), DIFFICULTY_MIN, DIFFICULTY_MAX);
  return TARGET_BASE + Math.round((TARGET_PER_DIFFICULTY_PCT * d) / 100);
}

/** Integer capability: (attr + skill) × (1 + clamped modPct), rounded half-up. */
export function capabilityFor(attr: number, skill: number, modPct = 0): number {
  const n = normalizeInput({ attr, skill, modPct, difficulty: 0 });
  return Math.round(((n.attr + n.skill) * (100 + Math.round(n.modPct * 100))) / 100);
}

/** Exactly two draws, in order: die 1 then die 2, each 1..6. */
export function roll2d6(rng: Rng): [number, number] {
  const d1 = 1 + Math.floor(rng.next() * 6);
  const d2 = 1 + Math.floor(rng.next() * 6);
  return [d1, d2];
}

/** The ladder band for an integer score against an integer target. Integer math:
 * score × 100 ≥ target × bandLo, half-open [lo, hi), Triumph's hi is Infinity. */
export function bandFor(score: number, target: number): ResultId {
  if (!Number.isInteger(score) || !Number.isInteger(target) || target <= 0) {
    throw new Error(`bandFor needs integer score and positive integer target, got ${score}/${target}`);
  }
  const s = score * 100;
  for (const band of RESULT_LADDER) {
    const lo = target * band.bandLo;
    const hi = band.bandHi === Infinity ? Infinity : target * band.bandHi;
    if (s >= lo && s < hi) return band.id;
  }
  // score < 0 can only happen with a negative capability, which normalizeInput forbids.
  return RESULT_LADDER[0].id;
}

const VALUE_OF: Record<ResultId, number> = Object.fromEntries(RESULT_LADDER.map((r) => [r.id, r.value])) as Record<
  ResultId,
  number
>;

export function valueOf(result: ResultId): number {
  return VALUE_OF[result];
}

/** Resolve one check. Consumes exactly two rng draws. */
export function resolveCheck(input: CheckInput, rng: Rng): CheckResult {
  const n = normalizeInput(input);
  const capability = capabilityFor(n.attr, n.skill, n.modPct);
  const target = targetFor(n.difficulty);
  const dice = roll2d6(rng);
  const score = capability + dice[0] + dice[1];
  const result = bandFor(score, target);
  return { dice, capability, score, target, pct: (score / target) * 100, result, value: valueOf(result) };
}

/** P(2d6 = k) as a count out of 36, k = 2..12. */
export const DICE_WAYS: Readonly<Record<number, number>> = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };

export type Distribution = Record<ResultId, number>;

/** Exact P(result) for an input, by enumerating the 36 dice outcomes. No rng. */
export function checkDistribution(input: CheckInput): Distribution {
  const n = normalizeInput(input);
  const capability = capabilityFor(n.attr, n.skill, n.modPct);
  const target = targetFor(n.difficulty);
  const dist = Object.fromEntries(RESULT_LADDER.map((r) => [r.id, 0])) as Distribution;
  for (let total = 2; total <= 12; total++) {
    dist[bandFor(capability + total, target)] += DICE_WAYS[total] / 36;
  }
  return dist;
}

/** P(Success or Triumph). */
export function pSuccess(dist: Distribution): number {
  return dist.success + dist.triumph;
}

/** The story-meter mapping for the wire slice (docs/CHALLENGE_SYSTEM.md
 * §Difficulty: thresholds need ≥5–10 points of visual gap). Piecewise-linear from
 * pct-of-target into each band's own 0–100 zone, so the needle always lands in the
 * zone the result names. Zone gaps are 20/20/25/15 — all ≥ 10. */
export const METER_ZONES: Readonly<Record<ResultId, [number, number]>> = {
  "critical-failure": [0, 20],
  failure: [20, 40],
  insufficient: [40, 60],
  success: [60, 85],
  triumph: [85, 100],
};

/** The pct at which the Triumph zone saturates (needle pinned at 100). */
export const METER_PCT_MAX = 160;

export function meterFor(score: number, target: number): number {
  const band = bandFor(score, target);
  const row = RESULT_LADDER.find((r) => r.id === band)!;
  const pct = (score / target) * 100;
  const lo = row.bandLo;
  const hi = row.bandHi === Infinity ? METER_PCT_MAX : row.bandHi;
  const [zLo, zHi] = METER_ZONES[band];
  const t = clamp((pct - lo) / (hi - lo), 0, 1);
  const raw = Math.round(zLo + (zHi - zLo) * t);
  // Rounding never escapes the zone (zHi belongs to the next band, except Triumph's 100).
  return Math.min(raw, band === "triumph" ? 100 : zHi - 1);
}
