// Guild sim — shared types. This module is the serializable heart of the guild
// game: a single GuildState plus the value types the pure reducers in clock.ts /
// life.ts / state.ts operate on. NO React, NO DOM, NO presentation here — the UI
// layer (web/src/ui/hall, web/src/ui/report) imports FROM this, never the reverse
// (keeps game/ below ui/ in the dependency graph).
//
// v2 (the living-canvas slice): the daily-batch endDay loop is restructured into
// an EVENT QUEUE on integer sim-ticks (DESIGN.md "The living guild"). The
// player-set cut retires (flat brokerage); heroes carry wallets and live
// autonomous daily lives. Everything here is JSON-serializable so the whole run
// round-trips through localStorage (persist.ts). Ground-truth roster data lives
// in roster.ts.

/** The four attributes the sim actually uses (mirrors battle/attributes.ts —
 * str/dex/sta/per; no Int/Cha invented yet). */
export type AttrKey = "str" | "dex" | "sta" | "per";

/** The quest tiers that resolve on the board this slice. */
export type QuestTier = "road" | "ruins" | "standing";

/** A beat's challenge kind (§10 minimal vocabulary). Every beat resolves at the
 * quest-resolver layer as a graded skill-vs-difficulty roll — NO combat engine is
 * invoked (the combat beat gains real engine fidelity at the fidelity slice). */
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
  /** Per-tier ask ceilings from Slice 1. DORMANT this slice: with the player-set
   * cut retired for a flat brokerage, ask-vs-share acceptance is degenerate; the
   * null entries still gate structural eligibility (a lone hero can't take the
   * Ruins). Asks return live with variable terms (slice-4 bounty top-ups). */
  askMaxCut: Partial<Record<QuestTier, number | null>>;
  /** Starting wallet per member (staggered so minute one shows the full
   * behavioral vocabulary: one party in lifestyle, one heading out, one broke). */
  startWallet: number;
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
 * Report fidelity tiers (a later slice) will be exact filters over this. */
export interface AdventureLog {
  beats: Beat[];
  outcome: "success" | "failure";
  /** Total reward pool for the run (daily_rate × duration; 0 on failure). */
  reward: number;
  /** The guild's gold from it = reward × cut (0 on failure). Under the pivot the
   * cut is the flat ~10% brokerage, not a player-set number. */
  guildCut: number;
  /** The cut-% in force when dispatched (the flat BROKERAGE this slice). */
  cutPct: number;
  durationDays: number;
}

/** A party currently out on a quest. The log is computed deterministically AT
 * DISPATCH (seed + returnTick fixed then) so a mid-quest refresh replays
 * identically — the sealed envelope the pivot reuses. */
export interface Assignment {
  questId: string;
  tier: QuestTier;
  questTitle: string;
  seed: number;
  dispatchedTick: number;
  returnTick: number;
  durationDays: number;
  /** Precomputed, revealed to the player only when the party returns. */
  log: AdventureLog;
}

/** A party's current at-home activity (rest/train/standing shift), for the party
 * strip. Out-on-a-quest is `assignment` instead; both null = between activities. */
export interface PartyActivity {
  kind: "rest" | "train";
  untilTick: number;
}

/** Live runtime state of a party (membership/quality come from PartyData). */
export interface PartyRuntime {
  id: string;
  /** null = at home; set = out on a quest until returnTick. */
  assignment: Assignment | null;
  /** null = idle/deciding; set = resting/training until untilTick. */
  activity: PartyActivity | null;
}

/** A scarce posting on the board (road / ruins). Standing jobs are not postings —
 * they're an always-available fallback chosen at decide time. The player no
 * longer sets a cut; the board is what the HEROES read. */
export interface Posting {
  /** Stable per-letter id (changes when a fresh letter replaces a taken one). */
  id: string;
  /** The QuestDef this letter posts (QUEST_BY_ID key — never derived from tier,
   * which only matches the id by coincidence today). */
  questId: string;
  tier: QuestTier;
  title: string;
  giver: string;
  /** Days remaining before the giver withdraws it untaken (~3). */
  daysLeft: number;
}

/** One line in the end-day ledger (§12 — every gold movement is visible). */
export interface LedgerEntry {
  label: string;
  amount: number;
  /** If set, this line is a returning quest's brokerage whose amount must stay
   * masked in the Report until the linked outcome envelope is opened (§4 — don't
   * spoil the sealed story's payoff). */
  sealedMailId?: string;
  /** One-off movements (construction) are excluded from the runway's burn math —
   * "gold lasts ~N days" must project the RECURRING trend, not panic the night
   * of the player's one big buy (Review #2 Player-experience). */
  oneOff?: boolean;
}

/** A mail envelope (§4 — reveals delivered as mail). v2 keeps two kinds: sealed
 * quest outcomes and the nightly ledger. Everything else lives in the Hall Feed. */
export type MailKind = "outcome" | "ledger";
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
  /** The night's net and end-of-day gold. Stored raw so the Report can WITHHOLD
   * them while any sealed return is unopened (they include the sealed payout, which
   * would otherwise let the player back out a hidden outcome — Codex R#34). */
  net?: number;
  endGold?: number;
  /** Outcome body (kind==="outcome"): the adventure to replay + who ran it. */
  log?: AdventureLog;
  partyName?: string;
  questTitle?: string;
  read?: boolean;
}

/** The sim's event types. Handlers live in clock.ts; each is pure. */
export type SimEventType = "decide" | "finish" | "return" | "night";

/** A queued sim event. Ordering is pinned: (tick, TYPE_RANK with night LAST, ord)
 * so a finish landing on the night tick contributes to THAT night's ledger, and
 * ordering never depends on array insertion accidents. `ord` is a monotonic
 * enqueue counter drawn from state.seq (distinct from mail/feed ids only in role —
 * same counter, so id generation stays pure). */
export interface SimEvent {
  id: string;
  tick: number;
  ord: number;
  type: SimEventType;
  partyId?: string;
  /** finish: which activity ended. */
  activity?: "rest" | "train";
  /** decide: the post-return decompress forces one rest (§ "returns → decompresses"). */
  forced?: "rest";
}

/** The Hall Feed's three registers (DESIGN "The living-world surface"). */
export type FeedRegister = "ambient" | "notable" | "decision";

/** Kenney icon keys the feed/UI use (ui/kit/Icon maps them to sprites). */
export type IconName =
  | "rest"
  | "train"
  | "depart"
  | "report"
  | "tavern"
  | "gold"
  | "spend"
  | "letter"
  | "watch"
  | "night"
  | "party";

/** One line of the living world. Ambient collapses; notable reads; decision
 * auto-pauses and asks for the player. */
export interface FeedItem {
  id: string;
  tick: number;
  day: number;
  register: FeedRegister;
  icon: IconName;
  text: string;
  /** decision items: the sealed outcome mail this decision opens. */
  mailId?: string;
  /** decision items: what tapping it does. */
  action?: "open-report" | "tavern";
  /** decision items: resolved (opened / bought / dismissed). */
  done?: boolean;
}

/** The one serializable object that IS the run. Bump SAVE_VERSION on any breaking
 * shape change (persist.ts discards + reinits on mismatch). */
export interface GuildState {
  version: number;
  /** Integer sim-tick; day/phase derive from it (clock.ts). Sim-time is FULLY
   * decoupled from real time — nothing schedules against the wall clock. */
  tick: number;
  gold: number;
  /** Per-hero wallets (the pivot's economy: heroes keep quest gold and spend it
   * at your facilities — that spend is your main income once captured). */
  wallets: Record<string, number>;
  buildings: { tavern: boolean };
  /** The tavern proposal decision item fires once (gated on visible sink lines). */
  tavernProposed: boolean;
  /** Count of rest-spends lost to the village (gates + grounds the proposal). */
  sinkSeen: number;
  /** Lifetime gold lost to the village (conservation tests + flavour). */
  villageSink: number;
  /** Tavern captures accrued since the last night (flushed to gold + a ledger
   * line at night, so the live treasury only moves at returns and nightfall). */
  dayTakings: number;
  /** Ledger lines accrued during the day, composed into the nightly ledger mail. */
  dayLedger: LedgerEntry[];
  parties: PartyRuntime[];
  board: Posting[];
  queue: SimEvent[];
  feed: FeedItem[];
  /** True once feed trimming has dropped old ambient lines (UI shows a faded note). */
  feedTrimmed: boolean;
  mail: Mail[];
  /** Monotonic counter for unique ids (kept in state so id generation is pure). */
  seq: number;
  rngSeed: number;
  /** True until the first nightfall (drives the Hall's first-run coach line). */
  firstDay: boolean;
}
