// Fidelity model — decide WHICH tier a report comes back at.
//
// Hybrid driver (per the design):
//   ceiling = f(agent.quality)   — better agent -> higher max fidelity
//   gate    = f(hero.trust)      — low trust lowers the tier you actually get
//   tier    = min(ceiling, gate)
//   if trust < CORRUPTION_THRESHOLD: a seeded chance the agent is fooled
//     (tier 4, fabricated) or blinded/killed (tier 0, no word).
//
// Pure & seeded: same (agent, hero, seed) => same decision.

import {
  CORRUPTION_AGENT_DEATH_PROB,
  CORRUPTION_BASE,
  CORRUPTION_FABRICATE_PROB,
  CORRUPTION_SLOPE,
  CORRUPTION_THRESHOLD,
  NO_AGENT_CEILING,
  QUALITY_TIERS,
  TRUST_TIERS,
} from "./constants";
import { makeRng } from "./rng";
import type { Agent, FidelityTier, Hero } from "./types";

export interface TierDecision {
  tier: FidelityTier;
  ceiling: FidelityTier;
  gate: FidelityTier;
  /** True when a corruption event overrode the honest min() tier. */
  corrupted: boolean;
  /** The agent was killed/blinded (tier-0 corruption path). */
  agentKilled: boolean;
  /** The hero did not return (tier-0 corruption path). */
  heroLost: boolean;
}

export function ceilingFromQuality(agent: Agent | null): FidelityTier {
  if (!agent || !agent.alive) return NO_AGENT_CEILING;
  for (const band of QUALITY_TIERS) {
    if (agent.quality >= band.min) return band.tier;
  }
  return 0;
}

export function gateFromTrust(trust: number): FidelityTier {
  for (const band of TRUST_TIERS) {
    if (trust >= band.min) return band.tier;
  }
  return 0;
}

/** Probability of a corruption event for a given trust (0 at/above threshold). */
export function corruptionChance(trust: number): number {
  if (trust >= CORRUPTION_THRESHOLD) return 0;
  const depth = (CORRUPTION_THRESHOLD - trust) / CORRUPTION_THRESHOLD; // 0..1
  return Math.min(1, CORRUPTION_BASE + depth * CORRUPTION_SLOPE);
}

export function decideTier(agent: Agent | null, hero: Hero, seed: number): TierDecision {
  const ceiling = ceilingFromQuality(agent);
  const gate = gateFromTrust(hero.trust);
  const honest = Math.min(ceiling, gate) as FidelityTier;

  const base: TierDecision = {
    tier: honest,
    ceiling,
    gate,
    corrupted: false,
    agentKilled: false,
    heroLost: false,
  };

  const chance = corruptionChance(hero.trust);
  if (chance <= 0) return base;

  const rng = makeRng(seed);
  if (!rng.chance(chance)) return base;

  // Corruption fired.
  if (rng.chance(CORRUPTION_FABRICATE_PROB)) {
    return { ...base, tier: 4, corrupted: true };
  }
  // Blinded / killed: no word returns (tier 0).
  const agentDies = agent != null && agent.alive && rng.chance(CORRUPTION_AGENT_DEATH_PROB);
  return {
    ...base,
    tier: 0,
    corrupted: true,
    agentKilled: agentDies,
    heroLost: !agentDies,
  };
}
