// The guild world-state domain — a pure, serializable, seeded model of Slice 1's
// thin closed loop. No React, no DOM; the UI (ui/guild/) consumes this. Never
// imports from the frozen combat core (battle/).

export * from "./types";
export { ECONOMY, QUESTS, RESOLVE, ACCEPT, type QuestTier } from "./economy";
export { STARTER_HEROES, STARTER_PARTY_NAME, partyQuality } from "./heroes";
export { newRun } from "./newRun";
export { endDay } from "./endDay";
export { setCut, adjustCut } from "./actions";
export { successChance } from "./resolve";
export { appetiteAt, APPETITE_LABEL, type Appetite } from "./appetite";
export { save, load, clear, isWorldState } from "./persist";
