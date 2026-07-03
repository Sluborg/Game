// Mock roster data for the Heroes scaffolding. No real hero / location / quest /
// contract system exists yet (those arrive in Slice 1+), so this is a small
// static array — UI only, no persistence, no web/src/game/ dependency beyond
// reusing the LPC presenter for placeholder portraits and DISPLAYING the sim's
// real attribute names (str/dex/sta/per — read-only, see battle/attributes.ts).
//
// Each hero's LPC layer set is resolved ONCE here at module load so the array
// identity is stable across renders (LpcSprite reloads its images whenever its
// `layers` prop identity changes).
//
// Everything below is illustrative placeholder data. The Bonds score, Gear, and
// Career/Skills systems are not built yet; the sheet presents them as mock, never
// as functional mechanics.

import { PRESETS, resolveLayers } from "../combat/lpc/presets";
import type { ResolvedLayer } from "../combat/lpc/types";

/** Certainty of a surfaced value — DESIGN.md §5's keystone, encoded IN the chip's
 * own fill (solid = verified, hatched = claimed, plain "?" = rumor). */
export type Certainty = "verified" | "claimed" | "rumor";

/** The four attributes the lean fight actually uses (battle/attributes.ts). The
 * sim has a fuller planned spread (Int/Cha…) that drives non-combat beats, but
 * per §5 the sheet stays UI-lean — we surface only these four here. */
export type AttrKey = "STR" | "DEX" | "STA" | "PER";
export interface HeroAttr {
  key: AttrKey;
  label: string;
  value: number;
  certainty: Certainty;
  /** What it does — shown by the inline inspect. Grounded in attributes.ts. */
  effect: string;
}

export type StatusKind = "guild" | "quest" | "idle";
export interface HeroStatus {
  kind: StatusKind;
  text: string;
}

export interface HeroTrait {
  name: string;
  /** The effect / the sentence that revealed it — shown by the inspect. */
  effect: string;
}

/** Six equipment slots (illustrative). A missing slot renders as an empty socket. */
export type GearSlot = "head" | "armor" | "mainhand" | "offhand" | "trinket1" | "trinket2";
export interface GearItem {
  name: string;
  effect: string;
}
export type Equipment = Partial<Record<GearSlot, GearItem>>;

/** A relationship. `scope` groups it (to the guild / to their party / to another
 * hero); `score` is a −100..100 rating mapped to a named feeling band by
 * relationships.ts. `type` is an optional flavour variant layered on the band —
 * the band/score is the INTENSITY, the variant is FLAVOUR and always respects
 * valence (a "rival" stays negative). Falls back to the band feeling when
 * absent. `targetId` links a hero-scope bond to another hero (for "Go to").
 * Illustrative — the bond sim doesn't exist until a later slice. */
export type BondScope = "guild" | "party" | "hero";
export interface Bond {
  scope: BondScope;
  name: string;
  score: number;
  note: string;
  type?: string;
  targetId?: string;
}

export interface Hero {
  id: string;
  name: string;
  archetype: string;
  presetKey: keyof typeof PRESETS;
  layers: ResolvedLayer[];
  status: HeroStatus;
  /** Exactly the 4 real attributes (§5 UI-lean). */
  attributes: HeroAttr[];
  equipment: Equipment;
  /** 0–3 discovered traits; the Character tab always shows 3 slots. */
  traits: HeroTrait[];
  bonds: Bond[];
}

function layersFor(presetKey: keyof typeof PRESETS): ResolvedLayer[] {
  const preset = PRESETS[presetKey];
  return resolveLayers(preset.items, preset.tints ?? {});
}

// Shared effect copy for the four attributes (what each does in the lean fight).
const EFFECT = {
  STR: "Raises hit damage and max HP.",
  DEX: "Speeds attacks; improves dodge, initiative, and crits.",
  STA: "Raises max HP.",
  PER: "Sharpens dodge and initiative — acts sooner.",
} as const;

function attrs(
  str: [number, Certainty],
  dex: [number, Certainty],
  sta: [number, Certainty],
  per: [number, Certainty],
): HeroAttr[] {
  return [
    { key: "STR", label: "Strength", value: str[0], certainty: str[1], effect: EFFECT.STR },
    { key: "DEX", label: "Dexterity", value: dex[0], certainty: dex[1], effect: EFFECT.DEX },
    { key: "STA", label: "Stamina", value: sta[0], certainty: sta[1], effect: EFFECT.STA },
    { key: "PER", label: "Perception", value: per[0], certainty: per[1], effect: EFFECT.PER },
  ];
}

export const HEROES: Hero[] = [
  {
    id: "brok",
    name: "Brok Ironhand",
    archetype: "Sellsword",
    presetKey: "knight",
    layers: layersFor("knight"),
    // Leads The Free Blades; between contracts at the hall (matches mockParties.ts).
    status: { kind: "guild", text: "At Guild Hall" },
    attributes: attrs([15, "verified"], [9, "claimed"], [13, "verified"], [7, "rumor"]),
    equipment: {
      armor: { name: "Steel Plate", effect: "Heavy mitigation; the sim's best armour tier." },
      mainhand: { name: "Arming Sword", effect: "Balanced one-hander." },
      offhand: { name: "Kite Shield", effect: "Adds block; frees no hand for a second weapon." },
    },
    traits: [
      { name: "Brave", effect: "Holds the line under stress; won't flee a losing fight." },
      { name: "Greedy", effect: "Chases the richest bounty; cheap to pull with gold." },
    ],
    bonds: [
      { scope: "guild", name: "The Guild", score: 45, note: "Renewed without a fuss last cycle." },
      { scope: "hero", name: "Ysolt", targetId: "ysolt", type: "Old grudge", score: -72, note: "Blames her for the crypt rout." },
      { scope: "hero", name: "Pell", targetId: "pell", type: "Drinking buddy", score: 58, note: "Drinks with him after every job." },
    ],
  },
  {
    id: "ysolt",
    name: "Ysolt Vane",
    archetype: "Champion",
    presetKey: "champion",
    layers: layersFor("champion"),
    // Leads The Iron Vigil into the Sunken Ruins — status matches the party's
    // reported location (mockParties.ts) so the sheet never contradicts the card.
    status: { kind: "quest", text: "On quest: Sunken Ruins" },
    attributes: attrs([16, "verified"], [12, "verified"], [14, "verified"], [11, "claimed"]),
    equipment: {
      head: { name: "Gilded Helm", effect: "Ornate; a proud hero's statement piece." },
      armor: { name: "Gilded Plate", effect: "Top-tier mitigation, at a top-tier price." },
      mainhand: { name: "Longsword", effect: "Two-handed reach and damage." },
      trinket1: { name: "Signet of Vane", effect: "Family seal; raises her asking price." },
    },
    traits: [
      { name: "Proud", effect: "Refuses quests she deems beneath her." },
      { name: "Disciplined", effect: "Never breaks formation; steadies a party." },
      { name: "Vengeful", effect: "Remembers every slight; hard to reconcile." },
    ],
    bonds: [
      { scope: "guild", name: "The Guild", score: 20, note: "Loyal while the pay flatters her." },
      { scope: "party", name: "The Iron Vigil", score: 40, note: "Leads them; expects deference." },
      { scope: "hero", name: "Brok", targetId: "brok", type: "Bitter rival", score: -68, note: "Thinks him a reckless brute." },
      { scope: "hero", name: "Doran", targetId: "doran", type: "Trusted second", score: 35, note: "Respects his steadiness." },
    ],
  },
  {
    id: "mira",
    name: "Mira Song",
    archetype: "Recruit",
    presetKey: "squire",
    layers: layersFor("squire"),
    status: { kind: "idle", text: "Idle" },
    attributes: attrs([6, "rumor"], [11, "claimed"], [8, "rumor"], [10, "claimed"]),
    equipment: {
      mainhand: { name: "Dagger", effect: "Fast, low damage; a beginner's blade." },
      armor: { name: "Leather Jerkin", effect: "Light mitigation; keeps her quick." },
    },
    // No traits discovered yet — the Character tab shows three empty "?" sockets.
    traits: [],
    bonds: [
      { scope: "guild", name: "The Guild", score: 12, note: "New; still proving herself." },
      { scope: "hero", name: "Pell", targetId: "pell", type: "Mentor", score: 30, note: "He's been showing her the ropes." },
    ],
  },
  {
    id: "doran",
    name: "Doran Blackfen",
    archetype: "Hedge Knight",
    presetKey: "knight",
    layers: layersFor("knight"),
    // The Iron Vigil's dependable second — same quest/location as Ysolt.
    status: { kind: "quest", text: "On quest: Sunken Ruins" },
    attributes: attrs([12, "claimed"], [8, "claimed"], [10, "verified"], [9, "rumor"]),
    equipment: {
      armor: { name: "Mail Hauberk", effect: "Mid-tier mitigation." },
      mainhand: { name: "Arming Sword", effect: "Balanced one-hander." },
      offhand: { name: "Round Shield", effect: "Light block; keeps him mobile." },
    },
    traits: [{ name: "Loyal", effect: "Turned down a rival's richer offer; slow to defect." }],
    bonds: [
      { scope: "guild", name: "The Guild", score: 66, note: "The steadiest hire on the books." },
      { scope: "party", name: "The Iron Vigil", score: 38, note: "The dependable second." },
      { scope: "hero", name: "Ysolt", targetId: "ysolt", type: "Follows her lead", score: 35, note: "Takes her orders without complaint." },
      { scope: "hero", name: "Mira", targetId: "mira", type: "Exasperated by", score: -22, note: "Finds her carelessness grating." },
    ],
  },
  {
    id: "pell",
    name: "Pell Quick",
    archetype: "Cutpurse",
    presetKey: "squire",
    layers: layersFor("squire"),
    status: { kind: "guild", text: "At Guild Hall" },
    attributes: attrs([5, "verified"], [15, "claimed"], [7, "claimed"], [12, "claimed"]),
    equipment: {
      mainhand: { name: "Dagger", effect: "Fast, low damage; his weapon of choice." },
      offhand: { name: "Parrying Dagger", effect: "A second blade instead of a shield." },
      armor: { name: "Leather Jerkin", effect: "Light mitigation; keeps him quick." },
      trinket1: { name: "Loaded Dice", effect: "Lucky charm; pure flavour for now." },
    },
    traits: [
      { name: "Nimble", effect: "Slips traps; strong on sneaking beats." },
      { name: "Coward", effect: "Flees when the fight turns; drags party morale." },
    ],
    bonds: [
      { scope: "guild", name: "The Guild", score: 8, note: "Here for the coin, nothing more." },
      { scope: "hero", name: "Brok", targetId: "brok", type: "Drinking buddy", score: 60, note: "His favourite drinking partner." },
      { scope: "hero", name: "Mira", targetId: "mira", type: "Protégé", score: 28, note: "Taken her under his wing." },
    ],
  },
];
