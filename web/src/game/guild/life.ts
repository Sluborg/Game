// Autonomous party daily-life (DESIGN "The world is alive"). Pure decision
// logic: given a state, a party, and the current tick, what does the party DO
// next? Minimal vocabulary this slice: rest / train / take-quest / standing-job.
// The player never commands — this module is the heroes' own will, and it is
// deterministic (all randomness via rngFor keyed by tick + party).
//
// Motivation model (Review #1-folded):
// - Coin runs low (avg member wallet < NEED_GOLD) → seek paid work: the best
//   eligible posting by the PINNED comparator (dailyRate desc, id asc — B5);
//   none eligible → a standing watch shift (the survival floor).
// - Comfortable → lifestyle: mostly rest/train, with a small seeded FAME_CHANCE
//   of taking a posting anyway — picked seeded across ALL eligible postings
//   (not best-pay) so the road job gets taken too and the board never rots.
// - After a quest the party ALWAYS decompresses with one forced rest ("returns →
//   decompresses"), carried on the decide event's `forced` payload.

import { bestPosting, partyEligible } from "./board";
import { STANDING_JOBS, type QuestDef } from "./quests";
import { PARTY_BY_ID } from "./roster";
import { rngFor } from "./seed";
import { FAME_CHANCE, NEED_GOLD, REST_WEIGHT } from "./tuning";
import type { GuildState, Posting } from "./types";

export type LifeChoice =
  | { kind: "quest"; posting: Posting }
  | { kind: "standing"; quest: QuestDef }
  | { kind: "rest" }
  | { kind: "train" };

export function avgWallet(state: GuildState, partyId: string): number {
  const party = PARTY_BY_ID[partyId];
  if (!party || party.memberIds.length === 0) return 0;
  const sum = party.memberIds.reduce((s, id) => s + (state.wallets[id] ?? 0), 0);
  return sum / party.memberIds.length;
}

/** Deterministic standing-job pick (alternates by seeded roll, not global order,
 * so it stays pure under replay). */
function pickStanding(state: GuildState, partyId: string, tick: number): QuestDef {
  const r = rngFor(state.rngSeed, "standing", tick, partyId).next();
  return STANDING_JOBS[Math.floor(r * STANDING_JOBS.length) % STANDING_JOBS.length];
}

export function chooseActivity(state: GuildState, partyId: string, tick: number, forced?: "rest"): LifeChoice {
  if (forced === "rest") return { kind: "rest" };

  const broke = avgWallet(state, partyId) < NEED_GOLD;
  if (broke) {
    const posting = bestPosting(state.board, partyId);
    if (posting) return { kind: "quest", posting };
    return { kind: "standing", quest: pickStanding(state, partyId, tick) };
  }

  const r = rngFor(state.rngSeed, "life", tick, partyId).next();
  if (r < FAME_CHANCE) {
    // Fame beckons: a seeded pick across ALL eligible postings (road included).
    const eligible = state.board
      .filter((p) => partyEligible(partyId, p.tier))
      .sort((a, b) => (a.id < b.id ? -1 : 1)); // codepoint order — locale-proof
    if (eligible.length > 0) {
      const pick = rngFor(state.rngSeed, "fame", tick, partyId).next();
      return { kind: "quest", posting: eligible[Math.floor(pick * eligible.length) % eligible.length] };
    }
    // Nothing posted they can take — fall through to lifestyle.
  }
  const rest = (r - FAME_CHANCE) / (1 - FAME_CHANCE) < REST_WEIGHT;
  return rest ? { kind: "rest" } : { kind: "train" };
}
