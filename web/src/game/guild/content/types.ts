// v2 content types (Skills v3) — the shape ChatGPT emits and the repo stores as
// JSON. DATA-DESCRIBING interfaces only; the runtime gate is schema.ts.
//
// Skills v3 replaces the v2 two-check Challenge with an ordered list of ENCOUNTERS.
// The reference graph is a strict 2-level DAG — Quest → Challenge → Encounter →
// skill — with no back-edges, so cycles are impossible and none are checked for.
//
// DELIBERATELY NOT IN THIS SHAPE YET (documented in docs/GLOSSARY.md as the coming
// model, built in the engine PR): an Encounter's cooperation `mode`, `crisis`
// (hard-fail consequence), `bridgeCost`, and actor min/max; a Quest's
// Physical/Mental/Social `requirements` and `tags`; and per-encounter difficulty
// (which lives on the Quest when it instantiates a Challenge, not on the reusable
// Challenge). Authors must not emit those keys yet — the validator rejects unknown
// fields on purpose.

import type { AttrId } from "./attributes";
import type { SkillId } from "./skills";
import type { ResultId } from "./ladder";

/** One Encounter — a named Skill check, the atomic step of a Challenge. This
 * slice authors only its skill; the mechanics fields above are deferred. */
export interface Encounter {
  /** Must be one of the nine skills (skills.ts). "combat" is rejected this slice. */
  skill: SkillId;
}

/** A Challenge — a broad, reusable activity ("Infiltrate and persuade"), authored
 * at the activity level (docs/GLOSSARY.md): the Quest owns the specific people,
 * places, and stakes; the Challenge says only what the heroes are broadly doing.
 * It is an ORDERED list of one or more Encounters (array order = run order).
 * One-Encounter Challenges are valid; repeated skills are allowed only for
 * meaningfully different Encounters (a judgment, not machine-enforceable — the
 * validator rejects only byte-identical adjacent Encounters). No per-band
 * narration is authored here; the narration model is still open. */
export interface Challenge {
  /** Globally unique across all content kinds; kebab-case `^[a-z0-9-]+$`. */
  id: string;
  /** The broad activity label, e.g. "Infiltrate and persuade". Kept named
   * `activity` (not `title`) to signal breadth and avoid clashing with Quest. */
  activity: string;
  /** Optional one-sentence broad summary. NOT per-result prose. */
  summary?: string;
  /** One or more Encounters, in run order. */
  encounters: Encounter[];
}

/** A Quest: a giver and place, a FLAT total reward, a duration window, and an
 * ordered list of Challenge ids. (Physical/Mental/Social requirements + tags are
 * documented for the engine PR, not authored here.) */
export interface Quest {
  id: string;
  title: string;
  giver: string;
  location: string;
  reward: number;
  minDuration: number;
  maxDuration: number;
  /** ≥ 1 Challenge id, each resolving to a Challenge. Order is the run order. */
  challenges: string[];
}

/** A trait's mechanical tilt: a percentage modifier applied to the check formula's
 * (Attribute + Skill) capability, scoped to named skills and/or attributes. */
export interface TraitEffect {
  /** Applied as (1 + modifierPercent); bounded to ±0.5 (±50%). */
  modifierPercent: number;
  /** At least one skill or attribute the tilt applies to. */
  appliesTo: { skills?: SkillId[]; attributes?: AttrId[] };
}

export interface Trait {
  id: string;
  name: string;
  description: string;
  effect: TraitEffect;
}

/** The enumerated rule-exception vocabulary a Perk may declare. Perks change
 * RULES / create exceptions; they do not duplicate a Skill value. */
export type PerkExceptionKind =
  | "reroll-lowest-check" // re-roll the weakest Encounter result once
  | "soften-critical-failure" // a Critical Failure on any Encounter counts as a Failure
  | "upgrade-result" // one named result band is read as the next-higher band
  | "skill-modifier"; // a bounded, standing +% on one named skill

export interface Perk {
  id: string;
  name: string;
  description: string;
  exception: {
    kind: PerkExceptionKind;
    /** upgrade-result: the band being upgraded (not "triumph"). */
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
