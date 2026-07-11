// The content validator — the runtime gate that fails CI on a bad ChatGPT drop.
// Pure functions only (no I/O, no state); content.test.ts feeds it the real
// content plus a crafted bad fixture per rule. Messages are legible on purpose
// (`path: message (expected …)`) so a phone-only author can act on a failure
// without reading a stack trace.
//
// This is the ONE file under content/ that holds logic; the vocabulary tables and
// the *.json drops are data-only. It validates DEFENSIVELY against `unknown` —
// an author's bad drop may not even match the TS interfaces, so nothing here may
// assume shape.

import { ATTR_IDS } from "./attributes";
import { SKILL_IDS, COMBAT_RESERVED } from "./skills";
import { RESULT_IDS } from "./ladder";

export interface Issue {
  /** Dotted path to the offending value, e.g. `challenges[2].checks[0].skill`. */
  path: string;
  /** What is wrong, in plain words. */
  message: string;
  /** What was expected, when a concrete example helps. */
  expected?: string;
}

const DIFFICULTY_MIN = 0;
const DIFFICULTY_MAX = 100;
const TRAIT_MOD_ABS = 0.5;
const PERK_MOD_ABS = 0.5;

// ---- small predicates -------------------------------------------------------

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isNonEmptyStr = (v: unknown): v is string => isStr(v) && v.trim().length > 0;
const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
const isFiniteNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const inRange = (v: number, lo: number, hi: number): boolean => v >= lo && v <= hi;

/** Format a JSON list of allowed values for an `expected` hint. Every content
 * vocabulary (15 skills, 6 attributes, 5 bands, 4 perk kinds) is short enough to
 * show in full, so a misspelled-skill message lists all valid ids. */
const oneOf = (vals: readonly string[]): string => {
  const cap = 20;
  const shown = vals.slice(0, cap).join(", ");
  return vals.length > cap ? `one of: ${shown}, … (${vals.length} total)` : `one of: ${shown}`;
};

/** Push an issue for any key on `obj` that isn't in `allowed` — enforces the
 * spec's "Never add fields" so a stray field (e.g. a five-band prose matrix
 * smuggled onto a challenge) can't validate clean. */
function rejectUnknownKeys(obj: Record<string, unknown>, allowed: readonly string[], path: string, out: Issue[]): void {
  for (const k of Object.keys(obj)) {
    if (!allowed.includes(k)) {
      out.push({ path: `${path}.${k}`, message: `unknown field "${k}"`, expected: `only: ${allowed.join(", ")}` });
    }
  }
}

// ---- derived, presentation-only ---------------------------------------------

/** The challenge's single visible difficulty = the MAX of its two check
 * difficulties (the harder demand is what gates the challenge). Display-only:
 * the 0–100 → check-target conversion remains open (CHALLENGE_SYSTEM.md). It is
 * stored NOWHERE — always recomputed — so it cannot drift from the checks. */
export function deriveVisibleDifficulty(checks: { difficulty: number }[]): number {
  return checks.reduce((m, c) => Math.max(m, c.difficulty), 0);
}

// ---- id collection ----------------------------------------------------------

const ID_RE = /^[a-z0-9-]+$/;

interface IdRef {
  id: string;
  path: string;
}

/** Validate one id's format + Unicode normalization, returning it for the global
 * uniqueness pass. A look-alike (e.g. a Cyrillic 'ѕ') fails the ASCII regex; a
 * non-NFC string is rejected so two visually-identical ids can't both be "unique". */
function collectId(v: unknown, path: string, out: Issue[]): string | null {
  if (!isNonEmptyStr(v)) {
    out.push({ path, message: "id must be a non-empty string", expected: "kebab-case, e.g. \"research-library\"" });
    return null;
  }
  if (v.normalize("NFC") !== v) {
    out.push({ path, message: `id "${v}" is not Unicode-normalized (NFC)`, expected: "plain ASCII kebab-case" });
    return null;
  }
  if (!ID_RE.test(v)) {
    out.push({ path, message: `id "${v}" has illegal characters`, expected: "lowercase letters, digits and hyphens only (^[a-z0-9-]+$)" });
    return null;
  }
  return v;
}

// ---- per-kind validators ----------------------------------------------------

function validateCheck(v: unknown, path: string, out: Issue[]): void {
  if (!isObj(v)) {
    out.push({ path, message: "check must be an object", expected: '{ "skill": "research", "difficulty": 60 }' });
    return;
  }
  rejectUnknownKeys(v, ["skill", "difficulty"], path, out);
  // skill
  if (!isStr(v.skill)) {
    out.push({ path: `${path}.skill`, message: "skill must be a string", expected: oneOf(SKILL_IDS) });
  } else if (v.skill === COMBAT_RESERVED) {
    out.push({
      path: `${path}.skill`,
      message: 'combat is not a skill — it is a temporary special rule authored in the later combat slice',
      expected: `${oneOf(SKILL_IDS)} (never "combat")`,
    });
  } else if (!(SKILL_IDS as readonly string[]).includes(v.skill)) {
    out.push({ path: `${path}.skill`, message: `unknown skill "${v.skill}"`, expected: oneOf(SKILL_IDS) });
  }
  // difficulty
  if (!isInt(v.difficulty)) {
    out.push({ path: `${path}.difficulty`, message: "difficulty must be an integer", expected: `integer ${DIFFICULTY_MIN}–${DIFFICULTY_MAX}` });
  } else if (!inRange(v.difficulty, DIFFICULTY_MIN, DIFFICULTY_MAX)) {
    out.push({ path: `${path}.difficulty`, message: `difficulty ${v.difficulty} out of range`, expected: `integer ${DIFFICULTY_MIN}–${DIFFICULTY_MAX}` });
  }
}

function validateChallenge(v: unknown, i: number, out: Issue[]): string | null {
  const path = `challenges[${i}]`;
  if (!isObj(v)) {
    out.push({ path, message: "challenge must be an object" });
    return null;
  }
  rejectUnknownKeys(v, ["id", "activity", "summary", "checks"], path, out);
  const id = collectId(v.id, `${path}.id`, out);
  if (!isNonEmptyStr(v.activity)) {
    out.push({ path: `${path}.activity`, message: "activity must be a non-empty broad label", expected: '"Researching in a library" (never a named shelf/tome)' });
  }
  if (v.summary !== undefined && !isNonEmptyStr(v.summary)) {
    out.push({ path: `${path}.summary`, message: "summary, if present, must be a non-empty string" });
  }
  // checks — exactly two, distinct skills
  if (!Array.isArray(v.checks)) {
    out.push({ path: `${path}.checks`, message: "checks must be an array of exactly two checks" });
  } else {
    if (v.checks.length !== 2) {
      out.push({ path: `${path}.checks`, message: `a challenge declares exactly two checks (found ${v.checks.length})`, expected: "two checks on two different skills" });
    }
    v.checks.forEach((c, ci) => validateCheck(c, `${path}.checks[${ci}]`, out));
    const skills = v.checks.filter(isObj).map((c) => c.skill).filter(isStr);
    if (skills.length === 2 && skills[0] === skills[1]) {
      out.push({ path: `${path}.checks`, message: `both checks name the same skill "${skills[0]}"`, expected: "two DIFFERENT skills" });
    }
  }
  return id;
}

function validateQuest(v: unknown, i: number, challengeIds: ReadonlySet<string>, out: Issue[]): string | null {
  const path = `quests[${i}]`;
  if (!isObj(v)) {
    out.push({ path, message: "quest must be an object" });
    return null;
  }
  rejectUnknownKeys(v, ["id", "title", "giver", "location", "reward", "minDuration", "maxDuration", "challenges"], path, out);
  const id = collectId(v.id, `${path}.id`, out);
  for (const f of ["title", "giver", "location"] as const) {
    if (!isNonEmptyStr(v[f])) out.push({ path: `${path}.${f}`, message: `${f} must be a non-empty string` });
  }
  if (!isInt(v.reward) || v.reward < 0) {
    out.push({ path: `${path}.reward`, message: "reward must be an integer ≥ 0", expected: "flat total gold, e.g. 350" });
  }
  const minOk = isInt(v.minDuration) && v.minDuration >= 1;
  const maxOk = isInt(v.maxDuration) && v.maxDuration >= 1;
  if (!minOk) out.push({ path: `${path}.minDuration`, message: "minDuration must be an integer ≥ 1" });
  if (!maxOk) out.push({ path: `${path}.maxDuration`, message: "maxDuration must be an integer ≥ 1" });
  if (minOk && maxOk && (v.maxDuration as number) < (v.minDuration as number)) {
    out.push({ path: `${path}.maxDuration`, message: `maxDuration (${v.maxDuration}) is below minDuration (${v.minDuration})`, expected: "maxDuration ≥ minDuration" });
  }
  if (!Array.isArray(v.challenges) || v.challenges.length < 1) {
    out.push({ path: `${path}.challenges`, message: "a quest must list at least one challenge id" });
  } else {
    v.challenges.forEach((cid, ci) => {
      if (!isStr(cid)) {
        out.push({ path: `${path}.challenges[${ci}]`, message: "challenge reference must be a string id" });
      } else if (!challengeIds.has(cid)) {
        out.push({ path: `${path}.challenges[${ci}]`, message: `unresolved challenge reference "${cid}"`, expected: "the id of a defined challenge" });
      }
    });
  }
  return id;
}

function validateSkillRefs(vals: unknown, path: string, out: Issue[]): void {
  if (!Array.isArray(vals)) return;
  vals.forEach((s, i) => {
    if (!isStr(s) || !(SKILL_IDS as readonly string[]).includes(s)) {
      out.push({ path: `${path}[${i}]`, message: `unknown skill "${String(s)}"`, expected: oneOf(SKILL_IDS) });
    }
  });
}

function validateTrait(v: unknown, i: number, out: Issue[]): string | null {
  const path = `traits[${i}]`;
  if (!isObj(v)) {
    out.push({ path, message: "trait must be an object" });
    return null;
  }
  rejectUnknownKeys(v, ["id", "name", "description", "effect"], path, out);
  const id = collectId(v.id, `${path}.id`, out);
  for (const f of ["name", "description"] as const) {
    if (!isNonEmptyStr(v[f])) out.push({ path: `${path}.${f}`, message: `${f} must be a non-empty string` });
  }
  const eff = v.effect;
  if (!isObj(eff)) {
    out.push({ path: `${path}.effect`, message: "effect must be an object with modifierPercent + appliesTo" });
    return id;
  }
  rejectUnknownKeys(eff, ["modifierPercent", "appliesTo"], `${path}.effect`, out);
  if (!isFiniteNum(eff.modifierPercent) || !inRange(eff.modifierPercent, -TRAIT_MOD_ABS, TRAIT_MOD_ABS)) {
    out.push({ path: `${path}.effect.modifierPercent`, message: "modifierPercent must be a number within ±0.5", expected: "e.g. 0.1 for +10%, -0.15 for −15%" });
  }
  const at = eff.appliesTo;
  if (!isObj(at)) {
    out.push({ path: `${path}.effect.appliesTo`, message: "appliesTo must be an object with skills and/or attributes" });
  } else {
    rejectUnknownKeys(at, ["skills", "attributes"], `${path}.effect.appliesTo`, out);
    // A present-but-non-array scope is malformed — reject it rather than coercing
    // it to [] (which would silently drop the intended scope and let a bad drop
    // pass; Codex P2). undefined is fine (the scope is simply omitted).
    const skillsIsArr = Array.isArray(at.skills);
    const attrsIsArr = Array.isArray(at.attributes);
    const skillsMalformed = at.skills !== undefined && !skillsIsArr;
    const attrsMalformed = at.attributes !== undefined && !attrsIsArr;
    if (skillsMalformed) {
      out.push({ path: `${path}.effect.appliesTo.skills`, message: "skills must be an array of skill ids", expected: '["research", "arcana"]' });
    }
    if (attrsMalformed) {
      out.push({ path: `${path}.effect.appliesTo.attributes`, message: "attributes must be an array of attribute ids", expected: '["wisdom"]' });
    }
    const skillCount = skillsIsArr ? (at.skills as unknown[]).length : 0;
    const attrCount = attrsIsArr ? (at.attributes as unknown[]).length : 0;
    // "applies to nothing" only when neither scope is malformed (a malformed one
    // is already reported) and both resolve to empty.
    if (!skillsMalformed && !attrsMalformed && skillCount + attrCount === 0) {
      out.push({ path: `${path}.effect.appliesTo`, message: "a trait must apply to at least one skill or attribute" });
    }
    validateSkillRefs(at.skills, `${path}.effect.appliesTo.skills`, out);
    if (attrsIsArr) {
      (at.attributes as unknown[]).forEach((a, ai) => {
        if (!isStr(a) || !(ATTR_IDS as readonly string[]).includes(a)) {
          out.push({ path: `${path}.effect.appliesTo.attributes[${ai}]`, message: `unknown attribute "${String(a)}"`, expected: oneOf(ATTR_IDS) });
        }
      });
    }
  }
  return id;
}

const PERK_KINDS = ["reroll-lowest-check", "soften-critical-failure", "upgrade-result", "skill-modifier"] as const;

function validatePerk(v: unknown, i: number, out: Issue[]): string | null {
  const path = `perks[${i}]`;
  if (!isObj(v)) {
    out.push({ path, message: "perk must be an object" });
    return null;
  }
  rejectUnknownKeys(v, ["id", "name", "description", "exception"], path, out);
  const id = collectId(v.id, `${path}.id`, out);
  for (const f of ["name", "description"] as const) {
    if (!isNonEmptyStr(v[f])) out.push({ path: `${path}.${f}`, message: `${f} must be a non-empty string` });
  }
  const ex = v.exception;
  if (!isObj(ex)) {
    out.push({ path: `${path}.exception`, message: "exception must be an object with a kind", expected: oneOf(PERK_KINDS) });
    return id;
  }
  rejectUnknownKeys(ex, ["kind", "fromResult", "skill", "percent"], `${path}.exception`, out);
  const kind = ex.kind;
  if (!isStr(kind) || !(PERK_KINDS as readonly string[]).includes(kind)) {
    out.push({ path: `${path}.exception.kind`, message: `unknown exception kind "${String(kind)}"`, expected: oneOf(PERK_KINDS) });
    return id;
  }
  // per-kind params
  if (kind === "skill-modifier") {
    if (!isStr(ex.skill) || !(SKILL_IDS as readonly string[]).includes(ex.skill)) {
      out.push({ path: `${path}.exception.skill`, message: `skill-modifier needs a valid skill (got "${String(ex.skill)}")`, expected: oneOf(SKILL_IDS) });
    }
    if (!isFiniteNum(ex.percent) || !inRange(ex.percent, -PERK_MOD_ABS, PERK_MOD_ABS)) {
      out.push({ path: `${path}.exception.percent`, message: "skill-modifier needs percent within ±0.5", expected: "e.g. 0.2 for +20%" });
    }
  } else if (kind === "upgrade-result") {
    if (!isStr(ex.fromResult) || !(RESULT_IDS as readonly string[]).includes(ex.fromResult)) {
      out.push({ path: `${path}.exception.fromResult`, message: `upgrade-result needs a valid result band (got "${String(ex.fromResult)}")`, expected: oneOf(RESULT_IDS) });
    } else if (ex.fromResult === "triumph") {
      out.push({ path: `${path}.exception.fromResult`, message: "cannot upgrade Triumph — nothing is higher", expected: "any band except triumph" });
    }
  }
  return id;
}

// ---- entry point ------------------------------------------------------------

/**
 * Validate a whole content set. Returns [] when clean; otherwise every issue
 * found (it does NOT stop at the first). A bad ChatGPT drop turns this red in CI.
 */
export function validateContent(raw: unknown): Issue[] {
  const out: Issue[] = [];
  if (!isObj(raw)) {
    return [{ path: "(root)", message: "content set must be an object with challenges/quests/traits/perks arrays" }];
  }
  for (const kind of ["challenges", "quests", "traits", "perks"] as const) {
    if (!Array.isArray(raw[kind])) out.push({ path: kind, message: `${kind} must be an array` });
  }

  const challenges = Array.isArray(raw.challenges) ? raw.challenges : [];
  const quests = Array.isArray(raw.quests) ? raw.quests : [];
  const traits = Array.isArray(raw.traits) ? raw.traits : [];
  const perks = Array.isArray(raw.perks) ? raw.perks : [];

  // First pass: validate each item and collect its id (challenge ids feed quest
  // reference resolution).
  const challengeIds = new Set<string>();
  const allIds: IdRef[] = [];

  challenges.forEach((c, i) => {
    const id = validateChallenge(c, i, out);
    if (id) {
      challengeIds.add(id);
      allIds.push({ id, path: `challenges[${i}].id` });
    }
  });
  quests.forEach((q, i) => {
    const id = validateQuest(q, i, challengeIds, out);
    if (id) allIds.push({ id, path: `quests[${i}].id` });
  });
  traits.forEach((t, i) => {
    const id = validateTrait(t, i, out);
    if (id) allIds.push({ id, path: `traits[${i}].id` });
  });
  perks.forEach((p, i) => {
    const id = validatePerk(p, i, out);
    if (id) allIds.push({ id, path: `perks[${i}].id` });
  });

  // Global uniqueness across ALL kinds (a challenge id must not equal a quest id,
  // or quest→challenge resolution could bind to the wrong kind).
  const seen = new Map<string, string>();
  for (const ref of allIds) {
    const prev = seen.get(ref.id);
    if (prev) {
      out.push({ path: ref.path, message: `duplicate id "${ref.id}" (also at ${prev})`, expected: "an id unique across ALL content kinds" });
    } else {
      seen.set(ref.id, ref.path);
    }
  }

  return out;
}

/** Convenience for CI/logs: a single legible multi-line report. */
export function formatIssues(issues: Issue[]): string {
  if (issues.length === 0) return "content OK";
  return issues
    .map((x) => `  ✗ ${x.path}: ${x.message}${x.expected ? ` (expected ${x.expected})` : ""}`)
    .join("\n");
}
