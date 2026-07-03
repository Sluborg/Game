// The lean-1v1 math, derived purely from a unit's attributes + equipment.
// Pure functions, no state — these are what the engine and the tests assert.

import { CAP, CRIT, CURVE_K, DAMAGE_VARIANCE, DODGE_WEIGHTS, HP, OPENING } from "./tuning";
import type { Rng } from "./rng";

/** The seven attributes; only Str/Dex/Sta/Per are used by the lean fight. */
export interface Attributes {
  str: number;
  dex: number;
  sta: number;
  per: number;
}

/** Single-input saturating curve: CAP * x / (x + k), clamped at CAP. */
function saturate(x: number, k: number): number {
  return Math.min(CAP, (CAP * x) / (x + k));
}

export function maxHp(a: Attributes): number {
  return a.sta * HP.perSta + a.str * HP.perStr;
}

/** Base (pre-variance, pre-crit) hit damage. */
export function baseDamage(a: Attributes): number {
  return a.str;
}

export function dodgeChance(a: Attributes): number {
  const x = DODGE_WEIGHTS.dex * a.dex + DODGE_WEIGHTS.per * a.per;
  return saturate(x, CURVE_K.dodge);
}

/** Fraction of incoming damage removed by armor (0..CAP). */
export function armorMitigation(armorValue: number): number {
  return saturate(armorValue, CURVE_K.armor);
}

/** Seconds per swing: weapon base reduced %-wise by Dex, floored at 10% of base. */
export function attackInterval(weaponBaseSeconds: number, a: Attributes): number {
  return weaponBaseSeconds * (1 - (CAP * a.dex) / (a.dex + CURVE_K.attackSpeed));
}

/** First-strike ordering key: higher (Dex + Per) acts first. */
export function initiative(a: Attributes): number {
  return a.dex + a.per;
}

// --- Tester-only feel (flagged) -------------------------------------------------

export function critChance(a: Attributes): number {
  return Math.min(CRIT.max, CRIT.base + a.dex * CRIT.perDex);
}

/** A multiplier in [0.8, 1.2] for this swing. */
export function rollVariance(rng: Rng): number {
  return DAMAGE_VARIANCE.min + rng.next() * (DAMAGE_VARIANCE.max - DAMAGE_VARIANCE.min);
}

/** When a unit takes its opening swing (desynced by Dex+Per plus jitter). */
export function openingDelay(interval: number, a: Attributes, rng: Rng): number {
  const roll = a.dex + a.per + rng.next() * OPENING.jitter;
  return interval * (1 - (OPENING.factor * roll) / (roll + OPENING.k));
}
