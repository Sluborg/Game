// Mock roster data for the Heroes scaffolding. There is no real hero /
// location / quest-state system yet (that arrives in Slice 1+), so this is a
// small static array — UI only, no persistence, no web/src/game/ dependency
// beyond reusing the LPC presenter for placeholder portraits.
//
// Each hero's LPC layer set is resolved ONCE here at module load, so the array
// identity is stable across renders (LpcSprite reloads its images whenever its
// `layers` prop identity changes — see LpcSprite.tsx:48 — and we don't want a
// reload/flash every time the roster re-renders or a sheet opens).

import { PRESETS, resolveLayers } from "../combat/lpc/presets";
import type { ResolvedLayer } from "../combat/lpc/types";

/** Certainty of a surfaced stat — DESIGN.md §5's keystone: it is encoded IN the
 * stat chip's own fill (solid = verified, hatched = claimed, plain "?" = rumor),
 * never as a separate glyph. */
export type Certainty = "verified" | "claimed" | "rumor";

export interface HeroStat {
  /** Short display label, e.g. "MIG". */
  label: string;
  value: number;
  certainty: Certainty;
}

/** Where a hero is right now — the roster's whole reason to exist. `kind` drives
 * a colour-coded status dot so the roster reads at a glance, not by reading. */
export type StatusKind = "guild" | "quest" | "idle";
export interface HeroStatus {
  kind: StatusKind;
  text: string;
}

/** A discovered trait. Undiscovered slots are rendered as empty sockets by the
 * stat page, not stored here. */
export interface HeroTrait {
  name: string;
  /** The sentence that revealed it (flavour; Slice 3 will make these real). */
  blurb: string;
}

export interface HeroRelation {
  verb: "likes" | "hates";
  name: string;
}

export interface HeroEquipment {
  weapon: string;
  armor: string;
}

export interface Hero {
  id: string;
  name: string;
  archetype: string;
  presetKey: keyof typeof PRESETS;
  /** Stable, resolved LPC layers for this hero's placeholder portrait. */
  layers: ResolvedLayer[];
  status: HeroStatus;
  /** 3–4 headline stats only — "sim-full, UI-lean" (DESIGN.md §5). */
  stats: HeroStat[];
  equipment: HeroEquipment;
  /** 0–3 discovered traits; the stat page always shows exactly 3 slots, filling
   * the remainder with empty "?" sockets. */
  traits: HeroTrait[];
  relations: HeroRelation[];
}

function layersFor(presetKey: keyof typeof PRESETS): ResolvedLayer[] {
  const preset = PRESETS[presetKey];
  return resolveLayers(preset.items, preset.tints ?? {});
}

export const HEROES: Hero[] = [
  {
    id: "brok",
    name: "Brok Ironhand",
    archetype: "Sellsword",
    presetKey: "knight",
    layers: layersFor("knight"),
    status: { kind: "quest", text: "On quest: Ruins" },
    stats: [
      { label: "MIG", value: 14, certainty: "verified" },
      { label: "GRT", value: 12, certainty: "verified" },
      { label: "AGI", value: 9, certainty: "claimed" },
      { label: "WIT", value: 7, certainty: "rumor" },
    ],
    equipment: { weapon: "Arming sword", armor: "Steel plate" },
    traits: [
      { name: "Brave", blurb: "Held the line when the wall fell." },
      { name: "Greedy", blurb: "First to the loot, every time." },
    ],
    relations: [
      { verb: "likes", name: "Pell" },
      { verb: "hates", name: "Ysolt" },
    ],
  },
  {
    id: "ysolt",
    name: "Ysolt Vane",
    archetype: "Champion",
    presetKey: "champion",
    layers: layersFor("champion"),
    status: { kind: "guild", text: "At Guild Hall" },
    stats: [
      { label: "MIG", value: 16, certainty: "verified" },
      { label: "GRT", value: 13, certainty: "verified" },
      { label: "AGI", value: 11, certainty: "verified" },
      { label: "WIT", value: 10, certainty: "claimed" },
    ],
    equipment: { weapon: "Longsword", armor: "Gilded plate" },
    traits: [
      { name: "Proud", blurb: "Refuses quests she deems beneath her." },
      { name: "Disciplined", blurb: "Never breaks formation." },
      { name: "Vengeful", blurb: "Remembers every slight." },
    ],
    relations: [
      { verb: "hates", name: "Brok" },
      { verb: "likes", name: "Doran" },
    ],
  },
  {
    id: "mira",
    name: "Mira Song",
    archetype: "Recruit",
    presetKey: "squire",
    layers: layersFor("squire"),
    status: { kind: "idle", text: "Idle" },
    stats: [
      { label: "MIG", value: 6, certainty: "rumor" },
      { label: "AGI", value: 11, certainty: "claimed" },
      { label: "WIT", value: 8, certainty: "rumor" },
    ],
    equipment: { weapon: "Dagger", armor: "Leather" },
    // No traits discovered yet — the stat page shows three empty "?" sockets.
    traits: [],
    relations: [{ verb: "likes", name: "Pell" }],
  },
  {
    id: "doran",
    name: "Doran Blackfen",
    archetype: "Hedge Knight",
    presetKey: "knight",
    layers: layersFor("knight"),
    status: { kind: "quest", text: "On quest: Ruins" },
    stats: [
      { label: "MIG", value: 12, certainty: "claimed" },
      { label: "GRT", value: 10, certainty: "verified" },
      { label: "AGI", value: 8, certainty: "claimed" },
      { label: "WIT", value: 9, certainty: "rumor" },
    ],
    equipment: { weapon: "Arming sword", armor: "Mail" },
    traits: [{ name: "Loyal", blurb: "Turned down a rival's richer offer." }],
    relations: [
      { verb: "likes", name: "Ysolt" },
      { verb: "hates", name: "Mira" },
    ],
  },
  {
    id: "pell",
    name: "Pell Quick",
    archetype: "Cutpurse",
    presetKey: "squire",
    layers: layersFor("squire"),
    status: { kind: "guild", text: "At Guild Hall" },
    stats: [
      { label: "AGI", value: 15, certainty: "claimed" },
      { label: "WIT", value: 12, certainty: "claimed" },
      { label: "MIG", value: 5, certainty: "verified" },
    ],
    equipment: { weapon: "Dagger", armor: "Leather" },
    traits: [
      { name: "Nimble", blurb: "Slipped every trap in the crypt." },
      { name: "Coward", blurb: "Fled the moment the ogre turned." },
    ],
    relations: [
      { verb: "likes", name: "Brok" },
      { verb: "likes", name: "Mira" },
    ],
  },
];
