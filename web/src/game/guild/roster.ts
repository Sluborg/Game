// Ground-truth roster for the guild sim (§5/§6). This is the SIM's reality: the
// heroes' true attributes, the trait effects that colour beats, and the parties'
// hidden per-tier asks. The UI mock roster (web/src/ui/heroes/mockHeroes.ts,
// mockParties.ts) imports FROM here so presentation and simulation never diverge —
// and so game/ never depends on ui/ (LPC sprites, etc.).
//
// The Slice-1 ask⟂quality invariant is DORMANT under the pivot (the player-set
// cut retired for a flat brokerage; asks return with slice-4 variable terms) —
// the askMaxCut data survives because its null entries still gate structural
// eligibility (lone Mira can't take the Ruins). Straw numbers; ratios are the
// design.

import type { HeroData, PartyData } from "./types";

// Reusable trait effects (mechanical — a flat power delta on matching beat types).
const BRAVE: HeroData["traits"][number] = { name: "Brave", types: ["combat"], delta: 3, blurb: "holds the line — Brave" };
const DISCIPLINED: HeroData["traits"][number] = { name: "Disciplined", types: ["combat", "travel"], delta: 2, blurb: "keeps formation — Disciplined" };
const PROUD: HeroData["traits"][number] = { name: "Proud", types: ["social"], delta: 2, blurb: "commands the room — Proud" };
const VENGEFUL: HeroData["traits"][number] = { name: "Vengeful", types: ["combat"], delta: 1, blurb: "presses the grudge — Vengeful" };
const LOYAL: HeroData["traits"][number] = { name: "Loyal", types: ["travel"], delta: 1, blurb: "steady on the road — Loyal" };
const SHARP_EYED: HeroData["traits"][number] = { name: "Sharp-eyed", types: ["investigation"], delta: 4, blurb: "spots the detail — Sharp-eyed" };
const WAYFARER: HeroData["traits"][number] = { name: "Wayfarer", types: ["travel"], delta: 4, blurb: "knows the paths — Wayfarer" };
const GREEDY: HeroData["traits"][number] = { name: "Greedy", types: ["social"], delta: 1, blurb: "haggles hard — Greedy" };
const NIMBLE: HeroData["traits"][number] = { name: "Nimble", types: ["investigation", "travel"], delta: 3, blurb: "slips through — Nimble" };
const COWARD: HeroData["traits"][number] = { name: "Coward", types: ["combat"], delta: -5, blurb: "balks at the fight — Coward" };

export const HERO_DATA: HeroData[] = [
  { id: "ysolt", name: "Ysolt Vane", archetype: "Champion", attrs: { str: 16, dex: 12, sta: 14, per: 11 }, traits: [DISCIPLINED, PROUD, VENGEFUL] },
  { id: "doran", name: "Doran Blackfen", archetype: "Hedge Knight", attrs: { str: 12, dex: 8, sta: 12, per: 9 }, traits: [LOYAL] },
  // The new 6th hero — a pathfinder giving the Iron Vigil non-combat coverage
  // (investigation/travel), which is what makes it the high-QUALITY party.
  { id: "wren", name: "Wren Ashdown", archetype: "Pathfinder", attrs: { str: 7, dex: 13, sta: 9, per: 15 }, traits: [SHARP_EYED, WAYFARER] },
  { id: "brok", name: "Brok Ironhand", archetype: "Sellsword", attrs: { str: 15, dex: 9, sta: 13, per: 7 }, traits: [BRAVE, GREEDY] },
  { id: "pell", name: "Pell Quick", archetype: "Cutpurse", attrs: { str: 5, dex: 15, sta: 7, per: 12 }, traits: [NIMBLE, COWARD] },
  { id: "mira", name: "Mira Song", archetype: "Recruit", attrs: { str: 6, dex: 11, sta: 8, per: 10 }, traits: [] },
];

export const PARTY_DATA: PartyData[] = [
  {
    id: "iron-vigil",
    name: "The Iron Vigil",
    memberIds: ["ysolt", "doran", "wren"],
    bossId: "ysolt",
    // High quality → low tolerated cut (proud). Only bite the Ruins at a low cut.
    askMaxCut: { road: 30, ruins: 24, standing: 60 },
    // Comfortable at run start: the Vigil opens in LIFESTYLE mode (rest/train on
    // screen from minute one — the canvas must show life, not an empty hall).
    startWallet: 90,
  },
  {
    id: "free-blades",
    name: "The Free Blades",
    memberIds: ["brok", "pell"],
    bossId: "brok",
    // Medium quality, greedy for work → bite across the whole 20–40 range.
    askMaxCut: { road: 55, ruins: 42, standing: 60 },
    // Middling coin: the Blades want work within the first day or two.
    startWallet: 45,
  },
  {
    id: "lone-mira",
    name: "Mira Song",
    memberIds: ["mira"],
    bossId: "mira",
    // A lone recruit: standing jobs only. She won't bid the Road (its ambush would
    // maul a solo recruit) or the Ruins — she guards the hall / walks the watch
    // until she has a party. Both scarce tiers null; standing is her floor.
    askMaxCut: { road: null, ruins: null, standing: 60 },
    // Broke: Mira takes watch shifts from the start (the survival floor, visible).
    startWallet: 20,
  },
];

export const HERO_BY_ID: Record<string, HeroData> = Object.fromEntries(HERO_DATA.map((h) => [h.id, h]));
export const PARTY_BY_ID: Record<string, PartyData> = Object.fromEntries(PARTY_DATA.map((p) => [p.id, p]));

/** A party's quality for a beat's attribute(s): the best member's true value for
 * that attribute (the specialist leads it) + a small size bonus for backup.
 * This is what makes the Iron Vigil's Wren shine on investigation/travel. */
export function partyAttr(partyId: string, attr: import("./types").AttrKey): number {
  const party = PARTY_BY_ID[partyId];
  const members = party.memberIds.map((id) => HERO_BY_ID[id]);
  const best = Math.max(...members.map((m) => m.attrs[attr]));
  const sizeBonus = (members.length - 1) * 1.0;
  return best + sizeBonus;
}

/** The trait cut-in (if any) that applies to a beat type, and the summed delta.
 * Returns the strongest-magnitude blurb for flavour. */
export function partyTraitMod(partyId: string, type: import("./types").BeatType): { delta: number; blurb?: string } {
  const party = PARTY_BY_ID[partyId];
  let delta = 0;
  let pick: { mag: number; blurb: string } | null = null;
  for (const id of party.memberIds) {
    for (const t of HERO_BY_ID[id].traits) {
      if (!t.types.includes(type)) continue;
      delta += t.delta;
      const mag = Math.abs(t.delta);
      // Name the hero — "slips through — Nimble" alone read as a riddle
      // (Stefan). "Pell Quick slips through — Nimble".
      if (!pick || mag > pick.mag) pick = { mag, blurb: `${HERO_BY_ID[id].name} ${t.blurb}` };
    }
  }
  return { delta, blurb: pick?.blurb };
}

/** Overall party quality 0..1 (mean of the four attribute leads, normalized),
 * used for the scarce-award best-fit tiebreak and success tuning. */
export function partyQuality(partyId: string): number {
  const attrs: import("./types").AttrKey[] = ["str", "dex", "sta", "per"];
  const mean = attrs.reduce((s, a) => s + partyAttr(partyId, a), 0) / attrs.length;
  return Math.min(1, mean / 20);
}
