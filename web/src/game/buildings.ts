// Building definitions. Ported from Building.kt / BuildingType.
// The Kotlin `baseGoldPerSecond` is reframed as `goldPerDay` (fresh day economy:
// per-second values x10 for clean integers). Upgrade cost formula is preserved
// verbatim: baseCost * level * 1.5 (floored).

import type { Building, BuildingType, HeroClass } from "./types";

export interface BuildingDef {
  type: BuildingType;
  displayName: string;
  icon: string;
  baseCost: number;
  goldPerDay: number;
  maxLevel: number;
  /** Hero classes this building unlocks for recruitment. */
  unlocks?: HeroClass[];
  effect?: string;
}

export const BUILDING_DEFS: Record<BuildingType, BuildingDef> = {
  PALACE: { type: "PALACE", displayName: "Palace", icon: "🏰", baseCost: 0, goldPerDay: 30, maxLevel: 5 },
  TAVERN: { type: "TAVERN", displayName: "Tavern", icon: "🍺", baseCost: 150, goldPerDay: 0, maxLevel: 5, unlocks: ["ROGUE"] },
  BLACKSMITH: { type: "BLACKSMITH", displayName: "Blacksmith", icon: "⚒️", baseCost: 300, goldPerDay: 15, maxLevel: 5 },
  MARKET: { type: "MARKET", displayName: "Market", icon: "🪙", baseCost: 250, goldPerDay: 10, maxLevel: 5 },
  FIGHTER_GUILD: { type: "FIGHTER_GUILD", displayName: "Fighter Guild", icon: "🛡️", baseCost: 400, goldPerDay: 0, maxLevel: 5, unlocks: ["WARRIOR", "PALADIN"] },
  RANGER_GUILD: { type: "RANGER_GUILD", displayName: "Ranger Guild", icon: "🏹", baseCost: 600, goldPerDay: 0, maxLevel: 5, unlocks: ["RANGER"] },
  MAGE_GUILD: { type: "MAGE_GUILD", displayName: "Mage Guild", icon: "🔮", baseCost: 800, goldPerDay: 0, maxLevel: 5, unlocks: ["WIZARD"] },
  TEMPLE: { type: "TEMPLE", displayName: "Temple", icon: "⛪", baseCost: 400, goldPerDay: 5, maxLevel: 5, effect: "Heroes heal faster" },
  GUARD_TOWER: { type: "GUARD_TOWER", displayName: "Guard Tower", icon: "🗼", baseCost: 350, goldPerDay: 0, maxLevel: 5, effect: "Reduces damage taken" },
  BARRACKS: { type: "BARRACKS", displayName: "Barracks", icon: "🏯", baseCost: 450, goldPerDay: 0, maxLevel: 5, effect: "+Hero max HP" },
};

/** The full build menu order. */
export const BUILDABLE_TYPES: BuildingType[] = [
  "TAVERN",
  "MARKET",
  "BLACKSMITH",
  "FIGHTER_GUILD",
  "RANGER_GUILD",
  "MAGE_GUILD",
  "TEMPLE",
  "GUARD_TOWER",
  "BARRACKS",
];

export function buildingDef(type: BuildingType): BuildingDef {
  return BUILDING_DEFS[type];
}

export function goldPerDay(b: Building): number {
  return BUILDING_DEFS[b.type].goldPerDay * b.level;
}

export function upgradeCost(b: Building): number {
  // Preserved verbatim from Building.kt: (baseCost * level * 1.5).toLong()
  return Math.floor(BUILDING_DEFS[b.type].baseCost * b.level * 1.5);
}

export function canUpgrade(b: Building): boolean {
  return b.level < BUILDING_DEFS[b.type].maxLevel;
}

export function guardTowerDamageReduction(b: Building): number {
  return b.type === "GUARD_TOWER" ? b.level : 0;
}

export function templeHealBonus(b: Building): number {
  return b.type === "TEMPLE" ? b.level * 0.02 : 0;
}

export function barracksHpBonus(b: Building): number {
  return b.type === "BARRACKS" ? b.level * 15 : 0;
}
