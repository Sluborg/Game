// v2 content vocabulary — the three Pillars (Skills v3, docs/GLOSSARY.md).
// DATA ONLY — no logic here.
//
// Pillars are the demand axes a Quest's requirements are expressed in (the new
// "skulls", replacing v1's Travel/Combat glyphs) and the axis the future
// generator draws Challenges along. They fall out of the Attributes: the three
// Physical attributes, the one Mental attribute (Mind), and the one Social
// attribute (Charisma) — so every skill maps to exactly one pillar via its
// governing Attribute, three per pillar.
//
// NOTE: the requirement VALUES + the generator that consumes pillars are DEFERRED
// to the engine PR (docs/GLOSSARY.md marks them "documented, not yet authorable").
// This file is reference data + the derived skill→pillar map, pinned by the test.

import type { AttrId } from "./attributes";
import type { SkillId } from "./skills";
import { SKILL_ATTR } from "./skills";

/** The three pillars, in canonical order. */
export const PILLARS = [
  { id: "physical", label: "Physical" },
  { id: "mental", label: "Mental" },
  { id: "social", label: "Social" },
] as const;

/** A pillar id — a compile-time union derived from the table above. */
export type PillarId = (typeof PILLARS)[number]["id"];

/** The set of valid pillar ids, for the runtime validator. */
export const PILLAR_IDS: readonly PillarId[] = PILLARS.map((p) => p.id);

/** attribute → pillar. The single authored mapping; skill→pillar is derived from
 * it via each skill's governing Attribute (so it can never drift). */
export const ATTR_PILLAR: Readonly<Record<AttrId, PillarId>> = {
  strength: "physical",
  dexterity: "physical",
  constitution: "physical",
  mind: "mental",
  charisma: "social",
};

/** skill id → pillar id, derived from SKILL_ATTR ∘ ATTR_PILLAR. */
export const SKILL_PILLAR: Readonly<Record<SkillId, PillarId>> = Object.fromEntries(
  Object.entries(SKILL_ATTR).map(([skill, attr]) => [skill, ATTR_PILLAR[attr]]),
) as Record<SkillId, PillarId>;
