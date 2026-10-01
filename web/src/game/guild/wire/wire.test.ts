import { afterEach, describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ATTR_MAX } from "../content/attributes";
import { SKILL_IDS, SKILL_MAX } from "../content/skills";
import { RESULT_LADDER, type ResultId } from "../content/ladder";
import { BIRTH_MAX, BIRTH_MIN, BIRTH_TOTAL, KIT_PRIMARY_LEVEL, KIT_SECONDARY_COUNT, KIT_SECONDARY_LEVEL } from "../resolve/birth";
import { capabilityFor, targetFor } from "../resolve/check";
import { detectEngine, getEngine, setEngine } from "../engine";
import { GRADE_ZONES, resolveQuest } from "../resolver";
import { HERO_DATA, HERO_BY_ID, partyTraitMod } from "../roster";
import { QUEST_BY_ID, ROAD_JOB, RUINS } from "../quests";
import type { Grade } from "../types";
import {
  RESULT_TO_GRADE,
  beatDistribution,
  beatTarget,
  encounterStats,
  meterScoreFor,
  partyCapability,
  partyLead,
  resolveBeatV3,
  SIZE_BONUS_PER_EXTRA,
  TRAIT_PCT_PER_DELTA,
} from "./bridge";
import { GATE, QUESTS, calibrationRows, questBeats } from "./harness";
import { renderWire } from "./report";

afterEach(() => setEngine("v1"));

// ── engine selection ──────────────────────────────────────────────────────────

describe("engine selection", () => {
  it("defaults to v1", () => {
    expect(getEngine()).toBe("v1");
  });
  it("detectEngine: v3 only on the dev deploy or by explicit query; production stays v1", () => {
    expect(detectEngine("/Game/", "")).toBe("v1");
    expect(detectEngine("/", "")).toBe("v1");
    expect(detectEngine(undefined, undefined)).toBe("v1");
    expect(detectEngine("/Game/dev/", "")).toBe("v3");
    expect(detectEngine("/Game/dev/", "?x=1")).toBe("v3");
    expect(detectEngine("/Game/", "?engine=v3")).toBe("v3"); // explicit opt-in works anywhere
    expect(detectEngine("/Game/dev/", "?engine=v1")).toBe("v1"); // explicit opt-out too
    expect(detectEngine("/Game/dev/", "?engine=bogus")).toBe("v3"); // junk is ignored
    expect(detectEngine("/Gamedev/", "")).toBe("v1");
  });
  it("setEngine/getEngine round-trip", () => {
    setEngine("v3");
    expect(getEngine()).toBe("v3");
  });
});

// ── the bridge ────────────────────────────────────────────────────────────────

describe("result → grade slot", () => {
  it("maps the ladder onto the v1 slots, bijectively", () => {
    expect(RESULT_TO_GRADE).toEqual({ triumph: "crit", success: "good", insufficient: "ok", failure: "poor", "critical-failure": "fail" });
    expect(new Set(Object.values(RESULT_TO_GRADE)).size).toBe(RESULT_LADDER.length);
  });
});

describe("encounterStats / partyLead", () => {
  it("a skill beat reads the governing attribute and the skill (0 when untrained)", () => {
    const ysolt = HERO_BY_ID.ysolt;
    expect(encounterStats(ysolt.v3, "force")).toEqual({ attr: ysolt.v3.attrs.strength, skill: ysolt.v3.skills.force });
    expect(encounterStats(ysolt.v3, "nature")).toEqual({ attr: ysolt.v3.attrs.mind, skill: 0 });
  });
  it("combat is the best of Str/Dex/Mind plus the Combat value, and never indexes the skill table", () => {
    const pell = HERO_BY_ID.pell; // dex 8 is his best
    expect(encounterStats(pell.v3, "combat")).toEqual({ attr: 8, skill: pell.v3.combat });
    expect((SKILL_IDS as readonly string[]).includes("combat")).toBe(false);
  });
  it("the lead is the member with the highest attr+skill (ties to the earlier member)", () => {
    expect(partyLead("iron-vigil", "combat").heroId).toBe("ysolt");
    expect(partyLead("iron-vigil", "reasoning").heroId).toBe("wren");
    expect(partyLead("lone-mira", "force").heroId).toBe("mira");
  });
});

describe("partyCapability: carry and size bonus sit OUTSIDE the engine clamp", () => {
  const def = { skill: "combat", type: "combat" } as const;
  it("carry adds point for point and the total floors at 0", () => {
    const base = partyCapability("iron-vigil", def, 0);
    expect(partyCapability("iron-vigil", def, 3)).toBe(base + 3);
    expect(partyCapability("iron-vigil", def, -2)).toBe(base - 2);
    expect(partyCapability("lone-mira", def, -100)).toBe(0);
  });
  it("the size bonus is (members − 1) flat points on top of the lead's percent-modified capability", () => {
    const lead = partyLead("iron-vigil", "combat");
    const pct = partyTraitMod("iron-vigil", "combat").delta * TRAIT_PCT_PER_DELTA;
    expect(partyCapability("iron-vigil", def, 0)).toBe(capabilityFor(lead.attr, lead.skill, pct) + 2 * SIZE_BONUS_PER_EXTRA);
    const solo = partyLead("lone-mira", "mobility");
    expect(partyCapability("lone-mira", { skill: "mobility", type: "travel" }, 0)).toBe(capabilityFor(solo.attr, solo.skill, 0));
  });
  it("carry is not clamped by the engine's attribute/skill caps", () => {
    // Ysolt's combat (attr 8 + combat 13) + carry stays linear well past SKILL_MAX + ATTR_MAX.
    expect(partyCapability("iron-vigil", def, 40) - partyCapability("iron-vigil", def, 0)).toBe(40);
  });
});

describe("beatTarget: a recovery raises the TARGET, unclamped", () => {
  it("anchors", () => {
    expect(beatTarget(50)).toBe(21);
    expect(beatTarget(50, 1.3)).toBe(27);
    expect(beatTarget(100)).toBe(targetFor(100));
    expect(beatTarget(100, 1.3)).toBe(47); // past the 36 scale top: the penalty still bites
    expect(beatTarget(0, 1.3)).toBe(8);
  });
});

describe("meterScoreFor: lands inside the mapped grade's existing zone", () => {
  const grades = (r: ResultId): Grade => RESULT_TO_GRADE[r];
  it("every score against every target stays in zone and is monotone in score", () => {
    for (let target = 6; target <= 47; target++) {
      let last = -1;
      for (let score = 0; score <= 70; score++) {
        const result = RESULT_LADDER.find((r) => score * 100 >= target * r.bandLo && (r.bandHi === Infinity || score * 100 < target * r.bandHi))!.id;
        const m = meterScoreFor(score, target, result);
        const [zLo, zHi] = GRADE_ZONES[grades(result)];
        expect(m).toBeGreaterThanOrEqual(zLo);
        expect(m).toBeLessThanOrEqual(grades(result) === "crit" ? 100 : zHi - 1);
        expect(m).toBeGreaterThanOrEqual(last); // monotone ACROSS zone boundaries
        last = m;
      }
    }
  });
  it("saturates at 100 for a huge triumph and floors at 0 for score 0", () => {
    expect(meterScoreFor(99, 10, "triumph")).toBe(100);
    expect(meterScoreFor(0, 20, "critical-failure")).toBe(0);
  });
});

describe("Insufficient narration (Codex P2): the prose matches the result", () => {
  const all = Object.values(QUEST_BY_ID).flatMap(questBeats);
  it("every beat has its own Insufficient line, distinct from all five v1 lines", () => {
    for (const b of all) {
      expect(b.insufficient.length, b.id).toBeGreaterThan(10);
      expect(Object.values(b.narration), b.id).not.toContain(b.insufficient);
    }
  });
  it("a v3 beat at the ok slot reads the Insufficient line; other slots keep their v1 line", () => {
    let ok = 0;
    let other = 0;
    for (let seed = 1; seed <= 400 && (ok < 5 || other < 5); seed++) {
      const log = resolveQuest({ quest: RUINS, partyId: "free-blades", cutPct: 10, durationDays: 1, seed, engine: "v3" });
      for (const b of log.beats) {
        const def = questBeats(RUINS).find((d) => b.id === d.id || b.id === `${d.id}-recovery` || b.id === `${d.id}-bonus`)!;
        if (b.grade === "ok") {
          expect(b.text).toBe(def.insufficient);
          ok++;
        } else {
          expect(b.text).toBe(def.narration[b.grade]);
          other++;
        }
      }
    }
    expect(ok).toBeGreaterThan(0);
    expect(other).toBeGreaterThan(0);
  });
  it("v1 still reads its ok line (unchanged), matched to the exact beat", () => {
    let seen = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const log = resolveQuest({ quest: RUINS, partyId: "free-blades", cutPct: 10, durationDays: 1, seed, engine: "v1" });
      for (const b of log.beats.filter((x) => x.grade === "ok")) {
        const def = questBeats(RUINS).find((d) => b.id === d.id || b.id === `${d.id}-recovery` || b.id === `${d.id}-bonus`)!;
        expect(b.text, b.id).toBe(def.narration.ok);
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
  it("a v3 bonus beat at Insufficient earns no bonus-purse sweetener; Success still does; v1 keeps its +8% for ok", () => {
    // In the shipped data no bonus beat lands Insufficient (they are Success or Triumph), so use a
    // harder synthetic tip beat (diff3 45, v1 difficulty 14) that yields every result for the Free Blades.
    const hard = { ...ROAD_JOB, bonusBeat: { ...ROAD_JOB.bonusBeat!, diff3: 45, difficulty: 14 } };
    const seen = { v3ok: false, v3good: false, v1ok: false };
    for (let seed = 1; seed <= 1500; seed++) {
      const v3 = resolveQuest({ quest: hard, partyId: "free-blades", cutPct: 10, durationDays: 1, seed, engine: "v3" });
      const b3 = v3.beats.find((b) => b.branch === "bonus");
      if (b3 && v3.outcome === "success") {
        if (b3.grade === "ok") {
          expect(v3.reward).toBe(ROAD_JOB.reward);
          seen.v3ok = true;
        }
        if (b3.grade === "good") {
          expect(v3.reward).toBeGreaterThan(ROAD_JOB.reward);
          seen.v3good = true;
        }
      }
      const v1 = resolveQuest({ quest: hard, partyId: "free-blades", cutPct: 10, durationDays: 1, seed, engine: "v1" });
      const b1 = v1.beats.find((b) => b.branch === "bonus");
      if (b1?.grade === "ok" && v1.outcome === "success") {
        expect(v1.reward).toBe(Math.round(ROAD_JOB.reward * 1.08));
        seen.v1ok = true;
      }
    }
    expect(seen).toEqual({ v3ok: true, v3good: true, v1ok: true });
  });
});

describe("resolveBeatV3", () => {
  it("consumes exactly two draws, derives roll from the dice, and keeps the slot/check/zone consistent", () => {
    let draws = 0;
    const seq = [0, 0.999];
    const rng = { next: () => seq[draws++] };
    const b = resolveBeatV3(ROAD_JOB.beats[1], "iron-vigil", rng, 0, 1);
    expect(draws).toBe(2);
    expect(b.check!.dice).toEqual([1, 6]);
    expect(b.roll).toBeCloseTo(0.5, 12); // (1+6−2)/10
    expect(b.grade).toBe(RESULT_TO_GRADE[b.check!.result]);
    const [zLo, zHi] = GRADE_ZONES[b.grade];
    expect(b.score).toBeGreaterThanOrEqual(zLo);
    expect(b.score).toBeLessThanOrEqual(b.grade === "crit" ? 100 : zHi - 1);
    expect(b.check!.score).toBe(b.check!.capability + 7);
  });
  it("beatDistribution sums to 1", () => {
    const d = beatDistribution("free-blades", RUINS.beats[2]);
    expect(Object.values(d).reduce((a, c) => a + c, 0)).toBeCloseTo(1, 12);
  });
});

// ── resolveQuest under each engine ────────────────────────────────────────────

describe("resolveQuest engines", () => {
  const input = { quest: RUINS, partyId: "iron-vigil", cutPct: 10, durationDays: 2, seed: 7 };
  it("v1 (default) is identical to an explicit v1 and carries no check", () => {
    const a = resolveQuest(input);
    expect(resolveQuest({ ...input, engine: "v1" })).toEqual(a);
    expect(a.beats.every((b) => b.check === undefined)).toBe(true);
  });
  it("v3 is deterministic per seed, every beat carries its check, and it JSON round-trips", () => {
    const a = resolveQuest({ ...input, engine: "v3" });
    expect(resolveQuest({ ...input, engine: "v3" })).toEqual(a);
    expect(a.beats.every((b) => b.check !== undefined)).toBe(true);
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
    expect(resolveQuest({ ...input, engine: "v3", seed: 8 })).not.toEqual(a);
  });
  it("v3 draws its own stream: changing the engine never perturbs the other", () => {
    const v1a = resolveQuest(input);
    resolveQuest({ ...input, engine: "v3" });
    expect(resolveQuest(input)).toEqual(v1a);
  });
  it("the carry/recovery logic holds on v3 (a recovery only follows a failed critical beat)", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const log = resolveQuest({ quest: RUINS, partyId: "free-blades", cutPct: 10, durationDays: 1, seed, engine: "v3" });
      const rec = log.beats.findIndex((b) => b.branch === "recovery");
      if (rec >= 0) {
        expect(log.beats[rec - 1].grade).toBe("fail");
        expect(log.beats[rec].check!.target).toBe(beatTarget(RUINS.beats[2].diff3, 1.3));
      }
    }
  });
});

// ── the data ──────────────────────────────────────────────────────────────────

describe("hero v3 stats", () => {
  it("every stat respects the content caps and names real skills", () => {
    for (const h of HERO_DATA) {
      for (const v of Object.values(h.v3.attrs)) {
        expect(v, h.id).toBeGreaterThanOrEqual(0);
        expect(v, h.id).toBeLessThanOrEqual(ATTR_MAX);
      }
      for (const [k, v] of Object.entries(h.v3.skills)) {
        expect(SKILL_IDS as readonly string[], `${h.id}.${k}`).toContain(k);
        expect(v!, `${h.id}.${k}`).toBeLessThanOrEqual(SKILL_MAX);
      }
      expect(h.v3.combat, h.id).toBeLessThanOrEqual(SKILL_MAX);
    }
  });
  it("Mira, the fresh recruit, follows the standardized birth rule exactly", () => {
    const m = HERO_BY_ID.mira.v3;
    const attrs = Object.values(m.attrs);
    expect(attrs.reduce((a, b) => a + b, 0)).toBe(BIRTH_TOTAL);
    for (const v of attrs) {
      expect(v).toBeGreaterThanOrEqual(BIRTH_MIN);
      expect(v).toBeLessThanOrEqual(BIRTH_MAX);
    }
    const kit = Object.values(m.skills);
    expect(kit.filter((v) => v === KIT_PRIMARY_LEVEL)).toHaveLength(1);
    expect(kit.filter((v) => v === KIT_SECONDARY_LEVEL)).toHaveLength(KIT_SECONDARY_COUNT);
    expect(kit).toHaveLength(1 + KIT_SECONDARY_COUNT);
  });
});

describe("beat v3 data", () => {
  const all = Object.values(QUEST_BY_ID).flatMap(questBeats);
  it("every beat names a real skill (or the combat rule) and a 0–100 integer difficulty", () => {
    expect(all).toHaveLength(9);
    for (const b of all) {
      expect(b.skill === "combat" || (SKILL_IDS as readonly string[]).includes(b.skill), b.id).toBe(true);
      expect(Number.isInteger(b.diff3), b.id).toBe(true);
      expect(b.diff3, b.id).toBeGreaterThanOrEqual(0);
      expect(b.diff3, b.id).toBeLessThanOrEqual(100);
    }
  });
  it("the skull dots never lie: within a beat type, v3 difficulty never contradicts v1 difficulty order", () => {
    for (const a of all) {
      for (const b of all) {
        if (a.type === b.type && a.difficulty < b.difficulty) expect(a.diff3, `${a.id} vs ${b.id}`).toBeLessThanOrEqual(b.diff3);
      }
    }
  });
});

// ── the calibration gate (this slice only) ────────────────────────────────────

describe("v3 plays like v1 (the gate, docs/resolution-wire.md §A)", () => {
  const rows = calibrationRows();
  it("every eligible quest×party is within tolerance on success, bonus and strong beats", () => {
    for (const r of rows) {
      const tag = `${r.quest.id}/${r.partyId}`;
      expect(Math.abs(r.v3.success - r.v1.success), `${tag} success`).toBeLessThanOrEqual(GATE.success);
      expect(Math.abs(r.v3.bonus - r.v1.bonus), `${tag} bonus`).toBeLessThanOrEqual(GATE.bonus);
      expect(Math.abs(r.v3.strong - r.v1.strong), `${tag} strong`).toBeLessThanOrEqual(GATE.strong);
    }
  });
  it("the Iron Vigil still out-delivers the Free Blades on the Ruins, under both engines", () => {
    const get = (p: string) => rows.find((r) => r.quest.id === "ruins" && r.partyId === p)!;
    expect(get("iron-vigil").v1.success).toBeGreaterThan(get("free-blades").v1.success);
    expect(get("iron-vigil").v3.success).toBeGreaterThan(get("free-blades").v3.success);
  });
  it("structural gates are unchanged: a lone recruit cannot bid the Road or the Ruins", () => {
    expect(rows.some((r) => r.partyId === "lone-mira" && (r.quest.id === "road" || r.quest.id === "ruins"))).toBe(false);
    expect(QUESTS.length).toBe(4);
  });
});

// ── the generated doc, and module boundaries ──────────────────────────────────

describe("docs/resolution-wire.md is generated from this code", () => {
  it("committed file matches renderWire() byte for byte (run `npm run sim:wire`)", () => {
    const path = fileURLToPath(new URL("../../../../../docs/resolution-wire.md", import.meta.url));
    expect(readFileSync(path, "utf8")).toBe(renderWire());
  });
  it("is deterministic and free of dates", () => {
    const a = renderWire();
    expect(a).toBe(renderWire());
    expect(a).not.toMatch(/20\d\d-\d\d-\d\d/);
  });
});

describe("wire/ boundaries", () => {
  it("wire/ never reaches into ui/ or the combat engine (only battle/rng)", () => {
    const dir = fileURLToPath(new URL(".", import.meta.url));
    const files = readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    const specRe = /from\s+['"](\.\.\/[^'"]*)['"]/g;
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(new URL(f, import.meta.url), "utf8");
      for (const m of src.matchAll(specRe)) {
        if (m[1].includes("/ui/") || (m[1].includes("battle") && m[1] !== "../../battle/rng")) offenders.push(`${f} → ${m[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
