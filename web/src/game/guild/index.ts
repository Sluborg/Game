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
  PartyActivity,
  Posting,
  LedgerEntry,
  Mail,
  MailKind,
  SimEvent,
  SimEventType,
  FeedItem,
  FeedRegister,
  IconName,
  GuildState,
} from "./types";

export { HERO_DATA, PARTY_DATA, HERO_BY_ID, PARTY_BY_ID, partyAttr, partyQuality, partyTraitMod } from "./roster";
export { ROAD_JOB, RUINS, STANDING_JOBS, POSTABLE_QUESTS, QUEST_BY_ID, typeSkulls, questSkulls, daysLabel, type QuestDef, type BeatDef } from "./quests";
export { resolveQuest, scoreFor, GRADE_ZONES } from "./resolver";
export { makePosting, partyEligible, bestPosting } from "./board";
export { chooseActivity, avgWallet, type LifeChoice } from "./life";
export {
  step,
  advanceUntilStop,
  peekNext,
  dayOf,
  phaseOf,
  type AdvanceStop,
} from "./clock";
export {
  SAVE_VERSION,
  createInitialState,
  displayedGold,
  markMailRead,
  buyTavern,
  dismissTavern,
  lastLedger,
  draft,
} from "./state";
export {
  TICKS_PER_DAY,
  PHASES,
  type Phase,
  STARTING_GOLD,
  DAILY_UPKEEP,
  PASSIVE_INCOME,
  BROKERAGE,
  NEED_GOLD,
  TAVERN_PRICE,
  FEED_CAP,
  MAIL_CAP,
  ADVANCE_CAP,
  EXPIRY_DAYS,
} from "./tuning";
export { loadState, saveState, clearSave, freshSeed } from "./persist";
export { deriveSeed } from "./seed";
