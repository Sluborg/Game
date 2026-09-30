import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { mulberry32, constantRng } from "../../battle/rng";
import { RESULT_LADDER } from "../content/ladder";
import { ATTR_IDS, ATTR_MAX } from "../content/attributes";
import { SKILL_IDS, SKILL_MAX } from "../content/skills";
import {
  MOD_CAP,
  METER_ZONES,
  bandFor,
  capabilityFor,
  checkDistribution,
  meterFor,
  normalizeInput,
  pSuccess,
  resolveCheck,
  roll2d6,
  targetFor,
} from "./check";
import { applyUse, attrXpBetween, emptyProgress, skillXpBetween, type HeroProgress } from "./growth";
import { BIRTH_MAX, BIRTH_MIN, BIRTH_TOTAL, birthHero } from "./birth";
import { renderSim } from "./sim";

// ── targetFor ─────────────────────────────────────────────────────────────────

describe("targetFor: 6 + 0.30 × difficulty, integer, clamped", () => {
  it("pinned anchors", () => {
    expect(targetFor(0)).toBe(6);
    expect(targetFor(50)).toBe(21);
    expect(targetFor(100)).toBe(36);
    expect(targetFor(1)).toBe(6); // 6.3 → 6
    expect(targetFor(5)).toBe(8); // 7.5 → 8 (half-up)
    expect(targetFor(100.4)).toBe(36);
  });
  it("clamps and rounds the visible scale", () => {
    expect(targetFor(-40)).toBe(6);
    expect(targetFor(500)).toBe(36);
    expect(targetFor(49.6)).toBe(21);
  });
  it("rejects non-finite", () => {
    expect(() => targetFor(NaN)).toThrow();
    expect(() => targetFor(Infinity)).toThrow();
  });
});

// ── capability + modifiers ────────────────────────────────────────────────────

describe("capabilityFor: (attr + skill) × (1 + mod), clamped, integer", () => {
  it("no modifier is the plain sum", () => {
    expect(capabilityFor(10, 20)).toBe(30);
  });
  it("modPct is clamped to ±MOD_CAP", () => {
    expect(capabilityFor(10, 20, 0.3)).toBe(39);
    expect(capabilityFor(10, 20, 5)).toBe(39);
    expect(capabilityFor(10, 20, -0.3)).toBe(21);
    expect(capabilityFor(10, 20, -5)).toBe(21);
    expect(MOD_CAP).toBe(0.3);
  });
  it("attr and skill are clamped to their caps and floored at 0", () => {
    expect(capabilityFor(99, 99)).toBe(ATTR_MAX + SKILL_MAX);
    expect(capabilityFor(-3, -3)).toBe(0);
  });
  it("normalizeInput throws on NaN / Infinity anywhere", () => {
    expect(() => normalizeInput({ attr: NaN, skill: 1, difficulty: 10 })).toThrow();
    expect(() => normalizeInput({ attr: 1, skill: 1, modPct: Infinity, difficulty: 10 })).toThrow();
    expect(() => normalizeInput({ attr: 1, skill: 1, difficulty: NaN })).toThrow();
  });
});

// ── dice ──────────────────────────────────────────────────────────────────────

describe("roll2d6", () => {
  it("exactly two draws, die 1 first, each 1..6", () => {
    let calls = 0;
    const seq = [0, 0.999];
    const rng = { next: () => seq[calls++] };
    expect(roll2d6(rng)).toEqual([1, 6]);
    expect(calls).toBe(2);
  });
  it("the die is added, never multiplied: +30% on capability moves score by capability only", () => {
    const a = resolveCheck({ attr: 10, skill: 10, difficulty: 50 }, constantRng(0.5));
    const b = resolveCheck({ attr: 10, skill: 10, modPct: 0.3, difficulty: 50 }, constantRng(0.5));
    expect(a.dice).toEqual(b.dice);
    expect(b.score - a.score).toBe(b.capability - a.capability);
    expect(b.capability).toBe(26);
  });
  it("deterministic by seed; two seeds differ somewhere", () => {
    const run = (seed: number) => {
      const rng = mulberry32(seed);
      return Array.from({ length: 20 }, () => resolveCheck({ attr: 5, skill: 8, difficulty: 50 }, rng).score);
    };
    expect(run(7)).toEqual(run(7));
    expect(run(7)).not.toEqual(run(8));
  });
});

// ── bands ─────────────────────────────────────────────────────────────────────

describe("bandFor: integer math on exact edges", () => {
  it("target 10: 6/8/10/12 sit on the lower edge of each band", () => {
    expect(bandFor(5, 10)).toBe("critical-failure");
    expect(bandFor(6, 10)).toBe("failure");
    expect(bandFor(7, 10)).toBe("failure");
    expect(bandFor(8, 10)).toBe("insufficient");
    expect(bandFor(9, 10)).toBe("insufficient");
    expect(bandFor(10, 10)).toBe("success");
    expect(bandFor(11, 10)).toBe("success");
    expect(bandFor(12, 10)).toBe("triumph");
    expect(bandFor(999, 10)).toBe("triumph");
  });
  it("target 21 (difficulty 50): a float pct would be 99.999…; integer math says success at 21", () => {
    expect(bandFor(21, 21)).toBe("success");
    expect(bandFor(20, 21)).toBe("insufficient");
    expect(bandFor(25, 21)).toBe("success"); // 119.05%
    expect(bandFor(26, 21)).toBe("triumph"); // 123.8%
  });
  it("rejects non-integer or non-positive targets", () => {
    expect(() => bandFor(10.5, 10)).toThrow();
    expect(() => bandFor(10, 0)).toThrow();
  });
  it("ladder is the content ladder (not a copy)", () => {
    expect(RESULT_LADDER.map((r) => r.id)).toEqual(["critical-failure", "failure", "insufficient", "success", "triumph"]);
  });
});

describe("checkDistribution: exact over 36 outcomes", () => {
  it("sums to 1 and matches the 2d6 curve at a boundary", () => {
    const d = checkDistribution({ attr: 5, skill: 8, difficulty: 50 }); // cap 13, target 21
    const sum = Object.values(d).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 12);
    // Success needs 2d6 ≥ 8 (21−13): 15/36; Triumph needs ≥ 13: impossible.
    expect(d.success).toBeCloseTo(15 / 36, 12);
    expect(d.triumph).toBe(0);
    expect(pSuccess(d)).toBeCloseTo(15 / 36, 12);
  });
  it("the ceiling is 42: an unmodified max hero can Triumph up to difficulty 98, never at 99+", () => {
    // Triumph needs score×100 ≥ target×120; max score 42 → target ≤ 35 (42 = 120% of 35 exactly).
    expect(targetFor(98)).toBe(35);
    expect(targetFor(99)).toBe(36);
    expect(checkDistribution({ attr: 10, skill: 20, difficulty: 98 }).triumph).toBeCloseTo(1 / 36, 12);
    expect(checkDistribution({ attr: 10, skill: 20, difficulty: 99 }).triumph).toBe(0);
    // With the +30% cap (capability 39) Triumph at 100 is 12/36 (2d6 ≥ 5 → 44 ≥ 43.2).
    expect(checkDistribution({ attr: 10, skill: 20, modPct: 0.3, difficulty: 100 }).triumph).toBeCloseTo(30 / 36, 12);
  });
});

// ── meter ─────────────────────────────────────────────────────────────────────

describe("meterFor: needle lands in the zone the result names", () => {
  it("zone gaps are all ≥ 10", () => {
    const edges = Object.values(METER_ZONES).map(([lo]) => lo).sort((a, b) => a - b);
    for (let i = 1; i < edges.length; i++) expect(edges[i] - edges[i - 1]).toBeGreaterThanOrEqual(10);
  });
  it("every score against every target stays inside its band's zone, monotone in score", () => {
    for (let target = 6; target <= 36; target++) {
      let last = -1;
      for (let score = 0; score <= 60; score++) {
        const m = meterFor(score, target);
        const [zLo, zHi] = METER_ZONES[bandFor(score, target)];
        expect(m).toBeGreaterThanOrEqual(zLo);
        expect(m).toBeLessThanOrEqual(bandFor(score, target) === "triumph" ? 100 : zHi - 1);
        expect(m).toBeGreaterThanOrEqual(last);
        last = m;
      }
    }
  });
  it("saturates at 100", () => {
    expect(meterFor(60, 10)).toBe(100);
  });
});

// ── growth ────────────────────────────────────────────────────────────────────

function heroAt(skill: number, attr: number): HeroProgress {
  const p = emptyProgress();
  p.skills.reasoning = skill;
  p.attrs.mind = attr;
  return p;
}

describe("applyUse: grow-from-use", () => {
  it("skill: 1 XP per use, 2 on success; level 1→2 costs 5", () => {
    let p = heroAt(1, 3);
    for (let i = 0; i < 4; i++) p = applyUse(p, "reasoning", "failure").progress;
    expect(p.skills.reasoning).toBe(1);
    expect(p.xp.skills.reasoning).toBe(4);
    const out = applyUse(p, "reasoning", "success"); // +2 → 6 ≥ 5 → level 2, bank 1
    expect(out.skillUp).toBe(1);
    expect(out.progress.skills.reasoning).toBe(2);
    expect(out.progress.xp.skills.reasoning).toBe(1);
    expect(out.attrUp).toBe(0);
    expect(out.progress.xp.attrs.mind).toBe(1);
  });
  it("attr: 1 XP per success only; level 3→4 costs 60", () => {
    let p = heroAt(20, 3); // skill capped so only the attr moves
    for (let i = 0; i < 59; i++) p = applyUse(p, "reasoning", "triumph").progress;
    expect(p.attrs.mind).toBe(3);
    const out = applyUse(p, "reasoning", "success");
    expect(out.attrUp).toBe(1);
    expect(out.progress.attrs.mind).toBe(4);
    expect(out.progress.xp.attrs.mind).toBe(0);
  });
  it("caps are independent: a capped skill still feeds its attribute; a capped attr discards XP", () => {
    const a = applyUse(heroAt(20, 5), "reasoning", "success");
    expect(a.progress.skills.reasoning).toBe(20);
    expect(a.progress.xp.skills.reasoning).toBe(0);
    expect(a.progress.xp.attrs.mind).toBe(1);
    const b = applyUse(heroAt(20, 10), "reasoning", "success");
    expect(b.progress.attrs.mind).toBe(10);
    expect(b.progress.xp.attrs.mind).toBe(0);
    expect(b.attrUp).toBe(0);
  });
  it("overshoot crosses several levels with remainder carry", () => {
    const p = heroAt(1, 3);
    p.xp.skills.reasoning = 5 + 10 + 15 + 3; // banked (not reachable in play; exercises the loop)
    const out = applyUse(p, "reasoning", "failure"); // +1 → 34: 1→2 (5), 2→3 (10), 3→4 (15), 4 left
    expect(out.skillUp).toBe(3);
    expect(out.progress.skills.reasoning).toBe(4);
    expect(out.progress.xp.skills.reasoning).toBe(4);
  });
  it("failure on a non-success result gives no attr XP; unknown skill throws; input untouched", () => {
    const p = heroAt(1, 3);
    const out = applyUse(p, "reasoning", "critical-failure");
    expect(out.progress.xp.attrs.mind).toBe(0);
    expect(p.xp.skills.reasoning).toBe(0); // pure
    expect(() => applyUse(p, "combat" as never, "success")).toThrow(/unknown skill/);
  });
  it("cost tables: skill 1→20 = 950 XP, attr 2→10 = 880 XP; an untrained skill is not free", () => {
    expect(skillXpBetween(1, 20)).toBe(950);
    expect(attrXpBetween(2, 10)).toBe(880);
    expect(skillXpBetween(0, 1)).toBe(5);
    const p = heroAt(0, 3);
    expect(applyUse(p, "reasoning", "failure").progress.skills.reasoning).toBe(0);
    expect(applyUse(p, "reasoning", "failure").progress.xp.skills.reasoning).toBe(1);
  });
  it("modPct is quantised to whole percent so x.5 products round predictably", () => {
    expect(capabilityFor(5, 0, 0.1)).toBe(6); // 5 × 1.1 = 5.5 → 6, never 5.4999…
    expect(capabilityFor(5, 0, 0.104)).toBe(6);
  });
});

// ── birth ─────────────────────────────────────────────────────────────────────

describe("birthHero: standardized birth", () => {
  it("over 500 seeds: total 14, each 2–4, kit is one 2 + three 1s, rest 0", () => {
    for (let seed = 1; seed <= 500; seed++) {
      const h = birthHero(mulberry32(seed), "force");
      const total = ATTR_IDS.reduce((s, a) => s + h.attrs[a], 0);
      expect(total).toBe(BIRTH_TOTAL);
      for (const a of ATTR_IDS) {
        expect(h.attrs[a]).toBeGreaterThanOrEqual(BIRTH_MIN);
        expect(h.attrs[a]).toBeLessThanOrEqual(BIRTH_MAX);
      }
      expect(h.skills.force).toBe(2);
      const ones = SKILL_IDS.filter((s) => h.skills[s] === 1);
      const zeros = SKILL_IDS.filter((s) => h.skills[s] === 0);
      expect(ones.length).toBe(3);
      expect(zeros.length).toBe(5);
      expect(ones).not.toContain("force");
    }
  });
  it("every attribute can be the 4 (no positional bias) and unknown primary throws", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const h = birthHero(mulberry32(seed), "nature");
      for (const a of ATTR_IDS) if (h.attrs[a] === 4) seen.add(a);
    }
    expect([...seen].sort()).toEqual([...ATTR_IDS].sort());
    expect(() => birthHero(mulberry32(1), "combat" as never)).toThrow();
  });
});

// ── the generated doc and module boundaries ───────────────────────────────────

describe("docs/resolution-sim.md is generated from this code", () => {
  it("committed file matches renderSim() byte for byte (run `npm run sim:resolution`)", () => {
    const path = fileURLToPath(new URL("../../../../../docs/resolution-sim.md", import.meta.url));
    expect(readFileSync(path, "utf8")).toBe(renderSim());
  });
  it("renderSim is deterministic and free of dates", () => {
    const a = renderSim();
    expect(a).toBe(renderSim());
    expect(a).not.toMatch(/20\d\d-\d\d-\d\d/);
  });
});

describe("resolve/ depends only on content/ and battle/rng", () => {
  it("no other ../ import, and nothing in the live sim imports resolve/", () => {
    const dir = fileURLToPath(new URL(".", import.meta.url));
    const files = readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    const specRe = /from\s+['"](\.\.\/[^'"]*)['"]/g;
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(new URL(f, import.meta.url), "utf8");
      for (const m of src.matchAll(specRe)) {
        if (!m[1].startsWith("../content/") && m[1] !== "../../battle/rng") offenders.push(`${f} → ${m[1]}`);
      }
    }
    expect(offenders).toEqual([]);

    const guildDir = fileURLToPath(new URL("..", import.meta.url));
    const live = readdirSync(guildDir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    const importsResolve = live.filter((f) => /from\s+['"]\.\/resolve(\/|['"])/.test(readFileSync(new URL(`../${f}`, import.meta.url), "utf8")));
    expect(importsResolve).toEqual([]);
  });
});
