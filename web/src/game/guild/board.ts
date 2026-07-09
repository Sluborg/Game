// Board logic (§9/§12) — the acceptance model and the observation-bracket learning
// that makes the cut a readable decision. A party's hidden ask = a MAX tolerated
// cut (anchor + fixed run offset + ±2 daily noise). The player never sees the
// number; they see an appetite chip projected from what they've OBSERVED (accept/
// decline at known cuts), and the real roll happens at end-day.

import { PARTY_BY_ID, partyQuality } from "./roster";
import { rngFor } from "./seed";
import type { AppetiteLabel, AskKnowledge, GuildState, QuestTier } from "./types";

export const NOISE = 2; // ±2 cut-points of daily mood noise (§12)

export function offsetKey(partyId: string, tier: QuestTier): string {
  return `${partyId}:${tier}`;
}

/** The party's effective max tolerated cut on a given day (anchor + run offset +
 * daily noise). null → the party cannot take this tier at all. */
export function effectiveMaxCut(state: GuildState, partyId: string, tier: QuestTier, day: number): number | null {
  const anchor = PARTY_BY_ID[partyId]?.askMaxCut[tier];
  if (anchor === null || anchor === undefined) return null;
  const runOffset = state.askRunOffset[offsetKey(partyId, tier)] ?? 0;
  // Daily noise in [-NOISE, +NOISE], deterministic per (run, day, party, tier).
  const noise = Math.round((rngFor(state.rngSeed, "noise", day, partyId, tier).next() * 2 - 1) * NOISE);
  return anchor + runOffset + noise;
}

/** Does the party accept a posting at `cutPct` on `day`? (Real end-day roll.) */
export function partyAccepts(state: GuildState, partyId: string, tier: QuestTier, cutPct: number, day: number): boolean {
  const max = effectiveMaxCut(state, partyId, tier, day);
  return max !== null && cutPct <= max;
}

/** The appetite chip the board shows for a candidate cut, projected purely from
 * the player's learned bracket (never from the hidden truth). "eager" must NEVER
 * lie: an observed accept at cut C only proves the true threshold K ≥ C − NOISE
 * (the accept may have landed on a +NOISE day), and a future roll can subtract
 * another NOISE, so the guaranteed-accept region is cut ≤ maxAcceptedCut − 2·NOISE.
 * (A tighter bound than the naïve − NOISE — see the Adversary Review #2 finding.) */
export function appetiteFor(knowledge: AskKnowledge | undefined, cutPct: number): AppetiteLabel {
  if (!knowledge || (knowledge.maxAcceptedCut === null && knowledge.minRejectedCut === null)) {
    return "unknown";
  }
  // Symmetric to "eager": an observed reject at C only proves K < C + NOISE (it may
  // have landed on a −NOISE day), so a future +NOISE day can still accept inside a
  // 2·NOISE band above the reject. Only call "won't bite" beyond that band, else the
  // chip would lie the other way (Codex R#34).
  if (knowledge.minRejectedCut !== null && cutPct >= knowledge.minRejectedCut + 2 * NOISE) return "won't bite";
  if (knowledge.maxAcceptedCut !== null && cutPct <= knowledge.maxAcceptedCut - 2 * NOISE) return "eager";
  return "might pass";
}

/** Fold an observed accept/decline into the player's knowledge (immutably). */
export function learn(knowledge: AskKnowledge | undefined, cutPct: number, accepted: boolean): AskKnowledge {
  const k: AskKnowledge = {
    maxAcceptedCut: knowledge?.maxAcceptedCut ?? null,
    minRejectedCut: knowledge?.minRejectedCut ?? null,
  };
  if (accepted) {
    k.maxAcceptedCut = k.maxAcceptedCut === null ? cutPct : Math.max(k.maxAcceptedCut, cutPct);
  } else {
    k.minRejectedCut = k.minRejectedCut === null ? cutPct : Math.min(k.minRejectedCut, cutPct);
  }
  return k;
}

/** Whether a party is structurally eligible for a tier (size gate + can-bid ask).
 * The Ruins requires a real party (a lone hero can't), enforced via a null ask. */
export function partyEligible(partyId: string, tier: QuestTier): boolean {
  const anchor = PARTY_BY_ID[partyId]?.askMaxCut[tier];
  return anchor !== null && anchor !== undefined;
}

/** Best-fit tiebreak when >1 party clears a scarce quest's ask: highest quality
 * wins (the read — a low cut lures the strong party). Stable by id. */
export function bestFit(partyIds: string[]): string | null {
  if (partyIds.length === 0) return null;
  return [...partyIds].sort((a, b) => {
    const q = partyQuality(b) - partyQuality(a);
    return q !== 0 ? q : a.localeCompare(b);
  })[0];
}
