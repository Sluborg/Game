// Guild sim tests (living-canvas slice) — the invariants Review #1 demanded be
// provable, not asserted: step()/advanceUntilStop() purity + determinism, the
// pinned within-tick ordering (night LAST), quest-over-days return timing, the
// forced decompress, gold conservation, spend clamping, sealed-outcome display
// masking, standing returns never auto-pausing, tavern routing + buy-once, the
// tavern proposal gating, feed/mail caps, handler stale-event guards, a full day
// fitting under the advance cap, and persistence round-trip + corrupt/version →
// reinit.

import { describe, it, expect, beforeEach } from "vitest";
import {
  createInitialState,
  step,
  advanceUntilStop,
  peekNext,
  dayOf,
  phaseOf,
  displayedGold,
  markMailRead,
  buyTavern,
  dismissTavern,
  chooseActivity,
  avgWallet,
  bestPosting,
  partyEligible,
  PARTY_DATA,
  HERO_DATA,
  BROKERAGE,
  NEED_GOLD,
  TAVERN_PRICE,
  TICKS_PER_DAY,
  DAILY_UPKEEP,
  PASSIVE_INCOME,
  STARTING_GOLD,
  ADVANCE_CAP,
  FEED_CAP,
  MAIL_CAP,
  loadState,
  saveState,
  clearSave,
  SAVE_VERSION,
} from "./index";
import type { GuildState, SimEvent } from "./types";

const SEED = 12345;

function stepN(state: GuildState, n: number): GuildState {
  let s = state;
  for (let i = 0; i < n; i++) s = step(s);
  return s;
}

/** Advance whole days (each stop is decision or night; decisions auto-opened so
 * the run keeps flowing like a player tapping through). */
function playDays(state: GuildState, days: number): GuildState {
  let s = state;
  const target = dayOf(s.tick) + days;
  let guard = 0;
  while (dayOf(s.tick) < target && guard++ < 500) {
    const r = advanceUntilStop(s);
    s = r.state;
    // Open every fresh sealed decision so the display settles and play continues.
    for (const f of s.feed) {
      if (f.register === "decision" && !f.done && f.mailId) s = markMailRead(s, f.mailId);
      if (f.register === "decision" && !f.done && f.action === "tavern") s = dismissTavern(s);
    }
  }
  return s;
}

/** Total gold in the whole economy (treasury + wallets + village sink + tavern
 * day-accrual). Conservation: only quests/passive add, only upkeep/construction
 * remove. */
function totalGold(s: GuildState): number {
  const wallets = Object.values(s.wallets).reduce((a, b) => a + b, 0);
  return s.gold + wallets + s.villageSink + s.dayTakings;
}

describe("clock: determinism & purity", () => {
  it("step() is pure — same input twice gives deep-equal output and never mutates its input", () => {
    const s0 = createInitialState(SEED);
    const frozen = JSON.stringify(s0);
    const a = stepN(s0, 40);
    const b = stepN(s0, 40);
    expect(JSON.stringify(s0)).toBe(frozen);
    expect(a).toEqual(b);
  });

  it("advanceUntilStop is deterministic and equals its own replay", () => {
    const s0 = createInitialState(SEED);
    const a = advanceUntilStop(s0);
    const b = advanceUntilStop(s0);
    expect(a.stop).toBe(b.stop);
    expect(a.state).toEqual(b.state);
  });

  it("a JSON round-trip mid-run resumes identically (mid-quest refresh)", () => {
    const s = stepN(createInitialState(SEED), 25);
    const revived = JSON.parse(JSON.stringify(s)) as GuildState;
    expect(step(revived)).toEqual(step(s));
  });
});

describe("clock: queue & time invariants", () => {
  it("the queue is never empty and always holds a future night", () => {
    let s = createInitialState(SEED);
    for (let i = 0; i < 80; i++) {
      s = step(s);
      expect(s.queue.length).toBeGreaterThan(0);
      expect(s.queue.some((e) => e.type === "night")).toBe(true);
    }
  });

  it("night fires exactly once per day, on the day's last tick", () => {
    let s = createInitialState(SEED);
    let nights = 0;
    for (let i = 0; i < 200 && nights < 5; i++) {
      const up = peekNext(s);
      if (up?.type === "night") {
        expect(up.tick % TICKS_PER_DAY).toBe(TICKS_PER_DAY - 1);
        nights++;
      }
      s = step(s);
    }
    expect(nights).toBe(5);
    expect(dayOf(s.tick)).toBeGreaterThanOrEqual(5);
  });

  it("ticks never move backwards", () => {
    let s = createInitialState(SEED);
    let last = s.tick;
    for (let i = 0; i < 120; i++) {
      s = step(s);
      expect(s.tick).toBeGreaterThanOrEqual(last);
      last = s.tick;
    }
  });

  it("within a tick, night runs AFTER party events (a dusk finish lands in that night's ledger)", () => {
    // Construct: finishes scheduled on the night tick, tavern built so the rest
    // spends accrue to dayTakings; the night's ledger must contain them even
    // though the night event was enqueued FIRST (lower ord).
    let s = createInitialState(SEED);
    s = buyTavern(s);
    const rich: GuildState = JSON.parse(JSON.stringify(s));
    rich.parties = rich.parties.map((p) => ({ ...p, assignment: null, activity: { kind: "rest" as const, untilTick: 3 } }));
    rich.queue = [
      { id: "t1", tick: 3, ord: 1, type: "night" },
      ...rich.parties.map<SimEvent>((p, i) => ({ id: `t${i + 2}`, tick: 3, ord: i + 2, type: "finish", partyId: p.id, activity: "rest" })),
    ];
    let out = rich;
    for (let i = 0; i < 4; i++) out = step(out);
    const ledger = out.mail.find((m) => m.kind === "ledger");
    expect(ledger).toBeTruthy();
    expect(ledger!.ledger!.some((e) => e.label === "Tavern takings" && e.amount > 0)).toBe(true);
    expect(out.dayTakings).toBe(0);
  });

  it("a full simulated day fits under the advance cap", () => {
    let s = createInitialState(SEED);
    for (let d = 0; d < 5; d++) {
      let events = 0;
      const startDay = dayOf(s.tick);
      while (dayOf(s.tick) === startDay && events < ADVANCE_CAP) {
        s = step(s);
        events++;
        for (const f of s.feed) if (f.register === "decision" && !f.done && f.mailId) s = markMailRead(s, f.mailId);
      }
      expect(events).toBeLessThan(ADVANCE_CAP);
    }
  });
});

describe("daily life: choices, quests over days, decompress", () => {
  it("a broke party takes the best-paying eligible posting (pinned comparator)", () => {
    const s = createInitialState(SEED);
    // Free Blades start at 45 < NEED_GOLD and can take both tiers → Ruins (300g/day).
    expect(avgWallet(s, "free-blades")).toBeLessThan(NEED_GOLD);
    const choice = chooseActivity(s, "free-blades", 0);
    expect(choice.kind).toBe("quest");
    if (choice.kind === "quest") expect(choice.posting.tier).toBe("ruins");
  });

  it("bestPosting is dailyRate desc with id-asc tiebreak; ineligible tiers filtered", () => {
    const s = createInitialState(SEED);
    expect(bestPosting(s.board, "free-blades")?.tier).toBe("ruins");
    expect(bestPosting(s.board, "lone-mira")).toBeNull();
    expect(partyEligible("lone-mira", "standing")).toBe(true);
  });

  it("a comfortable party lives its life (rest AND train both occur)", () => {
    const s = createInitialState(SEED);
    const kinds = new Set<string>();
    for (let t = 0; t < 40; t++) kinds.add(chooseActivity(s, "iron-vigil", t).kind);
    expect(kinds.has("rest")).toBe(true);
    expect(kinds.has("train")).toBe(true);
  });

  it("forced decompress: chooseActivity(forced) rests regardless of wallet", () => {
    const s = createInitialState(SEED);
    expect(chooseActivity(s, "free-blades", 0, "rest")).toEqual({ kind: "rest" });
  });

  it("a dispatched party is out for durationDays and returns exactly on schedule", () => {
    let s = createInitialState(SEED);
    let guard = 0;
    while (!s.parties.some((p) => p.assignment && p.assignment.tier !== "standing") && guard++ < 60) s = step(s);
    const out = s.parties.find((p) => p.assignment && p.assignment.tier !== "standing")!;
    const a = out.assignment!;
    expect(a.returnTick).toBe(a.dispatchedTick + a.durationDays * TICKS_PER_DAY);
    while (s.tick < a.returnTick - 1) s = step(s);
    expect(s.parties.find((p) => p.id === out.id)!.assignment).not.toBeNull();
    let guard2 = 0;
    while (s.parties.find((p) => p.id === out.id)!.assignment && guard2++ < 20) s = step(s);
    expect(s.mail.some((m) => m.kind === "outcome" && !m.read)).toBe(true);
    const decide = s.queue.find((e) => e.type === "decide" && e.partyId === out.id);
    expect(decide?.forced).toBe("rest");
  });
});

describe("economy: wallets, brokerage, conservation, spends", () => {
  it("gold is conserved: only quest rewards + passive add; only upkeep + construction remove", () => {
    // Runs the identity twice — without and WITH the tavern bought mid-run, so
    // the −400 construction burn is inside the accounting (Review #2 Adversary).
    for (const buyAtNight of [Infinity, 2]) {
      let s = createInitialState(SEED);
      const start = totalGold(s);
      let rewards = 0;
      let nights = 0;
      let construction = 0;
      for (let i = 0; i < 300 && nights < 6; i++) {
        const up = peekNext(s);
        if (up?.type === "return") {
          const party = s.parties.find((p) => p.id === up.partyId);
          if (party?.assignment && party.assignment.returnTick === up.tick) rewards += party.assignment.log.reward;
        }
        if (up?.type === "night") nights++;
        s = step(s);
        if (nights === buyAtNight && !s.buildings.tavern && s.gold >= TAVERN_PRICE) {
          s = buyTavern(s);
          construction = TAVERN_PRICE;
        }
      }
      const expected = start + rewards + nights * (PASSIVE_INCOME - DAILY_UPKEEP) - construction;
      expect(totalGold(s)).toBe(expected);
      if (buyAtNight !== Infinity) expect(construction).toBe(TAVERN_PRICE);
    }
  });

  it("the heroes' share splits evenly with the remainder to the boss; brokerage is the flat 10%", () => {
    let s = createInitialState(SEED);
    let guard = 0;
    while (guard++ < 200) {
      const up = peekNext(s);
      if (up?.type === "return") {
        const party = s.parties.find((p) => p.id === up.partyId)!;
        const a = party.assignment;
        if (a && a.tier !== "standing" && a.log.reward > 0) {
          const partyData = PARTY_DATA.find((p) => p.id === party.id)!;
          const before = partyData.memberIds.map((id) => s.wallets[id]);
          const share = a.log.reward - a.log.guildCut;
          const per = Math.floor(share / partyData.memberIds.length);
          const rem = share - per * partyData.memberIds.length;
          s = step(s);
          partyData.memberIds.forEach((id, i) => {
            const expected = before[i] + per + (id === partyData.bossId ? rem : 0);
            expect(s.wallets[id]).toBe(expected);
          });
          expect(a.log.guildCut).toBe(Math.round((a.log.reward * BROKERAGE) / 100));
          expect(a.log.cutPct).toBe(BROKERAGE);
          return;
        }
      }
      s = step(s);
    }
    throw new Error("no scarce success return found");
  });

  it("spends are clamped to the wallet — never negative, even below the minimum", () => {
    const s = createInitialState(SEED);
    const mod: GuildState = JSON.parse(JSON.stringify(s));
    for (const h of HERO_DATA) mod.wallets[h.id] = h.id === "ysolt" ? 3 : 0;
    mod.parties = mod.parties.map((p) => ({ ...p, assignment: null, activity: { kind: "train" as const, untilTick: 1 } }));
    mod.queue = mod.parties.map<SimEvent>((p, i) => ({ id: `f${i}`, tick: 1, ord: i + 1, type: "finish", partyId: p.id, activity: "train" }));
    let out = mod;
    for (let i = 0; i < 3; i++) out = step(out);
    for (const h of HERO_DATA) expect(out.wallets[h.id]).toBeGreaterThanOrEqual(0);
    expect(out.wallets["ysolt"]).toBe(0); // spent all 3 (min 8 clamped to wallet)
  });

  it("rest spends route to the village without a tavern, and takings appear with one", () => {
    const base = createInitialState(SEED);
    const without = playDays(base, 4);
    const withTavern = playDays(buyTavern(base), 4);
    expect(without.villageSink).toBeGreaterThan(0);
    const anyTakings = withTavern.mail.some(
      (m) => m.kind === "ledger" && m.ledger?.some((e) => e.label === "Tavern takings" && e.amount > 0),
    );
    expect(anyTakings).toBe(true);
  });
});

describe("the sealed reveal: display masking & standing quiet", () => {
  it("displayedGold hides a sealed return's brokerage until the envelope opens", () => {
    let s = createInitialState(SEED);
    let guard = 0;
    while (guard++ < 300) {
      const up = peekNext(s);
      if (up?.type === "return") {
        const party = s.parties.find((p) => p.id === up.partyId)!;
        const a = party.assignment;
        if (a && a.tier !== "standing" && a.log.guildCut > 0) {
          const shownBefore = displayedGold(s);
          s = step(s);
          // Real gold moved; the DISPLAY did not.
          expect(displayedGold(s)).toBe(shownBefore);
          const mail = s.mail.find((m) => m.kind === "outcome" && !m.read)!;
          const opened = markMailRead(s, mail.id);
          expect(displayedGold(opened)).toBe(shownBefore + a.log.guildCut);
          return;
        }
      }
      s = step(s);
    }
    throw new Error("no sealed scarce return found");
  });

  it("activity/spend feed lines never print gold amounts (letters may — board info is public)", () => {
    // A post-return spend sized in gold would leak the sealed reward (B1); the
    // rule covers every activity line. Quest letters restate the POSTED rate,
    // which is already public on the board card — exempt.
    const s = playDays(createInitialState(SEED), 6);
    for (const f of s.feed) {
      if (f.register === "ambient" && f.icon !== "letter") expect(f.text).not.toMatch(/\d+\s*g\b/);
    }
  });

  it("standing returns are quiet: no sealed mail, no decision item, but ledger income exists", () => {
    const s = playDays(createInitialState(SEED), 4);
    for (const m of s.mail) {
      if (m.kind === "outcome") expect(m.questTitle).not.toMatch(/Guard the Guild Hall|Help the City Watch/);
    }
    for (const f of s.feed) {
      if (f.register === "decision") expect(f.text).not.toMatch(/shift|watch/i);
    }
    const standingLine = s.mail.some(
      (m) => m.kind === "ledger" && m.ledger?.some((e) => /Guard the Guild Hall|Help the City Watch/.test(e.label)),
    );
    expect(standingLine).toBe(true);
  });

  it("advance stops on the decision a scarce return emits", () => {
    let s = createInitialState(SEED);
    let guard = 0;
    while (guard++ < 50) {
      const r = advanceUntilStop(s);
      s = r.state;
      if (r.stop === "decision") {
        expect(s.feed.some((f) => f.register === "decision" && !f.done)).toBe(true);
        return;
      }
    }
    throw new Error("advance never stopped on a decision");
  });
});

describe("the tavern: the slice's one investment", () => {
  it("buyTavern is guarded: once, and only when affordable", () => {
    const s = createInitialState(SEED);
    const poor: GuildState = { ...(JSON.parse(JSON.stringify(s)) as GuildState), gold: TAVERN_PRICE - 1 };
    expect(buyTavern(poor)).toBe(poor); // no-op reference return
    const bought = buyTavern(s);
    expect(bought.buildings.tavern).toBe(true);
    expect(bought.gold).toBe(STARTING_GOLD - TAVERN_PRICE);
    expect(buyTavern(bought)).toBe(bought);
  });

  it("the proposal never fires on gold the player can't yet see (sealed credit)", () => {
    // Raw gold crosses the price ONLY because of an unopened sealed brokerage;
    // the proposal popping would leak the outcome (Review #2 Engineer). Gate is
    // displayedGold.
    const base = createInitialState(SEED);
    const mod: GuildState = JSON.parse(JSON.stringify(base));
    mod.tick = TICKS_PER_DAY + 1; // day 2
    mod.sinkSeen = 5;
    mod.gold = TAVERN_PRICE + 50;
    mod.mail.unshift({
      id: "sealed-1",
      day: 2,
      kind: "outcome",
      teaser: "They are back.",
      log: { beats: [], outcome: "success", reward: 1000, guildCut: 100, cutPct: BROKERAGE, durationDays: 2 },
      partyName: "x",
      questTitle: "y",
      read: false,
    });
    expect(displayedGold(mod)).toBeLessThan(TAVERN_PRICE);
    mod.queue = [{ id: "d1", tick: mod.tick, ord: 1, type: "decide", partyId: "iron-vigil" }];
    const stepped = step(mod);
    expect(stepped.feed.some((f) => f.action === "tavern")).toBe(false);
    // Open the envelope → the gold is really yours → the proposal may fire.
    const opened = markMailRead(stepped, "sealed-1");
    const after = step(opened);
    expect(after.feed.some((f) => f.action === "tavern")).toBe(true);
  });

  it("the proposal fires once, gated on day 2+ AND visible village sinks", () => {
    let s = createInitialState(SEED);
    s = playDays(s, 1);
    expect(s.feed.some((f) => f.action === "tavern")).toBe(false);
    s = playDays(s, 4);
    expect(s.sinkSeen).toBeGreaterThanOrEqual(2);
    const proposals = s.feed.filter((f) => f.action === "tavern");
    expect(proposals.length).toBe(1);
    expect(s.tavernProposed).toBe(true);
  });

  it("dismissing the proposal resolves the decision without building", () => {
    let s = createInitialState(SEED);
    let guard = 0;
    while (!s.feed.some((f) => f.action === "tavern" && !f.done) && guard++ < 400) s = step(s);
    expect(s.feed.some((f) => f.action === "tavern" && !f.done)).toBe(true);
    const dismissed = dismissTavern(s);
    expect(dismissed.feed.every((f) => f.action !== "tavern" || f.done)).toBe(true);
    expect(dismissed.buildings.tavern).toBe(false);
  });
});

describe("stale events & caps (handler guards)", () => {
  it("a return for a party that isn't out no-ops safely", () => {
    const s = createInitialState(SEED);
    const mod: GuildState = JSON.parse(JSON.stringify(s));
    mod.queue = [{ id: "x", tick: 1, ord: 1, type: "return", partyId: "iron-vigil" }];
    const out = step(mod);
    expect(out.gold).toBe(mod.gold);
    expect(out.mail.length).toBe(mod.mail.length);
    const out2 = step(out); // empty queue → the clock re-seeds a night, no stall
    expect(out2.queue.some((e) => e.type === "night")).toBe(true);
  });

  it("a decide for an out party no-ops (no double-booking)", () => {
    let s = createInitialState(SEED);
    let guard = 0;
    while (!s.parties.some((p) => p.assignment && p.assignment.tier !== "standing") && guard++ < 60) s = step(s);
    const out = s.parties.find((p) => p.assignment && p.assignment.tier !== "standing")!;
    const mod: GuildState = JSON.parse(JSON.stringify(s));
    mod.queue.push({ id: "dup", tick: mod.tick, ord: mod.seq + 999, type: "decide", partyId: out.id });
    const stepped = step(mod);
    const runtime = stepped.parties.find((p) => p.id === out.id)!;
    expect(runtime.assignment?.questId).toBe(out.assignment!.questId);
  });

  it("a mismatched finish reschedules the party's decide (queue never starves a party)", () => {
    const s = createInitialState(SEED);
    const mod: GuildState = JSON.parse(JSON.stringify(s));
    mod.parties = mod.parties.map((p) => ({ ...p, activity: null }));
    mod.queue = [{ id: "x", tick: 1, ord: 1, type: "finish", partyId: "iron-vigil", activity: "rest" }];
    const out = step(mod);
    expect(out.queue.some((e) => e.type === "decide" && e.partyId === "iron-vigil")).toBe(true);
  });

  it("feed and mail stay bounded over a long run", () => {
    const s = playDays(createInitialState(SEED), 30);
    expect(s.feed.length).toBeLessThanOrEqual(FEED_CAP + 30); // trims run nightly
    expect(s.mail.length).toBeLessThanOrEqual(MAIL_CAP + 10);
  });

  it("UNREAD nightly ledgers are trim-eligible; unread sealed outcomes never are (Codex P2)", () => {
    // A Hall-only player never expands ledger rows — the cap must still hold.
    const s = createInitialState(SEED);
    const mod: GuildState = JSON.parse(JSON.stringify(s));
    for (let d = 0; d < MAIL_CAP + 40; d++) {
      mod.mail.push({ id: `led-${d}`, day: d + 1, kind: "ledger", teaser: `Day ${d + 1} ledger`, ledger: [], read: false });
    }
    mod.mail.push({
      id: "sealed-keep",
      day: 1,
      kind: "outcome",
      teaser: "back",
      log: { beats: [], outcome: "success", reward: 100, guildCut: 10, cutPct: BROKERAGE, durationDays: 1 },
      read: false,
    });
    mod.queue = [{ id: "n", tick: 3, ord: 1, type: "night" }];
    const out = step(mod);
    expect(out.mail.length).toBeLessThanOrEqual(MAIL_CAP);
    expect(out.mail.some((m) => m.id === "sealed-keep")).toBe(true);
  });

  it("Advance refuses to move the clock while a decision is already pending (Codex P2)", () => {
    let s = createInitialState(SEED);
    let guard = 0;
    while (guard++ < 50) {
      const r = advanceUntilStop(s);
      s = r.state;
      if (r.stop === "decision") break;
    }
    expect(s.feed.some((f) => f.register === "decision" && !f.done)).toBe(true);
    // Pressing Advance again: same state back (===), no events processed.
    const again = advanceUntilStop(s);
    expect(again.stop).toBe("decision");
    expect(again.state).toBe(s);
  });
});

describe("persistence", () => {
  beforeEach(() => {
    // Node test env has no localStorage — stub it (same pattern as Slice 1).
    const store = new Map<string, string>();
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as Storage;
    clearSave();
  });

  it("round-trips a live run", () => {
    const s = stepN(createInitialState(SEED), 30);
    saveState(s);
    expect(loadState(999)).toEqual(s);
  });

  it("reinits on version mismatch and on corrupt/truncated blobs", () => {
    const s = createInitialState(SEED);
    saveState({ ...s, version: SAVE_VERSION - 1 });
    expect(loadState(42).version).toBe(SAVE_VERSION);
    localStorage.setItem("guild.slice1.v1", "{not json");
    expect(loadState(42).version).toBe(SAVE_VERSION);
    localStorage.setItem("guild.slice1.v1", JSON.stringify({ version: SAVE_VERSION, tick: 1 }));
    const re = loadState(42);
    expect(Array.isArray(re.queue)).toBe(true);
    expect(re.queue.length).toBeGreaterThan(0);
  });

  it("phaseOf/dayOf agree with tick arithmetic", () => {
    expect(dayOf(0)).toBe(1);
    expect(dayOf(TICKS_PER_DAY - 1)).toBe(1);
    expect(dayOf(TICKS_PER_DAY)).toBe(2);
    expect(phaseOf(0)).toBe("dawn");
    expect(phaseOf(TICKS_PER_DAY - 1)).toBe("night");
  });
});
