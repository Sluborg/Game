// Danger scale: maps an edge's danger level (1 safe .. 5 deadly) to a stroke color,
// dash pattern, and short label. Colors come from the existing palette plus one
// added yellow-green shade.

import { colors } from "../../theme";
import type { DangerLevel, ResultKind } from "../../../game/campaign/types";

// Five distinct steps separated by both hue AND brightness, so they read apart
// even for colour-blind players (and the word label is a third, non-colour cue).
export const DANGER_COLOR: Record<DangerLevel, string> = {
  1: colors.forestGreen, // Safe   — green   #52C46B
  2: "#C9CC3A", //           Calm   — chartreuse
  3: "#E0A21E", //           Risky  — amber
  4: "#E8702A", //           Unsafe — orange
  5: "#C92A2A", //           Deadly — deep red
};

// Each level gets its own dash signature (solid → long → medium → short → dotted),
// giving danger a redundant, non-colour encoding.
export const DANGER_DASH: Record<DangerLevel, string | undefined> = {
  1: undefined, // solid
  2: "6 4",
  3: "4 3",
  4: "2.6 2.4",
  5: "0.4 2.6", // dotted (with round caps)
};

const DANGER_WORD: Record<DangerLevel, string> = {
  1: "Safe",
  2: "Calm",
  3: "Risky",
  4: "Unsafe",
  5: "Deadly",
};

/** Compact map label: just the level word (color + dash convey the rest). */
export function dangerWord(level: DangerLevel): string {
  return DANGER_WORD[level];
}

/** Full label for tooltips: "Unsafe · ☠☠☠☠" — word plus one skull per level. */
export function dangerLabel(level: DangerLevel): string {
  return `${DANGER_WORD[level]} · ${"☠".repeat(level)}`;
}

/** Color a report line by its kind, mirroring theme.logColor. */
export function reportColor(kind: ResultKind): string {
  switch (kind) {
    case "arrival":
      return colors.goldCoin;
    case "transit":
      return colors.royalPurpleLight;
    case "idle":
      return colors.parchmentDark;
    case "action":
    default:
      return colors.parchmentBeige;
  }
}
