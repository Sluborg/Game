// Pure copy helpers for the StoryStage — kept out of the component so the
// context-aware effect notes are unit-testable (Review #1: a note must never
// state mechanics that aren't true for THIS beat — no "next check" claims on
// the final or bonus beat, and a good recovery still carries a penalty).

import { readPref, savePref } from "../kit";
import type { Beat, Grade } from "../../game/guild";

// Display ladder (Stefan's benchmark words). The Grade UNION literals are
// persisted + fixture-pinned — labels only, never the keys.
export const GRADE_LABEL: Record<Grade, string> = {
  crit: "Triumph",
  good: "Great",
  ok: "Success",
  poor: "Poor",
  fail: "Botch",
};

/** The one-line consequence under the landed meter. `hasNext` = another beat
 * card follows this one in the displayed sequence. Returns null for no note. */
export function effectNote(beat: Beat, hasNext: boolean): string | null {
  if (beat.branch === "recovery") {
    // A recovery that passes still leaves the party rattled (carry −1); a
    // recovery that lands poor/fail ends the quest — the outcome card follows.
    if (beat.grade === "crit" || beat.grade === "good") return "They claw it back — rattled, but through.";
    if (beat.grade === "ok") return "They scrape out of the mess.";
    return "It slips away from them.";
  }
  if (beat.branch === "bonus") {
    if (beat.grade === "crit" || beat.grade === "good") return "A rich find.";
    if (beat.grade === "ok") return "A modest haul.";
    if (beat.grade === "poor") return "Not worth the trouble.";
    return "Nothing but dust.";
  }
  switch (beat.grade) {
    case "crit":
      return hasNext ? "A surge of momentum — the next check is eased." : "A flawless finish.";
    case "good":
      return hasNext ? "They press the advantage — the next check is eased." : "A strong finish.";
    case "ok":
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
export const SPEED_LABEL: Record<StorySpeed, string> = { slow: "Slow", normal: "Normal", fast: "Fast" };

export function readStorySpeed(): StorySpeed {
  return readPref<StorySpeed>(SPEED_KEY, SPEED_ORDER, "normal");
}

export function saveStorySpeed(speed: StorySpeed): void {
  savePref(SPEED_KEY, speed);
}
