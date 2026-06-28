import { describe, expect, it } from "vitest";
import {
  ceilingFromQuality,
  corruptionChance,
  decideTier,
  gateFromTrust,
} from "./fidelity";
import { CORRUPTION_THRESHOLD } from "./constants";
import { createAgent, createGuildHero } from "./state";
import type { Agent, Hero } from "./types";

const hero = (trust: number): Hero => createGuildHero("h", "Test", "WARRIOR", 1, trust);
const agent = (quality: number): Agent => createAgent("a", "Test", quality);

describe("fidelity: ceiling from agent quality", () => {
  it("maps quality bands to tiers", () => {
    expect(ceilingFromQuality(agent(90))).toBe(3);
    expect(ceilingFromQuality(agent(60))).toBe(2);
    expect(ceilingFromQuality(agent(30))).toBe(1);
    expect(ceilingFromQuality(agent(5))).toBe(0);
  });

  it("gives only hearsay with no agent", () => {
    expect(ceilingFromQuality(null)).toBe(1);
  });

  it("a dead agent is treated as no agent", () => {
    expect(ceilingFromQuality({ ...agent(99), alive: false })).toBe(1);
  });
});

describe("fidelity: gate from hero trust", () => {
  it("maps trust bands to tiers", () => {
    expect(gateFromTrust(80)).toBe(3);
    expect(gateFromTrust(50)).toBe(2);
    expect(gateFromTrust(30)).toBe(1);
    expect(gateFromTrust(10)).toBe(0);
  });

  it("gates exactly at band boundaries", () => {
    expect(gateFromTrust(70)).toBe(3);
    expect(gateFromTrust(69)).toBe(2);
    expect(gateFromTrust(45)).toBe(2);
    expect(gateFromTrust(44)).toBe(1);
  });
});

describe("fidelity: min() gating", () => {
  it("a great agent is gated down by a low-trust hero", () => {
    // ceiling 3, gate 2 -> tier 2. (trust 50 is above corruption threshold)
    const d = decideTier(agent(90), hero(50), 1);
    expect(d.ceiling).toBe(3);
    expect(d.gate).toBe(2);
    expect(d.tier).toBe(2);
    expect(d.corrupted).toBe(false);
  });

  it("a poor agent caps a high-trust hero", () => {
    const d = decideTier(agent(30), hero(90), 1);
    expect(d.ceiling).toBe(1);
    expect(d.gate).toBe(3);
    expect(d.tier).toBe(1);
  });
});

describe("fidelity: corruption only below threshold", () => {
  it("chance is zero at/above the threshold", () => {
    expect(corruptionChance(CORRUPTION_THRESHOLD)).toBe(0);
    expect(corruptionChance(CORRUPTION_THRESHOLD + 10)).toBe(0);
    expect(corruptionChance(CORRUPTION_THRESHOLD - 1)).toBeGreaterThan(0);
  });

  it("never corrupts a trusting hero across many seeds", () => {
    let corrupted = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const d = decideTier(agent(90), hero(60), seed);
      if (d.corrupted) corrupted++;
    }
    expect(corrupted).toBe(0);
  });

  it("sometimes corrupts a distrusted hero (tier 0 or 4)", () => {
    let corrupted = 0;
    let sawFabricated = false;
    let sawBlinded = false;
    for (let seed = 1; seed <= 400; seed++) {
      const d = decideTier(agent(90), hero(5), seed);
      if (d.corrupted) {
        corrupted++;
        if (d.tier === 4) sawFabricated = true;
        if (d.tier === 0) sawBlinded = true;
      }
    }
    expect(corrupted).toBeGreaterThan(0);
    expect(sawFabricated).toBe(true);
    expect(sawBlinded).toBe(true);
  });

  it("blinded corruption marks either the agent killed or the hero lost", () => {
    for (let seed = 1; seed <= 400; seed++) {
      const d = decideTier(agent(90), hero(2), seed);
      if (d.corrupted && d.tier === 0) {
        expect(d.agentKilled || d.heroLost).toBe(true);
      }
    }
  });

  it("is deterministic for the same seed", () => {
    const a = decideTier(agent(40), hero(10), 12345);
    const b = decideTier(agent(40), hero(10), 12345);
    expect(a).toEqual(b);
  });
});
