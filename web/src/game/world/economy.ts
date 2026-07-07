// The §12 number sheet, as named constants. All absolutes are straw defaults
// tuned for feel — the RATIOS are the design; retuning a number is free.

export const ECONOMY = {
  startingGold: 1000,
  dailyUpkeep: 60, // OUT / day (the §8 clock)
  passiveIncome: 20, // IN / day (Guild Hall floor) — idle net −40/day ≈ 25-day runway

  // The cut — Slice 1's priced decision. Base 30%, buttons −10/−5/+5/+10 → 20–40%.
  cutBase: 30,
  cutMin: 20,
  cutMax: 40,

  // Debt — §8's one warning stage.
  loanPrincipal: 600,
  loanInterestPerDay: 30, // flat 5%/day of 600, never compounding
  repayKeepBuffer: 200, // force-repays only when you can pay 600 AND keep this
  insolvencyLimit: 5, // consecutive insolvent end-days → charter revoked

  // Board.
  expiryDays: 3, // a posting the party never takes withdraws after ~3 days
  failWithdrawAt: 2, // giver withdraws after the 2nd failure
} as const;

// Quest tiers. Rewards are the pool; your take = reward × cut.
export const QUESTS = {
  road: {
    tier: "road" as const,
    giver: "Reeve of Ashford",
    title: "Clear the Ashford road",
    reward: 200, // → cut 40–80g. Survival: success ~85%; at 30% ≈ +6g/day net.
    // Acceptance is a MAX-CUT threshold in cut-points: the party bites if the
    // posted cut ≤ (askAnchor + run offset + daily noise). Road sits high, so it
    // is almost always taken — the §6 unstick floor.
    askAnchor: 42,
    failPayBump: 40, // one-time reward bump on failure (bounded; difficulty rises with pay)
  },
  ruins: {
    tier: "ruins" as const,
    giver: "Antiquarian Vell",
    title: "Delve the Sunken Ruins",
    reward: 600, // → cut 120–240g. Growth: 50–75% by party quality; a good day ≈ +140g.
    // Seated so the 40% squeeze is a genuine gamble: the run offset (±5) straddles
    // 40, so on some runs posting 40% is accepted (+~60g over 30%) and on others it
    // rots. You only know which by observing — that asymmetry is §12's R2 payoff.
    askAnchor: 38,
    failPayBump: 60,
  },
} as const;

// Acceptance-model spread, in cut-points.
export const ACCEPT = {
  runOffsetMax: 5, // ±5, fixed once per run per quest tier
  dailyNoiseMax: 2, // ±2, re-rolled each acceptance check
} as const;

// Resolver bands (seeded probability, reads party CV quality — no combat sim in Slice 1).
export const RESOLVE = {
  roadBase: 0.85, // ~85% flat; a slight quality nudge
  roadQualityBonus: 0.05,
  ruinsFloor: 0.5,
  ruinsQualitySpan: 0.25, // ruins p = floor + span×quality, clamped [0.50, 0.75]
} as const;

export type QuestTier = "road" | "ruins";
