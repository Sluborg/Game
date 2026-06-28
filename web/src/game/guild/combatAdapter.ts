// Combat adapter — the ONLY bridge between the guild layer and the existing
// combat engine. We consume combat through its public interface only:
//
//   defaultResolver.resolve(state: GameState, threat: MonsterGroup): CombatOutcome
//
// The engine is deterministic (no internal RNG), so the same hero + monster
// inputs always produce the same CombatOutcome — which is what lets a turn be
// replayed from its seed. Nothing in combat.ts / monsters.ts / dayEngine.ts is
// modified; we build throwaway engine inputs here and normalise the result.

import { defaultResolver } from "../combat";
import type { CombatOutcome } from "../combat";
import { monsterDef } from "../monsters";
import type { GameState, Hero as EngineHero, MonsterGroup, MonsterType } from "../types";
import { hashStr } from "./rng";
import type { Hero as GuildHero } from "./types";

/** Build the engine Hero that fights, from a guild hero's live stats. */
function toEngineHero(h: GuildHero): EngineHero {
  return {
    id: hashStr(h.id) & 0x7fffffff,
    name: h.name,
    heroClass: h.stats.heroClass,
    level: h.stats.level,
    experience: h.stats.experience,
    gold: 0,
    hp: h.stats.hp,
    maxHp: h.stats.maxHp,
    state: "IDLE",
  };
}

/** Build a MonsterGroup the same way monsters.ts does (baseHp * count). */
function makeThreat(type: MonsterType, count: number, id: number): MonsterGroup {
  const totalHp = monsterDef(type).baseHp * Math.max(1, count);
  return { id, type, count: Math.max(1, count), hp: totalHp, maxHp: totalHp };
}

/** A minimal GameState carrying just what defaultResolver reads. */
function wrapState(hero: EngineHero): GameState {
  return {
    gold: 0,
    day: 0,
    heroes: [hero],
    buildings: [], // no Guard Tower => no damage reduction; keep it lean
    monsterGroups: [],
    nextMonsterId: 0,
    nextHeroId: 0,
    nextBuildingId: 0,
    totalMonstersKilled: 0,
    totalGoldEarned: 0,
    totalBossKills: 0,
    battleLog: [],
    completedMilestones: [],
  };
}

export interface EncounterResult {
  /** Ground-truth combat outcome straight from the engine. */
  outcome: CombatOutcome;
  /** The guild hero with HP/XP/level written back from the fight. */
  heroAfter: GuildHero;
}

/**
 * Resolve one fight (a roadside encounter or an arrival quest) for a single
 * hero against `count` monsters of `type`. Pure: depends only on its inputs.
 */
export function resolveEncounter(
  hero: GuildHero,
  type: MonsterType,
  count: number,
  threatId: number,
): EncounterResult {
  const engineHero = toEngineHero(hero);
  const state = wrapState(engineHero);
  const threat = makeThreat(type, count, threatId);
  const outcome = defaultResolver.resolve(state, threat);

  const after = outcome.heroesAfter[0] ?? engineHero;
  const heroAfter: GuildHero = {
    ...hero,
    stats: {
      ...hero.stats,
      hp: after.hp,
      level: after.level,
      experience: after.experience,
      maxHp: after.maxHp,
    },
  };
  return { outcome, heroAfter };
}
