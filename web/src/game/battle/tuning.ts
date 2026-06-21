// Combat tuning — every magic number the sim depends on lives here, named.
// Canonical values come from the "Combat System" design page (the lean-1v1
// spec); the VARIANCE and CRIT blocks are tester-only feel knobs that the
// canonical resolver omits, kept separate so they are easy to disable.

/** Global saturation cap. No chance can reach 100%; the hard ceiling is 90%. */
export const CAP = 0.9;

/** Single-input saturating curves: value = CAP * x / (x + K). One K per curve. */
export const CURVE_K = {
  /** dodge: opposes nothing here, K=50 (stats bite early, then flatten). */
  dodge: 50,
  /** attack speed reduction, K=50. */
  attackSpeed: 50,
  /** armor mitigation, K=20 (armor numbers are small). */
  armor: 20,
} as const;

/** maxHp = STA*hpPerSta + STR*hpPerStr (Sta:Str = 2:1). */
export const HP = { perSta: 8, perStr: 4 } as const;

/** dodge input weights: (2*Dex + Per), i.e. Dex:Per = 2:1. */
export const DODGE_WEIGHTS = { dex: 2, per: 1 } as const;

// --- Tester-only feel knobs (NOT part of the canonical deterministic resolver) --

/** Per-hit damage multiplier is rolled uniformly in [min, max]. */
export const DAMAGE_VARIANCE = { min: 0.8, max: 1.2 } as const;

/** Crit chance = clamp(base + Dex*perDex, max); crit multiplies damage by mult. */
export const CRIT = { base: 0.05, perDex: 0.01, max: 0.25, mult: 2 } as const;

/**
 * Opening desync: a unit's first swing happens at
 *   cd * (1 - factor * roll / (roll + k)),  roll = (Dex + Per) + rand[0, jitter)
 * so higher (Dex+Per) strikes first and identical stack members don't lockstep.
 */
export const OPENING = { factor: 0.35, k: 15, jitter: 8 } as const;
