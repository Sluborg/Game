// Pure copy helpers for the StoryStage — kept out of the component so the
// context-aware effect notes are unit-testable (Review #1: a note must never
// state mechanics that aren't true for THIS beat — no "next check" claims on
// the final or bonus beat, and a good recovery still carries a penalty).

import { readPref, savePref } from "../kit";
import { GRADE_ZONES, type Beat, type Grade } from "../../game/guild";

// Display ladder (Stefan's benchmark words). The Grade UNION literals are
// persisted + fixture-pinned — labels only, never the keys.
export const GRADE_LABEL: Record<Grade, string> = {
  crit: "Triumph",
  good: "Great",
  ok: "Success",
  poor: "Poor",
  fail: "Botch",
};

/** The v3 result names (docs/CHALLENGE_SYSTEM.md §Result language), keyed by the
 * SAME grade slot the v3 engine maps each result onto (wire/bridge.ts), so the
 * ticker, the landed word and the aria text can never disagree. */
export const V3_LABEL: Record<Grade, string> = {
  crit: "Triumph",
  good: "Success",
  ok: "Insufficient",
  poor: "Failure",
  fail: "Critical Failure",
};

/** True when the v3 engine produced this beat (it carries its check). */
export function isV3Beat(beat: Beat): boolean {
  return beat.check !== undefined;
}

/** True when any beat of this report was resolved by the v3 engine (per-report
 * truth: old stored v1 reports say nothing, so a mixed history is never mislabelled). */
export function logIsV3(beats: readonly Beat[]): boolean {
  return beats.some(isV3Beat);
}

/** THE label source for a grade slot: v3 names for a v3 log, the v1 benchmark
 * words otherwise. Every place that prints a grade word goes through this. */
export function labelFor(grade: Grade, v3: boolean): string {
  return v3 ? V3_LABEL[grade] : GRADE_LABEL[grade];
}

/** The one-line consequence under the landed meter. `hasNext` = another beat
 * card follows this one in the displayed sequence. Returns null for no note. */
export function effectNote(beat: Beat, hasNext: boolean): string | null {
  if (beat.branch === "recovery") {
    // A recovery that passes still leaves the party rattled (carry −1); a
    // recovery that lands poor/fail ends the quest — the outcome card follows.
    if (beat.grade === "crit" || beat.grade === "good") return "They claw it back — rattled, but through.";
    // v3 Insufficient did not meet the requirement: never worded as a clean pass.
    if (beat.grade === "ok") return isV3Beat(beat) ? "Not enough, but they get through." : "They scrape out of the mess.";
    return "It slips away from them.";
  }
  if (beat.branch === "bonus") {
    if (beat.grade === "crit" || beat.grade === "good") return "A rich find.";
    // v3 Insufficient means the requirement was NOT met: never a positive note.
    if (beat.grade === "ok") return isV3Beat(beat) ? "Not enough to find much." : "A modest haul.";
    if (beat.grade === "poor") return "Not worth the trouble.";
    return "Nothing but dust.";
  }
  switch (beat.grade) {
    case "crit":
      return hasNext ? "A surge of momentum — the next check is eased." : "A flawless finish.";
    case "good":
      return hasNext ? "They press the advantage — the next check is eased." : "A strong finish.";
    case "ok":
      // v3 Insufficient: short of the requirement, but costs nothing (value 0).
      if (isV3Beat(beat)) return hasNext ? "Not enough, but no lasting harm." : "Not enough, but it held.";
      return hasNext ? "They hold steady." : "Steady to the end.";
    case "poor":
      return hasNext ? "Shaken — the next check is harder." : "A ragged finish.";
    case "fail":
      // Generic on purpose: a critical fail is followed by the recovery card's
      // own banner, and a non-critical fail on the last beat can still precede
      // a "Quest complete" outcome — this line must survive both.
      return "It goes wrong.";
  }
}

/** Zone display order, worst → best (mirrors GRADE_ZONES' layout). */
export const ZONE_ORDER: Grade[] = ["fail", "poor", "ok", "good", "crit"];

/** Zone lookup for the meter's live grade ticker — derived from GRADE_ZONES
 * (no restated magic numbers) with crit's lower bound INCLUSIVE, matching
 * scoreFor's clamp (a crit beat can land at exactly 90 — Review #1
 * Adversary). Monotonic in pct, so a monotonic fill can never flash a grade
 * above its landing. */
export function gradeAt(pct: number): Grade {
  for (let i = ZONE_ORDER.length - 1; i > 0; i--) {
    if (pct >= GRADE_ZONES[ZONE_ORDER[i]][0]) return ZONE_ORDER[i];
  }
  return ZONE_ORDER[0];
}

/** Story pacing prefs (UI-only; never in GuildState). */
export type StorySpeed = "slow" | "normal" | "fast";
/** Full-bar (score 100) fill time per speed — actual duration scales with the
 * score so every check RISES at the same rate and the stop point stays unknown
 * (Review #1 Designer B1). */
export const FILL_BASE_MS: Record<StorySpeed, number> = { slow: 3000, normal: 1600, fast: 700 };
/** Pause after the meter lands before Auto advances (counts from fill-END). */
export const HOLD_MS: Record<StorySpeed, number> = { slow: 1700, normal: 1100, fast: 800 };
/** Delay before the fill starts, so the eye finds the bar first. */
export const FILL_DELAY_MS = 500;

const SPEED_KEY = "guild.ui.storySpeed";
export const SPEED_ORDER: StorySpeed[] = ["slow", "normal", "fast"];

export function readStorySpeed(): StorySpeed {
  return readPref<StorySpeed>(SPEED_KEY, SPEED_ORDER, "normal");
}

export function saveStorySpeed(speed: StorySpeed): void {
  savePref(SPEED_KEY, speed);
}
