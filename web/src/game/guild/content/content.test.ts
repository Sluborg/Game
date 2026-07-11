// Schema gate for the content pipeline. This is what fails CI on a bad ChatGPT
// drop (.github/workflows/test.yml runs `npm run test` on PRs to dev).
//
// Three duties:
//   1. the real authored CONTENT validates clean;
//   2. a crafted BAD fixture per rule turns the validator red (so a rule that
//      never fires can't pass vacuously — the Engineer/Adversary Review #1 catch);
//   3. the v2 vocabulary matches CHALLENGE_SYSTEM.md exactly, and the content
//      namespace imports nothing from the v1 sim.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import { ATTRIBUTES, ATTR_IDS } from "./attributes";
import { SKILLS, SKILL_IDS, SKILL_ATTR, COMBAT_RESERVED } from "./skills";
import { RESULT_LADDER, RESULT_VALUES } from "./ladder";
import { validateContent, deriveVisibleDifficulty, formatIssues, type Issue } from "./schema";
import { CONTENT } from "./content";

// A deep clone so a fixture can mutate freely without touching the real content.
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Assert the validator flags SOMETHING at a path containing `pathPart`. */
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
});

describe("deriveVisibleDifficulty", () => {
  it("is the max of the two check difficulties", () => {
    expect(deriveVisibleDifficulty([{ difficulty: 60 }, { difficulty: 55 }])).toBe(60);
    expect(deriveVisibleDifficulty([{ difficulty: 40 }, { difficulty: 35 }])).toBe(40);
  });
});

describe("vocabulary integrity (matches CHALLENGE_SYSTEM.md)", () => {
  it("has exactly the six attributes", () => {
    expect(ATTRIBUTES.map((a) => a.id)).toEqual([
      "strength",
      "dexterity",
      "constitution",
      "intelligence",
      "wisdom",
      "charisma",
    ]);
  });

  it("has exactly the fifteen skills with the documented attribute mapping", () => {
    expect(SKILLS).toHaveLength(15);
    const expected: Record<string, string> = {
      force: "strength",
      intimidation: "strength",
      stealth: "dexterity",
      athletics: "dexterity",
      endurance: "constitution",
      resist: "constitution",
      research: "intelligence",
      arcana: "intelligence",
      planning: "intelligence",
      survival: "wisdom",
      investigation: "wisdom",
      medicine: "wisdom",
      persuasion: "charisma",
      deception: "charisma",
      inquiry: "charisma",
    };
    expect(Object.fromEntries(SKILLS.map((s) => [s.id, s.attr]))).toEqual(expected);
    // every skill's governing attribute is one of the six
    for (const s of SKILLS) expect(ATTR_IDS).toContain(SKILL_ATTR[s.id]);
  });

  it("does NOT list Combat as a skill (it is a temporary special rule)", () => {
    expect(SKILL_IDS).not.toContain(COMBAT_RESERVED);
  });

  it("has the five-band ladder with values −3/−1/0/+1/+3", () => {
    expect(RESULT_LADDER.map((r) => r.name)).toEqual([
      "Critical Failure",
      "Failure",
      "Insufficient",
      "Success",
      "Triumph",
    ]);
    expect(RESULT_VALUES).toEqual([-3, -1, 0, 1, 3]);
  });
});

// ---- one bad fixture per rule (proves each check actually fires) -------------

describe("validator rejects bad drops", () => {
  const base = () => clone(CONTENT);

  it("baseline clone is clean (guards the fixtures below)", () => {
    expect(validateContent(base())).toEqual([]);
  });

  it("duplicate id across kinds", () => {
    const c = base();
    c.quests[0].id = c.challenges[0].id; // quest id collides with a challenge id
    expectIssueAt(validateContent(c), "quests[0].id");
  });

  it("id with illegal characters", () => {
    const c = base();
    c.challenges[0].id = "Research Library"; // spaces + capitals
    expectIssueAt(validateContent(c), "challenges[0].id");
  });

  it("non-NFC / unicode look-alike id", () => {
    const c = base();
    c.challenges[0].id = "reséarch"; // "e" + combining acute, not NFC
    expectIssueAt(validateContent(c), "challenges[0].id");
  });

  it("unknown skill on a check", () => {
    const c = base();
    c.challenges[0].checks[0].skill = "reading" as never;
    expectIssueAt(validateContent(c), "challenges[0].checks[0].skill");
  });

  it("combat is rejected with a dedicated message", () => {
    const c = base();
    c.challenges[0].checks[0].skill = "combat" as never;
    const issues = validateContent(c);
    expectIssueAt(issues, "challenges[0].checks[0].skill");
    expect(issues.some((x) => /combat/i.test(x.message))).toBe(true);
  });

  it("difficulty out of range", () => {
    const c = base();
    c.challenges[0].checks[0].difficulty = 101;
    expectIssueAt(validateContent(c), "challenges[0].checks[0].difficulty");
  });

  it("difficulty is a float, not an integer", () => {
    const c = base();
    c.challenges[0].checks[0].difficulty = 60.5;
    expectIssueAt(validateContent(c), "challenges[0].checks[0].difficulty");
  });

  it("difficulty is NaN", () => {
    const c = base();
    (c.challenges[0].checks[0] as { difficulty: number }).difficulty = NaN;
    expectIssueAt(validateContent(c), "challenges[0].checks[0].difficulty");
  });

  it("challenge with one check instead of two", () => {
    const c = base();
    c.challenges[0].checks = [c.challenges[0].checks[0]] as never;
    expectIssueAt(validateContent(c), "challenges[0].checks");
  });

  it("challenge with both checks on the same skill", () => {
    const c = base();
    c.challenges[0].checks[1].skill = c.challenges[0].checks[0].skill;
    expectIssueAt(validateContent(c), "challenges[0].checks");
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

  it("negative reward", () => {
    const c = base();
    c.quests[0].reward = -5;
    expectIssueAt(validateContent(c), "quests[0].reward");
  });

  it("maxDuration below minDuration", () => {
    const c = base();
    c.quests[0].minDuration = 3;
    c.quests[0].maxDuration = 1;
    expectIssueAt(validateContent(c), "quests[0].maxDuration");
  });

  it("trait referencing an unknown skill", () => {
    const c = base();
    c.traits[0].effect.appliesTo.skills = ["reeserch" as never];
    expectIssueAt(validateContent(c), "traits[0].effect.appliesTo.skills[0]");
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

  it("trait with a non-array scope alongside a valid one (Codex P2)", () => {
    const c = base();
    // skills is a bare string (malformed) while attributes is a valid array —
    // must NOT be silently coerced to [] and skipped.
    (c.traits[0].effect.appliesTo as { skills: unknown }).skills = "research";
    c.traits[0].effect.appliesTo.attributes = ["wisdom"];
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

  it("upgrade-result perk cannot upgrade Triumph", () => {
    const c = base();
    const p = c.perks.find((x) => x.exception.kind === "upgrade-result")!;
    p.exception.fromResult = "triumph";
    expectIssueAt(validateContent(c), "exception.fromResult");
  });

  it("challenge with a THIRD check", () => {
    const c = base();
    const ch = c.challenges[0];
    ch.checks = [ch.checks[0], ch.checks[1], { skill: "planning", difficulty: 30 }] as never;
    expectIssueAt(validateContent(c), "challenges[0].checks");
  });

  it("empty (whitespace) required string field", () => {
    const c = base();
    c.challenges[0].activity = "   ";
    expectIssueAt(validateContent(c), "challenges[0].activity");
  });

  it("non-integer reward", () => {
    const c = base();
    c.quests[0].reward = 350.5;
    expectIssueAt(validateContent(c), "quests[0].reward");
  });

  it("minDuration below 1", () => {
    const c = base();
    c.quests[0].minDuration = 0;
    expectIssueAt(validateContent(c), "quests[0].minDuration");
  });

  it("trait referencing an unknown attribute", () => {
    const c = base();
    c.traits[2].effect.appliesTo.attributes = ["strenght" as never];
    expectIssueAt(validateContent(c), "traits[2].effect.appliesTo.attributes[0]");
  });

  it("skill-modifier perk with percent out of the ±0.5 bound", () => {
    const c = base();
    const p = c.perks.find((x) => x.exception.kind === "skill-modifier")!;
    p.exception.percent = 5;
    expectIssueAt(validateContent(c), "exception.percent");
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

  it("unknown/extra field is rejected (Never add fields)", () => {
    const c = base();
    (c.challenges[0] as Record<string, unknown>).results = { success: "…", failure: "…" };
    expectIssueAt(validateContent(c), "challenges[0].results");
  });

  it("a non-object content set is rejected at the root", () => {
    expectIssueAt(validateContent(null), "(root)");
    expectIssueAt(validateContent({ challenges: "nope" }), "challenges");
  });
});

// ---- isolation guard: content/ imports nothing from the v1 sim --------------

describe("v1/v2 isolation", () => {
  it("no content module reaches outside content/ (any ../ specifier — import, export-from, side-effect, or dynamic)", () => {
    const dir = fileURLToPath(new URL(".", import.meta.url));
    // Scan the shipped modules, not the tests: tests are build-excluded (they
    // never enter the bundle) and may legitimately import v1 or name a ../ path.
    const files = readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    // Any string literal specifier that climbs out of content/ — catches
    // `from "../x"`, bare `import "../x"`, and dynamic `import("../x")` alike.
    const parentSpecRe = /['"](\.\.\/[^'"]*)['"]/g;
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(new URL(f, import.meta.url), "utf8");
      for (const m of src.matchAll(parentSpecRe)) offenders.push(`${f} → ${m[1]}`);
    }
    expect(offenders, `content/ must not reach into the v1 sim:\n${offenders.join("\n")}`).toEqual([]);
  });
});
