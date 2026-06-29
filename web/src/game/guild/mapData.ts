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
  // x/y are World Map layout coords (viewBox 0..100 × 0..70), matching the ASCII
  // sketch above. The graph algorithms ignore them.
  nodes: [
    { id: "stonegate", name: "Stonegate", kind: "town", x: 13, y: 60 },
    { id: "watch", name: "Watchpost", kind: "town", x: 15, y: 37 },
    { id: "ford", name: "Bramble Ford", kind: "wild", questMonster: "GOBLIN", questCount: 2, x: 39, y: 43 },
    { id: "mire", name: "Sallow Mire", kind: "wild", questMonster: "UNDEAD", questCount: 2, x: 61, y: 43 },
    { id: "crags", name: "Howling Crags", kind: "wild", questMonster: "TROLL", questCount: 1, x: 49, y: 13 },
    { id: "hollow", name: "Grey Hollow", kind: "ruin", questMonster: "RAT", questCount: 4, x: 24, y: 13 },
    { id: "barrow", name: "Kingsbarrow", kind: "dungeon", questMonster: "BOSS_GOBLIN", questCount: 1, x: 86, y: 43 },
    { id: "drakespire", name: "Drakespire", kind: "dungeon", questMonster: "BOSS_DRAGON", questCount: 1, x: 83, y: 13 },
    // Deliberately roadless — unreachable for pathfinding tests.
    { id: "anvil", name: "The Anvil", kind: "ruin", questMonster: "DRAGON", questCount: 1, x: 90, y: 60 },
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
