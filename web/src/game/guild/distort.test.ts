import { describe, expect, it } from "vitest";
import { distort } from "./distort";
import { createGuildHero } from "./state";
import type { CombatOutcome, Hero } from "./types";

const hero: Hero = createGuildHero("h", "Gunter", "WARRIOR", 3, 50);

const WIN: CombatOutcome = {
  heroesAfter: [],
  goldEarned: 120,
  monstersKilled: 3,
  bossesKilled: 0,
  events: ["🗡 Heroes defeated Goblin x3! +120g", "Gunter took a scratch."],
  threatDefeated: true,
};

const LOSS: CombatOutcome = {
  heroesAfter: [],
  goldEarned: 0,
  monstersKilled: 0,
  bossesKilled: 0,
  events: ["💥 Troll x1 repelled the heroes — they regroup."],
  threatDefeated: false,
};

describe("distort: tier 3 is the ground truth", () => {
  it("reproduces the outcome verbatim", () => {
    const r = distort(WIN, 3, hero, 1);
    expect(r.lines).toEqual(WIN.events);
    expect(r.claimedDefeated).toBe(WIN.threatDefeated);
    expect(r.claimedGold).toBe(WIN.goldEarned);
    expect(r.claimedKills).toBe(WIN.monstersKilled);
    expect(r.fabricated).toBe(false);
    expect(r.silent).toBe(false);
  });
});

describe("distort: tier 0 hides the outcome", () => {
  it("returns a silent report with no battle detail", () => {
    const r = distort(WIN, 0, hero, 1);
    expect(r.silent).toBe(true);
    expect(r.lines).toEqual([]);
    expect(r.claimedGold).toBe(0);
    expect(r.claimedKills).toBe(0);
    // The headline reveals nothing about win/loss.
    expect(r.headline.toLowerCase()).toContain("no word");
  });
});

describe("distort: tier 2 eyewitness keeps the outcome but colors the telling", () => {
  it("reports the correct result with non-empty, reworded lines", () => {
    const r = distort(WIN, 2, hero, 7);
    expect(r.claimedDefeated).toBe(WIN.threatDefeated);
    expect(r.claimedGold).toBe(WIN.goldEarned);
    expect(r.lines.length).toBeGreaterThan(0);
    expect(r.fabricated).toBe(false);
  });
});

describe("distort: tier 1 hearsay is short and approximate", () => {
  it("returns a single summary line", () => {
    const r = distort(WIN, 1, hero, 2);
    expect(r.lines.length).toBe(1);
    expect(r.fabricated).toBe(false);
  });

  it("can be wrong: across seeds, at least one flips the outcome", () => {
    let flips = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const r = distort(WIN, 1, hero, seed);
      if (r.claimedDefeated !== WIN.threatDefeated) flips++;
    }
    expect(flips).toBeGreaterThan(0);
  });
});

describe("distort: tier 4 is a self-consistent lie that differs from truth", () => {
  it("flips the outcome flag (provably != ground truth)", () => {
    const r = distort(WIN, 4, hero, 3);
    expect(r.fabricated).toBe(true);
    expect(r.claimedDefeated).not.toBe(WIN.threatDefeated);
  });

  it("stays internally consistent for a fabricated victory", () => {
    // From a real LOSS, tier 4 claims a victory: gold & kills must be positive.
    const r = distort(LOSS, 4, hero, 5);
    expect(r.claimedDefeated).toBe(true);
    expect(r.claimedGold).toBeGreaterThan(0);
    expect(r.claimedKills).toBeGreaterThan(0);
    expect(r.lines.length).toBeGreaterThan(0);
  });

  it("stays internally consistent for a fabricated defeat", () => {
    // From a real WIN, tier 4 claims a defeat: no spoils.
    const r = distort(WIN, 4, hero, 9);
    expect(r.claimedDefeated).toBe(false);
    expect(r.claimedGold).toBe(0);
    expect(r.claimedKills).toBe(0);
  });

  it("is deterministic for the same seed", () => {
    expect(distort(WIN, 4, hero, 42)).toEqual(distort(WIN, 4, hero, 42));
  });
});
