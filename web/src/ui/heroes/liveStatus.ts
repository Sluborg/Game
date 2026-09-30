// liveStatus — a hero's whereabouts for the Heroes roster + sheet, derived from
// the live GuildState through the SAME helper as the Hall's party strip, so both
// screens say the same words for the same moment (Codex P2 on PR #45).

import type { GuildState } from "../../game/guild";
import { heroPartyStatus } from "../guild/partyStatus";
import type { HeroStatus } from "./mockHeroes";

export function heroStatus(heroId: string, state: GuildState): HeroStatus {
  const s = heroPartyStatus(heroId, state);
  // Guard only: every roster hero belongs to a sim party (liveStatus.test.ts).
  // Worded as an unknown, not a state the sim never produces (Review #2 Designer).
  if (!s) return { kind: "idle", text: "Whereabouts unknown" };
  return { kind: s.away ? "quest" : "guild", text: s.text };
}
