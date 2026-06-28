// Distortion filter — render a PresentedReport from the GROUND TRUTH at a tier.
//
//   tier 3  embedded    : EXACTLY the ground truth.
//   tier 2  eyewitness  : full log, reworded / colored, but outcome correct.
//   tier 1  hearsay     : short summary; may be wrong (seeded flag flip).
//   tier 0  no-witness  : silent — "no word returned".
//   tier 4  compromised : fabricated, internally consistent, provably != truth.
//
// The caller ALWAYS keeps the true CombatOutcome alongside this report (see
// DispatchEvent.truth); distortion never mutates or discards it.

import { HEARSAY_ERROR_PROB } from "./constants";
import { makeRng } from "./rng";
import type { CombatOutcome, FidelityTier, Hero, PresentedReport } from "./types";

const COLOR_PREFIXES = [
  "As I saw it,",
  "By my account,",
  "Near as I could tell,",
  "From the ridge,",
];

function round10(n: number): number {
  return Math.round(n / 10) * 10;
}

export function distort(
  truth: CombatOutcome,
  tier: FidelityTier,
  hero: Hero,
  seed: number,
): PresentedReport {
  const rng = makeRng(seed);

  switch (tier) {
    case 3:
      // Faithful: the ground truth, verbatim.
      return {
        tier,
        headline: truth.threatDefeated ? "Engagement won." : "Engagement lost.",
        lines: [...truth.events],
        claimedDefeated: truth.threatDefeated,
        claimedGold: truth.goldEarned,
        claimedKills: truth.monstersKilled,
        fabricated: false,
        silent: false,
      };

    case 2: {
      // Eyewitness: outcome correct, wording colored / reordered.
      const prefix = rng.pick(COLOR_PREFIXES);
      const colored = truth.events.map(
        (line, i) => (i === 0 ? `${prefix} ${decapitalize(line)}` : line),
      );
      if (colored.length > 1 && rng.chance(0.5)) {
        // bias: lead with the most dramatic line
        colored.unshift(colored.pop()!);
      }
      return {
        tier,
        headline: truth.threatDefeated
          ? `${hero.name}'s party carried the day.`
          : `${hero.name}'s party was driven back.`,
        lines: colored,
        claimedDefeated: truth.threatDefeated,
        claimedGold: truth.goldEarned,
        claimedKills: truth.monstersKilled,
        fabricated: false,
        silent: false,
      };
    }

    case 1: {
      // Hearsay: short, approximate, may be wrong.
      const flipped = rng.chance(HEARSAY_ERROR_PROB);
      const claimedDefeated = flipped ? !truth.threatDefeated : truth.threatDefeated;
      const claimedGold = claimedDefeated ? round10(truth.goldEarned || 50) : 0;
      const claimedKills = claimedDefeated ? Math.max(1, truth.monstersKilled) : 0;
      const headline = claimedDefeated
        ? `Word is ${hero.name} prevailed.`
        : `Word is ${hero.name} fell short.`;
      return {
        tier,
        headline,
        lines: [
          `Secondhand: ${claimedDefeated ? "a win was reported" : "a setback was reported"}` +
            (claimedDefeated ? `, perhaps ${claimedGold}g.` : "."),
        ],
        claimedDefeated,
        claimedGold,
        claimedKills,
        fabricated: false,
        silent: false,
      };
    }

    case 0:
      // No witness: silence.
      return {
        tier,
        headline: `No word returned of ${hero.name}.`,
        lines: [],
        claimedDefeated: false,
        claimedGold: 0,
        claimedKills: 0,
        fabricated: false,
        silent: true,
      };

    case 4: {
      // Compromised: a convincing lie. Guaranteed to differ from truth by
      // flipping the outcome flag, then made internally consistent.
      const claimedDefeated = !truth.threatDefeated;
      const claimedGold = claimedDefeated ? 20 + rng.int(2, 18) * 10 : 0;
      const claimedKills = claimedDefeated ? rng.int(1, 4) : 0;
      const lines = claimedDefeated
        ? [
            `${hero.name} reports a clean victory — the foe broke and ran.`,
            `Spoils recovered: ${claimedGold}g; ${claimedKills} slain.`,
          ]
        : [
            `${hero.name} reports the party was ambushed and overrun.`,
            `Nothing recovered; the objective was lost.`,
          ];
      return {
        tier,
        headline: claimedDefeated
          ? `${hero.name} claims a decisive victory.`
          : `${hero.name} claims a costly defeat.`,
        lines,
        claimedDefeated,
        claimedGold,
        claimedKills,
        fabricated: true,
        silent: false,
      };
    }
  }
}

function decapitalize(s: string): string {
  // Keep leading emoji/symbols, just lowercase the first alpha char.
  return s.replace(/[A-Za-z]/, (c) => c.toLowerCase());
}
