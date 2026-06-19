// Game balance constants. Ported from GameConstants.kt, with the real-time /
// offline-idle values removed and a fresh day-based economy added.

// --- Roster / progression (ported verbatim) ---
export const MAX_HEROES = 10;
export const MAX_HERO_LEVEL = 20;
export const HP_PER_LEVEL = 12; // bonus max HP per hero level
export const HP_GAIN_ON_LEVEL_UP = 20; // HP healed on level-up
export const STARTING_GOLD = 200;
export const BATTLE_LOG_MAX_SIZE = 8;

// --- Day-based threat schedule (fresh; replaces tick spawn intervals) ---
// A regular monster threat appears every N days; a boss every M days.
export const THREAT_EVERY_DAYS = 3; // first threat on day 3, then 6, 9, ...
export const BOSS_EVERY_DAYS = 10; // boss on day 10, 20, ... (overrides regular)

// Day thresholds that gate which monster tier spawns (keyed off `day`).
export const DAY_DRAGON = 30;
export const DAY_TROLL = 20;
export const DAY_GOBLIN = 8;
// (below DAY_GOBLIN → rats)

export const BOSS_DAY_DRAGON = 40;
export const BOSS_DAY_TROLL = 20;
// (below BOSS_DAY_TROLL → goblin warchief)
