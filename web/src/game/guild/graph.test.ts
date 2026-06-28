import { describe, expect, it } from "vitest";
import { shortestPath, travelTurnsOf, neighbors, edgeBetween } from "./graph";
import { TEST_WORLD } from "./mapData";

describe("graph: shortestPath", () => {
  it("finds the direct neighbour with hop=1 and the right ETA", () => {
    const r = shortestPath(TEST_WORLD, "stonegate", "watch");
    expect(r.unreachable).toBe(false);
    expect(r.path).toEqual(["stonegate", "watch"]);
    expect(r.travelTurns).toBe(1);
  });

  it("returns the fewest-hops path and sums edge travelTurns into the ETA", () => {
    const r = shortestPath(TEST_WORLD, "stonegate", "mire");
    expect(r.path).toEqual(["stonegate", "watch", "ford", "mire"]);
    // 1 (stonegate-watch) + 1 (watch-ford) + 1 (ford-mire)
    expect(r.travelTurns).toBe(3);
  });

  it("reaches a deep dungeon, summing a multi-turn edge", () => {
    const r = shortestPath(TEST_WORLD, "stonegate", "barrow");
    expect(r.path).toEqual(["stonegate", "watch", "ford", "mire", "barrow"]);
    // 1 + 1 + 1 + 3 (mire-barrow)
    expect(r.travelTurns).toBe(6);
  });

  it("travelTurns of the returned path equals travelTurnsOf()", () => {
    const r = shortestPath(TEST_WORLD, "stonegate", "drakespire");
    expect(r.travelTurns).toBe(travelTurnsOf(TEST_WORLD, r.path));
    expect(r.path[0]).toBe("stonegate");
    expect(r.path[r.path.length - 1]).toBe("drakespire");
    // fewest hops = 4 edges
    expect(r.path.length).toBe(5);
  });

  it("same-node path is trivial with zero travel", () => {
    const r = shortestPath(TEST_WORLD, "ford", "ford");
    expect(r.unreachable).toBe(false);
    expect(r.path).toEqual(["ford"]);
    expect(r.travelTurns).toBe(0);
  });

  it("marks an isolated node unreachable", () => {
    const r = shortestPath(TEST_WORLD, "stonegate", "anvil");
    expect(r.unreachable).toBe(true);
    expect(r.path).toEqual([]);
    expect(r.travelTurns).toBe(0);
  });

  it("marks an unknown node unreachable", () => {
    const r = shortestPath(TEST_WORLD, "stonegate", "atlantis");
    expect(r.unreachable).toBe(true);
  });
});

describe("graph: adjacency", () => {
  it("treats edges as undirected", () => {
    const fwd = neighbors(TEST_WORLD, "stonegate").map((n) => n.node);
    expect(fwd).toContain("watch");
    const back = neighbors(TEST_WORLD, "watch").map((n) => n.node);
    expect(back).toContain("stonegate");
  });

  it("finds an edge regardless of direction", () => {
    const a = edgeBetween(TEST_WORLD, "watch", "ford");
    const b = edgeBetween(TEST_WORLD, "ford", "watch");
    expect(a).toBeDefined();
    expect(a).toBe(b);
    expect(a!.travelTurns).toBe(1);
  });
});
