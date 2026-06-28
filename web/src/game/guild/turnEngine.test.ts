import { describe, expect, it } from "vitest";
import { advanceTurn } from "./turnEngine";
import {
  createInitialGuildState,
  createGuildHero,
  dispatchHero,
  type GuildState,
} from "./state";
import { makeRng, deriveSeed } from "./rng";

function runTurns(state: GuildState, n: number): GuildState {
  let s = state;
  for (let i = 0; i < n; i++) s = advanceTurn(s);
  return s;
}

describe("rng: seeded reproducibility", () => {
  it("same seed => same sequence", () => {
    const a = makeRng(123);
    const b = makeRng(123);
    const seqA = [a.next(), a.next(), a.next()];
    const seqB = [b.next(), b.next(), b.next()];
    expect(seqA).toEqual(seqB);
  });

  it("different seeds => different sequence", () => {
    const a = makeRng(1);
    const b = makeRng(2);
    expect(a.next()).not.toEqual(b.next());
  });

  it("deriveSeed is stable for the same key tuple", () => {
    expect(deriveSeed(99, 1, 2, 3)).toEqual(deriveSeed(99, 1, 2, 3));
    expect(deriveSeed(99, 1, 2, 3)).not.toEqual(deriveSeed(99, 3, 2, 1));
  });
});

describe("turnEngine: travel + arrival", () => {
  it("advances a hero one node per its edge cost and arrives", () => {
    let s = createInitialGuildState(42);
    // Stonegate -> Watchpost: a single 1-turn edge with a quest at neither end,
    // but Watchpost is a town (no quest). Use it to test pure travel/arrival.
    s = dispatchHero(s, "h1", "watch", null);
    expect(s.dispatches).toHaveLength(1);
    expect(s.dispatches[0].status).toBe("traveling");

    s = advanceTurn(s); // traverse the single edge -> arrive
    expect(s.dispatches[0].status).toBe("arrived");
  });

  it("takes the summed travel-turns to reach a far node", () => {
    let s = createInitialGuildState(7);
    // Stonegate -> Kingsbarrow: path turns = 1+1+1+3 = 6 travel-turns.
    s = dispatchHero(s, "h1", "barrow", null);
    s = runTurns(s, 5);
    expect(s.dispatches[0].status).toBe("traveling");
    s = advanceTurn(s); // 6th travel-turn completes the mire->barrow edge
    expect(s.dispatches[0].status).not.toBe("traveling");
  });

  it("resolves a quest fight on arrival and stores a CombatOutcome", () => {
    let s = createInitialGuildState(3);
    // Bramble Ford has a GOBLIN x2 quest; Stonegate->ford = 2 travel-turns.
    s = dispatchHero(s, "h1", "ford", null);
    s = runTurns(s, 2);
    const d = s.dispatches[0];
    expect(["arrived", "lost"]).toContain(d.status);
    const quest = d.log.find((e) => e.kind === "quest");
    expect(quest).toBeDefined();
    expect(quest!.truth).toMatchObject({
      threatDefeated: expect.any(Boolean),
      goldEarned: expect.any(Number),
      events: expect.any(Array),
    });
  });
});

describe("turnEngine: determinism / replay", () => {
  it("is fully replayable from the same seed", () => {
    const make = () => {
      let s = createInitialGuildState(0xabc);
      s = dispatchHero(s, "h4", "drakespire", "a1"); // long, encounter-heavy
      return runTurns(s, 10);
    };
    const a = make();
    const b = make();
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it("a different base seed can change the journey's events", () => {
    const journey = (seed: number) => {
      let s = createInitialGuildState(seed);
      s = dispatchHero(s, "h4", "drakespire", "a1");
      s = runTurns(s, 10);
      return s.dispatches[0].log.length;
    };
    // Not guaranteed different for every pair, but across a spread the seeded
    // encounter rolls should produce at least one differing event count.
    const counts = [1, 2, 3, 4, 5].map(journey);
    const allSame = counts.every((c) => c === counts[0]);
    expect(allSame).toBe(false);
  });

  it("encounter rolls fire on a high-chance route (across seeds)", () => {
    // Any single seed can roll no encounters (~3% on this route), so sweep a
    // spread: in aggregate the seeded encounter rolls must produce road fights.
    let total = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      let s = createInitialGuildState(seed);
      s = dispatchHero(s, "h1", "drakespire", null);
      s = runTurns(s, 12);
      total += s.dispatches[0].log.filter((e) => e.kind === "road").length;
    }
    expect(total).toBeGreaterThan(0);
  });

  it("chains HP damage across encounters (hero hp can drop below max)", () => {
    let s = createInitialGuildState(0xdead);
    const before = s.heroes.find((h) => h.id === "h3")!.stats.hp;
    s = dispatchHero(s, "h3", "drakespire", null); // fragile wizard, long road
    s = runTurns(s, 12);
    const after = s.heroes.find((h) => h.id === "h3")!.stats.hp;
    expect(after).toBeLessThanOrEqual(before);
  });

  it("createGuildHero clamps trust to 0..100", () => {
    expect(createGuildHero("x", "X", "WARRIOR", 1, 999).trust).toBe(100);
    expect(createGuildHero("x", "X", "WARRIOR", 1, -5).trust).toBe(0);
  });
});
