// v2 content vocabulary — the six Attributes (docs/CHALLENGE_SYSTEM.md §Attributes).
//
// AUTHORED-BUT-NOT-WIRED: this is the challenge-system v2 vocabulary the content
// pipeline authors against. It is deliberately SEPARATE from the shipped v1 sim
// (web/src/game/guild/*.ts still runs on the 4-attribute str/dex/sta/per model and
// the crit/good/ok/poor/fail grade ladder). Nothing here is consumed by the sim
// yet — this slice is the funnel, not the consumer. When the challenge system is
// implemented, the sim migrates onto this vocabulary and the v1 ladder is
// superseded (CHALLENGE_SYSTEM.md §"Supersession note").
//
// DATA ONLY — no logic lives in this file. Validation lives in schema.ts; the
// `as const` table is the single source the validator and the SkillId/AttrId
// unions derive from, so a typo is caught at compile time AND at test time.

/** The six Attributes, in the canonical order of CHALLENGE_SYSTEM.md §Attributes. */
export const ATTRIBUTES = [
  { id: "strength", label: "Strength" },
  { id: "dexterity", label: "Dexterity" },
  { id: "constitution", label: "Constitution" },
  { id: "intelligence", label: "Intelligence" },
  { id: "wisdom", label: "Wisdom" },
  { id: "charisma", label: "Charisma" },
] as const;

/** An attribute id — a compile-time union derived from the table above. */
export type AttrId = (typeof ATTRIBUTES)[number]["id"];

/** The set of valid attribute ids, for the runtime validator (schema.ts). */
export const ATTR_IDS: readonly AttrId[] = ATTRIBUTES.map((a) => a.id);

/** Hard maximum for any Attribute (CHALLENGE_SYSTEM.md §Attributes). A newly
 * generated hero can start with at most 15; the ceiling of 20 is what content
 * numbers are range-checked against. */
export const ATTR_MAX = 20;
export const ATTR_START_MAX = 15;
