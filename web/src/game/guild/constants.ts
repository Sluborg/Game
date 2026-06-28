// Asset Report — tuning constants for the fidelity / distortion model.
// All the knobs live here on purpose; starting values, expect to tune.

import type { FidelityTier } from "./types";

// --- Fidelity ceiling from AGENT QUALITY (0..100) ---------------------------
// Better agents can witness more faithfully. Tier 4 (fabrication) is NOT a
// quality reward — it only ever comes from corruption — so quality caps at 3.
// With no agent attached, you get the hero's own terse word (hearsay).
export const NO_AGENT_CEILING: FidelityTier = 1;
export const QUALITY_TIERS: Array<{ min: number; tier: FidelityTier }> = [
  { min: 75, tier: 3 }, // embedded / faithful
  { min: 45, tier: 2 }, // eyewitness
  { min: 20, tier: 1 }, // hearsay
  { min: 0, tier: 0 }, // no usable witness
];

// --- Fidelity gate from HERO TRUST (0..100) ---------------------------------
// A distrustful hero stonewalls even a great agent: the tier you actually get
// is min(ceiling, gate).
export const TRUST_TIERS: Array<{ min: number; tier: FidelityTier }> = [
  { min: 70, tier: 3 },
  { min: 45, tier: 2 },
  { min: 20, tier: 1 },
  { min: 0, tier: 0 },
];

// --- Corruption (only below the trust threshold) ----------------------------
// Below CORRUPTION_THRESHOLD trust, there is a seeded chance the agent is
// fooled (tier 4, fabricated) or blinded/killed (tier 0, no word).
export const CORRUPTION_THRESHOLD = 25;
// Base chance at the threshold, rising toward zero trust.
export const CORRUPTION_BASE = 0.15;
export const CORRUPTION_SLOPE = 0.55; // added as trust -> 0
// Of corruption events, how many fabricate (vs. blind/kill).
export const CORRUPTION_FABRICATE_PROB = 0.5;
// When blinded/killed and an agent is present, chance the AGENT dies (vs hero lost).
export const CORRUPTION_AGENT_DEATH_PROB = 0.5;

// --- Hearsay (tier 1) error model -------------------------------------------
// Hearsay "may be wrong": a chance the reported outcome flag is flipped.
export const HEARSAY_ERROR_PROB = 0.25;
