// The 3 pre-made heroes of Slice 1's one fixed party, "The Iron Vigil".
//
// NOTE (roster duplication, decided in Review #1): this is the world-state,
// serializable source of truth for the guild loop. The Heroes SCREEN still
// renders its own display mock (ui/heroes/mockHeroes.ts). The two share fiction
// (Ysolt, Doran) but are intentionally separate until Slice 3, when CV
// correction makes world-state the single source and the Heroes screen reads
// from it. Keeping them apart now avoids coupling the frozen-ish UI mock to the
// new economy model.
//
// `quality` is ground truth the resolver reads (never shown). The `cvs` are the
// guild's ESTIMATE of that hero, rendered with §5 certainty — honest but static
// in Slice 1 (no correction yet). Mean party quality ≈ 0.48 → a Ruins delve
// lands around 62% (inside §12's 50–75% band).

import type { Hero } from "./types";

export const STARTER_HEROES: Hero[] = [
  {
    id: "ysolt",
    name: "Ysolt Vane",
    archetype: "Champion",
    quality: 0.62,
    cvs: [
      { label: "STR", value: 78, certainty: "verified" },
      { label: "STA", value: 71, certainty: "verified" },
      { label: "DEX", value: 55, certainty: "claimed" },
      { label: "PER", value: 40, certainty: "rumor" },
    ],
  },
  {
    id: "doran",
    name: "Doran Fell",
    archetype: "Outrider",
    quality: 0.45,
    cvs: [
      { label: "DEX", value: 66, certainty: "verified" },
      { label: "PER", value: 58, certainty: "claimed" },
      { label: "STR", value: 47, certainty: "claimed" },
      { label: "STA", value: 44, certainty: "rumor" },
    ],
  },
  {
    id: "bryn",
    name: "Bryn Salt",
    archetype: "Sellsword",
    quality: 0.38,
    cvs: [
      { label: "STR", value: 52, certainty: "claimed" },
      { label: "STA", value: 49, certainty: "rumor" },
      { label: "DEX", value: 38, certainty: "rumor" },
    ],
  },
];

export const STARTER_PARTY_NAME = "The Iron Vigil";

/** Mean ground-truth quality of a set of heroes (0..1) — the resolver's input. */
export function partyQuality(heroes: Hero[]): number {
  if (heroes.length === 0) return 0;
  return heroes.reduce((s, h) => s + h.quality, 0) / heroes.length;
}
