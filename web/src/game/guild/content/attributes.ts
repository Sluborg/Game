// v2 content vocabulary — the Attributes (Skills v3, docs/GLOSSARY.md).
//
// AUTHORED-BUT-NOT-WIRED: the challenge-system v2/v3 vocabulary the content
// pipeline authors against, deliberately SEPARATE from the shipped v1 sim
// (web/src/game/guild/*.ts still runs the 4-attribute str/dex/sta/per model). This
// slice is the funnel, not the consumer — nothing here is imported by the sim.
//
// Skills v3 merges Intelligence + Wisdom into a single MIND attribute, so the set
// is five: three Physical, one Mental (Mind), one Social (Charisma). The pillars
// (docs/GLOSSARY.md) fall out of this grouping cleanly — see pillars.ts.
//
// DATA ONLY — validation lives in schema.ts.

/** The five Attributes, in canonical order. */
export const ATTRIBUTES = [
  { id: "strength", label: "Strength" },
  { id: "dexterity", label: "Dexterity" },
  { id: "constitution", label: "Constitution" },
  { id: "mind", label: "Mind" },
  { id: "charisma", label: "Charisma" },
] as const;

/** An attribute id — a compile-time union derived from the table above. */
export type AttrId = (typeof ATTRIBUTES)[number]["id"];

/** The set of valid attribute ids, for the runtime validator (schema.ts). */
export const ATTR_IDS: readonly AttrId[] = ATTRIBUTES.map((a) => a.id);

/** Hard maximum for any Attribute. A newly generated hero starts at ≤ 15; the
 * ceiling of 20 is what content numbers are range-checked against. */
export const ATTR_MAX = 20;
export const ATTR_START_MAX = 15;
