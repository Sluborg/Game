// Hand-authored test world — ~8 nodes. Data-driven on purpose: the graph
// algorithms know nothing about this specific layout. Tune freely.
//
//        Hollow(ruin) -- Crags(wild) -- Drakespire(dungeon)
//          |              |
//   Watch(town) -- Ford(wild) -- Mire(wild) -- Barrow(dungeon)
//          |
//   Stonegate(town, hub / origin)
//
// "Stonegate" is the guild seat (origin). "Anvil" is an isolated node with no
// roads, used to exercise unreachable-destination handling.

import type { WorldGraph } from "./types";

export const ORIGIN_NODE = "stonegate";

export const TEST_WORLD: WorldGraph = {
  nodes: [
    { id: "stonegate", name: "Stonegate", kind: "town" },
    { id: "watch", name: "Watchpost", kind: "town" },
    { id: "ford", name: "Bramble Ford", kind: "wild", questMonster: "GOBLIN", questCount: 2 },
    { id: "mire", name: "Sallow Mire", kind: "wild", questMonster: "UNDEAD", questCount: 2 },
    { id: "crags", name: "Howling Crags", kind: "wild", questMonster: "TROLL", questCount: 1 },
    { id: "hollow", name: "Grey Hollow", kind: "ruin", questMonster: "RAT", questCount: 4 },
    { id: "barrow", name: "Kingsbarrow", kind: "dungeon", questMonster: "BOSS_GOBLIN", questCount: 1 },
    { id: "drakespire", name: "Drakespire", kind: "dungeon", questMonster: "BOSS_DRAGON", questCount: 1 },
    // Deliberately roadless — unreachable for pathfinding tests.
    { id: "anvil", name: "The Anvil", kind: "ruin", questMonster: "DRAGON", questCount: 1 },
  ],
  edges: [
    { from: "stonegate", to: "watch", travelTurns: 1, encounterChance: 0.15, encounterMonster: "RAT", encounterCount: 2 },
    { from: "watch", to: "ford", travelTurns: 1, encounterChance: 0.3, encounterMonster: "GOBLIN", encounterCount: 1 },
    { from: "watch", to: "hollow", travelTurns: 2, encounterChance: 0.4, encounterMonster: "UNDEAD", encounterCount: 1 },
    { from: "hollow", to: "crags", travelTurns: 2, encounterChance: 0.45, encounterMonster: "TROLL", encounterCount: 1 },
    { from: "ford", to: "crags", travelTurns: 2, encounterChance: 0.4, encounterMonster: "GOBLIN", encounterCount: 2 },
    { from: "ford", to: "mire", travelTurns: 1, encounterChance: 0.35, encounterMonster: "UNDEAD", encounterCount: 1 },
    { from: "mire", to: "barrow", travelTurns: 3, encounterChance: 0.5, encounterMonster: "UNDEAD", encounterCount: 2 },
    { from: "crags", to: "drakespire", travelTurns: 3, encounterChance: 0.5, encounterMonster: "TROLL", encounterCount: 1 },
  ],
};
