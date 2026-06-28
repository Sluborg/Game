// Deterministic generators for future RECRUIT-spawned agents. Starter agents are
// hard-coded in data.ts for a stable opening; these keep generation testable.

import type { AgentSkill } from "./types";

const FIRST = [
  "Bram",
  "Senna",
  "Aldric",
  "Sylva",
  "Corvin",
  "Elka",
  "Tobias",
  "Wrenna",
  "Falk",
  "Isolde",
];

const LAST = [
  "Underbough",
  "Quillfeather",
  "Stonewer",
  "Ashmoor",
  "Larkspur",
  "Greaves",
  "Dunmere",
  "Holloway",
];

const SKILL_NAMES = [
  "Scouting",
  "Haggling",
  "Lockpicking",
  "Diplomacy",
  "Lore",
  "Stealth",
  "Forgery",
  "Brawling",
  "Husbandry",
  "Cartography",
];

const PORTRAIT_COUNT = 8;

function pick<T>(arr: T[], seed: number): T {
  return arr[((seed % arr.length) + arr.length) % arr.length];
}

export function generateAgentName(seed: number): string {
  return `${pick(FIRST, seed)} ${pick(LAST, Math.floor(seed / FIRST.length))}`;
}

/** Returns a committed portrait filename (public/portraits/portrait-NN.svg). */
export function pickPortrait(seed: number): string {
  const n = (((seed - 1) % PORTRAIT_COUNT) + PORTRAIT_COUNT) % PORTRAIT_COUNT;
  return `portrait-${String(n + 1).padStart(2, "0")}.svg`;
}

/** Three distinct flavor skills with ratings 1..5, deterministic by seed. */
export function rollSkills(seed: number): AgentSkill[] {
  const len = SKILL_NAMES.length;
  const skills: AgentSkill[] = [];
  // Bounded walk over the array (at most `len` steps) so it always terminates;
  // the dedupe guard keeps it correct even if the step shares a factor with len.
  for (let i = 0; skills.length < 3 && i < len; i++) {
    const name = SKILL_NAMES[(Math.abs(seed) + i * 3) % len];
    if (skills.some((sk) => sk.name === name)) continue;
    skills.push({ name, rating: 1 + (Math.abs(seed * 31 + i * 17) % 5) });
  }
  return skills;
}
