// Reporter — glue between the turn engine and the fidelity/distortion model.
// Given a ground-truth event, decide the tier (fidelity.ts) and render the
// player-facing report (distort.ts). Pass the result to advanceTurn via its
// `reporter` option; the engine stores both truth and presented report.

import { decideTier } from "./fidelity";
import { distort } from "./distort";
import { deriveSeed } from "./rng";
import type { Reporter } from "./turnEngine";

/** The standard reporter used by the live game. */
export const standardReporter: Reporter = (ctx) => {
  const decision = decideTier(ctx.agent, ctx.hero, deriveSeed(ctx.seed, 1));
  const presented = distort(ctx.outcome, decision.tier, ctx.hero, deriveSeed(ctx.seed, 2));
  return {
    tier: decision.tier,
    presented,
    agentKilled: decision.agentKilled,
    heroLost: decision.heroLost,
  };
};
