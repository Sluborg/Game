// Board helpers (§9/§12, post-pivot) — the board is now what the HEROES read.
// The player-set cut, the acceptance rolls, and the appetite/observation-bracket
// learning retired with the pivot (DESIGN "The living guild"; the ask machinery
// is dormant in roster.ts and returns with slice-4 variable terms). What's left:
// posting construction, structural eligibility, and the deterministic comparator
// autonomous parties use to pick work (Review #1 B5 — pinned so two
// implementations can't "both match the plan").

import { PARTY_BY_ID } from "./roster";
import { QUEST_BY_ID } from "./quests";
import type { Posting, QuestTier } from "./types";

export function makePosting(quest: { id: string; tier: QuestTier; title: string; giver: string }, seq: number): Posting {
  return {
    id: `${quest.id}-${seq}`,
    tier: quest.tier,
    title: quest.title,
    giver: quest.giver,
    daysLeft: 3,
  };
}

/** Whether a party is structurally eligible for a tier (size gate via a null ask —
 * e.g. lone Mira can't take the Ruins or the road). */
export function partyEligible(partyId: string, tier: QuestTier): boolean {
  const anchor = PARTY_BY_ID[partyId]?.askMaxCut[tier];
  return anchor !== null && anchor !== undefined;
}

/** The pinned work comparator (Review #1 B5): eligible postings sorted by
 * dailyRate DESC, tie-broken by posting id ASC. Deterministic and testable. */
export function bestPosting(board: Posting[], partyId: string): Posting | null {
  const eligible = board.filter((p) => partyEligible(partyId, p.tier));
  if (eligible.length === 0) return null;
  return [...eligible].sort((a, b) => {
    const rate = (QUEST_BY_ID[b.tier]?.dailyRate ?? 0) - (QUEST_BY_ID[a.tier]?.dailyRate ?? 0);
    return rate !== 0 ? rate : a.id.localeCompare(b.id);
  })[0];
}
