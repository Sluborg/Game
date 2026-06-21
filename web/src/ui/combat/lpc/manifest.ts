// Asset manifest — the catalogue of LPC items actually committed under
// public/sprites/lpc/. Each item lists its image layers (path + variant + zPos +
// tint group). Adding gear = adding a row here + committing its PNG + crediting
// it. Nothing downstream hardcodes a file path.

import type { SpriteItem, SpriteLayer } from "./types";

/** Resolve a layer's runtime URL, honouring the Vite base (/Game/ or /Game/dev/). */
export function layerUrl(layer: SpriteLayer): string {
  return `${import.meta.env.BASE_URL}sprites/lpc/${layer.path}${layer.variant}.png`;
}

// zPos conventions from LPC: weapon-behind 9, body 10, torso 60, head 100,
// hair 120, weapon-front 140. (The LPC "thick" body base is headless; the head
// is its own layer, which suits the slot system.)
const Z = {
  weaponBehind: 9,
  body: 10,
  torso: 60,
  head: 100,
  hair: 120,
  ears: 130,
  weaponFront: 140,
} as const;

export const ITEMS: Record<string, SpriteItem> = {
  // Bodies + heads + hair belong to the "skin" tint group (recolored for monsters).
  body_male_light: {
    id: "body_male_light",
    slot: "body",
    label: "Human (light)",
    layers: [{ path: "body/bodies/male/", variant: "light", zPos: Z.body, tintGroup: "skin" }],
  },
  head_human_male_light: {
    id: "head_human_male_light",
    slot: "head",
    label: "Human head",
    layers: [{ path: "head/heads/human/male/", variant: "light", zPos: Z.head, tintGroup: "skin" }],
  },
  hair_chestnut: {
    id: "hair_chestnut",
    slot: "hair",
    label: "Hair (chestnut)",
    layers: [{ path: "hair/plain/male/", variant: "chestnut", zPos: Z.hair }],
  },
  ears_long: {
    id: "ears_long",
    slot: "ears",
    label: "Long ears",
    layers: [{ path: "head/ears/long/adult/", variant: "light", zPos: Z.ears, tintGroup: "skin" }],
  },

  // Torso armour — "gear" group (gilded by a divine tint).
  torso_leather: {
    id: "torso_leather",
    slot: "torso",
    label: "Leather",
    layers: [{ path: "torso/armour/leather/male/", variant: "leather", zPos: Z.torso, tintGroup: "gear" }],
  },
  torso_leather_purple: {
    id: "torso_leather_purple",
    slot: "torso",
    label: "Leather (violet)",
    layers: [{ path: "torso/armour/leather/male/", variant: "purple", zPos: Z.torso, tintGroup: "gear" }],
  },
  torso_plate_steel: {
    id: "torso_plate_steel",
    slot: "torso",
    label: "Plate (steel)",
    layers: [{ path: "torso/armour/plate/male/", variant: "steel", zPos: Z.torso, tintGroup: "gear" }],
  },
  torso_plate_gold: {
    id: "torso_plate_gold",
    slot: "torso",
    label: "Plate (gilt)",
    layers: [{ path: "torso/armour/plate/male/", variant: "gold", zPos: Z.torso, tintGroup: "gear" }],
  },

  // Weapons (behind-body layer + in-front layer) — "gear" group.
  weapon_dagger: {
    id: "weapon_dagger",
    slot: "weapon",
    label: "Dagger",
    layers: [
      { path: "weapon/sword/dagger/behind/", variant: "dagger", zPos: Z.weaponBehind },
      { path: "weapon/sword/dagger/", variant: "dagger", zPos: Z.weaponFront, tintGroup: "gear" },
    ],
  },
  weapon_arming: {
    id: "weapon_arming",
    slot: "weapon",
    label: "Arming sword",
    layers: [
      { path: "weapon/sword/arming/universal/bg/", variant: "steel", zPos: Z.weaponBehind },
      { path: "weapon/sword/arming/universal/fg/", variant: "steel", zPos: Z.weaponFront, tintGroup: "gear" },
    ],
  },
  weapon_mace: {
    id: "weapon_mace",
    slot: "weapon",
    label: "Mace",
    layers: [
      { path: "weapon/blunt/mace/universal_behind/", variant: "mace", zPos: Z.weaponBehind },
      { path: "weapon/blunt/mace/", variant: "mace", zPos: Z.weaponFront, tintGroup: "gear" },
    ],
  },
};
