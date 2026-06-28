// Danger scale: maps an edge's danger level (1 safe .. 5 deadly) to a stroke color,
// dash pattern, and short label. Colors come from the existing palette plus one
// added yellow-green shade.

import { colors } from "../../theme";
import type { DangerLevel, ResultKind } from "../../../game/campaign/types";

export const DANGER_COLOR: Record<DangerLevel, string> = {
  1: colors.forestGreen, // SAFE
  2: "#A8C64A", // yellow-green
  3: colors.goldDark, // caution
  4: colors.emberOrange, // UNSAFE
  5: colors.bloodRed, // deadly
};

// Dashes lengthen / tighten as danger rises (solid when safe).
export const DANGER_DASH: Record<DangerLevel, string | undefined> = {
  1: undefined,
  2: undefined,
  3: "10 6",
  4: "10 6",
  5: "6 6",
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
