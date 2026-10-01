import { afterEach, describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { setEngine } from "../engine";
import { SAVE_VERSION, createInitialState, step } from "../index";
import { loadState, saveState } from "../persist";
import { resolveQuest } from "../resolver";
import { HERO_BY_ID, HERO_DATA } from "../roster";
import { RUINS, STANDING_JOBS } from "../quests";
import { ATTR_MAX } from "../content/attributes";
import { SKILL_MAX } from "../content/skills";
import type { ResultId } from "../content/ladder";
import type { AdventureLog, Beat, HeroProgressState } from "../types";
import { renderGrowth } from "./growthReport";
import { awardGrowth, heroStatsFrom, initialHeroes, normalizeHeroes, validHeroProgress } from "./progress";
import { questStats } from "./harness";

afterEach(() => setEngine("v1"));

// ── helpers ───────────────────────────────────────────────────────────────────

function beat(skill: string, leadId: string, result: ResultId, extra: Partial<Beat> = {}): Beat {
  return {
    id: `b-${skill}`,
    type: "investigation",
    location: "x",
    grade: "ok",
    roll: 0.5,
    score: 50,
    text: "t",
    check: { skill: skill as never, leadId, dice: [3, 4], capability: 10, score: 17, target: 20, result },
    ...extra,
  };
}
const logOf = (beats: Beat[]): AdventureLog => ({ beats, outcome: "success", reward: 100, guildCut: 10, cutPct: 10, durationDays: 1 });
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

// ── the award rules ───────────────────────────────────────────────────────────

describe("awardGrowth", () => {
  it("the lead gets skill XP (+2 on Success) and attribute XP; supporters +1 skill XP only on Success", () => {
    const heroes = initialHeroes();
    const out = awardGrowth(heroes, "iron-vigil", logOf([beat("reasoning", "wren", "success")]));
    expect(out.heroes.wren.xp.skills.reasoning).toBe(2);
    expect(out.heroes.wren.xp.attrs.mind).toBe(1);
    expect(out.heroes.ysolt.xp.skills.reasoning).toBe(1);
    expect(out.heroes.ysolt.xp.attrs.mind).toBe(0); // support never trains the attribute
    expect(out.heroes.doran.xp.skills.reasoning).toBe(1);
    expect(out.heroes.brok).toEqual(heroes.brok); // another party untouched
  });

  it("a failed beat still teaches the lead (+1 skill XP) and gives supporters nothing", () => {
    const out = awardGrowth(initialHeroes(), "iron-vigil", logOf([beat("reasoning", "wren", "failure")]));
    expect(out.heroes.wren.xp.skills.reasoning).toBe(1);
    expect(out.heroes.wren.xp.attrs.mind).toBe(0);
    expect(out.heroes.ysolt.xp.skills.reasoning).toBe(0);
    expect(out.lines.map((l) => l.heroId)).toEqual(["wren"]);
  });

  it("combat beats, v1 beats (no check) and older v3 beats (no leadId) award nothing, and heroes are deep-equal", () => {
    const heroes = initialHeroes();
    const v1: Beat = { ...beat("x", "wren", "success"), check: undefined };
    const noLead: Beat = beat("reasoning", "wren", "success");
    delete noLead.check!.leadId;
    const out = awardGrowth(heroes, "iron-vigil", logOf([beat("combat", "ysolt", "triumph"), v1, noLead]));
    expect(out.heroes).toEqual(heroes);
    expect(out.lines).toEqual([]);
  });

  it("a lone hero earns lead XP and there is no support to give", () => {
    const out = awardGrowth(initialHeroes(), "lone-mira", logOf([beat("willpower", "mira", "success")]));
    expect(out.heroes.mira.xp.skills.willpower).toBe(2);
    expect(out.lines).toHaveLength(1);
  });

  it("recovery and bonus beats count; XP aggregates per hero and skill", () => {
    const out = awardGrowth(
      initialHeroes(),
      "iron-vigil",
      logOf([beat("reasoning", "wren", "success"), beat("reasoning", "wren", "success", { branch: "bonus" }), beat("reasoning", "wren", "failure", { branch: "recovery" })]),
    );
    expect(out.heroes.wren.xp.skills.reasoning).toBe(2 + 2 + 1);
    expect(out.lines.find((l) => l.heroId === "wren")!.xpGained).toBe(5);
  });

  it("XP at the skill cap is discarded and not reported as gained", () => {
    const heroes = initialHeroes();
    heroes.wren.skills.reasoning = SKILL_MAX;
    const out = awardGrowth(heroes, "iron-vigil", logOf([beat("reasoning", "wren", "success")]));
    expect(out.heroes.wren.skills.reasoning).toBe(SKILL_MAX);
    expect(out.heroes.wren.xp.skills.reasoning).toBe(0);
    expect(out.heroes.wren.xp.attrs.mind).toBe(1); // the independent attribute still grows
    expect(out.lines.find((l) => l.heroId === "wren")?.xpGained ?? 0).toBe(0);
  });

  it("level-ups sort first, carry the level and bank, and report the cost", () => {
    const heroes = initialHeroes();
    heroes.wren.xp.skills.reasoning = 30; // level 6 costs 30: not reachable as a bank, so use level 1 below
    heroes.wren.skills.reasoning = 1;
    heroes.wren.xp.skills.reasoning = 4; // level 1 costs 5: +2 crosses
    const out = awardGrowth(heroes, "iron-vigil", logOf([beat("reasoning", "ysolt", "success"), beat("nature", "wren", "success")]));
    const up = out.lines.find((l) => l.heroId === "wren" && l.skill === "reasoning")!;
    expect(up.levelUp).toBe(true);
    expect(up.level).toBe(2);
    expect(up.cost).toBe(10);
    expect(out.lines[0].levelUp).toBe(true);
  });

  it("is deterministic (structuredClone inputs give byte-equal output) and idempotent on a log that already has growth", () => {
    const heroes = initialHeroes();
    const log = logOf([beat("reasoning", "wren", "success"), beat("nature", "wren", "triumph")]);
    const a = awardGrowth(clone(heroes), "iron-vigil", clone(log));
    const b = awardGrowth(clone(heroes), "iron-vigil", clone(log));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const sealed = { ...log, growth: a.lines };
    const again = awardGrowth(a.heroes, "iron-vigil", sealed);
    expect(again.heroes).toBe(a.heroes); // untouched
    expect(again.lines).toBe(a.lines);
  });

  it("never mutates its input", () => {
    const heroes = initialHeroes();
    const snapshot = JSON.stringify(heroes);
    awardGrowth(heroes, "iron-vigil", logOf([beat("reasoning", "wren", "success")]));
    expect(JSON.stringify(heroes)).toBe(snapshot);
  });
});

// ── persistence: no version bump, per-hero validation ─────────────────────────

describe("normalizeHeroes / validHeroProgress", () => {
  it("a save with no heroes gets the roster defaults; valid saved progress is kept", () => {
    expect(normalizeHeroes(undefined)).toEqual(initialHeroes());
    const grown = initialHeroes();
    grown.wren.skills.reasoning = 9;
    expect(normalizeHeroes(clone(grown)).wren.skills.reasoning).toBe(9);
  });

  it("a corrupt entry is refilled ALONE; the others keep their growth", () => {
    const grown = initialHeroes();
    grown.wren.skills.reasoning = 9;
    grown.ysolt.skills.force = 12;
    const bad = clone(grown) as Record<string, unknown>;
    (bad.ysolt as HeroProgressState).skills.force = null as never; // JSON NaN
    const out = normalizeHeroes(bad);
    expect(out.ysolt).toEqual(initialHeroes().ysolt);
    expect(out.wren.skills.reasoning).toBe(9);
  });

  it("rejects out-of-range levels, oversized or negative XP banks, missing keys, and non-integers", () => {
    const base = () => clone(initialHeroes().wren);
    const mk = (f: (p: HeroProgressState) => void) => {
      const p = base();
      f(p);
      return validHeroProgress(p);
    };
    expect(validHeroProgress(base())).toBe(true);
    expect(mk((p) => (p.attrs.mind = ATTR_MAX + 1))).toBe(false);
    expect(mk((p) => (p.skills.force = SKILL_MAX + 1))).toBe(false);
    expect(mk((p) => (p.skills.force = 2.5))).toBe(false);
    expect(mk((p) => (p.xp.skills.force = -1))).toBe(false);
    expect(mk((p) => (p.xp.skills.force = 9999))).toBe(false); // bank beyond the next level's cost
    expect(mk((p) => delete (p.skills as Record<string, number>).force)).toBe(false);
    expect(validHeroProgress(null)).toBe(false);
  });
});

describe("loadState/saveState carry growth without a version bump", () => {
  const store = new Map<string, string>();
  const g = globalThis as unknown as { localStorage?: unknown };
  const install = () => {
    g.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
  };
  afterEach(() => {
    delete g.localStorage;
    store.clear();
  });

  it("SAVE_VERSION is unchanged", () => {
    expect(SAVE_VERSION).toBe(4);
  });
  it("round-trips grown heroes", () => {
    install();
    const s = createInitialState(5);
    s.heroes.wren.skills.reasoning = 11;
    saveState(s);
    expect(loadState(5).heroes.wren.skills.reasoning).toBe(11);
  });
  it("an older save with no `heroes` field loads and gains the defaults; an old build would carry the field through", () => {
    install();
    const old = clone(createInitialState(5)) as unknown as Record<string, unknown>;
    delete old.heroes;
    store.set("guild.slice1.v1", JSON.stringify(old));
    expect(loadState(5).heroes).toEqual(initialHeroes());
    // An OLD build only parses and re-serialises: an unknown `heroes` field survives untouched.
    const withHeroes = JSON.stringify(createInitialState(5));
    expect(JSON.parse(withHeroes).heroes.wren.skills.reasoning).toBe(HERO_BY_ID.wren.v3.skills.reasoning);
  });
  it("a corrupt hero in a save is refilled alone, the run survives", () => {
    install();
    const s = clone(createInitialState(5)) as unknown as { heroes: Record<string, unknown>; gold: number };
    s.heroes.brok = { nonsense: true };
    s.gold = 4242;
    store.set("guild.slice1.v1", JSON.stringify(s));
    const loaded = loadState(5);
    expect(loaded.gold).toBe(4242);
    expect(loaded.heroes.brok).toEqual(initialHeroes().brok);
  });
});

// ── through the clock ─────────────────────────────────────────────────────────

describe("growth through the real clock", () => {
  function runUntilOutcome(engine: "v1" | "v3") {
    setEngine(engine);
    let s = createInitialState(1);
    for (let i = 0; i < 800; i++) {
      s = step(s);
      if (s.mail.some((m) => m.kind === "outcome" && m.log && m.log.beats.length >= 3)) break;
    }
    return s;
  }

  it("v3: a returning scarce quest seals its growth in the mail log and grows the heroes", () => {
    const s = runUntilOutcome("v3");
    const mail = s.mail.find((m) => m.kind === "outcome" && m.log)!;
    expect(mail.log!.growth!.length).toBeGreaterThan(0);
    expect(s.heroes).not.toEqual(initialHeroes());
    // nothing in the feed or ledger mentions experience (the seal holds)
    expect(JSON.stringify(s.feed)).not.toMatch(/XP|grew|Level up/);
    expect(JSON.stringify(s.dayLedger)).not.toMatch(/XP|grew|Level up/);
    expect(JSON.stringify(mail.teaser)).not.toMatch(/XP|grew|Level up/);
  });

  it("v1: production behaviour is inert: no growth lines, heroes deep-equal the defaults", () => {
    const s = runUntilOutcome("v1");
    expect(s.mail.some((m) => m.log?.growth)).toBe(false);
    expect(s.heroes).toEqual(initialHeroes());
  });

  it("a v3 log returned while the engine is v1 still awards (the award keys off the log, not the engine)", () => {
    const s = runUntilOutcome("v3");
    const log = s.mail.find((m) => m.kind === "outcome" && m.log)!.log!;
    setEngine("v1");
    const fresh = { ...clone(log), growth: undefined };
    delete fresh.growth;
    expect(awardGrowth(initialHeroes(), "free-blades", fresh).lines.length + awardGrowth(initialHeroes(), "iron-vigil", fresh).lines.length).toBeGreaterThan(0);
  });

  it("v3 dispatch with fresh-state stats equals the roster-default resolve (stats plumbing is neutral at the start)", () => {
    const stats = heroStatsFrom(initialHeroes());
    for (const partyId of ["iron-vigil", "free-blades"]) {
      for (let seed = 1; seed <= 30; seed++) {
        const a = resolveQuest({ quest: RUINS, partyId, cutPct: 10, durationDays: 1, seed, engine: "v3", stats });
        const b = resolveQuest({ quest: RUINS, partyId, cutPct: 10, durationDays: 1, seed, engine: "v3" });
        expect(a).toEqual(b);
      }
    }
    expect(STANDING_JOBS.length).toBeGreaterThan(0);
  });

  it("grown heroes succeed more often than the starting heroes on the hard quest (fixed seeds)", () => {
    const grown = initialHeroes();
    for (const id of ["brok", "pell"]) for (const s of Object.keys(grown[id].skills)) (grown[id].skills as Record<string, number>)[s] = SKILL_MAX;
    const before = questStats(RUINS, "free-blades", "v3", 400);
    const after = questStats(RUINS, "free-blades", "v3", 400, heroStatsFrom(grown));
    expect(after.success).toBeGreaterThan(before.success);
  });
});

describe("a sealed log's growth stays small", () => {
  it("four growth lines serialise to well under 1 KB", () => {
    const out = awardGrowth(initialHeroes(), "iron-vigil", logOf([beat("reasoning", "wren", "success"), beat("nature", "wren", "success"), beat("mobility", "wren", "success"), beat("fortitude", "ysolt", "success")]));
    expect(JSON.stringify(out.lines.slice(0, 4)).length).toBeLessThan(1000);
  });
});

// ── the seal: who may read heroes / growth ────────────────────────────────────

describe("nothing outside the story card reads sealed growth or live heroes", () => {
  it("only the allowed files read `.heroes` / `.growth` (a hero panel must mask unread outcomes first)", () => {
    const root = fileURLToPath(new URL("../../../", import.meta.url)); // web/src/
    const allowed = [
      "game/guild/clock.ts",
      "game/guild/persist.ts",
      "game/guild/state.ts",
      "ui/report/StoryStage.tsx",
    ];
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = dir + name;
        if (statSync(full).isDirectory()) walk(full + "/");
        else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) {
          const rel = full.slice(root.length);
          if (rel.startsWith("game/guild/wire/") || allowed.includes(rel)) continue;
          if (/\.(heroes|growth)\b/.test(readFileSync(full, "utf8"))) offenders.push(rel);
        }
      }
    };
    walk(root + "game/");
    walk(root + "ui/");
    expect(offenders).toEqual([]);
    expect(HERO_DATA.length).toBeGreaterThan(0);
  });
});

// ── the generated doc ─────────────────────────────────────────────────────────

describe("docs/resolution-growth.md is generated from this code", () => {
  it("committed file matches renderGrowth() byte for byte (run `npm run sim:growth`)", () => {
    const path = fileURLToPath(new URL("../../../../../docs/resolution-growth.md", import.meta.url));
    expect(readFileSync(path, "utf8")).toBe(renderGrowth());
  });
  it("is deterministic and free of dates", () => {
    const a = renderGrowth();
    expect(a).toBe(renderGrowth());
    expect(a).not.toMatch(/20\d\d-\d\d-\d\d/);
  });
});
