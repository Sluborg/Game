// v2 content vocabulary — the five-band result ladder (docs/CHALLENGE_SYSTEM.md
// §"Result language and values"). DATA ONLY — no logic here.
//
// This is the ONE table, mirrored verbatim from the contract so a copy-paste can
// never misalign name ↔ value ↔ band. It REPLACES the shipped v1 meter ladder
// (Botch / Poor / Success / Great / Triumph) when the challenge system lands — the
// two never coexist (CHALLENGE_SYSTEM.md §"Supersession note"). Note "Success"
// names a different tier in each: the v1 middle tier vs. this ladder's second-best.
//
// Content NEVER authors a result value or band — only, at most, a result NAME.
// The value (−3/−1/0/+1/+3) and the working band are fixed here and derived.

/** One result band: player-facing name, internal contribution value, and the
 * working percentage band (a tuning hypothesis, not locked balance). */
export const RESULT_LADDER = [
  { id: "critical-failure", name: "Critical Failure", value: -3, bandLo: 0, bandHi: 60 },
  { id: "failure", name: "Failure", value: -1, bandLo: 60, bandHi: 80 },
  { id: "insufficient", name: "Insufficient", value: 0, bandLo: 80, bandHi: 100 },
  { id: "success", name: "Success", value: 1, bandLo: 100, bandHi: 120 },
  { id: "triumph", name: "Triumph", value: 3, bandLo: 120, bandHi: Infinity },
] as const;

/** A result-band id — compile-time union derived from the ladder. */
export type ResultId = (typeof RESULT_LADDER)[number]["id"];

/** The set of valid result-band ids, for the runtime validator. */
export const RESULT_IDS: readonly ResultId[] = RESULT_LADDER.map((r) => r.id);

/** The canonical contribution values, in ladder order: −3 / −1 / 0 / +1 / +3.
 * The vocabulary-integrity test pins this so the table can never silently drift
 * from the authoring contract. */
export const RESULT_VALUES: readonly number[] = RESULT_LADDER.map((r) => r.value);
