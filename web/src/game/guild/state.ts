// GuildState construction + the small pure reducers the UI dispatches. endDay.ts
// holds the big tick; this holds init, the cut-revision reducer, and mail helpers.
// Every reducer takes a state and returns a NEW state (via a JSON clone draft) so
// the sim stays pure and trivially serializable.

import { PARTY_DATA } from "./roster";
import { ROAD_JOB, RUINS } from "./quests";
import { offsetKey } from "./board";
import { rngFor } from "./seed";
import type { GuildState, Mail, Posting } from "./types";

export const SAVE_VERSION = 1;
export const STARTING_GOLD = 1000;
export const DAILY_UPKEEP = 60;
export const PASSIVE_INCOME = 20;
export const RUN_ASK_BAND = 5; // ±5 cut-points fixed per run (§12)

/** A deep, pure clone for a mutable reducer draft. State is JSON-serializable. */
export function draft(state: GuildState): GuildState {
  return JSON.parse(JSON.stringify(state)) as GuildState;
}

function freshPosting(quest: { id: string; tier: GuildState["board"][number]["tier"]; title: string; giver: string }, seq: number, day: number): Posting {
  return {
    id: `${quest.id}-${seq}`,
    tier: quest.tier,
    title: quest.title,
    giver: quest.giver,
    cutPct: 30,
    daysLeft: 3,
    lastRevisedDay: day - 1, // revisable immediately on the day it's posted
    failCount: 0,
  };
}

export function createInitialState(seed: number): GuildState {
  // Fixed-per-run ask offsets (±RUN_ASK_BAND), so each run has a stable personality
  // the player can learn.
  const askRunOffset: Record<string, number> = {};
  for (const party of PARTY_DATA) {
    for (const tier of ["road", "ruins", "standing"] as const) {
      if (party.askMaxCut[tier] === null || party.askMaxCut[tier] === undefined) continue;
      const r = rngFor(seed, "runoffset", party.id, tier).next();
      askRunOffset[offsetKey(party.id, tier)] = Math.round((r * 2 - 1) * RUN_ASK_BAND);
    }
  }

  const state: GuildState = {
    version: SAVE_VERSION,
    day: 1,
    gold: STARTING_GOLD,
    askRunOffset,
    parties: PARTY_DATA.map((p) => ({ id: p.id, assignment: null })),
    board: [freshPosting(ROAD_JOB, 1, 1), freshPosting(RUINS, 2, 1)],
    knowledge: {},
    mail: [],
    seq: 2,
    rngSeed: seed,
    firstDay: true,
  };

  // First-run coach envelope (§ PX first-run comprehension).
  state.mail.unshift(coachMail(state));
  return state;
}

export function coachMail(state: GuildState): Mail {
  return {
    id: `coach-${state.seq + 1}`,
    day: state.day,
    kind: "coach",
    teaser: "Steward's note: Set your cut on the board, end the day, and watch who bites. Read who takes what — that's the whole game.",
    read: false,
  };
}

/** Revise a posting's cut — allowed once per day (§12). No-op if already revised
 * today or the posting doesn't exist. */
export function reviseCut(state: GuildState, postingId: string, cutPct: number): GuildState {
  const clamped = Math.max(20, Math.min(40, cutPct));
  const next = draft(state);
  const posting = next.board.find((p) => p.id === postingId);
  if (!posting) return state;
  if (posting.lastRevisedDay >= next.day) return state; // one revision per day
  if (posting.cutPct === clamped) return state;
  posting.cutPct = clamped;
  posting.lastRevisedDay = next.day;
  return next;
}

/** Can this posting's cut still be revised today? (For the UI's disabled state.) */
export function canRevise(posting: Posting, day: number): boolean {
  return posting.lastRevisedDay < day;
}

export function markMailRead(state: GuildState, mailId: string): GuildState {
  const next = draft(state);
  const m = next.mail.find((x) => x.id === mailId);
  if (!m || m.read) return state;
  m.read = true;
  return next;
}
