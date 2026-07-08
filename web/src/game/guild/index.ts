// Public surface of the guild sim. The UI imports from here; nothing in game/guild
// imports from ui/. Pure, serializable, deterministic.

export type {
  AttrKey,
  QuestTier,
  BeatType,
  Grade,
  Beat,
  AdventureLog,
  Assignment,
  PartyRuntime,
  Posting,
  AskKnowledge,
  AppetiteLabel,
  LedgerEntry,
  Mail,
  MailKind,
  GuildState,
} from "./types";

export { HERO_DATA, PARTY_DATA, HERO_BY_ID, PARTY_BY_ID, partyAttr, partyQuality, partyTraitMod } from "./roster";
export { ROAD_JOB, RUINS, STANDING_JOBS, POSTABLE_QUESTS, QUEST_BY_ID, challengeDots, type QuestDef, type BeatDef } from "./quests";
export { resolveQuest } from "./resolver";
export { appetiteFor, effectiveMaxCut, partyAccepts, partyEligible, bestFit, offsetKey, NOISE } from "./board";
export { endDay } from "./endDay";
export {
  SAVE_VERSION,
  STARTING_GOLD,
  DAILY_UPKEEP,
  PASSIVE_INCOME,
  createInitialState,
  reviseCut,
  canRevise,
  markMailRead,
} from "./state";
export { loadState, saveState, clearSave, freshSeed } from "./persist";
export { deriveSeed } from "./seed";
