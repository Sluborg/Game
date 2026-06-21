// Unit roster — heroes and monster species as data. A template pairs an
// attribute block with an equipment loadout and a body sprite; the loadout
// drives stats (via equipment.ts) and the rendered model (body + armor + weapon).
//
// The Medium hero vs Goblin reproduces the Combat System worked example exactly:
//   Warrior Str10 Dex6 Sta10 Per5, mail(armor10), sword(1.6s)
//   Goblin  Str3  Dex5 Sta4  Per4, scraps(armor2), crude blade(1.4s)

import type { Attributes } from "./attributes";
import type { ArmorId, WeaponId } from "./equipment";

export type Side = "hero" | "monster";
export type BodySprite = "knight" | "goblin" | "orc" | "troll";

export interface UnitTemplate {
  id: string;
  name: string;
  side: Side;
  body: BodySprite;
  attributes: Attributes;
  weapon: WeaponId;
  armor: ArmorId;
}

export type HeroTier = "weak" | "medium" | "strong";

export const HERO_TEMPLATES: Record<HeroTier, UnitTemplate> = {
  weak: {
    id: "hero-weak",
    name: "Squire",
    side: "hero",
    body: "knight",
    attributes: { str: 6, dex: 5, sta: 6, per: 4 },
    weapon: "dagger",
    armor: "leather",
  },
  medium: {
    id: "hero-medium",
    name: "Knight",
    side: "hero",
    body: "knight",
    attributes: { str: 10, dex: 6, sta: 10, per: 5 },
    weapon: "sword",
    armor: "mail",
  },
  strong: {
    id: "hero-strong",
    name: "Champion",
    side: "hero",
    body: "knight",
    attributes: { str: 16, dex: 9, sta: 14, per: 8 },
    weapon: "greataxe",
    armor: "plate",
  },
};

export type MonsterSpecies = "goblin" | "orc" | "troll";

export const MONSTER_TEMPLATES: Record<MonsterSpecies, UnitTemplate> = {
  goblin: {
    id: "goblin",
    name: "Goblin",
    side: "monster",
    body: "goblin",
    attributes: { str: 3, dex: 5, sta: 4, per: 4 },
    weapon: "crudeBlade",
    armor: "scraps",
  },
  orc: {
    id: "orc",
    name: "Orc",
    side: "monster",
    body: "orc",
    attributes: { str: 7, dex: 5, sta: 7, per: 4 },
    weapon: "cleaver",
    armor: "leather",
  },
  troll: {
    id: "troll",
    name: "Troll",
    side: "monster",
    body: "troll",
    attributes: { str: 12, dex: 3, sta: 12, per: 3 },
    weapon: "greatclub",
    armor: "hide",
  },
};

export const HERO_TIERS = Object.keys(HERO_TEMPLATES) as HeroTier[];
export const MONSTER_SPECIES = Object.keys(MONSTER_TEMPLATES) as MonsterSpecies[];
