// The resolution simulation — renders docs/resolution-sim.md (phone-readable
// tables Stefan judges the tuning by). PURE: no Date, no Math.random, no locale;
// only mulberry32 with fixed seeds, so re-rendering yields a byte-identical file
// (resolve.test.ts enforces that the committed doc matches this code).

import { mulberry32 } from "../../battle/rng";
import { RESULT_LADDER, type ResultId } from "../content/ladder";
import { SKILL_ATTR, type SkillId } from "../content/skills";
import type { AttrId } from "../content/attributes";
import {
  MOD_CAP,
  METER_PCT_MAX,
  METER_ZONES,
  TARGET_BASE,
  TARGET_PER_DIFFICULTY,
  capabilityFor,
  checkDistribution,
  meterFor,
  pSuccess,
  resolveCheck,
  targetFor,
  type Distribution,
} from "./check";
import { applyUse, attrXpToNext, skillXpToNext, type HeroProgress } from "./growth";
import { birthHero } from "./birth";

interface Archetype {
  label: string;
  attr: number;
  skill: number;
}

export const ARCHETYPES: readonly Archetype[] = [
  { label: "Fresh (Attr 3 + Skill 1)", attr: 3, skill: 1 },
  { label: "Journeyman (Attr 5 + Skill 8)", attr: 5, skill: 8 },
  { label: "Veteran (Attr 8 + Skill 15)", attr: 8, skill: 15 },
  { label: "Max (Attr 10 + Skill 20)", attr: 10, skill: 20 },
];

const DIFFICULTIES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const BAND_SHORT: Record<ResultId, string> = {
  "critical-failure": "CritFail",
  failure: "Fail",
  insufficient: "Insuf",
  success: "Success",
  triumph: "Triumph",
};

/** Whole-number percent, half-up. */
function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

function row(cells: (string | number)[]): string {
  return `| ${cells.join(" | ")} |`;
}

function table(header: string[], rows: (string | number)[][]): string {
  const sep = header.map(() => "---");
  return [row(header), row(sep), ...rows.map(row)].join("\n");
}

function distRow(label: string | number, d: Distribution): (string | number)[] {
  return [label, ...RESULT_LADDER.map((r) => pct(d[r.id]))];
}

/** The visible difficulty whose target is nearest `target` (clamped 0–100). */
export function difficultyForTarget(target: number): number {
  return Math.min(100, Math.max(0, Math.round((target - TARGET_BASE) / TARGET_PER_DIFFICULTY)));
}

export type Policy = "fair" | "stretch";
/** Difficulty policies, as a dice offset over capability (the 2d6 mean is 7):
 * fair: target = capability + 7 → P(≥Success) ≈ 58% before any modifier;
 * stretch: target = capability + 9 → ≈ 28%. Clamped to the 0–100 scale. */
export const POLICY_OFFSET: Record<Policy, number> = { fair: 7, stretch: 9 };
export function policyDifficulty(policy: Policy, capability: number): number {
  return difficultyForTarget(capability + POLICY_OFFSET[policy]);
}

/** Lowest difficulty (0–100) at which P(≥Success) drops to ≤ p, or 100. */
function difficultyAtSuccess(a: Archetype, modPct: number, p: number): number {
  for (let d = 0; d <= 100; d++) {
    if (pSuccess(checkDistribution({ attr: a.attr, skill: a.skill, modPct, difficulty: d })) <= p) return d;
  }
  return 100;
}

/** Highest difficulty with P(Triumph) ≥ 5%, or "none". */
function triumphReach(a: Archetype, modPct: number): string {
  for (let d = 100; d >= 0; d--) {
    if (checkDistribution({ attr: a.attr, skill: a.skill, modPct, difficulty: d }).triumph >= 0.05) return String(d);
  }
  return "none";
}

// ── Career simulations ─────────────────────────────────────────────────────────

interface CareerPoint {
  uses: number;
  skill: number;
  attr: number;
  pSuccess: number;
}

interface Career {
  points: CareerPoint[];
  usesToSkill: Record<number, number | null>;
  usesToAttr: Record<number, number | null>;
}

const CHECKPOINTS = [25, 50, 100, 200, 400, 800, 1500];
const SKILL_MILESTONES = [10, 15, 20];
const ATTR_MILESTONES = [5, 7, 10];

/** One hero, one skill, `uses` encounters at the policy's difficulty (re-derived
 * from current capability before every check, so difficulty tracks growth). */
function runCareer(seed: number, skill: SkillId, policy: Policy, uses: number): Career {
  const rng = mulberry32(seed);
  let hero = birthHero(rng, skill);
  const attr = SKILL_ATTR[skill];
  const points: CareerPoint[] = [];
  const usesToSkill: Record<number, number | null> = Object.fromEntries(SKILL_MILESTONES.map((m) => [m, null]));
  const usesToAttr: Record<number, number | null> = Object.fromEntries(ATTR_MILESTONES.map((m) => [m, null]));
  const snap = (u: number) => {
    const cap = capabilityFor(hero.attrs[attr], hero.skills[skill]);
    const d = policyDifficulty(policy, cap);
    points.push({ uses: u, skill: hero.skills[skill], attr: hero.attrs[attr], pSuccess: pSuccess(checkDistribution({ attr: hero.attrs[attr], skill: hero.skills[skill], difficulty: d })) });
  };
  for (let u = 1; u <= uses; u++) {
    const cap = capabilityFor(hero.attrs[attr], hero.skills[skill]);
    const d = policyDifficulty(policy, cap);
    const res = resolveCheck({ attr: hero.attrs[attr], skill: hero.skills[skill], difficulty: d }, rng);
    hero = applyUse(hero, skill, res.result).progress;
    for (const m of SKILL_MILESTONES) if (usesToSkill[m] === null && hero.skills[skill] >= m) usesToSkill[m] = u;
    for (const m of ATTR_MILESTONES) if (usesToAttr[m] === null && hero.attrs[attr] >= m) usesToAttr[m] = u;
    if (CHECKPOINTS.includes(u)) snap(u);
  }
  return { points, usesToSkill, usesToAttr };
}

/** True median (mean of the middle pair on even lengths). */
function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function medianOrNever(xs: (number | null)[]): string {
  if (xs.some((x) => x === null)) return "never (within 1500)";
  return String(median(xs as number[]));
}

const CAREER_SEEDS = [11, 22, 33];

function careerSection(policy: Policy): string {
  const runs = CAREER_SEEDS.map((s) => runCareer(s, "reasoning", policy, 1500));
  const rows = CHECKPOINTS.map((u, i) => {
    const pts = runs.map((r) => r.points[i]);
    return [u, median(pts.map((p) => p.skill)), median(pts.map((p) => p.attr)), pct(median(pts.map((p) => p.pSuccess)))];
  });
  const milestones = [
    ...SKILL_MILESTONES.map((m) => [`Skill ${m}`, medianOrNever(runs.map((r) => r.usesToSkill[m]))]),
    ...ATTR_MILESTONES.map((m) => [`Attr ${m}`, medianOrNever(runs.map((r) => r.usesToAttr[m]))]),
  ];
  return [
    table(["Uses", "Skill", "Attr", "Success odds now"], rows),
    "",
    table(["Milestone", "Uses (median of 3 seeds)"], milestones),
  ].join("\n");
}

// ── Focused vs varied ──────────────────────────────────────────────────────────

interface Strategy {
  label: string;
  skills: SkillId[];
}

const STRATEGIES: readonly Strategy[] = [
  { label: "1 skill (Rsn)", skills: ["reasoning"] },
  { label: "2, same pillar (Rsn, Nat)", skills: ["reasoning", "nature"] },
  { label: "3, across pillars (Frc, Rsn, Inf)", skills: ["force", "reasoning", "influence"] },
];

const VARIED_USES = 600;
const VARIED_SEEDS = [44, 55, 66];
const SHORT: Record<string, string> = {
  reasoning: "Rsn",
  nature: "Nat",
  force: "Frc",
  influence: "Inf",
  mind: "Mind",
  strength: "Str",
  charisma: "Cha",
};

function runStrategy(seed: number, s: Strategy): { hero: HeroProgress; attrUps: number } {
  const rng = mulberry32(seed);
  let hero = birthHero(rng, s.skills[0]);
  let attrUps = 0;
  for (let u = 0; u < VARIED_USES; u++) {
    const skill = s.skills[u % s.skills.length]; // round-robin
    const attr = SKILL_ATTR[skill];
    const cap = capabilityFor(hero.attrs[attr], hero.skills[skill]);
    const d = policyDifficulty("fair", cap);
    const res = resolveCheck({ attr: hero.attrs[attr], skill: hero.skills[skill], difficulty: d }, rng);
    const out = applyUse(hero, skill, res.result);
    hero = out.progress;
    attrUps += out.attrUp;
  }
  return { hero, attrUps };
}

function variedSection(): string {
  const rows = STRATEGIES.map((s) => {
    const runs = VARIED_SEEDS.map((seed) => runStrategy(seed, s));
    const attrs = [...new Set(s.skills.map((k) => SKILL_ATTR[k]))] as AttrId[];
    const skillCells = s.skills.map((k) => `${SHORT[k]} ${median(runs.map((r) => r.hero.skills[k]))}`).join(" · ");
    const attrCells = attrs.map((a) => `${SHORT[a]} ${median(runs.map((r) => r.hero.attrs[a]))}`).join(" · ");
    const ups = median(runs.map((r) => r.attrUps));
    return [s.label, skillCells, `${attrCells} (+${ups} ups)`];
  });
  return table(["Strategy", "Skills", "Attrs touched"], rows);
}

// ── Render ─────────────────────────────────────────────────────────────────────

export function renderSim(): string {
  const out: string[] = [];
  const push = (...lines: string[]) => out.push(...lines);

  push(
    "# Resolution simulation",
    "",
    "GENERATED by `npm run sim:resolution` (web/src/game/guild/resolve/sim.ts). Do not edit by hand;",
    "`resolve.test.ts` fails if this file drifts from the code. Exact probabilities (36 dice",
    "outcomes enumerated), not Monte Carlo. Careers use fixed seeds.",
    "",
    "**What this means for a player:** nothing on screen changes yet. This is the engine the next",
    "slice wires into quests. Read the tables and say whether the feel is right: is 58% at fair",
    "difficulty too swingy? Do Veterans feel too safe? Is a 600-use climb to Skill 20 too long?",
    "",
    "## How to read",
    "",
    `- **Check:** Score = round((Attr + Skill) × (1 + mod)) + 2d6. **Target** = ${TARGET_BASE} + ${TARGET_PER_DIFFICULTY} × Difficulty`,
    "  (Difficulty 0 → 6, 50 → 21, 100 → 36). Mod is clamped to ±" + Math.round(MOD_CAP * 100) + "%.",
    "- **Result** by Score as % of Target: " +
      RESULT_LADDER.map((r) => `${BAND_SHORT[r.id]} ${r.bandHi === Infinity ? `≥${r.bandLo}%` : `${r.bandLo}–${r.bandHi}%`}`).join(" · ") +
      ".",
    "- **Archetypes:** Fresh = a newborn hero's best skill; Journeyman/Veteran = mid-career; Max = both caps.",
    "- **Diff** = Difficulty (0–100). **(T21)** = Target 21, the score to reach. **Insuf** = close but not",
    "  enough (no penalty). **Success odds** = Success or Triumph. **Fair** difficulty = target is",
    "  capability + 7 (the 2d6 average), so an unmodified hero succeeds ~58% of the time.",
    "- **Unmodified ceiling:** Attr 10 + Skill 20 + 12 = 42. Triumph at the top of the scale needs",
    "  modifiers, by design (see the Reach table).",
    "",
    "## A. Result odds by difficulty (no modifiers)",
    "",
  );

  for (const a of ARCHETYPES) {
    const rows = DIFFICULTIES.map((d) => distRow(`${d} (T${targetFor(d)})`, checkDistribution({ attr: a.attr, skill: a.skill, difficulty: d })));
    const fair = policyDifficulty("fair", capabilityFor(a.attr, a.skill));
    const fd = checkDistribution({ attr: a.attr, skill: a.skill, difficulty: fair });
    push(
      `### ${a.label}`,
      "",
      table(["Diff (Target)", ...RESULT_LADDER.map((r) => BAND_SHORT[r.id])], rows),
      "",
      `Feel check: at fair difficulty ${fair} (target ${targetFor(fair)} = capability ${capabilityFor(a.attr, a.skill)} + 7) this hero gets ` +
        `Success-or-better ${pct(pSuccess(fd))}, Triumph ${pct(fd.triumph)}, CritFail ${pct(fd["critical-failure"])}` +
        (fair === 100 ? " (fair is clipped at 100, the hardest task in the game)." : "."),
      "",
    );
  }

  push(
    "## B. Hero-relative difficulty",
    "",
    "For each hero: the difficulty (D) where Success odds fall to about 70% and about 50%, and the",
    "full split there. Max hits the scale's end (D100) before dropping to 50%, so both rows match.",
    "",
  );
  const bRows: (string | number)[][] = [];
  for (const a of ARCHETYPES) {
    for (const p of [0.7, 0.5]) {
      const d = difficultyAtSuccess(a, 0, p);
      bRows.push(distRow(`${a.label.split(" (")[0]} · ${Math.round(p * 100)}% · D${d}`, checkDistribution({ attr: a.attr, skill: a.skill, difficulty: d })));
    }
  }
  push(table(["Hero · odds · D", ...RESULT_LADDER.map((r) => BAND_SHORT[r.id])], bRows), "");

  push(
    "### Reach",
    "",
    "The hardest difficulty where Triumph is still ≥ 5% likely, without and with the +30% modifier",
    "cap; and how much +30% lifts Success odds in a fair fight.",
    "",
    table(
      ["Hero", "Triumph reach", `+${Math.round(MOD_CAP * 100)}%`, `Fair-fight odds (no mod → +${Math.round(MOD_CAP * 100)}%)`],
      ARCHETYPES.map((a) => {
        const fair = policyDifficulty("fair", capabilityFor(a.attr, a.skill));
        const d0 = checkDistribution({ attr: a.attr, skill: a.skill, difficulty: fair });
        const d1 = checkDistribution({ attr: a.attr, skill: a.skill, modPct: MOD_CAP, difficulty: fair });
        return [a.label.split(" (")[0], `D${triumphReach(a, 0)}`, `D${triumphReach(a, MOD_CAP)}`, `D${fair}: ${pct(pSuccess(d0))} → ${pct(pSuccess(d1))}`];
      }),
    ),
    "",
    "### Design flags (for Stefan to rule on)",
    "",
    "- **Dead top of the scale unmodified.** An unmodified Max hero cannot Triumph above D98 and is",
    "  below 5% from D95; at D100 it sits at 72% Success / 28% Insuf / 0% Triumph. Only modifiers",
    "  (feats, traits, gear) open the top ~6 points. Intended per Stefan's target decision; confirm.",
    "- **Narrow Success band mid-scale.** At T21 (D50) Success is scores 21–25, five points wide, so a",
    "  Journeyman goes from 83% Triumph (D30) to 0% Triumph (D50) across 20 difficulty points. The",
    "  dice barely move the band; capability gates it. Intended (feats not dice), but the cliff is real.",
    "- **Attributes crawl.** Fair play: Attr 7 after ~530 uses, Attr 10 after ~1340. Stretch play",
    "  (target = capability + 9): Attr 10 never within 1500 uses and the Skill caps at 20 around use",
    "  735, after which attribute XP is the only progression left.",
    "- **Fair tracking stops at D100.** Once capability passes 29 the fair target cannot follow (36 max),",
    "  so the last career row jumps to 72%: the hero has outgrown the scale.",
    "",
  );

  push(
    "## C. Story-meter mapping (for the wire slice)",
    "",
    "Needle position 0–100 from Score as % of Target, piecewise-linear inside each band's own zone.",
    `Zone gaps are 20/20/25/15 points (rule: ≥ 5–10). Triumph saturates at ${METER_PCT_MAX}%.`,
    "",
    table(
      ["Result", "% of target", "Meter zone", "Example (target 21)"],
      RESULT_LADDER.map((r) => {
        const [zLo, zHi] = METER_ZONES[r.id];
        const sample = Math.ceil((21 * (r.bandLo + (r.bandHi === Infinity ? 130 : r.bandHi))) / 200);
        return [BAND_SHORT[r.id], r.bandHi === Infinity ? `≥${r.bandLo}%` : `${r.bandLo}–${r.bandHi}%`, `${zLo}–${zHi}`, `score ${sample} → ${meterFor(sample, 21)}`];
      }),
    ),
    "",
  );

  push(
    "## D. Career: one skill, difficulty tracks the hero",
    "",
    `Fresh hero (birth kit, Reasoning primary), 1500 uses, difficulty re-set before every check. Skill level n→n+1 costs ${skillXpToNext(1)}n XP (+1 per use, +2 on Success); Attr n→n+1 costs ${attrXpToNext(1)}n XP (+1 per Success). Medians of 3 seeds.`,
    "",
    "### Policy: fair (target = capability + 7)",
    "",
    careerSection("fair"),
    "",
    "### Policy: stretch (target = capability + 9)",
    "",
    careerSection("stretch"),
    "",
    "## E. Focused vs varied (heroes are shaped by what you send them to do)",
    "",
    "Same 600 uses at fair difficulty, round-robin across the listed skills. Medians of 3 seeds.",
    "Rsn Reasoning · Nat Nature · Frc Force · Inf Influence · Str Strength · Cha Charisma.",
    "",
    variedSection(),
    "",
    "Takeaway: focus maxes one skill; variety gives several mid-level skills. Attribute XP only",
    "comes from Successes, so the number of attribute level-ups (+ups) is about the same either way;",
    "focus stacks them on one pillar, spreading across pillars spreads them thin.",
    "",
  );

  return out.join("\n");
}
