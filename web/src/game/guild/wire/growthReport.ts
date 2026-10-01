// Renders docs/resolution-growth.md: how fast heroes grow under the live rules and
// what that does to quest difficulty. PURE and deterministic (fixed seeds, no Date,
// Math.random or locale); wire/growth.test.ts fails if the committed doc drifts.

import { PARTY_BY_ID, PARTY_DATA } from "../roster";
import { ROAD_JOB, RUINS, STANDING_JOBS, type QuestDef } from "../quests";
import { resolveQuest } from "../resolver";
import type { HeroProgressState } from "../types";
import { SKILL_IDS } from "../content/skills";
import { ATTR_IDS } from "../content/attributes";
import { eligibleParties, QUESTS, questStats } from "./harness";
import { awardGrowth, heroStatsFrom, initialHeroes } from "./progress";

const SHORT: Record<string, string> = { "iron-vigil": "Vigil", "free-blades": "Blades", "lone-mira": "Mira" };
const pct = (p: number) => `${Math.round(p * 100)}%`;
const row = (cells: (string | number)[]) => `| ${cells.join(" | ")} |`;
const table = (header: string[], rows: (string | number)[][]) => [row(header), row(header.map(() => "---")), ...rows.map(row)].join("\n");

const MAX_QUESTS = 300;
const STEP = 5;
const SNAP = [0, 20, 50, 100];
const TRIALS = 400;

/** The quests a party keeps taking (the Road and the Ruins alternate; a lone recruit works the standing jobs). */
function loopQuests(partyId: string): QuestDef[] {
  return partyId === "lone-mira" ? STANDING_JOBS : [ROAD_JOB, RUINS];
}

interface Career {
  /** Heroes after 0, STEP, 2*STEP, ... quests. */
  snapshots: Record<string, HeroProgressState>[];
  /** Quest number (1-based) of the first skill level-up in the party, or null. */
  firstLevelUp: number | null;
}

function runCareer(partyId: string): Career {
  const quests = loopQuests(partyId);
  const idx = PARTY_DATA.findIndex((p) => p.id === partyId);
  let heroes = initialHeroes();
  const snapshots = [heroes];
  let firstLevelUp: number | null = null;
  for (let q = 1; q <= MAX_QUESTS; q++) {
    const quest = quests[(q - 1) % quests.length];
    const log = resolveQuest({ quest, partyId, cutPct: 10, durationDays: 1, seed: q * 7919 + idx, engine: "v3", stats: heroStatsFrom(heroes) });
    const award = awardGrowth(heroes, partyId, log);
    if (firstLevelUp === null && award.lines.some((l) => l.levelUp)) firstLevelUp = q;
    heroes = award.heroes;
    if (q % STEP === 0) snapshots.push(heroes);
  }
  return { snapshots, firstLevelUp };
}

const snapAt = (c: Career, quests: number) => c.snapshots[Math.round(quests / STEP)];

function partyTotals(partyId: string, heroes: Record<string, HeroProgressState>): { skills: number; attrs: number } {
  let skills = 0;
  let attrs = 0;
  for (const id of PARTY_BY_ID[partyId].memberIds) {
    for (const s of SKILL_IDS) skills += heroes[id].skills[s];
    for (const a of ATTR_IDS) attrs += heroes[id].attrs[a];
  }
  return { skills, attrs };
}

export function renderGrowth(): string {
  const careers = new Map(PARTY_DATA.map((p) => [p.id, runCareer(p.id)]));
  const base = initialHeroes();

  // Drift: P(success) of each eligible quest x party at each checkpoint, and the first
  // checkpoint (every STEP quests) where it reaches 90%.
  interface Drift { quest: QuestDef; partyId: string; atSnap: number[]; to90: number | null }
  const drifts: Drift[] = [];
  for (const quest of QUESTS) {
    for (const partyId of eligibleParties(quest)) {
      const c = careers.get(partyId)!;
      const success = (n: number) => questStats(quest, partyId, "v3", TRIALS, heroStatsFrom(snapAt(c, n))).success;
      let to90: number | null = null;
      for (let n = 0; n <= MAX_QUESTS; n += STEP) {
        if (success(n) >= 0.9) {
          to90 = n;
          break;
        }
      }
      drifts.push({ quest, partyId, atSnap: SNAP.map(success), to90 });
    }
  }

  const contested = drifts.filter((d) => d.quest.tier !== "standing");
  const solved = contested.filter((d) => d.to90 === 0);
  const slow = contested.filter((d) => d.to90 !== 0);
  const label = (d: Drift) => `${d.quest.title} · ${SHORT[d.partyId]}`;
  const attrGain = (id: string) => partyTotals(id, snapAt(careers.get(id)!, 100)).attrs - partyTotals(id, base).attrs;
  const attrTotal = PARTY_DATA.reduce((t, p) => t + attrGain(p.id), 0);
  const verdict =
    `**Verdict:** ${solved.length} of ${contested.length} postable quest·party pairs are already at 90% success or better before any growth (the same as v1). ` +
    (slow.length === 0
      ? "Nothing is left to grow into. "
      : `The rest (${slow.map((d) => `${label(d)}: ${pct(d.atSnap[0])} now, ${pct(d.atSnap[3])} after 100 quests`).join("; ")}) ` +
        (slow.every((d) => d.to90 !== null)
          ? `reach 90% after ${slow.map((d) => d.to90).join(", ")} quests. `
          : `do not reach 90% within ${MAX_QUESTS} quests. `)) +
    `Attributes gain ${attrTotal === 0 ? "no levels at all" : `only ${attrTotal} level${attrTotal === 1 ? "" : "s"}`} in 100 quests (20 XP per level, Success only).`;
  const decision =
    "**Decide:** raise the skill XP rates, or ship harder quests first, before building more growth UI? " +
    "(Harder quests, content progression, are not in this slice.)";
  // Only the pairs that move are worth a table row; the rest sit at 100% throughout.
  const interesting = drifts.filter((d) => d.atSnap.some((x) => x < 1) || d.to90 !== 0);
  const flat = drifts.length - interesting.length;

  const out: string[] = [];
  const push = (...l: string[]) => out.push(...l);
  push(
    "# Resolution growth",
    "",
    "GENERATED by `npm run sim:growth` (web/src/game/guild/wire/growthReport.ts). Do not edit by hand;",
    "`wire/growth.test.ts` fails if this file drifts. Real `resolveQuest` + `awardGrowth` runs, v3 rules, fixed seeds.",
    "",
    verdict,
    "",
    decision,
    "",
    "**What this means for a player:** after each quest the end-of-story card lists the experience the party earned",
    "(\"Wren Ashdown · Reasoning 6 · +2 XP (12/30 to next)\", \"Level up!\"). The Heroes screen still shows its old mock stats; a live",
    "hero-sheet panel is a later slice. Production (v1) earns no experience.",
    "",
    "## How growth works",
    "",
    "- The hero who **led** an encounter gets skill XP (+1, +2 on Success or Triumph) and attribute XP (+1 on Success or Triumph).",
    "- Every other party member gets +1 XP in the skill that encounter tested on a Success or Triumph, no attribute XP, so nobody stalls.",
    "- Skill level n costs 5n XP, attribute level n costs 20n XP (PR #46's rates). **Attributes will not visibly move in a playtest.**",
    "- **Combat beats train nothing** (combat is a temporary rule), so combat-heavy quests are growth-neutral.",
    "- Difficulty is absolute: a stronger hero simply succeeds more often.",
    "",
    "## A. Pace",
    "",
    "Skill levels gained by the whole party (sum over members) after N quests, the Road and the Ruins alternating",
    "(a lone recruit works the standing jobs).",
    "",
    table(
      ["Party", "First level-up", "+ after 20", "+ after 50", "+ after 100"],
      PARTY_DATA.map((p) => {
        const c = careers.get(p.id)!;
        const b = partyTotals(p.id, base).skills;
        const at = (n: number) => `+${partyTotals(p.id, snapAt(c, n)).skills - b}`;
        return [SHORT[p.id], c.firstLevelUp === null ? "none" : `quest ${c.firstLevelUp}`, at(20), at(50), at(100)];
      }),
    ),
    "",
    "## B. Difficulty drift",
    "",
    "P(success) of each quest with the party's heroes as grown after N quests (400 seeded runs each).",
    "",
    table(
      ["Quest · party", "0", "20", "50", "100"],
      interesting.map((d) => [`${d.quest.title} · ${SHORT[d.partyId]}`, ...d.atSnap.map(pct)]),
    ),
    "",
    `The other ${flat} quest·party pairs are at 100% throughout.`,
    "",
    "## C. Quests until 90% success",
    "",
    "The explicit threshold: how many quests (checked every 5) until the party succeeds 90% of the time.",
    "",
    table(
      ["Quest · party", "Quests to 90%"],
      interesting.map((d) => [`${d.quest.title} · ${SHORT[d.partyId]}`, d.to90 === null ? `over ${MAX_QUESTS}` : d.to90 === 0 ? "already" : d.to90]),
    ),
    "",
  );
  return out.join("\n");
}
