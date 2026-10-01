// Typed loader — binds the authored JSON drops to the v2 content interfaces and
// exposes them as one ContentSet. This is the seam a future consumer would import
// FROM; today nothing in the sim does (funnel, not consumer). It is added to NO
// export barrel (guild/index.ts) and imported by NO v1 module — the no-v1-import
// guard test enforces that this namespace stays isolated.
//
// The `as` casts trust the JSON's shape to the interfaces; the real gate is the
// runtime validator (schema.ts), exercised over exactly this CONTENT in
// content.test.ts. A malformed drop fails that test rather than corrupting a type.

import type { Challenge, Quest, Trait, Perk, ContentSet } from "./types";
import challengesJson from "./challenges.json";
import questsJson from "./quests.json";
import traitsJson from "./traits.json";
import perksJson from "./perks.json";

export const CHALLENGES = challengesJson as Challenge[];
export const QUESTS = questsJson as Quest[];
export const TRAITS = traitsJson as Trait[];
export const PERKS = perksJson as Perk[];

export const CONTENT: ContentSet = {
  challenges: CHALLENGES,
  quests: QUESTS,
  traits: TRAITS,
  perks: PERKS,
};
