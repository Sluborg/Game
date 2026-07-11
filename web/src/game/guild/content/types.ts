// v2 content types — the shape ChatGPT emits and the repo stores as JSON
// (challenges.json / quests.json / traits.json / perks.json). DATA-DESCRIBING
// interfaces only; the runtime gate is schema.ts.
//
// The reference graph is a strict 2-level DAG — quest → challenge → skill — with
// NO back-edges, so cycles are structurally impossible and none are checked for.
// Traits and perks are leaf library content: they reference the skill/attribute
// vocabulary but nothing references them by id this slice.

import type { AttrId } from "./attributes";
import type { SkillId } from "./skills";
import type { ResultId } from "./ladder";

/** One of a challenge's two skill checks. Per Stefan's resolved decision, each
 * check declares its OWN difficulty (the retired mockup's "Research 60 + Arcana
 * 55"). The governing Attribute is NOT stored here — it is derived from the skill
 * via SKILL_ATTR. */
export interface Check {
  /** Must be one of the 15 skills (skills.ts). "combat" is rejected this slice. */
  skill: SkillId;
  /** Integer 0–100, the visible difficulty scale (CHALLENGE_SYSTEM.md
   * §"Difficulty and presentation"). Conversion to a check target is still open;
   * this is the authored ground-truth demand for this check. */
  difficulty: number;
}

/** A challenge activity, authored at the BROAD level (CHALLENGE_SYSTEM.md
 * §"Start with narrative"): "Researching in a library", never a named shelf or
 * tome. The quest owns the specific people/places/objectives; the challenge says
 * only what the heroes are broadly doing. It declares exactly two DISTINCT skill
 * checks. No per-band narration is authored this slice — the scalable narration
 * model is an open decision, and a per-check prose matrix is exactly the report
 * data-dump the contract forbids. */
export interface Challenge {
  /** Globally unique across all content kinds; kebab-case `^[a-z0-9-]+$`. */
  id: string;
  /** The broad activity label, e.g. "Researching in a library". */
  activity: string;
  /** Optional one-sentence broad summary of the activity. NOT per-result prose. */
  summary?: string;
  /** Exactly two checks, on two DIFFERENT skills. */
  checks: [Check, Check];
}

/** A quest: a giver and place, a FLAT total reward, a duration window (time cost,
 * never extra gold — DESIGN.md), and an ordered list of challenge ids to run.
 * Reference magnitudes from the shipped board: road ≈ 350g, ruins ≈ 700g,
 * standing ≈ 25g. */
export interface Quest {
  /** Globally unique; kebab-case. */
  id: string;
  title: string;
  /** Free text this slice (not validated against sim node ids — content is not
   * wired). e.g. "a nervous merchant". */
  giver: string;
  /** Free text this slice. e.g. "Old Trade Road". */
  location: string;
  /** Flat total reward in gold, integer ≥ 0. */
  reward: number;
  /** Known-minimum days, integer ≥ 1. */
  minDuration: number;
  /** Upper bound, integer ≥ minDuration (the fuzz above the known minimum). */
  maxDuration: number;
  /** ≥ 1 challenge id, each resolving to a Challenge. Order is the run order. */
  challenges: string[];
}

/** A trait's mechanical tilt. Numeric competence lives in Skills; a trait applies
 * a percentage modifier to the check formula's (Attribute + Skill) capability
 * (CHALLENGE_SYSTEM.md §"Check formula" — the d20 is never multiplied), scoped to
 * named skills and/or attributes. */
export interface TraitEffect {
  /** Modifier applied as (1 + modifierPercent); bounded to ±0.5 (±50%). */
  modifierPercent: number;
  /** At least one skill or attribute the tilt applies to. */
  appliesTo: { skills?: SkillId[]; attributes?: AttrId[] };
}

export interface Trait {
  /** Globally unique; kebab-case. */
  id: string;
  name: string;
  description: string;
  effect: TraitEffect;
}

/** The enumerated rule-exception vocabulary a Perk may declare. Perks change
 * RULES / create exceptions, they do not duplicate a Skill value
 * (CHALLENGE_SYSTEM.md §"Skills and Perks"). A free-text perk is un-validatable,
 * so an author selects a kind from this closed set. */
export type PerkExceptionKind =
  | "reroll-lowest-check" // re-roll the lower of the challenge's two checks once
  | "soften-critical-failure" // a Critical Failure on any check counts as a Failure
  | "upgrade-result" // one named result band is read as the next-higher band
  | "skill-modifier"; // a bounded, standing +% on one named skill (the sole numeric exception)

export interface Perk {
  /** Globally unique; kebab-case. */
  id: string;
  name: string;
  description: string;
  exception: {
    kind: PerkExceptionKind;
    /** upgrade-result: the band being upgraded (not "triumph" — nothing is higher). */
    fromResult?: ResultId;
    /** skill-modifier: the skill the standing modifier applies to. */
    skill?: SkillId;
    /** skill-modifier: the modifier, bounded to ±0.5. */
    percent?: number;
  };
}

/** The whole authored content set — what the validator ingests. */
export interface ContentSet {
  challenges: Challenge[];
  quests: Quest[];
  traits: Trait[];
  perks: Perk[];
}
