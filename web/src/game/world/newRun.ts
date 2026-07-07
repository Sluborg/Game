// Builds a fresh WorldState from a seed. The seed may come from Math.random at
// the call site (a new run is genuinely random), but once chosen it is stored,
// so the whole run — including its hidden per-quest asks — replays deterministically.

import { ACCEPT, ECONOMY, QUESTS } from "./economy";
import { STARTER_HEROES, STARTER_PARTY_NAME } from "./heroes";
import { makeCursor, nextInt } from "./rng";
import { SCHEMA_VERSION, type Quest, type WorldState } from "./types";

function freshQuest(tier: "road" | "ruins", askMaxCut: number): Quest {
  const t = QUESTS[tier];
  return {
    id: t.tier,
    giver: t.giver,
    title: t.title,
    reward: t.reward,
    onBoard: true,
    cut: ECONOMY.cutBase,
    cutRevisedToday: false,
    daysOnBoard: 0,
    failCount: 0,
    payBump: 0,
    askMaxCut,
    learnedMaxAccepted: null,
    learnedMinDeclined: null,
  };
}

export function newRun(seed: number): WorldState {
  // Draw the run-fixed ask offsets (±5) from a cursor seeded off the run seed, so
  // the same seed always yields the same hidden asks. This cursor is then thrown
  // away; live play uses `rngState` below (a distinct stream) so acceptance/
  // outcome rolls don't correlate with the setup draws.
  const setup = makeCursor((seed ^ 0x9e3779b9) >>> 0);
  const roadAsk = QUESTS.road.askAnchor + nextInt(setup, -ACCEPT.runOffsetMax, ACCEPT.runOffsetMax);
  const ruinsAsk = QUESTS.ruins.askAnchor + nextInt(setup, -ACCEPT.runOffsetMax, ACCEPT.runOffsetMax);

  return {
    schemaVersion: SCHEMA_VERSION,
    day: 1,
    gold: ECONOMY.startingGold,
    rngState: seed >>> 0,
    runSeed: seed >>> 0,
    heroes: STARTER_HEROES.map((h) => ({ ...h, cvs: h.cvs.map((c) => ({ ...c })) })),
    party: { name: STARTER_PARTY_NAME, heroIds: STARTER_HEROES.map((h) => h.id), out: null },
    quests: [freshQuest("road", roadAsk), freshQuest("ruins", ruinsAsk)],
    loan: { active: false, taken: false },
    insolventStreak: 0,
    status: "playing",
    lastReport: null,
  };
}
