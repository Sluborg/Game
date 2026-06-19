// Milestones. Ported verbatim from Milestone.kt — same 7 definitions, same
// rewards, same completion checks.

import type { GameState, Milestone } from "./types";

interface MilestoneDef {
  id: string;
  title: string;
  description: string;
  goldReward: number;
  check: (s: GameState) => boolean;
}

export const MILESTONE_DEFS: MilestoneDef[] = [
  { id: "first_blood", title: "First Blood", description: "Defeat your first monster", goldReward: 50, check: (s) => s.totalMonstersKilled >= 1 },
  { id: "second_hero", title: "A Kingdom Needs Champions", description: "Recruit your second hero", goldReward: 200, check: (s) => s.heroes.length >= 2 },
  { id: "hero_level_5", title: "Seasoned Veteran", description: "Raise a hero to level 5", goldReward: 500, check: (s) => s.heroes.some((h) => h.level >= 5) },
  { id: "five_buildings", title: "Growing Kingdom", description: "Build 5 different structures", goldReward: 750, check: (s) => s.buildings.length >= 5 },
  { id: "boss_slayer", title: "Slayer of Kings", description: "Defeat your first Boss monster", goldReward: 1500, check: (s) => s.totalBossKills >= 1 },
  { id: "monster_hunter", title: "Monster Hunter", description: "Defeat 50 monsters", goldReward: 1000, check: (s) => s.totalMonstersKilled >= 50 },
  { id: "full_party", title: "The Fellowship", description: "Have 5 heroes in your roster", goldReward: 2000, check: (s) => s.heroes.length >= 5 },
];

export function evaluateMilestones(state: GameState): Milestone[] {
  return MILESTONE_DEFS.map((def) => ({
    id: def.id,
    title: def.title,
    description: def.description,
    goldReward: def.goldReward,
    isCompleted: def.check(state),
  }));
}
