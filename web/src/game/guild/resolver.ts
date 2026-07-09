// The quest resolver (§10) — turns a quest + party + seed into an AdventureLog of
// graded beats. Pure and deterministic: same inputs → same log, so a stored seed
// regenerates the exact adventure the player read (slice-2 replay comes free).
// NO combat engine is called; the combat beat is a graded roll like the others.

import { mulberry32 } from "../battle/rng";
import { partyAttr, partyTraitMod } from "./roster";
import type { QuestDef, BeatDef } from "./quests";
import type { AdventureLog, Beat, Grade } from "./types";

const GRADE_ORDER: Grade[] = ["fail", "poor", "ok", "good", "crit"];

/** Grade a beat from the ratio of (party power × variance) to its difficulty. */
function gradeFor(ratio: number): Grade {
  if (ratio >= 1.5) return "crit";
  if (ratio >= 1.15) return "good";
  if (ratio >= 0.9) return "ok";
  if (ratio >= 0.72) return "poor";
  return "fail";
}

function isStrong(g: Grade): boolean {
  return g === "good" || g === "crit";
}

/** Resolve one beat def against a party, given a carried momentum modifier and a
 * difficulty multiplier (recovery branches raise it). Returns the Beat + grade. */
function resolveBeat(
  def: BeatDef,
  partyId: string,
  rng: { next(): number },
  carry: number,
  diffMult: number,
  branch?: Beat["branch"],
): Beat {
  const base = partyAttr(partyId, def.attr);
  const trait = partyTraitMod(partyId, def.type);
  const power = base + trait.delta + carry;
  const roll = rng.next();
  const variance = 0.6 + roll * 0.7; // [0.6, 1.3] — wide enough that quality separates
  const ratio = (power * variance) / (def.difficulty * diffMult);
  const grade = gradeFor(ratio);
  return {
    id: branch ? `${def.id}-${branch}` : def.id,
    type: def.type,
    location: def.location,
    grade,
    roll,
    text: def.narration[grade],
    traitBlurb: trait.blurb && trait.delta !== 0 ? trait.blurb : undefined,
    branch,
  };
}

export interface ResolveInput {
  quest: QuestDef;
  partyId: string;
  cutPct: number;
  durationDays: number;
  seed: number;
}

export function resolveQuest({ quest, partyId, cutPct, durationDays, seed }: ResolveInput): AdventureLog {
  const rng = mulberry32(seed);
  const beats: Beat[] = [];
  let carry = 0;
  let failed = false;
  let bonusUnlocked = false;

  for (const def of quest.beats) {
    const beat = resolveBeat(def, partyId, rng, carry, 1);
    beats.push(beat);

    if (isStrong(beat.grade)) {
      carry += 1; // small momentum — not enough to make a strong start unfailable
      if (def.unlocksBonus) bonusUnlocked = true;
    } else if (beat.grade === "poor") {
      carry -= 1;
    } else if (beat.grade === "fail") {
      if (def.critical) {
        // Forced hard branch: a recovery beat at raised difficulty (§10).
        const recovery = resolveBeat(def, partyId, rng, carry - 2, 1.3, "recovery");
        beats.push(recovery);
        if (recovery.grade === "fail" || recovery.grade === "poor") {
          failed = true;
          break;
        }
        carry -= 1;
      } else {
        carry -= 2;
      }
    }
  }

  // The optional bonus beat, appended when a strong result unlocked it and the
  // quest didn't already fail.
  if (bonusUnlocked && !failed && quest.bonusBeat) {
    beats.push(resolveBeat(quest.bonusBeat, partyId, rng, carry, 1, "bonus"));
  }

  const reward = quest.dailyRate * durationDays;
  const outcome: AdventureLog["outcome"] = failed ? "failure" : "success";
  // A bonus beat sweetens the reward; a poor overall run trims it a touch (the
  // pool the guild takes its cut of).
  const bonusBeat = beats.find((b) => b.branch === "bonus");
  const bonusMult = bonusBeat ? 1 + Math.max(0, GRADE_ORDER.indexOf(bonusBeat.grade) - 1) * 0.08 : 1;
  const effReward = outcome === "success" ? Math.round(reward * bonusMult) : 0;
  const guildCut = Math.round((effReward * cutPct) / 100);

  return { beats, outcome, reward: effReward, guildCut, cutPct, durationDays };
}
