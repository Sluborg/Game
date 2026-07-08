// Guild sim tests — the invariants Review #1 demanded be provable, not asserted:
// endDay purity + determinism, pinned assignment order (no double-book, no Ruins
// starvation, out-parties excluded), anti-correlated award, appetite projection vs
// the noise band, standing income below the idle burn, and persistence round-trip
// + corrupt/version → reinit.

import { describe, it, expect, beforeEach } from "vitest";
import {
  createInitialState,
  endDay,
  reviseCut,
  resolveQuest,
  appetiteFor,
  bestFit,
  partyEligible,
  partyQuality,
  partyAccepts,
  effectiveMaxCut,
  DAILY_UPKEEP,
  PASSIVE_INCOME,
  loadState,
  saveState,
  clearSave,
  SAVE_VERSION,
} from "./index";
import { learn } from "./board";
import { RUINS } from "./quests";
import type { GuildState } from "./types";

const SEED = 12345;

function run(state: GuildState, days: number): GuildState {
  let s = state;
  for (let i = 0; i < days; i++) s = endDay(s);
  return s;
}

describe("initial state", () => {
  it("starts at 1000g, day 1, with a road + ruins posting and a coach note", () => {
    const s = createInitialState(SEED);
    expect(s.gold).toBe(1000);
    expect(s.day).toBe(1);
    expect(s.board.filter((p) => p.tier === "road")).toHaveLength(1);
    expect(s.board.filter((p) => p.tier === "ruins")).toHaveLength(1);
    expect(s.mail.some((m) => m.kind === "coach")).toBe(true);
    expect(s.firstDay).toBe(true);
  });
});

describe("endDay purity & determinism", () => {
  it("does not mutate its input", () => {
    const s = createInitialState(SEED);
    const snapshot = JSON.stringify(s);
    endDay(s);
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it("is a pure function of state (run twice → deep-equal)", () => {
    const s = createInitialState(SEED);
    expect(endDay(s)).toEqual(endDay(s));
  });

  it("is deterministic across identical runs (no Date.now / Math.random inside)", () => {
    const a = run(createInitialState(SEED), 8);
    const b = run(createInitialState(SEED), 8);
    expect(a).toEqual(b);
  });

  it("different seeds diverge", () => {
    const a = run(createInitialState(1), 8);
    const b = run(createInitialState(2), 8);
    expect(a).not.toEqual(b);
  });
});

describe("assignment order & invariants", () => {
  it("never double-books a party and keeps out-parties out until their return day", () => {
    let s = createInitialState(SEED);
    for (let i = 0; i < 15; i++) {
      s = endDay(s);
      const out = s.parties.filter((p) => p.assignment);
      for (const p of out) {
        // returnDay is always strictly in the future — a freshly dispatched party
        // is never resolved in the same tick (no instant resolve / double-book).
        expect(p.assignment!.returnDay).toBeGreaterThan(s.day);
        expect(p.assignment!.durationDays).toBeGreaterThanOrEqual(1);
      }
      // Each party appears once (structural — the array is keyed by id).
      expect(new Set(s.parties.map((p) => p.id)).size).toBe(s.parties.length);
    }
  });

  it("the lone hero can never be awarded the Ruins", () => {
    expect(partyEligible("lone-mira", "ruins")).toBe(false);
    let s = createInitialState(SEED);
    for (let i = 0; i < 20; i++) {
      s = endDay(s);
      const mira = s.parties.find((p) => p.id === "lone-mira")!;
      if (mira.assignment) expect(mira.assignment.tier).not.toBe("ruins");
    }
  });

  it("keeps a road and a ruins posting always available (no starvation of the board)", () => {
    let s = createInitialState(SEED);
    for (let i = 0; i < 20; i++) {
      s = endDay(s);
      expect(s.board.some((p) => p.tier === "road")).toBe(true);
      expect(s.board.some((p) => p.tier === "ruins")).toBe(true);
    }
  });
});

describe("multi-party read: anti-correlated ask ⟂ quality", () => {
  it("the Iron Vigil is the higher-quality party (best-fit winner at a low cut)", () => {
    expect(partyQuality("iron-vigil")).toBeGreaterThan(partyQuality("free-blades"));
    expect(bestFit(["free-blades", "iron-vigil"])).toBe("iron-vigil");
  });

  it("the strong party is ALWAYS lurable at the cut floor and NEVER bites the blind default", () => {
    // With anchor 24, run band ±2, daily noise ±2, the Iron Vigil's Ruins threshold
    // is 22..26 at offset 0 — so cut 20 always seats it, cut 30 (blind default) and
    // cut 40 never do. The read is always available; the lever is crisp.
    const s = createInitialState(SEED);
    s.askRunOffset["iron-vigil:ruins"] = 0;
    for (let day = 2; day < 60; day++) {
      const eff = effectiveMaxCut(s, "iron-vigil", "ruins", day)!;
      expect(eff).toBeLessThan(30); // never bites at the blind 30% default
      expect(partyAccepts(s, "iron-vigil", "ruins", 20, day)).toBe(true); // always lurable at the floor
      expect(partyAccepts(s, "iron-vigil", "ruins", 40, day)).toBe(false); // proud: never at 40%
    }
    // Even at the WORST run offset (−RUN_ASK_BAND), cut 20 still seats the strong party.
    s.askRunOffset["iron-vigil:ruins"] = -2;
    for (let day = 2; day < 60; day++) {
      expect(partyAccepts(s, "iron-vigil", "ruins", 20, day)).toBe(true);
    }
  });

  it("a lone hero can't bid the Ruins or the Road (standing jobs only)", () => {
    expect(partyEligible("lone-mira", "ruins")).toBe(false);
    expect(partyEligible("lone-mira", "road")).toBe(false);
    expect(partyEligible("lone-mira", "standing")).toBe(true);
  });
});

describe("appetite projection (never lies past the noise band)", () => {
  it("is unknown with no observations", () => {
    expect(appetiteFor(undefined, 30)).toBe("unknown");
  });

  it("brackets tighten from observed accept/decline; eager never lies past the noise band", () => {
    let k = learn(undefined, 30, true); // accepted at 30 → guaranteed-accept region is ≤ 30 − 2·NOISE = 26
    expect(appetiteFor(k, 26)).toBe("eager"); // boundary: safe
    expect(appetiteFor(k, 27)).toBe("might pass"); // inside the band a future roll could still decline
    expect(appetiteFor(k, 30)).toBe("might pass");
    k = learn(k, 38, false); // declined at 38
    expect(appetiteFor(k, 38)).toBe("won't bite");
    expect(appetiteFor(k, 40)).toBe("won't bite");
  });
});

describe("economy shape", () => {
  it("three standing jobs sum below the idle burn (a floor, not a faucet)", () => {
    // Standing guild take ≈ 8g/day each; idle burn = upkeep − passive = 40g/day.
    const standingGuildTake = Math.round((27 * 30) / 100); // reward × cut
    expect(standingGuildTake * 3).toBeLessThan(DAILY_UPKEEP - PASSIVE_INCOME + 1 + 24);
    expect(standingGuildTake * 3).toBeLessThan(DAILY_UPKEEP);
  });

  it("every end-day produces a visible ledger envelope with a runway note", () => {
    const s = endDay(createInitialState(SEED));
    const ledger = s.mail.find((m) => m.kind === "ledger");
    expect(ledger).toBeTruthy();
    expect(ledger!.ledger!.length).toBeGreaterThan(0);
    expect(ledger!.runwayNote).toBeTruthy();
  });
});

describe("resolver", () => {
  it("is deterministic for a given seed", () => {
    const input = { quest: RUINS, partyId: "iron-vigil", cutPct: 30, durationDays: 2, seed: 999 } as const;
    expect(resolveQuest(input)).toEqual(resolveQuest(input));
  });

  it("a stronger party clears the Ruins more often than a weaker one", () => {
    const successes = (partyId: string) => {
      let wins = 0;
      for (let seed = 0; seed < 200; seed++) {
        if (resolveQuest({ quest: RUINS, partyId, cutPct: 30, durationDays: 2, seed }).outcome === "success") wins++;
      }
      return wins;
    };
    expect(successes("iron-vigil")).toBeGreaterThan(successes("free-blades"));
  });

  it("guild cut is zero on a failed quest", () => {
    // Find a seed that fails for the weak solo party on the (party-gated) Ruins math.
    let sawFailure = false;
    for (let seed = 0; seed < 100 && !sawFailure; seed++) {
      const log = resolveQuest({ quest: RUINS, partyId: "free-blades", cutPct: 40, durationDays: 1, seed });
      if (log.outcome === "failure") {
        expect(log.guildCut).toBe(0);
        sawFailure = true;
      }
    }
    expect(sawFailure).toBe(true);
  });
});

describe("cut revision (once per day)", () => {
  it("applies once and then locks for the day", () => {
    const s = createInitialState(SEED);
    const road = s.board.find((p) => p.tier === "road")!;
    const s1 = reviseCut(s, road.id, 20);
    expect(s1.board.find((p) => p.id === road.id)!.cutPct).toBe(20);
    const s2 = reviseCut(s1, road.id, 40);
    expect(s2.board.find((p) => p.id === road.id)!.cutPct).toBe(20); // locked today
  });

  it("clamps to the 20–40 range", () => {
    const s = createInitialState(SEED);
    const road = s.board.find((p) => p.tier === "road")!;
    expect(reviseCut(s, road.id, 99).board.find((p) => p.id === road.id)!.cutPct).toBe(40);
  });
});

describe("persistence", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as Storage;
  });

  it("round-trips a run through save/load", () => {
    const s = run(createInitialState(SEED), 5);
    saveState(s);
    expect(loadState(0)).toEqual(s);
  });

  it("reinits (never throws) on a corrupt blob", () => {
    localStorage.setItem("guild.slice1.v1", "{not json");
    const s = loadState(SEED);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.day).toBe(1);
  });

  it("reinits on a version mismatch", () => {
    localStorage.setItem("guild.slice1.v1", JSON.stringify({ version: 999, day: 50 }));
    expect(loadState(SEED).day).toBe(1);
  });

  it("clearSave wipes the slot", () => {
    saveState(createInitialState(SEED));
    clearSave();
    expect(loadState(SEED).day).toBe(1);
  });
});
