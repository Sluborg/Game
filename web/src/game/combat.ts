// Combat resolution — PLACEHOLDER.
//
// The real combat system is being designed separately (see COMBAT_DESIGN_PROMPT.md).
// Everything below is a deliberately trivial stand-in. The day engine only ever
// talks to combat through the `CombatResolver` interface, so dropping in the real
// design means replacing `defaultResolver` (and nothing else).

import { guardTowerDamageReduction } from "./buildings";
import { gainExperience } from "./heroes";
import { monsterDef } from "./monsters";
import type { GameState, Hero, MonsterGroup } from "./types";

export interface CombatOutcome {
  /** Heroes after the fight (HP/XP/level changes). */
  heroesAfter: Hero[];
  goldEarned: number;
  monstersKilled: number;
  bossesKilled: number;
  events: string[];
  /** True if the threat was cleared this resolution. */
  threatDefeated: boolean;
}

export interface CombatResolver {
  resolve(state: GameState, threat: MonsterGroup): CombatOutcome;
}

// --- PLACEHOLDER implementation -------------------------------------------------
// Heroes have "power" proportional to their level. If total power clears the
// threat's HP, the heroes win: rewards are granted, the threat is removed, and
// each hero takes a token scratch. Otherwise the threat survives to the next day
// and the heroes take chip damage.

function heroPower(hero: Hero): number {
  return 10 + hero.level * 5;
}

export const defaultResolver: CombatResolver = {
  resolve(state, threat): CombatOutcome {
    const def = monsterDef(threat.type);
    const aliveHeroes = state.heroes.filter((h) => h.hp > 0);

    if (aliveHeroes.length === 0) {
      return {
        heroesAfter: state.heroes,
        goldEarned: 0,
        monstersKilled: 0,
        bossesKilled: 0,
        events: [`⚠️ No heroes able to fight the ${def.displayName}!`],
        threatDefeated: false,
      };
    }

    const totalPower = aliveHeroes.reduce((sum, h) => sum + heroPower(h), 0);
    const damageReduction = state.buildings.reduce((sum, b) => sum + guardTowerDamageReduction(b), 0);
    const won = totalPower >= threat.hp;

    const events: string[] = [];
    const heroesAfter = state.heroes.map((hero) => {
      if (hero.hp <= 0) return hero;
      if (won) {
        // Split XP across the party, apply a small scratch.
        const xpShare = Math.floor((def.xpReward * threat.count) / aliveHeroes.length);
        const scratch = Math.max(1, threat.count * def.threatLevel - damageReduction);
        const healed = gainExperience(hero, xpShare);
        return { ...healed, hp: Math.max(1, healed.hp - scratch), state: "IDLE" as const };
      } else {
        const hit = Math.max(1, threat.count * def.threatLevel * 2 - damageReduction);
        return { ...hero, hp: Math.max(0, hero.hp - hit), state: "FLEEING" as const };
      }
    });

    if (won) {
      const gold = def.goldReward * threat.count;
      events.push(`🗡 Heroes defeated ${def.displayName} x${threat.count}! +${gold}g`);
      return {
        heroesAfter,
        goldEarned: gold,
        monstersKilled: threat.count,
        bossesKilled: def.isBoss ? 1 : 0,
        events,
        threatDefeated: true,
      };
    }

    events.push(`💥 ${def.displayName} x${threat.count} repelled the heroes — they regroup.`);
    return {
      heroesAfter,
      goldEarned: 0,
      monstersKilled: 0,
      bossesKilled: 0,
      events,
      threatDefeated: false,
    };
  },
};
