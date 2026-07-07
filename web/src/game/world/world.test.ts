// Guards for the Slice 1 guild economy. These assert the §12 rules and the
// foundations (determinism across reload, the end-day tick order, debt/insolvency,
// appetite provenance) that Review #1 flagged as the corner-case-prone parts.

import { describe, expect, it, beforeEach } from "vitest";
import { ACCEPT, ECONOMY, QUESTS, RESOLVE } from "./economy";
import { partyQuality, STARTER_HEROES } from "./heroes";
import { newRun } from "./newRun";
import { endDay } from "./endDay";
import { adjustCut, setCut } from "./actions";
import { appetiteAt } from "./appetite";
import { successChance } from "./resolve";
import { isWorldState, load, save, clear } from "./persist";
import { SCHEMA_VERSION, type WorldState } from "./types";
import { makeCursor, nextFloat } from "./rng";

const roundTrip = (s: WorldState): WorldState => JSON.parse(JSON.stringify(s));
const road = (s: WorldState) => s.quests.find((q) => q.id === "road")!;
const ruins = (s: WorldState) => s.quests.find((q) => q.id === "ruins")!;

/** A seed whose first roll forces a given outcome, so failure paths are testable. */
function seedForFirstRoll(pred: (x: number) => boolean): number {
  for (let r = 1; r < 100000; r++) {
    if (pred(nextFloat(makeCursor(r >>> 0)))) return r >>> 0;
  }
  throw new Error("no seed found");
}

describe("determinism", () => {
  it("same seed → identical multi-day trajectory", () => {
    const run = (seed: number) => {
      let s = newRun(seed);
      for (let i = 0; i < 6; i++) s = endDay(s);
      return s;
    };
    expect(run(4242)).toEqual(run(4242));
  });

  it("survives a save→reload before each End Day (cursor is in-state)", () => {
    let live = newRun(777);
    let reloaded = newRun(777);
    for (let i = 0; i < 6; i++) {
      live = endDay(live);
      reloaded = endDay(roundTrip(reloaded)); // JSON round-trip mimics persistence
    }
    expect(reloaded).toEqual(live);
  });

  it("endDay does not mutate its input", () => {
    const s = newRun(9);
    const snapshot = roundTrip(s);
    endDay(s);
    expect(s).toEqual(snapshot);
  });
});

describe("cash clock (§12 number sheet)", () => {
  const idle = (s: WorldState) => {
    // No board postings, party free → a pure idle day: +20 −60 = −40.
    s.quests.forEach((q) => (q.onBoard = false));
    s.party.out = null;
    return s;
  };

  it("idle net is −40g/day", () => {
    const s = endDay(idle(newRun(1)));
    expect(s.gold).toBe(ECONOMY.startingGold - 40);
    expect(s.lastReport!.netPerDay).toBe(-40);
    expect(s.lastReport!.runwayDaysAfter).toBe(Math.floor((ECONOMY.startingGold - 40) / 40));
  });

  it("gold < 0 at end-day triggers exactly one 600g loan that clears insolvency", () => {
    const s0 = idle(newRun(1));
    s0.gold = 10; // 10 + 20 − 60 = −30 → loan
    const s = endDay(s0);
    expect(s.loan).toEqual({ active: true, taken: true });
    expect(s.gold).toBe(-30 + ECONOMY.loanPrincipal);
    expect(s.insolventStreak).toBe(0); // the fresh loan cleared the day's insolvency
    expect(s.lastReport!.mail.some((m) => m.kind === "loan")).toBe(true);
  });

  it("ending at exactly 0g is survivable and loan-free", () => {
    const s0 = idle(newRun(1));
    s0.gold = 40; // 40 + 20 − 60 = 0
    const s = endDay(s0);
    expect(s.gold).toBe(0);
    expect(s.loan.taken).toBe(false);
    expect(s.insolventStreak).toBe(0);
  });

  it("interest is flat 30g/day and never a second loan", () => {
    const s0 = idle(newRun(1));
    s0.loan = { active: true, taken: true };
    s0.gold = 100;
    const s = endDay(s0);
    // 100 + 20 − 60 − 30(interest) = 30; can't repay (30−600 < 200)
    expect(s.gold).toBe(30);
    expect(s.lastReport!.ledger.some((l) => l.label.includes("interest") && l.amount === -30)).toBe(true);
  });

  it("force-repays only when it can pay 600 and keep 200", () => {
    const s0 = idle(newRun(1));
    s0.loan = { active: true, taken: true };
    s0.gold = 900; // 900 +20 −60 −30 = 830 → 830−600 = 230 ≥ 200 → repay
    const s = endDay(s0);
    expect(s.loan.active).toBe(false);
    expect(s.gold).toBe(230);
  });

  it("does NOT repay when it can't keep the 200 buffer", () => {
    const s0 = idle(newRun(1));
    s0.loan = { active: true, taken: true };
    s0.gold = 700; // 700+20−60−30 = 630 → 630−600 = 30 < 200 → hold
    const s = endDay(s0);
    expect(s.loan.active).toBe(true);
    expect(s.gold).toBe(630);
  });

  it("5 consecutive insolvent end-days revoke the charter", () => {
    let s = idle(newRun(1));
    s.loan = { active: false, taken: true }; // loan already spent — no rescue left
    s.gold = 100;
    let insolventDays = 0;
    for (let i = 0; i < 12 && s.status === "playing"; i++) {
      s = idle(s);
      s = endDay(s);
      if (s.gold < 0) insolventDays++;
    }
    expect(s.status).toBe("revoked");
    expect(insolventDays).toBe(ECONOMY.insolvencyLimit);
    expect(s.insolventStreak).toBe(ECONOMY.insolvencyLimit);
  });

  it("a solvent end-day resets the insolvency streak", () => {
    const s0 = idle(newRun(1));
    s0.insolventStreak = 3;
    s0.gold = 100; // stays positive → reset
    expect(endDay(s0).insolventStreak).toBe(0);
  });

  it("a revoked run is terminal — End Day is a no-op", () => {
    const s0 = newRun(1);
    s0.status = "revoked";
    const s = endDay(s0);
    expect(s.day).toBe(s0.day);
    expect(s.gold).toBe(s0.gold);
  });
});

describe("acceptance, quests & the road floor", () => {
  it("prefers the Ruins when the party would accept both (better expected share)", () => {
    const s0 = newRun(3);
    // Both cheap enough to accept regardless of ±2 noise (min askMaxCut is 33).
    s0.quests.forEach((q) => (q.cut = ECONOMY.cutMin));
    const s = endDay(s0);
    expect(s.party.out?.questId).toBe("ruins");
    expect(ruins(s).onBoard).toBe(false);
    expect(road(s).onBoard).toBe(true);
  });

  it("the road job at base cut is always takeable (the §6 unstick floor)", () => {
    // Over many seeds, a base-30% road posting is essentially always accepted.
    let taken = 0;
    const N = 200;
    for (let seed = 1; seed <= N; seed++) {
      const s0 = newRun(seed);
      ruins(s0).onBoard = false; // isolate the road decision
      const s = endDay(s0);
      if (s.party.out?.questId === "road") taken++;
    }
    expect(taken).toBe(N);
  });

  it("a failed quest returns as the SAME quest — failCount & payBump persist", () => {
    const s0 = newRun(5);
    // Party out on the ruins, returning today; force a failed roll.
    ruins(s0).onBoard = false;
    s0.party.out = { questId: "ruins", cut: 30, reward: QUESTS.ruins.reward, returnsOnDay: s0.day };
    s0.rngState = seedForFirstRoll((x) => x >= 0.75); // above the ruins ceiling → fail
    const s = endDay(s0);
    expect(ruins(s).failCount).toBe(1);
    expect(ruins(s).payBump).toBe(QUESTS.ruins.failPayBump);
    expect(ruins(s).reward).toBe(QUESTS.ruins.reward + QUESTS.ruins.failPayBump);
    // The same quest is back in play — either on the board or immediately re-taken
    // by the freed party that night (back-to-back), never deleted or reset.
    expect(ruins(s).onBoard || s.party.out?.questId === "ruins").toBe(true);
    expect(s.lastReport!.mail.some((m) => m.kind === "outcome" && !m.success)).toBe(true);
  });

  it("the giver withdraws after a second failure (fresh letter, failCount reset)", () => {
    const s0 = newRun(5);
    road(s0).onBoard = false;
    road(s0).failCount = 1; // already failed once
    road(s0).payBump = QUESTS.road.failPayBump;
    s0.party.out = { questId: "road", cut: 30, reward: QUESTS.road.reward + QUESTS.road.failPayBump, returnsOnDay: s0.day };
    s0.rngState = seedForFirstRoll((x) => x >= 0.95); // above the road ceiling → fail
    const s = endDay(s0);
    expect(road(s).failCount).toBe(0); // withdrawn → fresh letter
    expect(road(s).reward).toBe(QUESTS.road.reward);
    expect(s.lastReport!.mail.some((m) => m.kind === "expired")).toBe(true);
  });

  it("an untaken posting expires after ~3 days", () => {
    let s = newRun(5);
    road(s).onBoard = false; // isolate the ruins on the board
    s.party.out = { questId: "road", cut: 30, reward: 200, returnsOnDay: s.day + 100 }; // party parked, never frees
    let expired = false;
    for (let i = 0; i < ECONOMY.expiryDays; i++) {
      s = endDay(s);
      if (s.lastReport!.mail.some((m) => m.kind === "expired")) expired = true;
    }
    expect(expired).toBe(true);
    expect(ruins(s).daysOnBoard).toBe(0); // reset by the fresh letter
  });

  it("invariants hold across a long randomized game", () => {
    for (const seed of [11, 47, 88, 129, 1000]) {
      let s = newRun(seed);
      for (let i = 0; i < 40 && s.status === "playing"; i++) {
        s = endDay(s);
        for (const q of s.quests) {
          expect(q.failCount).toBeGreaterThanOrEqual(0);
          expect(q.failCount).toBeLessThanOrEqual(ECONOMY.failWithdrawAt);
          expect([0, QUESTS[q.id].failPayBump]).toContain(q.payBump);
          expect(q.reward).toBeLessThanOrEqual(QUESTS[q.id].reward + QUESTS[q.id].failPayBump);
          expect(q.cut).toBeGreaterThanOrEqual(ECONOMY.cutMin);
          expect(q.cut).toBeLessThanOrEqual(ECONOMY.cutMax);
        }
        const r = s.lastReport!;
        expect(r.runwayDaysAfter === null || r.runwayDaysAfter >= 0).toBe(true);
        expect(isWorldState(roundTrip(s))).toBe(true); // stays serializable & valid
      }
    }
  });
});

describe("the cut (priced decision)", () => {
  it("clamps to 20–40 and the buttons nudge within range", () => {
    let s = newRun(1);
    s = adjustCut(s, "ruins", -100);
    expect(ruins(s).cut).toBe(ECONOMY.cutMin);
    s = adjustCut(s, "ruins", +100);
    expect(ruins(s).cut).toBe(ECONOMY.cutMax);
    s = setCut(s, "ruins", 30);
    expect(ruins(s).cut).toBe(30);
    expect(ruins(s).cutRevisedToday).toBe(true);
  });

  it("cutRevisedToday resets the next morning", () => {
    let s = setCut(newRun(1), "road", 40);
    expect(road(s).cutRevisedToday).toBe(true);
    s = endDay(s);
    expect(road(s).cutRevisedToday).toBe(false);
  });
});

describe("appetite chip provenance (Review #1 blocker)", () => {
  it("day 1 is 'unknown' and never leaks the hidden ask", () => {
    const q = ruins(newRun(1));
    expect(q.learnedMaxAccepted).toBeNull();
    expect(q.learnedMinDeclined).toBeNull();
    for (const cut of [20, 25, 30, 35, 40]) expect(appetiteAt(q, cut)).toBe("unknown");
  });

  it("reads ONLY the observation brackets — independent of askMaxCut", () => {
    const base = { ...ruins(newRun(1)), learnedMaxAccepted: 30, learnedMinDeclined: 38 };
    const a = { ...base, askMaxCut: 20 };
    const b = { ...base, askMaxCut: 45 };
    for (const cut of [20, 25, 30, 33, 35, 38, 40]) {
      expect(appetiteAt(a, cut)).toBe(appetiteAt(b, cut)); // askMaxCut can't change the chip
    }
    expect(appetiteAt(base, 30)).toBe("eager"); // ≤ seen-accepted
    expect(appetiteAt(base, 35)).toBe("might-pass"); // in the unresolved band
    expect(appetiteAt(base, 38)).toBe("wont-bite"); // ≥ seen-declined
  });

  it("play accumulates a bracket only from what was observed", () => {
    let s = newRun(42);
    // Force the road to be declined so a decline bracket is recorded.
    road(s).cut = ECONOMY.cutMax;
    road(s).askMaxCut = 0; // guarantees a decline this tick (observation, not leak)
    ruins(s).onBoard = false;
    s = endDay(s);
    expect(road(s).learnedMinDeclined).not.toBeNull();
  });
});

describe("blind play is base-optimal (§12 R2 property)", () => {
  // Exact enumeration over the run-offset band and daily noise — validates the
  // constants, no Monte-Carlo flakiness. EV = P(accept) × take × success.
  const quality = partyQuality(STARTER_HEROES);
  const acceptProb = (tier: "road" | "ruins", cut: number) => {
    let hits = 0;
    let n = 0;
    for (let off = -ACCEPT.runOffsetMax; off <= ACCEPT.runOffsetMax; off++) {
      for (let noise = -ACCEPT.dailyNoiseMax; noise <= ACCEPT.dailyNoiseMax; noise++) {
        n++;
        if (cut <= QUESTS[tier].askAnchor + off + noise) hits++;
      }
    }
    return hits / n;
  };
  const ev = (tier: "road" | "ruins", cut: number) =>
    acceptProb(tier, cut) * ((QUESTS[tier].reward * cut) / 100) * successChance(tier, quality);

  it("cut = 30 maximises blind EV on both tiers", () => {
    for (const tier of ["road", "ruins"] as const) {
      expect(ev(tier, 30)).toBeGreaterThanOrEqual(ev(tier, 20));
      expect(ev(tier, 30)).toBeGreaterThanOrEqual(ev(tier, 40));
    }
  });

  it("acceptance is monotonically non-increasing in cut", () => {
    for (const tier of ["road", "ruins"] as const) {
      expect(acceptProb(tier, 20)).toBeGreaterThanOrEqual(acceptProb(tier, 30));
      expect(acceptProb(tier, 30)).toBeGreaterThanOrEqual(acceptProb(tier, 40));
    }
  });

  it("the Ruins 40% squeeze is a live gamble (0 < P < 1), so knowledge pays", () => {
    const p = acceptProb("ruins", 40);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });

  it("success stays inside §12's stated bands", () => {
    expect(successChance("road", quality)).toBeGreaterThanOrEqual(RESOLVE.roadBase);
    const ruinsP = successChance("ruins", quality);
    expect(ruinsP).toBeGreaterThanOrEqual(RESOLVE.ruinsFloor);
    expect(ruinsP).toBeLessThanOrEqual(RESOLVE.ruinsFloor + RESOLVE.ruinsQualitySpan);
  });
});

describe("persistence guard", () => {
  // A tiny in-memory localStorage stand-in.
  const mkStore = (throwOnSet = false): Storage => {
    const m = new Map<string, string>();
    return {
      get length() {
        return m.size;
      },
      clear: () => m.clear(),
      getItem: (k: string) => m.get(k) ?? null,
      key: (i: number) => [...m.keys()][i] ?? null,
      removeItem: (k: string) => m.delete(k),
      setItem: (k: string, v: string) => {
        if (throwOnSet) throw new DOMException("quota", "QuotaExceededError");
        m.set(k, v);
      },
    } as Storage;
  };

  beforeEach(() => {
    (globalThis as { localStorage?: Storage }).localStorage = mkStore();
    clear();
  });

  it("round-trips a saved run", () => {
    const s = endDay(newRun(2024));
    save(s);
    expect(load()).toEqual(s);
  });

  it("rejects a wrong schema version", () => {
    const s = newRun(1);
    (globalThis.localStorage as Storage).setItem(
      "guild.slice1.state",
      JSON.stringify({ ...s, schemaVersion: SCHEMA_VERSION + 1 }),
    );
    expect(load()).toBeNull();
  });

  it("rejects a shape-valid-version but truncated payload", () => {
    (globalThis.localStorage as Storage).setItem(
      "guild.slice1.state",
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, day: 1 }), // missing everything else
    );
    expect(load()).toBeNull();
  });

  it("rejects garbage JSON without throwing", () => {
    (globalThis.localStorage as Storage).setItem("guild.slice1.state", "{not json");
    expect(load()).toBeNull();
  });

  it("save swallows a write failure (private mode) instead of throwing", () => {
    (globalThis as { localStorage?: Storage }).localStorage = mkStore(true);
    expect(() => save(newRun(1))).not.toThrow();
  });
});
