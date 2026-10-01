// Hero growth in the live sim (Wire B): the grown v3 stats that live in GuildState,
// how they feed the check, how a returning party earns experience, and how a saved
// run is normalised. PURE and deterministic (no rng, no clock): the award is a
// function of (heroes, party, sealed log).
//
// Rules (docs/CHALLENGE_SYSTEM.md §Progression; rates are PR #46's, unchanged):
//   - A beat awards only if its `check` carries `skill` + `leadId` (stored at resolve
//     time). v1 logs and older v3 logs have neither, so they award nothing. The rule
//     keys off the LOG, not the current engine.
//   - The LEAD gets applyUse: skill +1 XP (+2 on Success/Triumph), attribute +1 XP on
//     Success/Triumph only. Every OTHER member gets applySupport: skill +1 XP on
//     Success/Triumph only, no attribute XP. Combat beats train nothing (combat is the
//     temporary rule). Recovery and bonus beats count; a failed beat still teaches the lead.

import { ATTR_IDS, ATTR_MAX, type AttrId } from "../content/attributes";
import { SKILL_IDS, SKILL_MAX, SKILL_ATTR, type SkillId } from "../content/skills";
import { applySupport, applyUse, attrXpToNext, emptyProgress, isSuccess, skillXpToNext, type HeroProgress } from "../resolve/growth";
import { HERO_BY_ID, HERO_DATA, PARTY_BY_ID } from "../roster";
import type { AdventureLog, GrowthLine, HeroProgressState, HeroStatsMap } from "../types";

/** The starting progress of every roster hero: their v3 stats, zero XP banks. */
export function initialHeroes(): Record<string, HeroProgressState> {
  const out: Record<string, HeroProgressState> = {};
  for (const h of HERO_DATA) {
    const p = emptyProgress();
    for (const a of ATTR_IDS) p.attrs[a] = h.v3.attrs[a];
    for (const s of SKILL_IDS) p.skills[s] = h.v3.skills[s] ?? 0;
    out[h.id] = p;
  }
  return out;
}

/** The stats the bridge reads: the grown attrs and skills, plus the roster's static Combat. */
export function heroStatsFrom(heroes: Record<string, HeroProgressState>): HeroStatsMap {
  const out: HeroStatsMap = {};
  for (const h of HERO_DATA) {
    const p = heroes[h.id];
    out[h.id] = p ? { attrs: { ...p.attrs }, skills: { ...p.skills }, combat: h.v3.combat } : h.v3;
  }
  return out;
}

const isLevel = (v: unknown, cap: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= cap;
const isBank = (v: unknown, cost: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v < Math.max(cost, 1);

/** Is one hero's saved progress well-formed? Every attr/skill present and a finite
 * integer within its cap, every XP bank a finite integer below the next level's cost
 * (JSON turns NaN into null, so typeof alone is not enough). */
export function validHeroProgress(p: unknown): p is HeroProgressState {
  if (typeof p !== "object" || p === null) return false;
  const q = p as HeroProgressState;
  if (!q.attrs || !q.skills || !q.xp || !q.xp.attrs || !q.xp.skills) return false;
  for (const a of ATTR_IDS) {
    if (!isLevel(q.attrs[a], ATTR_MAX)) return false;
    if (!isBank(q.xp.attrs[a], q.attrs[a] >= ATTR_MAX ? 1 : attrXpToNext(q.attrs[a]))) return false;
  }
  for (const s of SKILL_IDS) {
    if (!isLevel(q.skills[s], SKILL_MAX)) return false;
    if (!isBank(q.xp.skills[s], q.skills[s] >= SKILL_MAX ? 1 : skillXpToNext(q.skills[s]))) return false;
  }
  return true;
}

/** A saved `heroes` field made safe: each roster hero keeps its valid saved progress
 * or, alone, falls back to the roster default (a corrupt entry never nukes the run).
 * A save that predates growth has no field and gets the defaults. Existing saves keep
 * their grown stats; a later roster rebalance does not reach them (intended). */
export function normalizeHeroes(raw: unknown): Record<string, HeroProgressState> {
  const base = initialHeroes();
  if (typeof raw !== "object" || raw === null) return base;
  const saved = raw as Record<string, unknown>;
  for (const h of HERO_DATA) if (validHeroProgress(saved[h.id])) base[h.id] = saved[h.id] as HeroProgressState;
  return base;
}

export interface AwardResult {
  heroes: Record<string, HeroProgressState>;
  lines: GrowthLine[];
}

function cloneHeroes(h: Record<string, HeroProgressState>): Record<string, HeroProgressState> {
  return JSON.parse(JSON.stringify(h)) as Record<string, HeroProgressState>;
}

const SKILL_ORDER = (s: SkillId) => SKILL_IDS.indexOf(s);

/** Experience a returning party earns from its sealed log. Pure: returns new heroes and
 * the aggregated per-hero, per-skill lines (level-ups first, then most XP, then party
 * order). A no-op when the log already carries `growth` (idempotence guard) or has no
 * trainable v3 beats. */
export function awardGrowth(heroes: Record<string, HeroProgressState>, partyId: string, log: AdventureLog): AwardResult {
  if (log.growth) return { heroes, lines: log.growth };
  const party = PARTY_BY_ID[partyId];
  const next = cloneHeroes(heroes);
  type Acc = { gained: number; levelUp: boolean; attrUp: boolean };
  const acc = new Map<string, Acc>(); // `${heroId}|${skill}`
  const touch = (heroId: string, skill: SkillId): Acc => {
    const k = `${heroId}|${skill}`;
    let a = acc.get(k);
    if (!a) acc.set(k, (a = { gained: 0, levelUp: false, attrUp: false }));
    return a;
  };

  for (const beat of log.beats) {
    const c = beat.check;
    if (!c || !c.skill || !c.leadId || c.skill === "combat") continue;
    const skill = c.skill;
    const success = isSuccess(c.result);
    for (const id of party.memberIds) {
      const atCap = next[id].skills[skill] >= SKILL_MAX; // XP at the cap is discarded, so it is not "gained"
      const prog = next[id] as unknown as HeroProgress;
      if (id === c.leadId) {
        const out = applyUse(prog, skill, c.result);
        next[id] = out.progress as unknown as HeroProgressState;
        const a = touch(id, skill);
        if (!atCap) a.gained += success ? 2 : 1;
        if (out.skillUp > 0) a.levelUp = true;
        if (out.attrUp > 0) a.attrUp = true;
      } else {
        const out = applySupport(prog, skill, c.result);
        next[id] = out.progress as unknown as HeroProgressState;
        if (success) {
          const a = touch(id, skill);
          if (!atCap) a.gained += 1;
          if (out.skillUp > 0) a.levelUp = true;
        }
      }
    }
  }

  const lines: GrowthLine[] = [];
  const order = (id: string) => party.memberIds.indexOf(id);
  for (const [k, a] of acc) {
    if (a.gained <= 0 && !a.levelUp && !a.attrUp) continue;
    const [heroId, skillRaw] = k.split("|");
    const skill = skillRaw as SkillId;
    const p = next[heroId];
    const level = p.skills[skill];
    const attr: AttrId = SKILL_ATTR[skill];
    const line: GrowthLine = {
      heroId,
      name: HERO_BY_ID[heroId].name,
      skill,
      xpGained: a.gained,
      level,
      xp: p.xp.skills[skill],
      cost: level >= SKILL_MAX ? null : skillXpToNext(level),
      levelUp: a.levelUp,
    };
    if (a.attrUp) {
      line.attr = attr;
      line.attrLevel = p.attrs[attr];
      line.attrUp = true;
    }
    lines.push(line);
  }
  lines.sort(
    (x, y) =>
      Number(y.levelUp || y.attrUp === true) - Number(x.levelUp || x.attrUp === true) ||
      y.xpGained - x.xpGained ||
      order(x.heroId) - order(y.heroId) ||
      SKILL_ORDER(x.skill) - SKILL_ORDER(y.skill),
  );
  return { heroes: next, lines };
}
