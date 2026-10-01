// Calibration harness for the v3 wire: runs the REAL resolveQuest under both
// engines over fixed seeds and reports the quest-level stats the two engines must
// agree on (this slice's gate, wire.test.ts) and the v3-only "hero vs luck" view
// (docs/resolution-wire.md). Pure and deterministic: seeds 1..SEEDS, no clock, no
// Math.random, only the engines' own mulberry32 streams.

import { PARTY_DATA } from "../roster";
import { ROAD_JOB, RUINS, STANDING_JOBS, type BeatDef, type QuestDef } from "../quests";
import { resolveQuest } from "../resolver";
import type { Engine } from "../engine";
import type { HeroStatsMap } from "../types";
import { beatDistribution } from "./bridge";

export const SEEDS = 2000;
export const QUESTS: readonly QuestDef[] = [ROAD_JOB, RUINS, ...STANDING_JOBS];

/** Gate tolerances for THIS slice only (v3 is expected to diverge once growth
 * and feats land): quest success and bonus-unlock rates within ±10 percentage
 * points, mean strong beats per run within ±0.3. */
export const GATE = { success: 0.1, bonus: 0.1, strong: 0.3 } as const;

/** Parties that can actually take a quest (askMaxCut null gates a lone recruit out
 * of the Road and the Ruins, exactly as the board does). */
export function eligibleParties(quest: QuestDef): string[] {
  return PARTY_DATA.filter((p) => quest.tier === "standing" || p.askMaxCut[quest.tier] != null).map((p) => p.id);
}

export interface QuestStats {
  success: number;
  bonus: number;
  recovery: number;
  /** Mean number of strong (good|crit) beats per run. */
  strong: number;
}

export function questStats(quest: QuestDef, partyId: string, engine: Engine, seeds = SEEDS, stats?: HeroStatsMap): QuestStats {
  let ok = 0;
  let bonus = 0;
  let rec = 0;
  let strong = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const log = resolveQuest({ quest, partyId, cutPct: 10, durationDays: 1, seed, engine, stats });
    if (log.outcome === "success") ok++;
    if (log.beats.some((b) => b.branch === "bonus")) bonus++;
    if (log.beats.some((b) => b.branch === "recovery")) rec++;
    strong += log.beats.filter((b) => b.grade === "good" || b.grade === "crit").length;
  }
  return { success: ok / seeds, bonus: bonus / seeds, recovery: rec / seeds, strong: strong / seeds };
}

export interface CalibrationRow {
  quest: QuestDef;
  partyId: string;
  v1: QuestStats;
  v3: QuestStats;
}

export function calibrationRows(seeds = SEEDS): CalibrationRow[] {
  const rows: CalibrationRow[] = [];
  for (const quest of QUESTS) {
    for (const partyId of eligibleParties(quest)) {
      rows.push({ quest, partyId, v1: questStats(quest, partyId, "v1", seeds), v3: questStats(quest, partyId, "v3", seeds) });
    }
  }
  return rows;
}

/** Every beat of a quest, bonus beat last. */
export function questBeats(quest: QuestDef): BeatDef[] {
  return [...quest.beats, ...(quest.bonusBeat ? [quest.bonusBeat] : [])];
}

/** The share of the single most likely result for a party on a beat (v3 only,
 * exact, no carry): high means the hero decides the check, low means luck does. */
export function modalShare(partyId: string, beat: BeatDef): number {
  return Math.max(...Object.values(beatDistribution(partyId, beat)));
}
