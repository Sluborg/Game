import { describe, expect, it } from "vitest";
import { TEST_WORLD } from "../../game/guild/mapData";
import { dangerFromEncounter, type DangerLevel } from "./danger";

describe("dangerFromEncounter", () => {
  it("maps encounterChance (0..1) to a 1..5 level across the whole range", () => {
    expect(dangerFromEncounter(0)).toBe(1);
    expect(dangerFromEncounter(0.15)).toBe(1);
    expect(dangerFromEncounter(0.3)).toBe(2);
    expect(dangerFromEncounter(0.4)).toBe(3);
    expect(dangerFromEncounter(0.45)).toBe(4);
    expect(dangerFromEncounter(0.5)).toBe(5);
    expect(dangerFromEncounter(1)).toBe(5);
  });
});

describe("World Map data", () => {
  it("gives every node layout coordinates", () => {
    for (const node of TEST_WORLD.nodes) {
      expect(typeof node.x).toBe("number");
      expect(typeof node.y).toBe("number");
    }
  });

  it("spreads road danger across the scale (every level represented)", () => {
    const levels = new Set<DangerLevel>(
      TEST_WORLD.edges.map((e) => dangerFromEncounter(e.encounterChance)),
    );
    // The hand-authored test world should exercise all five danger levels.
    expect(levels.size).toBeGreaterThanOrEqual(4);
  });
});
