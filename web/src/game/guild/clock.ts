// The event-queue clock (DESIGN "Time — a skip-primary living clock") — the pure
// heart of the living canvas. Replaces the Slice-1 daily-batch endDay.ts: the
// same economics now run as per-event handlers on integer sim-ticks. Everything
// here is pure and deterministic (same state → same result; the purity test runs
// step() twice and deep-equals). Sim-time never touches the wall clock.
//
// Ordering is PINNED (Review #1 B7): events process by (tick, TYPE_RANK, ord)
// with `night` ranked LAST within a tick, so a finish landing on the night tick
// contributes to THAT night's ledger, and a same-tick decide can't race a
// posting the night is about to expire into a nondeterministic outcome.
//
// Every handler validates its preconditions and no-ops on a stale event
// (Review #1 B4) — the event is consumed either way, and the party's decide is
// rescheduled where needed so the queue can never starve a party.

import { makePosting, partyEligible } from "./board";
import { chooseActivity } from "./life";
import { QUEST_BY_ID, ROAD_JOB, RUINS, type QuestDef } from "./quests";
import { resolveQuest } from "./resolver";
import { PARTY_BY_ID } from "./roster";
import { deriveSeed, rngFor, rollInt } from "./seed";
import { displayedGold, draft } from "./state";
import {
  ADVANCE_CAP,
  BROKERAGE,
  DAILY_UPKEEP,
  FEED_CAP,
  MAIL_CAP,
  PASSIVE_INCOME,
  PHASES,
  PROPOSAL_MIN_DAY,
  REST_SPEND_MIN,
  REST_SPEND_PCT,
  REST_TICKS,
  SINK_LINES_BEFORE_PROPOSAL,
  STANDING_TICKS,
  TAVERN_PRICE,
  TICKS_PER_DAY,
  TRAIN_SPEND_MIN,
  TRAIN_SPEND_PCT,
  TRAIN_TICKS,
  type Phase,
} from "./tuning";
import type {
  Assignment,
  FeedItem,
  GuildState,
  Mail,
  PartyRuntime,
  SimEvent,
  SimEventType,
} from "./types";

// ── Time helpers ────────────────────────────────────────────────────────────────
export function dayOf(tick: number): number {
  return Math.floor(tick / TICKS_PER_DAY) + 1;
}
export function phaseOf(tick: number): Phase {
  return PHASES[((tick % TICKS_PER_DAY) + TICKS_PER_DAY) % TICKS_PER_DAY];
}

// ── Queue ordering (pinned) ─────────────────────────────────────────────────────
const TYPE_RANK: Record<SimEventType, number> = { return: 0, finish: 1, decide: 2, night: 3 };

/** Index of the next event to process, by (tick, TYPE_RANK night-last, ord). */
function nextEventIndex(queue: SimEvent[]): number {
  let best = -1;
  for (let i = 0; i < queue.length; i++) {
    if (best === -1) {
      best = i;
      continue;
    }
    const a = queue[i];
    const b = queue[best];
    if (
      a.tick < b.tick ||
      (a.tick === b.tick &&
        (TYPE_RANK[a.type] < TYPE_RANK[b.type] ||
          (TYPE_RANK[a.type] === TYPE_RANK[b.type] && a.ord < b.ord)))
    ) {
      best = i;
    }
  }
  return best;
}

/** Peek the next event without processing (for the driver's stop logic). */
export function peekNext(state: GuildState): SimEvent | null {
  const i = nextEventIndex(state.queue);
  return i === -1 ? null : state.queue[i];
}

// ── Small helpers on the draft ──────────────────────────────────────────────────
function pushFeed(next: GuildState, item: Omit<FeedItem, "id" | "tick" | "day">): void {
  next.feed.unshift({
    id: `feed-${++next.seq}`,
    tick: next.tick,
    day: dayOf(next.tick),
    ...item,
  });
}

function schedule(next: GuildState, tick: number, type: SimEventType, rest?: Partial<SimEvent>): void {
  next.queue.push({ id: `ev-${++next.seq}`, tick, ord: next.seq, type, ...rest });
}

function partyName(id: string): string {
  return PARTY_BY_ID[id]?.name ?? id;
}

function findParty(next: GuildState, id: string | undefined): PartyRuntime | undefined {
  return next.parties.find((p) => p.id === id);
}

/** Sealed dispatch — reuses the Slice-1 Assignment discipline unchanged: the
 * whole adventure is computed AT DISPATCH from a derived seed and revealed only
 * on return. cutPct is the flat BROKERAGE now (no player-set cut). */
function dispatch(next: GuildState, partyId: string, quest: QuestDef, atTick: number): Assignment {
  const duration = rollInt(rngFor(next.rngSeed, "dur", atTick, quest.id, partyId), quest.minDuration, quest.maxDuration);
  const seed = deriveSeed(next.rngSeed, "quest", atTick, quest.id, partyId);
  const log = resolveQuest({ quest, partyId, cutPct: BROKERAGE, durationDays: duration, seed });
  const ticksOut = quest.tier === "standing" ? STANDING_TICKS : duration * TICKS_PER_DAY;
  return {
    questId: quest.id,
    tier: quest.tier,
    questTitle: quest.title,
    seed,
    dispatchedTick: atTick,
    returnTick: atTick + ticksOut,
    durationDays: duration,
    log,
  };
}

/** Split the heroes' share (reward − brokerage) evenly, remainder to the boss. */
function creditWallets(next: GuildState, partyId: string, share: number): void {
  const party = PARTY_BY_ID[partyId];
  if (!party || share <= 0) return;
  const per = Math.floor(share / party.memberIds.length);
  let remainder = share - per * party.memberIds.length;
  for (const id of party.memberIds) {
    next.wallets[id] = (next.wallets[id] ?? 0) + per + (id === party.bossId ? remainder : 0);
    if (id === party.bossId) remainder = 0;
  }
}

// ── Handlers ────────────────────────────────────────────────────────────────────
function onDecide(next: GuildState, ev: SimEvent): void {
  const party = findParty(next, ev.partyId);
  // Stale guards: no such party, already out, or already mid-activity → no-op.
  // (Out parties get their decide from `return`; mid-activity from `finish` —
  // the queue can't starve.)
  if (!party || party.assignment) return;
  if (party.activity && party.activity.untilTick > next.tick) return;
  party.activity = null;

  const choice = chooseActivity(next, party.id, next.tick, ev.forced);

  if (choice.kind === "quest") {
    // The posting may have been taken by an earlier same-tick decide or expired
    // at last night — re-check it's still on the board (award-to-one by order).
    const posting = next.board.find((p) => p.id === choice.posting.id);
    if (posting && partyEligible(party.id, posting.tier)) {
      next.board = next.board.filter((p) => p.id !== posting.id);
      const quest = QUEST_BY_ID[posting.questId];
      party.assignment = dispatch(next, party.id, quest, next.tick);
      schedule(next, party.assignment.returnTick, "return", { partyId: party.id });
      const days = party.assignment.durationDays;
      pushFeed(next, {
        register: "notable",
        icon: "depart",
        text: `${partyName(party.id)} took ${posting.title} from the board and set out — back in ~${days} day${days === 1 ? "" : "s"}.`,
      });
      return;
    }
    // Gone (taken this same tick, or expired last night) — fall back to a
    // standing shift so the broke party still earns.
    const standing = QUEST_BY_ID["guard-hall"];
    party.assignment = dispatch(next, party.id, standing, next.tick);
    schedule(next, party.assignment.returnTick, "return", { partyId: party.id });
    pushFeed(next, {
      register: "ambient",
      icon: "watch",
      text: `${partyName(party.id)} missed the posting they wanted and took a watch shift instead.`,
    });
    return;
  }

  if (choice.kind === "standing") {
    party.assignment = dispatch(next, party.id, choice.quest, next.tick);
    schedule(next, party.assignment.returnTick, "return", { partyId: party.id });
    pushFeed(next, {
      register: "ambient",
      icon: "watch",
      text: `${partyName(party.id)} took a shift: ${choice.quest.title.toLowerCase()}.`,
    });
    return;
  }

  // Lifestyle: rest / train. Narration happens at finish (no double lines).
  const ticks = choice.kind === "rest" ? REST_TICKS : TRAIN_TICKS;
  party.activity = { kind: choice.kind, untilTick: next.tick + ticks };
  schedule(next, next.tick + ticks, "finish", { partyId: party.id, activity: choice.kind });
}

function onFinish(next: GuildState, ev: SimEvent): void {
  const party = findParty(next, ev.partyId);
  // Stale guards: gone, out on a quest, or the activity doesn't match.
  if (!party || party.assignment) return;
  if (!party.activity || party.activity.kind !== ev.activity) {
    // Still make sure the party keeps living.
    schedule(next, next.tick + 1, "decide", { partyId: party.id });
    return;
  }
  party.activity = null;

  const members = PARTY_BY_ID[party.id]?.memberIds ?? [];
  const isRest = ev.activity === "rest";
  let spent = 0;
  for (const id of members) {
    const wallet = next.wallets[id] ?? 0;
    if (wallet <= 0) continue;
    const base = isRest
      ? Math.max(REST_SPEND_MIN, Math.round(wallet * REST_SPEND_PCT))
      : Math.max(TRAIN_SPEND_MIN, Math.round(wallet * TRAIN_SPEND_PCT));
    const spend = Math.min(wallet, base); // never spend coin they don't have (B3)
    next.wallets[id] = wallet - spend;
    spent += spend;
  }

  // Route the spend: your facility captures it, or the village drinks it.
  // Ambient lines NEVER print amounts (B1 — a fat post-quest spend would size a
  // sealed reward); the nightly ledger carries the numbers.
  if (isRest) {
    if (next.buildings.tavern) {
      next.dayTakings += spent;
      pushFeed(next, {
        register: "ambient",
        icon: "tavern",
        text: `${partyName(party.id)} drank the evening away at your tavern.`,
      });
    } else {
      next.villageSink += spent;
      next.sinkSeen += 1;
      pushFeed(next, {
        register: "ambient",
        icon: "rest",
        text: `${partyName(party.id)} caroused in the village — coin your guild has no tavern to catch.`,
      });
    }
  } else {
    next.villageSink += spent;
    pushFeed(next, {
      register: "ambient",
      icon: "train",
      text: `${partyName(party.id)} drilled with a village swordmaster.`,
    });
  }

  schedule(next, next.tick + 1, "decide", { partyId: party.id });
}

function onReturn(next: GuildState, ev: SimEvent): void {
  const party = findParty(next, ev.partyId);
  // Stale guards: gone, not out, or a different dispatch than this event's.
  if (!party || !party.assignment || party.assignment.returnTick !== next.tick) return;
  const a = party.assignment;
  party.assignment = null;

  next.gold += a.log.guildCut;
  creditWallets(next, party.id, a.log.reward - a.log.guildCut);

  if (a.tier === "standing") {
    // Quiet work: ambient + a plain ledger line. NO sealed mail, NO decision,
    // NO auto-pause (Review #1 B2 — Mira must not spam the clock).
    next.dayLedger.push({ label: `${a.questTitle} — ${partyName(party.id)}`, amount: a.log.guildCut });
    pushFeed(next, {
      register: "ambient",
      icon: "watch",
      text: `${partyName(party.id)} finished the shift: ${a.questTitle.toLowerCase()}.`,
    });
    schedule(next, next.tick + 1, "decide", { partyId: party.id });
    return;
  }

  // A scarce quest: the sealed envelope + the auto-pause decision moment.
  // Wording and icon are OUTCOME-AGNOSTIC — the seal must hold on screen.
  const mailId = `mail-${++next.seq}`;
  next.dayLedger.push({
    label: `${a.questTitle} — ${partyName(party.id)}`,
    amount: a.log.guildCut,
    sealedMailId: mailId,
  });
  next.mail.unshift({
    id: mailId,
    day: dayOf(next.tick),
    kind: "outcome",
    teaser: `${partyName(party.id)} are back from ${a.questTitle}.`,
    log: a.log,
    partyName: partyName(party.id),
    questTitle: a.questTitle,
    read: false,
  });
  pushFeed(next, {
    register: "decision",
    icon: "report",
    text: `${partyName(party.id)} are back from ${a.questTitle} — open the report.`,
    mailId,
    action: "open-report",
  });
  // Returns → decompresses: the next decide is a forced rest.
  schedule(next, next.tick + 1, "decide", { partyId: party.id, forced: "rest" });
}

function onNight(next: GuildState): void {
  const day = dayOf(next.tick);

  // Board: age postings toward withdrawal; refill missing tiers (fresh letters).
  const withdrawn: string[] = [];
  for (const posting of next.board) {
    posting.daysLeft -= 1;
    if (posting.daysLeft <= 0) withdrawn.push(posting.id);
  }
  for (const id of withdrawn) {
    const p = next.board.find((x) => x.id === id)!;
    pushFeed(next, {
      register: "notable",
      icon: "letter",
      text: `${p.giver} withdrew ${p.title} — no party would take it.`,
    });
  }
  next.board = next.board.filter((p) => !withdrawn.includes(p.id));
  for (const quest of [ROAD_JOB, RUINS]) {
    // No repost while a party is out on this very quest — the giver waits for
    // word, and the Quests card would otherwise show the same title twice
    // (open + active), which reads as a double-post (Review #2 Adversary/PX).
    const outOnIt = next.parties.some((p) => p.assignment?.questId === quest.id);
    if (!outOnIt && !next.board.some((p) => p.tier === quest.tier)) {
      next.board.push(makePosting(quest, ++next.seq));
      pushFeed(next, {
        register: "ambient",
        icon: "letter",
        text: `A letter arrived: ${quest.title}, ${quest.dailyRate}g a day, from ${quest.giver}.`,
      });
    }
  }

  // Economy: passive, upkeep, and the day's tavern takings flush to the treasury
  // here — so the live gold chip only ever moves at returns (masked) and at
  // night, and a mid-day capture can't leak a sealed reward's size.
  next.gold += PASSIVE_INCOME;
  next.dayLedger.push({ label: "Guild Hall passive", amount: PASSIVE_INCOME });
  next.gold -= DAILY_UPKEEP;
  next.dayLedger.push({ label: "Daily upkeep", amount: -DAILY_UPKEEP });
  if (next.dayTakings > 0) {
    next.gold += next.dayTakings;
    next.dayLedger.push({ label: "Tavern takings", amount: next.dayTakings });
    next.dayTakings = 0;
  }

  const net = next.dayLedger.reduce((s, e) => s + e.amount, 0);
  // Runway projects the RECURRING trend — one-off movements (construction) are
  // excluded, else the night of the player's one big buy reads "gold lasts ~2
  // days" and the signature move looks like a bug (Review #2 Player-experience).
  const recurring = next.dayLedger.reduce((s, e) => s + (e.oneOff ? 0 : e.amount), 0);
  const runwayNote =
    recurring >= 0
      ? `Treasury growing +${recurring}g/day.`
      : next.gold <= 0
        ? `Treasury is in the red (${next.gold}g).`
        : `Gold lasts ~${Math.max(1, Math.floor(next.gold / -recurring))} days at this burn.`;
  next.mail.unshift({
    id: `mail-${++next.seq}`,
    day,
    kind: "ledger",
    teaser: `Day ${day} ledger`,
    ledger: next.dayLedger,
    runwayNote,
    net,
    endGold: next.gold,
    read: false,
  });
  next.dayLedger = [];

  pushFeed(next, { register: "ambient", icon: "night", text: `Night falls on day ${day}.` });
  next.firstDay = false;

  // Caps (checked nightly, the cheap place): mail trims oldest READ first, then
  // oldest unread LEDGERS — a Hall-only player never expands ledger rows, and
  // exempting them grew the archive one mail per night forever (Codex P2 on
  // PR #36). An unread OUTCOME — a sealed story — is never dropped.
  if (next.mail.length > MAIL_CAP) {
    const trimmable = [(m: Mail) => !!m.read, (m: Mail) => m.kind === "ledger"];
    for (const match of trimmable) {
      let excess = next.mail.length - MAIL_CAP;
      for (let i = next.mail.length - 1; i >= 0 && excess > 0; i--) {
        if (match(next.mail[i])) {
          next.mail.splice(i, 1);
          excess--;
        }
      }
      if (next.mail.length <= MAIL_CAP) break;
    }
  }
  if (next.feed.length > FEED_CAP) {
    // Trim order: ambient, then RESOLVED decisions, then notable — an undone
    // decision is never dropped (it still asks for the player), but a done one
    // must be trimmable or decision stubs alone eventually exceed the cap and
    // growth goes unbounded (Review #2 Adversary).
    const trimmable = [
      (f: FeedItem) => f.register === "ambient",
      (f: FeedItem) => f.register === "decision" && !!f.done,
      (f: FeedItem) => f.register === "notable",
    ];
    for (const match of trimmable) {
      let excess = next.feed.length - FEED_CAP;
      for (let i = next.feed.length - 1; i >= 0 && excess > 0; i--) {
        if (match(next.feed[i])) {
          next.feed.splice(i, 1);
          next.feedTrimmed = true;
          excess--;
        }
      }
      if (next.feed.length <= FEED_CAP) break;
    }
  }

  schedule(next, next.tick + TICKS_PER_DAY, "night");
}

// ── The engine ──────────────────────────────────────────────────────────────────
/** After every event: surface the tavern proposal once it's grounded (day ≥ 2,
 * the player has WATCHED coin drain to the village, and it's affordable). The
 * affordability gate reads displayedGold, NOT raw gold — raw gold contains
 * unopened sealed brokerage, and a proposal popping "because you can afford it
 * now" would leak the hidden outcome (Review #2/Engineer; same discipline as
 * the Hall chip and the Build buttons). */
function postCheck(next: GuildState): void {
  if (
    !next.buildings.tavern &&
    !next.tavernProposed &&
    dayOf(next.tick) >= PROPOSAL_MIN_DAY &&
    next.sinkSeen >= SINK_LINES_BEFORE_PROPOSAL &&
    displayedGold(next) >= TAVERN_PRICE
  ) {
    next.tavernProposed = true;
    pushFeed(next, {
      register: "decision",
      icon: "tavern",
      text: `The steward proposes a tavern — ${TAVERN_PRICE}g, fixed price. "All that coin they drink away in the village could land in OUR till."`,
      action: "tavern",
    });
  }
}

/** Process exactly ONE due queue event. Pure: same state → same result. If the
 * queue is somehow empty (corrupt-but-versioned save), re-seed the night so the
 * clock can never stall. */
export function step(state: GuildState): GuildState {
  const next = draft(state);
  const i = nextEventIndex(next.queue);
  if (i === -1) {
    // Corrupt-but-versioned save with an empty queue: re-seed the clock AND the
    // parties. The night lands on the next night tick strictly in the future;
    // every at-home party gets a decide so the world can't become an
    // alive-looking softlock that drains upkeep forever (Review #2 Adversary).
    const untilNight = TICKS_PER_DAY - 1 - (next.tick % TICKS_PER_DAY);
    schedule(next, next.tick + (untilNight > 0 ? untilNight : TICKS_PER_DAY), "night");
    for (const p of next.parties) {
      if (!p.assignment) {
        p.activity = null;
        schedule(next, next.tick + 1, "decide", { partyId: p.id });
      } else {
        schedule(next, Math.max(p.assignment.returnTick, next.tick + 1), "return", { partyId: p.id });
      }
    }
    return next;
  }
  const [ev] = next.queue.splice(i, 1);
  next.tick = Math.max(next.tick, ev.tick);
  switch (ev.type) {
    case "decide":
      onDecide(next, ev);
      break;
    case "finish":
      onFinish(next, ev);
      break;
    case "return":
      onReturn(next, ev);
      break;
    case "night":
      onNight(next);
      break;
  }
  postCheck(next);
  return next;
}

export type AdvanceStop = "decision" | "night" | "cap";

/** The skip-primary spine: run events until the first DECISION feed item is
 * emitted or a night has been processed (day boundary), capped at ADVANCE_CAP
 * as a runaway guard (a full day fits well under it — tested). Pure; the UI
 * commits the returned state once (one autosave per Advance — Review #1 B6).
 * If something ALREADY needs the player, it refuses to move the clock at all —
 * decisions are auto-pauses, not scenery to roll past (Codex P2 on PR #36; the
 * Hall disables the button too, but the sim must hold either way). */
export function advanceUntilStop(state: GuildState): { state: GuildState; stop: AdvanceStop } {
  if (state.feed.some((f) => f.register === "decision" && !f.done)) {
    return { state, stop: "decision" };
  }
  let current = state;
  for (let n = 0; n < ADVANCE_CAP; n++) {
    const upcoming = peekNext(current);
    const decisionsBefore = current.feed.filter((f) => f.register === "decision" && !f.done).length;
    current = step(current);
    const decisionsAfter = current.feed.filter((f) => f.register === "decision" && !f.done).length;
    if (decisionsAfter > decisionsBefore) return { state: current, stop: "decision" };
    if (upcoming?.type === "night") return { state: current, stop: "night" };
  }
  return { state: current, stop: "cap" };
}
