// Schema gate for the content pipeline (Skills v3). Fails CI on a bad content
// drop (.github/workflows/test.yml runs tsc -b + npm run test on PRs to dev).
//
// Duties: (1) the real authored CONTENT validates clean; (2) a crafted BAD fixture
// per rule turns the validator red (so no rule passes vacuously); (3) the v3
// vocabulary matches docs/GLOSSARY.md exactly (5 attributes, 9 skills, 3/3/3
// pillars, the fixed result ladder), and the content namespace imports nothing
// from the v1 sim.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import { ATTRIBUTES, ATTR_IDS } from "./attributes";
import { SKILLS, SKILL_IDS, SKILL_ATTR, COMBAT_RESERVED } from "./skills";
import { PILLARS, PILLAR_IDS, SKILL_PILLAR, ATTR_PILLAR } from "./pillars";
import { RESULT_LADDER, RESULT_VALUES } from "./ladder";
import { validateContent, formatIssues, type Issue } from "./schema";
import { CONTENT } from "./content";

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function expectIssueAt(issues: Issue[], pathPart: string): void {
  const hit = issues.some((x) => x.path.includes(pathPart));
  expect(hit, `expected an issue at "${pathPart}" but got:\n${formatIssues(issues)}`).toBe(true);
}

describe("real authored content", () => {
  it("validates clean (no issues)", () => {
    const issues = validateContent(CONTENT);
    expect(formatIssues(issues)).toBe("content OK");
    expect(issues).toEqual([]);
  });

  it("every quest challenge reference resolves to a defined challenge", () => {
    const ids = new Set(CONTENT.challenges.map((c) => c.id));
    for (const q of CONTENT.quests) {
      for (const cid of q.challenges) expect(ids.has(cid), `${q.id} → ${cid}`).toBe(true);
    }
  });

  it("every encounter names a real skill", () => {
    for (const c of CONTENT.challenges) {
      expect(c.encounters.length).toBeGreaterThanOrEqual(1);
      for (const e of c.encounters) expect(SKILL_IDS).toContain(e.skill);
    }
  });
});

describe("vocabulary integrity (matches docs/GLOSSARY.md)", () => {
  it("has exactly the five attributes", () => {
    expect(ATTRIBUTES.map((a) => a.id)).toEqual(["strength", "dexterity", "constitution", "mind", "charisma"]);
  });

  it("has exactly the nine skills with the documented attribute mapping", () => {
    expect(SKILLS).toHaveLength(9);
    const expected: Record<string, string> = {
      force: "strength",
      mobility: "dexterity",
      fortitude: "constitution",
      reasoning: "mind",
      nature: "mind",
      willpower: "mind",
      influence: "charisma",
      inquiry: "charisma",
      integrity: "charisma",
    };
    expect(Object.fromEntries(SKILLS.map((s) => [s.id, s.attr]))).toEqual(expected);
    for (const s of SKILLS) expect(ATTR_IDS).toContain(SKILL_ATTR[s.id]);
  });

  it("does NOT list Combat as a skill (it is a temporary special rule)", () => {
    expect(SKILL_IDS).not.toContain(COMBAT_RESERVED);
  });

  it("has three pillars with three skills each (3/3/3)", () => {
    expect(PILLARS.map((p) => p.id)).toEqual(["physical", "mental", "social"]);
    const counts: Record<string, number> = { physical: 0, mental: 0, social: 0 };
    for (const s of SKILLS) {
      const pillar = SKILL_PILLAR[s.id];
      expect(PILLAR_IDS).toContain(pillar);
      counts[pillar]++;
    }
    expect(counts).toEqual({ physical: 3, mental: 3, social: 3 });
    // every attribute maps to a pillar
    for (const a of ATTR_IDS) expect(PILLAR_IDS).toContain(ATTR_PILLAR[a]);
  });

  it("has the five-band ladder with values −3/−1/0/+1/+3", () => {
    expect(RESULT_LADDER.map((r) => r.name)).toEqual(["Critical Failure", "Failure", "Insufficient", "Success", "Triumph"]);
    expect(RESULT_VALUES).toEqual([-3, -1, 0, 1, 3]);
  });
});

// ---- one bad fixture per rule -----------------------------------------------

describe("validator rejects bad drops", () => {
  const base = () => clone(CONTENT);

  it("baseline clone is clean (guards the fixtures below)", () => {
    expect(validateContent(base())).toEqual([]);
  });

  it("duplicate id across kinds", () => {
    const c = base();
    c.quests[0].id = c.challenges[0].id;
    expectIssueAt(validateContent(c), "quests[0].id");
  });

  it("id with illegal characters", () => {
    const c = base();
    c.challenges[0].id = "Research Library";
    expectIssueAt(validateContent(c), "challenges[0].id");
  });

  it("non-NFC / unicode look-alike id", () => {
    const c = base();
    c.challenges[0].id = "réséarch";
    expectIssueAt(validateContent(c), "challenges[0].id");
  });

  it("empty (whitespace) required string field", () => {
    const c = base();
    c.challenges[0].activity = "   ";
    expectIssueAt(validateContent(c), "challenges[0].activity");
  });

  it("challenge with an empty encounters array", () => {
    const c = base();
    c.challenges[0].encounters = [];
    expectIssueAt(validateContent(c), "challenges[0].encounters");
  });

  it("encounters not an array", () => {
    const c = base();
    (c.challenges[0] as { encounters: unknown }).encounters = "reasoning";
    expectIssueAt(validateContent(c), "challenges[0].encounters");
  });

  it("encounter that is not an object", () => {
    const c = base();
    (c.challenges[0].encounters as unknown[])[0] = "reasoning";
    expectIssueAt(validateContent(c), "challenges[0].encounters[0]");
  });

  it("unknown skill on an encounter", () => {
    const c = base();
    c.challenges[0].encounters[0].skill = "research" as never;
    expectIssueAt(validateContent(c), "challenges[0].encounters[0].skill");
  });

  it("combat is rejected with a dedicated message", () => {
    const c = base();
    c.challenges[0].encounters[0].skill = "combat" as never;
    const issues = validateContent(c);
    expectIssueAt(issues, "challenges[0].encounters[0].skill");
    expect(issues.some((x) => /combat/i.test(x.message))).toBe(true);
  });

  it("unknown/extra field on an encounter (e.g. a deferred `mode`)", () => {
    const c = base();
    (c.challenges[0].encounters[0] as Record<string, unknown>).mode = "resisted";
    expectIssueAt(validateContent(c), "challenges[0].encounters[0].mode");
  });

  it("byte-identical adjacent encounters (lazy skill padding)", () => {
    const c = base();
    // dungeon-traps is [reasoning, mobility]; make the second reasoning too.
    const traps = c.challenges.find((x) => x.id === "dungeon-traps")!;
    traps.encounters = [{ skill: "reasoning" }, { skill: "reasoning" }];
    expectIssueAt(validateContent(c), "encounters[1]");
  });

  it("unknown/extra field on a challenge (Never add fields)", () => {
    const c = base();
    (c.challenges[0] as Record<string, unknown>).difficulty = 60;
    expectIssueAt(validateContent(c), "challenges[0].difficulty");
  });

  it("quest referencing a nonexistent challenge", () => {
    const c = base();
    c.quests[0].challenges[0] = "no-such-challenge";
    expectIssueAt(validateContent(c), "quests[0].challenges[0]");
  });

  it("quest with an empty challenge list", () => {
    const c = base();
    c.quests[0].challenges = [];
    expectIssueAt(validateContent(c), "quests[0].challenges");
  });

  it("non-integer reward", () => {
    const c = base();
    c.quests[0].reward = 350.5;
    expectIssueAt(validateContent(c), "quests[0].reward");
  });

  it("negative reward", () => {
    const c = base();
    c.quests[0].reward = -5;
    expectIssueAt(validateContent(c), "quests[0].reward");
  });

  it("minDuration below 1", () => {
    const c = base();
    c.quests[0].minDuration = 0;
    expectIssueAt(validateContent(c), "quests[0].minDuration");
  });

  it("maxDuration below minDuration", () => {
    const c = base();
    c.quests[0].minDuration = 3;
    c.quests[0].maxDuration = 1;
    expectIssueAt(validateContent(c), "quests[0].maxDuration");
  });

  it("trait referencing an unknown skill", () => {
    const c = base();
    c.traits[0].effect.appliesTo.skills = ["reeson" as never];
    expectIssueAt(validateContent(c), "traits[0].effect.appliesTo.skills[0]");
  });

  it("trait referencing an unknown attribute", () => {
    const c = base();
    c.traits[2].effect.appliesTo.attributes = ["wisdom" as never];
    expectIssueAt(validateContent(c), "traits[2].effect.appliesTo.attributes[0]");
  });

  it("trait modifierPercent out of the ±0.5 bound", () => {
    const c = base();
    c.traits[0].effect.modifierPercent = 5;
    expectIssueAt(validateContent(c), "traits[0].effect.modifierPercent");
  });

  it("trait applying to nothing", () => {
    const c = base();
    c.traits[0].effect.appliesTo = {};
    expectIssueAt(validateContent(c), "traits[0].effect.appliesTo");
  });

  it("trait with a non-array scope alongside a valid one", () => {
    const c = base();
    (c.traits[0].effect.appliesTo as { skills: unknown }).skills = "reasoning";
    c.traits[0].effect.appliesTo.attributes = ["mind"];
    expectIssueAt(validateContent(c), "traits[0].effect.appliesTo.skills");
  });

  it("perk with an unknown exception kind", () => {
    const c = base();
    (c.perks[0].exception as { kind: string }).kind = "make-it-easier";
    expectIssueAt(validateContent(c), "perks[0].exception.kind");
  });

  it("skill-modifier perk missing a valid skill", () => {
    const c = base();
    const p = c.perks.find((x) => x.exception.kind === "skill-modifier")!;
    p.exception.skill = "charm" as never;
    expectIssueAt(validateContent(c), "exception.skill");
  });

  it("skill-modifier perk with percent out of the ±0.5 bound", () => {
    const c = base();
    const p = c.perks.find((x) => x.exception.kind === "skill-modifier")!;
    p.exception.percent = 5;
    expectIssueAt(validateContent(c), "exception.percent");
  });

  it("upgrade-result perk cannot upgrade Triumph", () => {
    const c = base();
    const p = c.perks.find((x) => x.exception.kind === "upgrade-result")!;
    p.exception.fromResult = "triumph";
    expectIssueAt(validateContent(c), "exception.fromResult");
  });

  it("upgrade-result perk with an invalid band", () => {
    const c = base();
    const p = c.perks.find((x) => x.exception.kind === "upgrade-result")!;
    p.exception.fromResult = "great" as never;
    expectIssueAt(validateContent(c), "exception.fromResult");
  });

  it("a non-object challenge entry", () => {
    const c = base();
    (c.challenges as unknown[])[0] = "not-an-object";
    expectIssueAt(validateContent(c), "challenges[0]");
  });

  it("a non-object content set is rejected at the root", () => {
    expectIssueAt(validateContent(null), "(root)");
    expectIssueAt(validateContent({ challenges: "nope" }), "challenges");
  });
});

describe("v1/v2 isolation", () => {
  it("no content module reaches outside content/ (any ../ specifier)", () => {
    const dir = fileURLToPath(new URL(".", import.meta.url));
    const files = readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    const parentSpecRe = /['"](\.\.\/[^'"]*)['"]/g;
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(new URL(f, import.meta.url), "utf8");
      for (const m of src.matchAll(parentSpecRe)) offenders.push(`${f} → ${m[1]}`);
    }
    expect(offenders, `content/ must not reach into the v1 sim:\n${offenders.join("\n")}`).toEqual([]);
  });
});
