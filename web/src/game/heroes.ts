// Hero definitions. Ported from Hero.kt — base HP, recruit cost, XP curve,
// level-up math, and name pools are all preserved verbatim.

import { HP_GAIN_ON_LEVEL_UP, HP_PER_LEVEL, MAX_HERO_LEVEL } from "./constants";
import type { BuildingType, Hero, HeroClass } from "./types";

export interface HeroClassDef {
  heroClass: HeroClass;
  displayName: string;
  icon: string;
  requiredBuilding: BuildingType | null;
}

export const HERO_CLASS_DEFS: Record<HeroClass, HeroClassDef> = {
  WARRIOR: { heroClass: "WARRIOR", displayName: "Warrior", icon: "⚔️", requiredBuilding: "FIGHTER_GUILD" },
  RANGER: { heroClass: "RANGER", displayName: "Ranger", icon: "🏹", requiredBuilding: "RANGER_GUILD" },
  WIZARD: { heroClass: "WIZARD", displayName: "Wizard", icon: "🧙", requiredBuilding: "MAGE_GUILD" },
  PALADIN: { heroClass: "PALADIN", displayName: "Paladin", icon: "🛡️", requiredBuilding: "FIGHTER_GUILD" },
  ROGUE: { heroClass: "ROGUE", displayName: "Rogue", icon: "🗡️", requiredBuilding: "TAVERN" },
};

export function baseMaxHpForClass(cls: HeroClass): number {
  switch (cls) {
    case "WARRIOR": return 120;
    case "PALADIN": return 140;
    case "RANGER": return 80;
    case "WIZARD": return 60;
    case "ROGUE": return 90;
  }
}

export function recruitCost(cls: HeroClass): number {
  switch (cls) {
    case "WARRIOR": return 150;
    case "RANGER": return 200;
    case "ROGUE": return 175;
    case "PALADIN": return 250;
    case "WIZARD": return 300;
  }
}

export function experienceToNextLevel(hero: Hero): number {
  return hero.level * 100;
}

export function heroHpPercent(hero: Hero): number {
  return hero.hp / hero.maxHp;
}

const NAME_POOLS: Record<HeroClass, string[]> = {
  WARRIOR: ["Aldric", "Bjorn", "Eirik", "Tomas", "Wulf"],
  RANGER: ["Sylva", "Keris", "Fenn", "Arlow", "Mirel"],
  WIZARD: ["Alaric", "Syndra", "Vex", "Morwen", "Ilyas"],
  PALADIN: ["Dawnholt", "Sera", "Valric", "Oswin", "Lira"],
  ROGUE: ["Shade", "Nyx", "Cobolt", "Riven", "Pix"],
};

export function randomNameForClass(cls: HeroClass, existingNames: Set<string>): string {
  const pool = NAME_POOLS[cls];
  const free = pool.find((n) => !existingNames.has(n));
  return free ?? `${HERO_CLASS_DEFS[cls].displayName} ${existingNames.size + 1}`;
}

export function createHero(id: number, name: string, heroClass: HeroClass): Hero {
  const baseHp = baseMaxHpForClass(heroClass);
  return {
    id,
    name,
    heroClass,
    level: 1,
    experience: 0,
    gold: 0,
    hp: baseHp,
    maxHp: baseHp,
    state: "IDLE",
  };
}

/**
 * Grant XP and apply level-ups. Ported verbatim from Hero.gainExperience: each
 * level-up recomputes maxHp from class base + (level-1)*HP_PER_LEVEL and heals
 * HP_GAIN_ON_LEVEL_UP capped at the new maxHp.
 */
export function gainExperience(hero: Hero, amount: number): Hero {
  if (amount <= 0 || hero.level >= MAX_HERO_LEVEL) return hero;
  let result: Hero = { ...hero };
  let remaining = amount;
  while (remaining > 0 && result.level < MAX_HERO_LEVEL) {
    const toNext = experienceToNextLevel(result) - result.experience;
    if (remaining >= toNext) {
      remaining -= toNext;
      const newLevel = result.level + 1;
      const baseHp = baseMaxHpForClass(result.heroClass);
      const newMaxHp = baseHp + (newLevel - 1) * HP_PER_LEVEL;
      result = {
        ...result,
        level: newLevel,
        experience: 0,
        maxHp: newMaxHp,
        hp: Math.min(result.hp + HP_GAIN_ON_LEVEL_UP, newMaxHp),
      };
    } else {
      result = { ...result, experience: result.experience + remaining };
      remaining = 0;
    }
  }
  return result;
}
