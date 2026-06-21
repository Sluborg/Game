// Sprite registries — id -> component. Swapping placeholder art for real art is
// a one-line change here; nothing else in the app references concrete sprites.

import type { JSX } from "react";
import type { ArmorSprite, BodySprite, WeaponSprite } from "../../../game/battle";
import { GoblinBody, KnightBody, OrcBody, TrollBody } from "./bodies";
import { Cleaver, Club, Dagger, Greataxe, Greatclub, Sword } from "./weapons";
import {
  HideArmor,
  LeatherArmor,
  MailArmor,
  NoArmor,
  PlateArmor,
  type ArmorProps,
} from "./armor";

export const BODY_SPRITES: Record<BodySprite, () => JSX.Element> = {
  knight: KnightBody,
  goblin: GoblinBody,
  orc: OrcBody,
  troll: TrollBody,
};

export const WEAPON_SPRITES: Record<WeaponSprite, () => JSX.Element> = {
  dagger: Dagger,
  sword: Sword,
  greataxe: Greataxe,
  cleaver: Cleaver,
  club: Club,
  greatclub: Greatclub,
};

export const ARMOR_SPRITES: Record<ArmorSprite, (props: ArmorProps) => JSX.Element> = {
  none: NoArmor,
  leather: LeatherArmor,
  hide: HideArmor,
  mail: MailArmor,
  plate: PlateArmor,
};
