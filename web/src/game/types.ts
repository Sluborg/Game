// Core game types. Ported from the Kotlin domain/model package, adapted for a
// turn-based "day" loop (no real-time tick / accumulator / save-timestamp).

export type BuildingType =
  | "PALACE"
  | "TAVERN"
  | "BLACKSMITH"
  | "MARKET"
  | "FIGHTER_GUILD"
  | "RANGER_GUILD"
  | "MAGE_GUILD"
  | "TEMPLE"
  | "GUARD_TOWER"
  | "BARRACKS";

export type HeroClass = "WARRIOR" | "RANGER" | "WIZARD" | "PALADIN" | "ROGUE";

export type HeroState =
  | "IDLE"
  | "PATROLLING"
  | "HUNTING"
  | "FLEEING"
  | "SHOPPING"
  | "RESTING";

export type MonsterType =
  | "RAT"
  | "GOBLIN"
  | "TROLL"
  | "DRAGON"
  | "UNDEAD"
  | "BOSS_RAT"
  | "BOSS_GOBLIN"
  | "BOSS_TROLL"
  | "BOSS_DRAGON";

export interface Building {
  id: number;
  type: BuildingType;
  level: number;
}

export interface Hero {
  id: number;
  name: string;
  heroClass: HeroClass;
  level: number;
  experience: number;
  gold: number;
  hp: number;
  maxHp: number;
  state: HeroState;
}

export interface MonsterGroup {
  id: number;
  type: MonsterType;
  count: number;
  hp: number;
  maxHp: number;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  goldReward: number;
  isCompleted: boolean;
}

/**
 * Whole-game state. Mirrors KingdomState but `tickCount` becomes `day`, and the
 * real-time-only fields (goldAccumulator, lastSavedAt) are gone.
 */
export interface GameState {
  gold: number;
  day: number;
  heroes: Hero[];
  buildings: Building[];
  monsterGroups: MonsterGroup[];
  nextMonsterId: number;
  nextHeroId: number;
  nextBuildingId: number;
  totalMonstersKilled: number;
  totalGoldEarned: number;
  totalBossKills: number;
  battleLog: string[];
  /** Milestone ids already completed (so rewards fire exactly once). */
  completedMilestones: string[];
}
