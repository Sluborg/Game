// v2 content vocabulary — the nine Skills and their governing Attributes
// (Skills v3, docs/GLOSSARY.md). DATA ONLY — no logic here.
//
// This table is the single source of truth for skill references. Every Encounter
// names a skill by id; the governing Attribute is DERIVED from this table.
//
// Skills v3 (down from 15): Stealth+Athletics → Mobility; Endurance+Resist →
// Fortitude; Research/Arcana/Planning/Investigation → Reasoning; Survival+Medicine
// → Nature; Persuasion+Deception+Intimidation → Influence. New resistance skills
// Willpower (Mind) and Integrity (Charisma) join
// Fortitude to make one resistance skill per pillar. Magic lives in Reasoning,
// healing in Nature. "Combat" remains a temporary special rule, NOT a skill.

import type { AttrId } from "./attributes";

/** The nine skills, three per pillar (Physical / Mental / Social). */
export const SKILLS = [
  // Physical
  { id: "force", label: "Force", attr: "strength" },
  { id: "mobility", label: "Mobility", attr: "dexterity" },
  { id: "fortitude", label: "Fortitude", attr: "constitution" },
  // Mental (Mind)
  { id: "reasoning", label: "Reasoning", attr: "mind" },
  { id: "nature", label: "Nature", attr: "mind" },
  { id: "willpower", label: "Willpower", attr: "mind" },
  // Social (Charisma)
  { id: "influence", label: "Influence", attr: "charisma" },
  { id: "inquiry", label: "Inquiry", attr: "charisma" },
  { id: "integrity", label: "Integrity", attr: "charisma" },
] as const satisfies readonly { id: string; label: string; attr: AttrId }[];

/** A skill id — a compile-time union derived from the table above. */
export type SkillId = (typeof SKILLS)[number]["id"];

/** The set of valid skill ids, for the runtime validator. */
export const SKILL_IDS: readonly SkillId[] = SKILLS.map((s) => s.id);

/** skill id → governing Attribute id. Derived, never authored on an Encounter. */
export const SKILL_ATTR: Readonly<Record<SkillId, AttrId>> = Object.fromEntries(
  SKILLS.map((s) => [s.id, s.attr]),
) as Record<SkillId, AttrId>;

/** Hard maximum for any Skill (docs/CHALLENGE_SYSTEM.md §Skills) — double the
 * Attribute ceiling, so training can reach 2× aptitude. A new hero starts with a
 * small kit (one Skill at 2, three at 1, rest 0) and Skills grow from use.
 * Reference constants for the future resolution slice. */
export const SKILL_MAX = 20;
export const SKILL_START_MAX = 2;

/** The reserved label the temporary Combat rule uses. Present ONLY so the
 * validator can give a friendly "combat is authored later" message. NOT a skill. */
export const COMBAT_RESERVED = "combat";
