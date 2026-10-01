// Board helpers (§9/§12, post-pivot) — the board is now what the HEROES read.
// The player-set cut, the acceptance rolls, and the appetite/observation-bracket
// learning retired with the pivot (DESIGN "The living guild"; the ask machinery
// is dormant in roster.ts and returns with slice-4 variable terms). What's left:
// posting construction, structural eligibility, and the deterministic comparator
// autonomous parties use to pick work (Review #1 B5 — pinned so two
// implementations can't "both match the plan").

import { PARTY_BY_ID } from "./roster";
import { EXPIRY_DAYS } from "./tuning";
import { QUEST_BY_ID } from "./quests";
import type { Posting, QuestTier } from "./types";

export function makePosting(quest: { id: string; tier: QuestTier; title: string; giver: string }, seq: number): Posting {
  return {
    id: `${quest.id}-${seq}`,
    questId: quest.id,
    tier: quest.tier,
    title: quest.title,
    giver: quest.giver,
    daysLeft: EXPIRY_DAYS,
  };
}

/** Whether a party is structurally eligible for a tier (size gate via a null ask —
 * e.g. lone Mira can't take the Ruins or the road). */
export function partyEligible(partyId: string, tier: QuestTier): boolean {
  const anchor = PARTY_BY_ID[partyId]?.askMaxCut[tier];
  return anchor !== null && anchor !== undefined;
}

/** The pinned work comparator (re-pinned for flat rewards): eligible postings
 * by total `reward` DESC, tie posting-id ASC. Heroes chase the same number the
 * board displays (information honesty); a broke party wants the biggest purse.
 * ACCEPTED pathology, in writing: a future long low-per-day quest with a big
 * purse would out-rank a short better-per-day one — revisited with the
 * challenge-v2 slice's smarter hero brains. */
export function bestPosting(board: Posting[], partyId: string): Posting | null {
  const eligible = board.filter((p) => partyEligible(partyId, p.tier));
  if (eligible.length === 0) return null;
  return [...eligible].sort((a, b) => {
    const pay = (QUEST_BY_ID[b.questId]?.reward ?? 0) - (QUEST_BY_ID[a.questId]?.reward ?? 0);
    // Plain codepoint compare — localeCompare is locale-sensitive, and this
    // ordering must replay identically on any runtime (determinism).
    return pay !== 0 ? pay : a.id < b.id ? -1 : 1;
  })[0];
}
