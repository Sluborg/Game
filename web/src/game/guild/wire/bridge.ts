// The bridge between the live quest resolver and the Skills-v3 check engine
// (resolve/check.ts). It is the ONLY place both worlds meet: it reads the roster's
// v3 stats and a beat's Encounter (skill + diff3), builds the party's capability,
// runs the 2d6 check with the engine's primitives, and hands back a normal Beat
// whose GRADE SLOT (crit/good/ok/poor/fail) drives the unchanged carry / recovery /
// bonus logic in resolver.ts. The truth behind the slot rides on Beat.check.
//
//   capability = capabilityFor(lead attr, lead skill, traitPct)   (engine: integer, clamped)
//              + sizeBonus (members − 1) + carry                   (OUTSIDE the clamp), floored at 0
//   score      = capability + 2d6
//   target     = round(targetFor(diff3) × diffMult)                (recovery raises the TARGET)
//   result     = bandFor(score, target)        → slot: triumph→crit, success→good,
//                insufficient→ok, failure→poor, critical-failure→fail
//
// Stand-ins, documented in docs/resolution-wire.md: the flat size bonus and "best
// member leads" are placeholders for the open Cooperation Modes; trait deltas
// convert to percent at TRAIT_PCT_PER_DELTA.

import type { Rng } from "../../battle/rng";
import { RESULT_LADDER, type ResultId } from "../content/ladder";
import { SKILL_ATTR, type SkillId } from "../content/skills";
import { METER_PCT_MAX, bandFor, capabilityFor, roll2d6, targetFor } from "../resolve/check";
import type { BeatDef } from "../quests";
import { HERO_BY_ID, PARTY_BY_ID, partyTraitMod } from "../roster";
import type { Beat, BeatCheck, Grade, HeroData } from "../types";
import { GRADE_ZONES } from "../zones";

/** Each point of a v1 trait delta becomes this fraction of capability (the
 * engine clamps the summed percentage to ±30%). 0.03 makes a +4 trait +12%. */
export const TRAIT_PCT_PER_DELTA = 0.03;
/** Flat capability per extra party member (v1's size bonus, kept as a stand-in
 * for the open "lead / additive" Cooperation Modes). */
export const SIZE_BONUS_PER_EXTRA = 1;

/** v3 result → the v1 grade slot that carries the quest logic. */
export const RESULT_TO_GRADE: Record<ResultId, Grade> = {
  triumph: "crit",
  success: "good",
  insufficient: "ok",
  failure: "poor",
  "critical-failure": "fail",
};

export type EncounterSkill = SkillId | "combat";

/** A hero's (attribute, skill) pair for an encounter. Combat is the temporary
 * special rule: the best of Strength / Dexterity / Mind plus the Combat value —
 * the bridge owns this split, the engine only sees two numbers. */
export function encounterStats(hero: HeroData, skill: EncounterSkill): { attr: number; skill: number } {
  if (skill === "combat") {
    const a = hero.v3.attrs;
    return { attr: Math.max(a.strength, a.dexterity, a.mind), skill: hero.v3.combat };
  }
  return { attr: hero.v3.attrs[SKILL_ATTR[skill]], skill: hero.v3.skills[skill] ?? 0 };
}

/** The party member who leads an encounter: the highest (attr + skill), ties to
 * the earlier member. */
export function partyLead(partyId: string, skill: EncounterSkill): { heroId: string; attr: number; skill: number } {
  const party = PARTY_BY_ID[partyId];
  let best: { heroId: string; attr: number; skill: number } | null = null;
  for (const id of party.memberIds) {
    const st = encounterStats(HERO_BY_ID[id], skill);
    if (!best || st.attr + st.skill > best.attr + best.skill) best = { heroId: id, ...st };
  }
  return best!;
}

/** The integer capability a party brings to a beat (before dice). `carry` and the
 * size bonus are added after the engine's clamp; the total is floored at 0. */
export function partyCapability(partyId: string, def: Pick<BeatDef, "skill" | "type">, carry = 0): number {
  const lead = partyLead(partyId, def.skill);
  const trait = partyTraitMod(partyId, def.type);
  const base = capabilityFor(lead.attr, lead.skill, trait.delta * TRAIT_PCT_PER_DELTA);
  const size = (PARTY_BY_ID[partyId].memberIds.length - 1) * SIZE_BONUS_PER_EXTRA;
  return Math.max(0, base + size + carry);
}

/** The integer target for a beat; a recovery (diffMult > 1) raises the TARGET. */
export function beatTarget(diff3: number, diffMult = 1): number {
  return Math.max(1, Math.round(targetFor(diff3) * diffMult));
}

/** Place a check on the existing 0–100 story meter: linear inside the mapped
 * grade's own v1 zone (GRADE_ZONES) by score as % of target, so the zone marks and
 * every zone-honesty test keep working. Triumph saturates at METER_PCT_MAX. */
export function meterScoreFor(score: number, target: number, result: ResultId): number {
  const row = RESULT_LADDER.find((r) => r.id === result)!;
  const grade = RESULT_TO_GRADE[result];
  const pct = target > 0 ? (score / target) * 100 : 0;
  const hi = row.bandHi === Infinity ? METER_PCT_MAX : row.bandHi;
  const t = Math.min(1, Math.max(0, (pct - row.bandLo) / (hi - row.bandLo)));
  const [zLo, zHi] = GRADE_ZONES[grade];
  const raw = Math.round(zLo + (zHi - zLo) * t);
  return Math.max(zLo, Math.min(raw, grade === "crit" ? 100 : zHi - 1));
}

/** Resolve one beat with the v3 check. Same signature as the v1 resolveBeat so
 * resolver.ts can swap it in. Consumes exactly two rng draws (the dice). */
export function resolveBeatV3(
  def: BeatDef,
  partyId: string,
  rng: Rng,
  carry: number,
  diffMult: number,
  branch?: Beat["branch"],
): Beat {
  const trait = partyTraitMod(partyId, def.type);
  const capability = partyCapability(partyId, def, carry);
  const dice = roll2d6(rng);
  const score = capability + dice[0] + dice[1];
  const target = beatTarget(def.diff3, diffMult);
  const result = bandFor(score, target);
  const grade = RESULT_TO_GRADE[result];
  const check: BeatCheck = { dice, capability, score, target, result };
  return {
    id: branch ? `${def.id}-${branch}` : def.id,
    type: def.type,
    location: def.location,
    grade,
    roll: (dice[0] + dice[1] - 2) / 10, // 0..1, from the dice (a v3 beat has no separate roll)
    score: meterScoreFor(score, target, result),
    text: def.narration[grade],
    traitBlurb: trait.blurb && trait.delta !== 0 ? trait.blurb : undefined,
    branch,
    check,
  };
}

/** Exact per-beat result distribution for a party (no carry, no recovery): used by
 * the calibration harness and docs. Enumerates the 36 dice outcomes. */
export function beatDistribution(partyId: string, def: Pick<BeatDef, "skill" | "type" | "diff3">, carry = 0, diffMult = 1): Record<ResultId, number> {
  const capability = partyCapability(partyId, def, carry);
  const target = beatTarget(def.diff3, diffMult);
  const dist = Object.fromEntries(RESULT_LADDER.map((r) => [r.id, 0])) as Record<ResultId, number>;
  const ways: Record<number, number> = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };
  for (let total = 2; total <= 12; total++) dist[bandFor(capability + total, target)] += ways[total] / 36;
  return dist;
}
