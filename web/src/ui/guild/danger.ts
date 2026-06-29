// Road danger scale for the World Map. Derived from each edge's per-turn
// `encounterChance` (0..1). Five steps separated by hue AND brightness AND a
// distinct dash AND a word label, so danger reads even for colour-blind players.

export type DangerLevel = 1 | 2 | 3 | 4 | 5;

export const DANGER_COLOR: Record<DangerLevel, string> = {
  1: "#52C46B", // Safe   — green
  2: "#C9CC3A", // Calm   — chartreuse
  3: "#E0A21E", // Risky  — amber
  4: "#E8702A", // Unsafe — orange
  5: "#C92A2A", // Deadly — deep red
};

export const DANGER_DASH: Record<DangerLevel, string | undefined> = {
  1: undefined, // solid
  2: "6 4",
  3: "4 3",
  4: "2.6 2.4",
  5: "0.4 2.6", // dotted (round caps)
};

const DANGER_WORD: Record<DangerLevel, string> = {
  1: "Safe",
  2: "Calm",
  3: "Risky",
  4: "Unsafe",
  5: "Deadly",
};

export function dangerWord(level: DangerLevel): string {
  return DANGER_WORD[level];
}

/** Map an edge's per-turn roadside `encounterChance` (0..1) to a 1..5 level. */
export function dangerFromEncounter(chance: number): DangerLevel {
  if (chance <= 0.18) return 1;
  if (chance <= 0.3) return 2;
  if (chance <= 0.4) return 3;
  if (chance <= 0.48) return 4;
  return 5;
}
