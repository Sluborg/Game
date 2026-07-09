// All sim tuning knobs in one place. Straw numbers tuned for feel — the RATIOS
// are the design (retuning a number is free; breaking a ratio is a design
// change). Time constants live here too so state.ts / clock.ts / life.ts can
// share them without import cycles.

/** Integer sim-ticks per day: dawn / midday / dusk / night. Sim-time is FULLY
 * decoupled from real time — ticks advance only when the player advances. */
export const TICKS_PER_DAY = 4;
export const PHASES = ["dawn", "midday", "dusk", "night"] as const;
export type Phase = (typeof PHASES)[number];

/** Bump on any breaking GuildState shape change (persist.ts discards + reinits). */
export const SAVE_VERSION = 2;

export const STARTING_GOLD = 1000;
export const DAILY_UPKEEP = 60;
export const PASSIVE_INCOME = 20;

/** Flat brokerage % the guild takes on completed quests (DESIGN: "a small flat
 * ~10% brokerage cut"). Never player-tuned — no price-fiddling. */
export const BROKERAGE = 10;
/** A party whose average member wallet drops below this seeks paid work. */
export const NEED_GOLD = 60;
/** Rest spend: pct of wallet with a floor, always clamped to the wallet
 * (Review #1 B3 — a hero never spends coin they don't have). */
export const REST_SPEND_PCT = 0.15;
export const REST_SPEND_MIN = 5;
/** Train spend: a bit dearer (drillmasters charge). */
export const TRAIN_SPEND_PCT = 0.2;
export const TRAIN_SPEND_MIN = 8;
/** Chance a comfortable party takes a quest anyway ("fame beckons") so the
 * board never rots; the pick is seeded across ALL eligible postings, not
 * best-pay, so the road job gets taken too (Review #1 B5 fold). */
export const FAME_CHANCE = 0.15;
/** Of the remaining lifestyle probability: rest vs train split. */
export const REST_WEIGHT = 0.6;

/** The slice's one fixed-price investment (guardrails #1/#3). */
export const TAVERN_PRICE = 400;
/** The tavern proposal fires once: day >= this AND >= SINK_LINES_BEFORE_PROPOSAL
 * rest-spends visibly lost to the village (so the pitch is grounded in flow the
 * player has watched — Review #1 B11). */
export const PROPOSAL_MIN_DAY = 2;
export const SINK_LINES_BEFORE_PROPOSAL = 2;

/** Feed cap (ambient trimmed first, decisions never) and mail cap (read-only
 * trims — an unread or sealed envelope is never dropped). */
export const FEED_CAP = 150;
export const MAIL_CAP = 120;

/** advanceUntilStop's runaway guard. A normal day is ~25–35 events with three
 * parties; a full day must fit under this (tested). */
export const ADVANCE_CAP = 60;

/** Activity lengths in ticks. */
export const REST_TICKS = 1;
export const TRAIN_TICKS = 2;
/** A standing watch shift is out-and-back within the day. */
export const STANDING_TICKS = 2;
