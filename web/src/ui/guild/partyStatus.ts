// partyStatus — the ONE wording for a party's live whereabouts, shared by the
// Hall's party strip and the Heroes roster/sheet so the two screens never describe
// the same moment in different words (Codex P2 on PR #45; Review #1 Player-exp).
//
// Reads ONLY what the Hall strip already shows (assignment title/day, rest/train);
// it never reads mail, results or HP, so it cannot leak a sealed outcome (§4).

import { PARTY_BY_ID, PARTY_DATA, dayOf, type GuildState, type PartyRuntime } from "../../game/guild";
import type { IconProps } from "../kit";

export interface PartyStatus {
  icon: IconProps["name"];
  text: string;
  /** Out of the hall (quest or shift) vs at home — the Heroes status dot. */
  away: boolean;
}

export function partyStatus(runtime: PartyRuntime, tick: number): PartyStatus {
  const a = runtime.assignment;
  if (a) {
    if (a.tier === "standing") return { icon: "watch", text: `On a shift — ${a.questTitle}`, away: true };
    const dayNow = dayOf(tick);
    const dayX = dayNow - dayOf(a.dispatchedTick) + 1;
    return { icon: "depart", text: `Out — ${a.questTitle} · day ${Math.min(dayX, a.durationDays)} of ${a.durationDays}`, away: true };
  }
  if (runtime.activity) {
    return runtime.activity.kind === "rest"
      ? { icon: "rest", text: "Resting", away: false }
      : { icon: "train", text: "Training", away: false };
  }
  // A lone hero gets the single meeple, not the party cluster (Stefan).
  const solo = (PARTY_BY_ID[runtime.id]?.memberIds.length ?? 1) === 1;
  return { icon: solo ? "hero" : "party", text: "In the hall", away: false };
}

/** Which sim party each hero belongs to (built once — membership is static data). */
const PARTY_OF_HERO: Record<string, string> = Object.fromEntries(
  PARTY_DATA.flatMap((p) => p.memberIds.map((id) => [id, p.id] as const)),
);

/** A hero's live status = their party's. null when the hero has no sim party or
 * the party is missing from the state (a guard; every roster hero has one). */
export function heroPartyStatus(heroId: string, state: GuildState): PartyStatus | null {
  const partyId = PARTY_OF_HERO[heroId];
  const runtime = partyId ? state.parties.find((p) => p.id === partyId) : undefined;
  return runtime ? partyStatus(runtime, state.tick) : null;
}
