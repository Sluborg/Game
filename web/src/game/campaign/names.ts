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

/** Three flavor skills with ratings 1..5, deterministic by seed. */
export function rollSkills(seed: number): AgentSkill[] {
  const skills: AgentSkill[] = [];
  const used = new Set<string>();
  let s = seed;
  while (skills.length < 3) {
    const name = pick(SKILL_NAMES, s);
    s = s * 7 + 13;
    if (used.has(name)) continue;
    used.add(name);
    skills.push({ name, rating: 1 + (Math.abs(s) % 5) });
  }
  return skills;
}
