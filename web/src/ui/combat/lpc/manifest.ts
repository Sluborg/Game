// Asset manifest — the catalogue of LPC items actually committed under
// public/sprites/lpc/. Each item lists its image layers (path + variant + zPos).
// Adding gear = adding a row here + committing its PNG + crediting it. Nothing
// downstream hardcodes a file path.

import type { SpriteItem, SpriteLayer } from "./types";

/** Resolve a layer's runtime URL, honouring the Vite base (/Game/ or /Game/dev/). */
export function layerUrl(layer: SpriteLayer): string {
  return `${import.meta.env.BASE_URL}sprites/lpc/${layer.path}${layer.variant}.png`;
}

// zPos conventions from LPC: body 10, torso 60, head 100, weapon-behind 9,
// weapon-front 140. (The LPC "thick" body base is headless; the head is its own
// layer, which suits the slot system.)
const Z = { weaponBehind: 9, body: 10, torso: 60, head: 100, weaponFront: 140 } as const;

export const ITEMS: Record<string, SpriteItem> = {
  // Bodies (skin is not tintable, so a theme tint gilds gear, not flesh)
  body_male_light: {
    id: "body_male_light",
    slot: "body",
    label: "Human (light)",
    layers: [{ path: "body/bodies/male/", variant: "light", zPos: Z.body }],
  },

  // Head (separate LPC layer)
  head_human_male_light: {
    id: "head_human_male_light",
    slot: "head",
    label: "Human head",
    layers: [{ path: "head/heads/human/male/", variant: "light", zPos: Z.head }],
  },

  // Torso armour
  torso_leather: {
    id: "torso_leather",
    slot: "torso",
    label: "Leather",
    layers: [{ path: "torso/armour/leather/male/", variant: "leather", zPos: Z.torso, tintable: true }],
  },
  torso_leather_purple: {
    id: "torso_leather_purple",
    slot: "torso",
    label: "Leather (violet)",
    layers: [{ path: "torso/armour/leather/male/", variant: "purple", zPos: Z.torso, tintable: true }],
  },
  torso_plate_steel: {
    id: "torso_plate_steel",
    slot: "torso",
    label: "Plate (steel)",
    layers: [{ path: "torso/armour/plate/male/", variant: "steel", zPos: Z.torso, tintable: true }],
  },
  torso_plate_gold: {
    id: "torso_plate_gold",
    slot: "torso",
    label: "Plate (gilt)",
    layers: [{ path: "torso/armour/plate/male/", variant: "gold", zPos: Z.torso, tintable: true }],
  },

  // Weapons (each: behind-body layer + in-front layer)
  weapon_dagger: {
    id: "weapon_dagger",
    slot: "weapon",
    label: "Dagger",
    layers: [
      { path: "weapon/sword/dagger/behind/", variant: "dagger", zPos: Z.weaponBehind },
      { path: "weapon/sword/dagger/", variant: "dagger", zPos: Z.weaponFront, tintable: true },
    ],
  },
  weapon_arming: {
    id: "weapon_arming",
    slot: "weapon",
    label: "Arming sword",
    layers: [
      { path: "weapon/sword/arming/universal/bg/", variant: "steel", zPos: Z.weaponBehind },
      { path: "weapon/sword/arming/universal/fg/", variant: "steel", zPos: Z.weaponFront, tintable: true },
    ],
  },
  weapon_longsword: {
    id: "weapon_longsword",
    slot: "weapon",
    label: "Longsword",
    layers: [
      { path: "weapon/sword/longsword/universal_behind/", variant: "longsword", zPos: Z.weaponBehind },
      { path: "weapon/sword/longsword/", variant: "longsword", zPos: Z.weaponFront, tintable: true },
    ],
  },
};
