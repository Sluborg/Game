// GuildState construction + the small pure reducers the UI dispatches directly
// (buy/dismiss the tavern, open mail) + selectors. clock.ts holds the event
// engine; tuning.ts holds every knob. Every reducer takes a state and returns a
// NEW state (via a JSON clone draft) so the sim stays pure and trivially
// serializable.

import { PARTY_DATA } from "./roster";
import { ROAD_JOB, RUINS } from "./quests";
import { makePosting } from "./board";
import { SAVE_VERSION as V, STARTING_GOLD, TAVERN_PRICE, TICKS_PER_DAY } from "./tuning";
import type { FeedItem, GuildState, Mail, SimEvent } from "./types";

export const SAVE_VERSION = V;

/** A deep, pure clone for a mutable reducer draft. State is JSON-serializable. */
export function draft(state: GuildState): GuildState {
  return JSON.parse(JSON.stringify(state)) as GuildState;
}

export function createInitialState(seed: number): GuildState {
  const wallets: Record<string, number> = {};
  for (const party of PARTY_DATA) {
    for (const id of party.memberIds) wallets[id] = party.startWallet;
  }

  // Every party decides at tick 0 (dawn, day 1); the first night is tick 3.
  // ord comes from a local counter so init is pure and replayable.
  let ord = 0;
  const queue: SimEvent[] = PARTY_DATA.map((p) => ({
    id: `ev-${++ord}`,
    tick: 0,
    ord,
    type: "decide" as const,
    partyId: p.id,
  }));
  queue.push({ id: `ev-${++ord}`, tick: TICKS_PER_DAY - 1, ord, type: "night" });

  const feed: FeedItem[] = [
    {
      id: `feed-${++ord}`,
      tick: 0,
      day: 1,
      register: "ambient",
      icon: "party",
      text: "Two letters wait on the board — takers decide today.",
    },
  ];

  return {
    version: SAVE_VERSION,
    tick: 0,
    gold: STARTING_GOLD,
    wallets,
    buildings: { tavern: false },
    tavernProposed: false,
    sinkSeen: 0,
    villageSink: 0,
    dayTakings: 0,
    dayLedger: [],
    parties: PARTY_DATA.map((p) => ({ id: p.id, assignment: null, activity: null })),
    board: [makePosting(ROAD_JOB, 1), makePosting(RUINS, 2)],
    queue,
    feed,
    feedTrimmed: false,
    mail: [],
    seq: ord,
    rngSeed: seed,
    firstDay: true,
  };
}

/** What the always-on treasury chip SHOWS: real gold minus every credit still
 * hidden behind an unopened sealed envelope, so a mid-day return can't leak its
 * outcome through a visible gold jump (Review #1 B1; the Hall-header rebirth of
 * Codex R#34). Opening the envelope settles the display. */
export function displayedGold(state: GuildState): number {
  let hidden = 0;
  for (const m of state.mail) {
    if (m.kind === "outcome" && !m.read && m.log) hidden += m.log.guildCut;
  }
  return state.gold - hidden;
}

export function markMailRead(state: GuildState, mailId: string): GuildState {
  const next = draft(state);
  const m = next.mail.find((x) => x.id === mailId);
  if (!m || m.read) return state;
  m.read = true;
  // Resolve the matching feed decision item so it stops asking.
  const item = next.feed.find((f) => f.mailId === mailId && f.register === "decision");
  if (item) item.done = true;
  return next;
}

/** Buy the tavern — the slice's one fixed-price investment. No-op if already
 * built or unaffordable (the UI disables the button; the reducer still guards). */
export function buyTavern(state: GuildState): GuildState {
  if (state.buildings.tavern || state.gold < TAVERN_PRICE) return state;
  const next = draft(state);
  next.gold -= TAVERN_PRICE;
  next.buildings.tavern = true;
  next.dayLedger.push({ label: "Tavern construction", amount: -TAVERN_PRICE, oneOff: true });
  next.feed.unshift({
    id: `feed-${++next.seq}`,
    tick: next.tick,
    day: Math.floor(next.tick / TICKS_PER_DAY) + 1,
    register: "notable",
    icon: "tavern",
    text: "The tavern opens its doors — hero coin now lands in your till.",
  });
  for (const f of next.feed) if (f.action === "tavern") f.done = true;
  return next;
}

/** Dismiss the tavern proposal ("Not yet") — the standing investment card stays. */
export function dismissTavern(state: GuildState): GuildState {
  const item = state.feed.find((f) => f.action === "tavern" && !f.done);
  if (!item) return state;
  const next = draft(state);
  for (const f of next.feed) if (f.action === "tavern") f.done = true;
  return next;
}

/** The most recent nightly ledger mail (for the Hall's runway note). */
export function lastLedger(state: GuildState): Mail | undefined {
  return state.mail.find((m) => m.kind === "ledger");
}
