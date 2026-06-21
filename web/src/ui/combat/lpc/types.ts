// LPC sprite system — core types. A unit's appearance is a set of equipped
// items per slot; each item is one or more z-ordered image layers (LPC 64x64
// universal sheets). Everything here is data; the compositor renders it.

export const FRAME = 64;

/** Equipment slots, drawn back-to-front by each layer's zPos (not slot order). */
export type Slot = "body" | "legs" | "torso" | "head" | "ears" | "hair" | "shield" | "weapon";

/** Which theme-tint channel a layer belongs to (skin recolor vs gear recolor). */
export type TintGroup = "skin" | "gear";

/** A single LPC image layer: a spritesheet under public/sprites/lpc/. */
export interface SpriteLayer {
  /** Directory under sprites/lpc/, e.g. "weapon/sword/arming/universal/fg/". */
  path: string;
  /** Variant file name without extension, e.g. "steel". */
  variant: string;
  /** Paint order; lower draws first (further back). Mirrors LPC zPos. */
  zPos: number;
  /** Tint channel this layer responds to (skin = body/head/hair, gear = armour/weapon). */
  tintGroup?: TintGroup;
}

/** An equippable item = a named bundle of layers for one slot. */
export interface SpriteItem {
  id: string;
  slot: Slot;
  label: string;
  layers: SpriteLayer[];
}

/** Programmatic recolor hook applied to a layer. */
export interface Tint {
  /** CSS color painted over opaque pixels. */
  color: string;
  /** 0..1 blend strength. */
  strength: number;
}

/** Per-channel tints — e.g. green skin for a goblin, gilded gear for a champion. */
export interface TintMap {
  skin?: Tint;
  gear?: Tint;
}

/** A named bundle of equipped item ids per slot, plus an optional theme tint.
 * Themed presets (e.g. an "Aesir Champion") are just more of these, added as
 * data — no code change. */
export interface Preset {
  id: string;
  label: string;
  items: Partial<Record<Slot, string>>;
  tints?: TintMap;
}

/** LPC universal animation layout. `row` is the first of the 4 direction rows
 * (up, left, down, right); `singleDir` animations occupy one row only. */
export interface AnimationDef {
  row: number;
  frames: number;
  fps: number;
  loop: boolean;
  singleDir?: boolean;
}

export type AnimationName = "idle" | "walk" | "thrust" | "slash" | "hurt";

export type Direction = "up" | "left" | "down" | "right";

export const DIRECTION_ROW: Record<Direction, number> = { up: 0, left: 1, down: 2, right: 3 };

// Classic LPC block (rows 0-20), identical and top-aligned in both the 1344- and
// 2944-tall sheets, so every layer aligns regardless of its extra animations.
export const ANIMATIONS: Record<AnimationName, AnimationDef> = {
  idle: { row: 8, frames: 1, fps: 1, loop: true }, // standing frame of the walk block
  walk: { row: 8, frames: 9, fps: 8, loop: true },
  thrust: { row: 4, frames: 8, fps: 13, loop: false },
  slash: { row: 12, frames: 6, fps: 14, loop: false },
  hurt: { row: 20, frames: 6, fps: 11, loop: false, singleDir: true },
};

/** Resolved, ready-to-draw layer (absolute URL + paint order + optional tint). */
export interface ResolvedLayer {
  url: string;
  zPos: number;
  tint?: Tint;
}
