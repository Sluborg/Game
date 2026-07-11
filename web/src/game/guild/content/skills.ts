// v2 content vocabulary — the fifteen Skills and their governing Attributes
// (docs/CHALLENGE_SYSTEM.md §Skills). DATA ONLY — no logic here.
//
// This table is the single source of truth for skill references. Every challenge
// check names a skill by id; the governing Attribute is DERIVED from this table,
// never stored alongside the check (so an author can't file "Research" under
// "Strength" — there is one place the mapping lives).
//
// Combat is deliberately ABSENT: it is a temporary special rule, not a 16th
// ordinary Skill (CHALLENGE_SYSTEM.md §"Temporary Combat rule"). Combat challenges
// are authored in the later dedicated combat slice; the validator rejects any
// check that names "combat" today.

import type { AttrId } from "./attributes";

/** The 15-skill table, grouped by governing Attribute exactly as
 * CHALLENGE_SYSTEM.md §Skills lists them. `attr` must be an AttrId (compile-checked). */
export const SKILLS = [
  // Strength
  { id: "force", label: "Force", attr: "strength" },
  { id: "intimidation", label: "Intimidation", attr: "strength" },
  // Dexterity
  { id: "stealth", label: "Stealth", attr: "dexterity" },
  { id: "athletics", label: "Athletics", attr: "dexterity" },
  // Constitution
  { id: "endurance", label: "Endurance", attr: "constitution" },
  { id: "resist", label: "Resist", attr: "constitution" },
  // Intelligence
  { id: "research", label: "Research", attr: "intelligence" },
  { id: "arcana", label: "Arcana", attr: "intelligence" },
  { id: "planning", label: "Planning", attr: "intelligence" },
  // Wisdom
  { id: "survival", label: "Survival", attr: "wisdom" },
  { id: "investigation", label: "Investigation", attr: "wisdom" },
  { id: "medicine", label: "Medicine", attr: "wisdom" },
  // Charisma
  { id: "persuasion", label: "Persuasion", attr: "charisma" },
  { id: "deception", label: "Deception", attr: "charisma" },
  { id: "inquiry", label: "Inquiry", attr: "charisma" },
] as const satisfies readonly { id: string; label: string; attr: AttrId }[];

/** A skill id — a compile-time union derived from the table above. A challenge
 * check typed `SkillId` therefore rejects a misspelled skill at `tsc` time; the
 * runtime validator (schema.ts) re-checks it for authored JSON drops. */
export type SkillId = (typeof SKILLS)[number]["id"];

/** The set of valid skill ids, for the runtime validator. */
export const SKILL_IDS: readonly SkillId[] = SKILLS.map((s) => s.id);

/** skill id → governing Attribute id. Derived, never authored on a check. */
export const SKILL_ATTR: Readonly<Record<SkillId, AttrId>> = Object.fromEntries(
  SKILLS.map((s) => [s.id, s.attr]),
) as Record<SkillId, AttrId>;

/** Hard maximum for any Skill (CHALLENGE_SYSTEM.md §Skills). Start cap is 5; the
 * ceiling of 20 is what content numbers are range-checked against. */
export const SKILL_MAX = 20;
export const SKILL_START_MAX = 5;

/** The reserved label the temporary Combat rule uses. Present ONLY so the
 * validator can give a friendly "combat is authored later" message instead of a
 * bare "unknown skill". It is NOT a member of SKILL_IDS. */
export const COMBAT_RESERVED = "combat";
