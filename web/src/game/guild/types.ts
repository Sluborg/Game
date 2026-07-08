// Guild sim — shared types. This module is the serializable heart of the guild
// game (Slice 1): a single GuildState plus the value types the pure reducers in
// endDay.ts / board.ts / resolver.ts operate on. NO React, NO DOM, NO presentation
// here — the UI layer (web/src/ui/board, web/src/ui/report) imports FROM this,
// never the reverse (keeps game/ below ui/ in the dependency graph).
//
// Everything here is JSON-serializable so the whole run round-trips through
// localStorage (persist.ts). Ground-truth roster data lives in roster.ts.

/** The four attributes the sim actually uses (mirrors battle/attributes.ts —
 * str/dex/sta/per; no Int/Cha invented for Slice 1). */
export type AttrKey = "str" | "dex" | "sta" | "per";

/** The quest tiers that resolve on the board this slice. */
export type QuestTier = "road" | "ruins" | "standing";

/** A beat's challenge kind (§10 minimal vocabulary). Every beat resolves at the
 * quest-resolver layer as a graded skill-vs-difficulty roll — NO combat engine is
 * invoked in Slice 1 (the combat beat is a roll too; it gains real engine fidelity
 * only at slice 2). */
export type BeatType = "investigation" | "travel" | "social" | "combat";

/** Graded outcome of a single beat (never a bare pass/fail — §10). */
export type Grade = "crit" | "good" | "ok" | "poor" | "fail";

/** A trait's mechanical effect on beats: a flat power delta applied when a beat of
 * one of `types` is rolled. Positive helps, negative balks (Pell's Coward). */
export interface TraitEffect {
  name: string;
  types: BeatType[];
  delta: number;
  /** The sentence shown when this trait colours a beat (§4/§5 reveal texture). */
  blurb: string;
}

export interface HeroData {
  id: string;
  name: string;
  archetype: string;
  /** Ground-truth attributes (the sim's reality; the UI's CV chips may differ and
   * are dormant/locked this slice). */
  attrs: Record<AttrKey, number>;
  traits: TraitEffect[];
}

export interface PartyData {
  id: string;
  name: string;
  memberIds: string[];
  bossId: string;
  /** Anchor ask per tier = the MAX cut-% the party tolerates (accepts if the
   * posted cut ≤ this). Anti-correlated with quality (§12 rewrite): a strong,
   * proud party demands a low cut. A run offset (±5) is added at init; ±2 daily
   * noise is added at the acceptance roll. `null` = the party can't take this
   * tier at all (e.g. a lone hero on the Ruins). */
  askMaxCut: Partial<Record<QuestTier, number | null>>;
}

/** One resolved beat in an adventure (§10 envelope element). */
export interface Beat {
  id: string;
  type: BeatType;
  location: string;
  grade: Grade;
  /** 0..1 roll that produced the grade (persisted so the story replays identically). */
  roll: number;
  /** The narration line for this beat at its rolled grade. */
  text: string;
  /** A trait cut-in that coloured this beat, if any (§5). */
  traitBlurb?: string;
  /** True when this beat was inserted by a forced branch (a fail recovery) or is
   * the optional bonus beat unlocked by a strong result. */
  branch?: "recovery" | "bonus";
}

/** The quest's real structure (§10): a sequence of beats + the aggregate outcome.
 * Report fidelity tiers (slice 2) will be exact filters over this. */
export interface AdventureLog {
  beats: Beat[];
  outcome: "success" | "failure";
  /** Total reward pool for the run (daily_rate × duration). */
  reward: number;
  /** The guild's gold from it = reward × cut (0 on failure). */
  guildCut: number;
  /** The cut-% the quest was posted at when taken. */
  cutPct: number;
  durationDays: number;
}

/** A party currently out on a quest. The log is computed deterministically AT
 * DISPATCH (seed + returnDay fixed then) so a mid-quest refresh replays identically. */
export interface Assignment {
  questId: string;
  tier: QuestTier;
  questTitle: string;
  seed: number;
  dispatchedDay: number;
  returnDay: number;
  durationDays: number;
  /** Precomputed, revealed to the player only when the party returns. */
  log: AdventureLog;
}

/** Live runtime state of a party (membership/quality come from PartyData). */
export interface PartyRuntime {
  id: string;
  /** null = idle/available; set = out on a quest until returnDay. */
  assignment: Assignment | null;
}

/** A scarce posting on the board (road / ruins). Standing jobs are not postings —
 * they're an always-available fallback generated at assignment time. */
export interface Posting {
  /** Stable per-letter id (changes when a fresh letter replaces a taken one). */
  id: string;
  tier: QuestTier;
  title: string;
  giver: string;
  cutPct: number;
  /** Days remaining before the giver withdraws it untaken (~3). */
  daysLeft: number;
  /** The day the player last revised this posting's cut (once-per-day guard). */
  lastRevisedDay: number;
  /** Failure count persists across re-attempts (§12). */
  failCount: number;
}

/** What the player has learned about a party's ask for a tier, from observing
 * accept/decline at known cuts (§12 observation brackets). */
export interface AskKnowledge {
  maxAcceptedCut: number | null;
  minRejectedCut: number | null;
}

export type AppetiteLabel = "unknown" | "eager" | "might pass" | "won't bite";

/** One line in the end-day ledger (§12 — every gold movement is visible). */
export interface LedgerEntry {
  label: string;
  amount: number;
}

/** A mail envelope (§4 — reveals delivered as mail, opened one at a time). */
export type MailKind = "outcome" | "acceptance" | "letter" | "ledger" | "notice" | "coach";
export interface Mail {
  id: string;
  day: number;
  kind: MailKind;
  /** The always-visible teaser (an outcome envelope withholds the result until
   * opened in the story stage — the summary must not spoil the drama). */
  teaser: string;
  /** Ledger body (kind==="ledger"): the itemized movements + runway line. */
  ledger?: LedgerEntry[];
  runwayNote?: string;
  /** Outcome body (kind==="outcome"): the adventure to replay + who ran it. */
  log?: AdventureLog;
  partyName?: string;
  questTitle?: string;
  read?: boolean;
}

/** The one serializable object that IS the run. Bump SAVE_VERSION on any breaking
 * shape change (persist.ts discards + reinits on mismatch). */
export interface GuildState {
  version: number;
  day: number;
  gold: number;
  /** Fixed-at-init per-party/per-tier ask offset (±5), so a run has a stable
   * personality the player learns; keyed "partyId:tier". */
  askRunOffset: Record<string, number>;
  parties: PartyRuntime[];
  board: Posting[];
  knowledge: Record<string, AskKnowledge>; // keyed "partyId:tier"
  mail: Mail[];
  /** Monotonic counter for unique ids (kept in state so id generation is pure). */
  seq: number;
  rngSeed: number;
  /** True until the player ends their first day (drives the first-run coach). */
  firstDay: boolean;
}
