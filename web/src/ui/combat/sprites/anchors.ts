// Sprite coordinate system. Every unit is drawn in one shared viewBox so the
// layered parts (body + armor + weapon) line up. Anchors say where to mount
// gear; swapping a body keeps the anchors, so weapons/armor still fit.

import type { BodySprite } from "../../../game/battle";

export const VIEWBOX = { w: 120, h: 140 } as const;

export interface Point {
  x: number;
  y: number;
}

export interface BodyAnchors {
  /** Weapon grip. */
  hand: Point;
  /** Helm / head-gear centre. */
  head: Point;
  /** Chest-armour centre. */
  chest: Point;
  /** Overall heft multiplier (troll is bigger, goblin smaller). */
  scale: number;
}

const BASE: BodyAnchors = {
  hand: { x: 93, y: 90 },
  head: { x: 60, y: 40 },
  chest: { x: 60, y: 82 },
  scale: 1,
};

export const BODY_ANCHORS: Record<BodySprite, BodyAnchors> = {
  knight: BASE,
  orc: { ...BASE, scale: 1.04 },
  goblin: { ...BASE, hand: { x: 92, y: 94 }, head: { x: 60, y: 44 }, scale: 0.86 },
  troll: { ...BASE, head: { x: 60, y: 34 }, scale: 1.16 },
};
