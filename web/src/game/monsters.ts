// Monster definitions. Stats ported verbatim from MonsterType (MonsterGroup.kt).
// The spawn logic is reframed from tick-based to day-based (see spawnForDay).

import {
  BOSS_DAY_DRAGON,
  BOSS_DAY_TROLL,
  DAY_DRAGON,
  DAY_GOBLIN,
  DAY_TROLL,
} from "./constants";
import type { MonsterGroup, MonsterType } from "./types";

export interface MonsterDef {
  type: MonsterType;
  displayName: string;
  icon: string;
  baseHp: number;
  goldReward: number;
  threatLevel: number;
  xpReward: number;
  isBoss: boolean;
}

export const MONSTER_DEFS: Record<MonsterType, MonsterDef> = {
  RAT: { type: "RAT", displayName: "Giant Rat", icon: "🐀", baseHp: 20, goldReward: 5, threatLevel: 1, xpReward: 8, isBoss: false },
  GOBLIN: { type: "GOBLIN", displayName: "Goblin", icon: "👺", baseHp: 40, goldReward: 10, threatLevel: 2, xpReward: 18, isBoss: false },
  TROLL: { type: "TROLL", displayName: "Troll", icon: "🧌", baseHp: 120, goldReward: 30, threatLevel: 4, xpReward: 45, isBoss: false },
  DRAGON: { type: "DRAGON", displayName: "Dragon", icon: "🐉", baseHp: 500, goldReward: 200, threatLevel: 10, xpReward: 200, isBoss: false },
  UNDEAD: { type: "UNDEAD", displayName: "Undead Horde", icon: "💀", baseHp: 80, goldReward: 20, threatLevel: 3, xpReward: 30, isBoss: false },
  BOSS_RAT: { type: "BOSS_RAT", displayName: "Rat King", icon: "👑", baseHp: 60, goldReward: 25, threatLevel: 3, xpReward: 40, isBoss: true },
  BOSS_GOBLIN: { type: "BOSS_GOBLIN", displayName: "Goblin Warchief", icon: "👑", baseHp: 120, goldReward: 50, threatLevel: 5, xpReward: 90, isBoss: true },
  BOSS_TROLL: { type: "BOSS_TROLL", displayName: "Mountain Troll", icon: "👑", baseHp: 360, goldReward: 150, threatLevel: 9, xpReward: 225, isBoss: true },
  BOSS_DRAGON: { type: "BOSS_DRAGON", displayName: "Elder Dragon", icon: "👑", baseHp: 1500, goldReward: 1000, threatLevel: 20, xpReward: 1000, isBoss: true },
};

export function monsterDef(type: MonsterType): MonsterDef {
  return MONSTER_DEFS[type];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function regularTypeForDay(day: number): MonsterType {
  if (day >= DAY_DRAGON) return "DRAGON";
  if (day >= DAY_TROLL) return day % 3 === 0 ? "UNDEAD" : "TROLL";
  if (day >= DAY_GOBLIN) return day % 2 === 0 ? "GOBLIN" : "UNDEAD";
  return "RAT";
}

function bossTypeForDay(day: number): MonsterType {
  if (day >= BOSS_DAY_DRAGON) return "BOSS_DRAGON";
  if (day >= BOSS_DAY_TROLL) return "BOSS_TROLL";
  return "BOSS_GOBLIN";
}

function makeGroup(type: MonsterType, count: number, id: number): MonsterGroup {
  const totalHp = MONSTER_DEFS[type].baseHp * count;
  return { id, type, count, hp: totalHp, maxHp: totalHp };
}

/** Build a regular (non-boss) threat for the given day. */
export function spawnRegular(day: number, id: number): MonsterGroup {
  const type = regularTypeForDay(day);
  let count: number;
  switch (type) {
    case "RAT": count = randomInt(2, 5); break;
    case "GOBLIN": count = randomInt(1, 3); break;
    case "UNDEAD": count = randomInt(1, 3); break;
    default: count = 1; break;
  }
  return makeGroup(type, count, id);
}

/** Build a boss threat for the given day. */
export function spawnBoss(day: number, id: number): MonsterGroup {
  return makeGroup(bossTypeForDay(day), 1, id);
}

export function isBossGroup(g: MonsterGroup): boolean {
  return MONSTER_DEFS[g.type].isBoss;
}
