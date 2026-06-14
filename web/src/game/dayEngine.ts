// Day engine — the turn-based replacement for GameEngine.tick.
//
// advanceDay() runs one full day: collect income, regenerate heroes, possibly
// spawn a threat, resolve combat (via the pluggable CombatResolver), then award
// milestone rewards. Pure: returns a new state plus the events it generated.

import { templeHealBonus } from "./buildings";
import { BOSS_EVERY_DAYS, THREAT_EVERY_DAYS } from "./constants";
import { type CombatResolver, defaultResolver } from "./combat";
import { goldPerDayTotal, pushLog } from "./economy";
import { evaluateMilestones } from "./milestones";
import { monsterDef, spawnBoss, spawnRegular } from "./monsters";
import type { GameState, Hero } from "./types";

export interface DayResult {
  state: GameState;
  events: string[];
}

/** Daily passive heal: 5% max HP base + temple bonus, capped at maxHp. */
function regenerateHero(hero: Hero, templeBonus: number): Hero {
  if (hero.hp <= 0 || hero.hp >= hero.maxHp) return hero;
  const baseHeal = Math.max(1, Math.floor(hero.maxHp * 0.05));
  const bonusHeal = Math.floor(hero.maxHp * templeBonus);
  const newHp = Math.min(hero.maxHp, hero.hp + baseHeal + bonusHeal);
  return { ...hero, hp: newHp, state: newHp >= hero.maxHp ? "IDLE" : "RESTING" };
}

export function advanceDay(
  state: GameState,
  resolver: CombatResolver = defaultResolver,
): DayResult {
  const events: string[] = [];
  const day = state.day + 1;

  // 1. Passive income.
  const income = goldPerDayTotal(state.buildings);

  // 2. Daily hero regeneration.
  const templeBonus = state.buildings.reduce((sum, b) => sum + templeHealBonus(b), 0);
  const healedHeroes = state.heroes.map((h) => regenerateHero(h, templeBonus));

  let working: GameState = {
    ...state,
    day,
    gold: state.gold + income,
    totalGoldEarned: state.totalGoldEarned + income,
    heroes: healedHeroes,
  };

  // 3. Threat spawn (boss takes precedence on overlapping days).
  if (day % BOSS_EVERY_DAYS === 0) {
    const boss = spawnBoss(day, working.nextMonsterId);
    working = {
      ...working,
      monsterGroups: [...working.monsterGroups, boss],
      nextMonsterId: working.nextMonsterId + 1,
    };
    events.push(`⚠️ A ${monsterDef(boss.type).displayName} approaches — Battle Stations!`);
  } else if (day % THREAT_EVERY_DAYS === 0) {
    const threat = spawnRegular(day, working.nextMonsterId);
    working = {
      ...working,
      monsterGroups: [...working.monsterGroups, threat],
      nextMonsterId: working.nextMonsterId + 1,
    };
    const def = monsterDef(threat.type);
    events.push(`⚔️ ${def.displayName} x${threat.count} threatens the kingdom!`);
  }

  // 4. Resolve combat for each active threat. Damage threads between fights.
  const survivingThreats = [];
  for (const threat of working.monsterGroups) {
    const outcome = resolver.resolve(working, threat);
    working = {
      ...working,
      heroes: outcome.heroesAfter,
      gold: working.gold + outcome.goldEarned,
      totalGoldEarned: working.totalGoldEarned + outcome.goldEarned,
      totalMonstersKilled: working.totalMonstersKilled + outcome.monstersKilled,
      totalBossKills: working.totalBossKills + outcome.bossesKilled,
    };
    events.push(...outcome.events);
    if (!outcome.threatDefeated) survivingThreats.push(threat);
  }
  working = { ...working, monsterGroups: survivingThreats };

  // 5. Milestones — award gold once per milestone.
  const milestoneEvents: string[] = [];
  const newlyCompleted = evaluateMilestones(working).filter(
    (m) => m.isCompleted && !working.completedMilestones.includes(m.id),
  );
  if (newlyCompleted.length > 0) {
    const reward = newlyCompleted.reduce((sum, m) => sum + m.goldReward, 0);
    working = {
      ...working,
      gold: working.gold + reward,
      totalGoldEarned: working.totalGoldEarned + reward,
      completedMilestones: [
        ...working.completedMilestones,
        ...newlyCompleted.map((m) => m.id),
      ],
    };
    for (const m of newlyCompleted) {
      milestoneEvents.push(`🏆 ${m.title} complete! +${m.goldReward}g`);
    }
  }

  // 6. Compose the day's log (income line first, newest day on top).
  const incomeEvent = income > 0 ? `🪙 Day ${day}: collected +${income}g.` : `🌅 Day ${day} dawns.`;
  const allEvents = [...milestoneEvents, ...events, incomeEvent];
  working = { ...working, battleLog: pushLog(working.battleLog, allEvents) };

  return { state: working, events: allEvents };
}
