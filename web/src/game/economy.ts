// Economy actions — pure reducers ported from KingdomViewModel's build/upgrade/
// recruit handlers (the tax-tap and tick loop are gone in the day-based design).
// Each function returns a new GameState (or the original if the action is invalid).

import { BUILDING_DEFS, canUpgrade, goldPerDay, upgradeCost } from "./buildings";
import { BATTLE_LOG_MAX_SIZE, MAX_HEROES, STARTING_GOLD } from "./constants";
import {
  HERO_CLASS_DEFS,
  createHero,
  randomNameForClass,
  recruitCost,
} from "./heroes";
import type { Building, BuildingType, GameState, Hero, HeroClass } from "./types";

export function pushLog(log: string[], entries: string[]): string[] {
  return [...entries, ...log].slice(0, BATTLE_LOG_MAX_SIZE);
}

/** Total passive gold collected when a day ends. */
export function goldPerDayTotal(buildings: Building[]): number {
  return buildings.reduce((sum, b) => sum + goldPerDay(b), 0);
}

/** Fresh game: same seed roster as the Kotlin game (Palace, Tavern, Gunter). */
export function createInitialState(): GameState {
  const palace: Building = { id: 1, type: "PALACE", level: 1 };
  const tavern: Building = { id: 2, type: "TAVERN", level: 1 };
  const gunter: Hero = createHero(1, "Gunter", "WARRIOR");
  return {
    gold: STARTING_GOLD,
    day: 1,
    heroes: [gunter],
    buildings: [palace, tavern],
    monsterGroups: [],
    nextMonsterId: 1000,
    nextHeroId: 2,
    nextBuildingId: 3,
    totalMonstersKilled: 0,
    totalGoldEarned: 0,
    totalBossKills: 0,
    battleLog: ["👑 Your reign begins. Build, recruit, and survive."],
    completedMilestones: [],
  };
}

/** Build a new structure (one per type). */
export function buildBuilding(state: GameState, type: BuildingType): GameState {
  const def = BUILDING_DEFS[type];
  if (state.gold < def.baseCost) return state;
  if (state.buildings.some((b) => b.type === type)) return state;

  const building: Building = { id: state.nextBuildingId, type, level: 1 };
  return {
    ...state,
    gold: state.gold - def.baseCost,
    buildings: [...state.buildings, building],
    nextBuildingId: state.nextBuildingId + 1,
    battleLog: pushLog(state.battleLog, [`🏗 Built ${def.displayName}.`]),
  };
}

/** Upgrade an existing building by id. */
export function upgradeBuilding(state: GameState, buildingId: number): GameState {
  const building = state.buildings.find((b) => b.id === buildingId);
  if (!building || !canUpgrade(building)) return state;
  const cost = upgradeCost(building);
  if (state.gold < cost) return state;

  const buildings = state.buildings.map((b) =>
    b.id === buildingId ? { ...b, level: b.level + 1 } : b,
  );
  return { ...state, gold: state.gold - cost, buildings };
}

/** Whether a hero class can currently be recruited (prereq building present). */
export function canRecruit(state: GameState, heroClass: HeroClass): boolean {
  if (state.heroes.length >= MAX_HEROES) return false;
  const required = HERO_CLASS_DEFS[heroClass].requiredBuilding;
  if (required && !state.buildings.some((b) => b.type === required)) return false;
  return true;
}

/** Recruit a hero of the given class. */
export function recruitHero(state: GameState, heroClass: HeroClass): GameState {
  const cost = recruitCost(heroClass);
  if (state.gold < cost) return state;
  if (!canRecruit(state, heroClass)) return state;

  const existingNames = new Set(state.heroes.map((h) => h.name));
  const name = randomNameForClass(heroClass, existingNames);
  const hero = createHero(state.nextHeroId, name, heroClass);
  const event = `🗡 ${name} the ${HERO_CLASS_DEFS[heroClass].displayName} joins your kingdom!`;

  return {
    ...state,
    gold: state.gold - cost,
    heroes: [...state.heroes, hero],
    nextHeroId: state.nextHeroId + 1,
    battleLog: pushLog(state.battleLog, [event]),
  };
}
