// Presets + the bridge from the engine's appearance to LPC items. The engine is
// untouched: it still emits Appearance {body, weapon, armor} sprite ids; this UI
// layer maps those to LPC item ids and resolves them to drawable layers.

import type { Appearance } from "../../../game/battle";
import { ITEMS, layerUrl } from "./manifest";
import type { Preset, ResolvedLayer, Slot, Tint } from "./types";

/** Named theme tints. Generic now; "Aesir/Greek/Egyptian" become more entries. */
export const TINTS: Record<string, Tint> = {
  divine: { color: "#ffcf4a", strength: 0.42 }, // gilded, toward the Godblood palette
  shadow: { color: "#6a2fbf", strength: 0.38 },
};

/** Generic hero presets (themed presets are just more rows like these). */
const HUMAN = { body: "body_male_light", head: "head_human_male_light" } as const;

export const PRESETS: Record<string, Preset> = {
  squire: {
    id: "squire",
    label: "Squire",
    items: { ...HUMAN, torso: "torso_leather", weapon: "weapon_dagger" },
  },
  knight: {
    id: "knight",
    label: "Knight",
    items: { ...HUMAN, torso: "torso_plate_steel", weapon: "weapon_arming" },
  },
  champion: {
    id: "champion",
    label: "Champion",
    items: { ...HUMAN, torso: "torso_plate_gold", weapon: "weapon_longsword" },
    tint: TINTS.divine,
  },
};

// --- Engine appearance -> LPC items ---------------------------------------------
// Pure presentation lookups; the engine's sprite ids are the keys.

const BODY_ITEM: Record<Appearance["body"], string> = {
  knight: "body_male_light",
  // Monsters keep the SVG renderer for now (Phase B brings LPC bodies for them).
  goblin: "body_male_light",
  orc: "body_male_light",
  troll: "body_male_light",
};

const WEAPON_ITEM: Record<Appearance["weapon"], string> = {
  dagger: "weapon_dagger",
  sword: "weapon_arming",
  greataxe: "weapon_longsword",
  cleaver: "weapon_arming",
  club: "weapon_arming",
  greatclub: "weapon_longsword",
};

const ARMOR_ITEM: Record<Appearance["armor"], string | null> = {
  none: null,
  leather: "torso_leather",
  hide: "torso_leather",
  mail: "torso_plate_steel",
  plate: "torso_plate_gold",
};

/** Item ids per slot for an engine appearance (Phase A: hero slots only). */
export function itemsForAppearance(appearance: Appearance): Partial<Record<Slot, string>> {
  const items: Partial<Record<Slot, string>> = {
    body: BODY_ITEM[appearance.body],
    head: "head_human_male_light",
    weapon: WEAPON_ITEM[appearance.weapon],
  };
  const armor = ARMOR_ITEM[appearance.armor];
  if (armor) items.torso = armor;
  return items;
}

/** Resolve item ids (+ optional tint) into ordered, drawable layers. */
export function resolveLayers(
  items: Partial<Record<Slot, string>>,
  tint?: Tint,
): ResolvedLayer[] {
  const resolved: ResolvedLayer[] = [];
  for (const itemId of Object.values(items)) {
    if (!itemId) continue;
    const item = ITEMS[itemId];
    if (!item) continue;
    for (const layer of item.layers) {
      resolved.push({ url: layerUrl(layer), zPos: layer.zPos, tint: tint && layer.tintable ? tint : undefined });
    }
  }
  return resolved.sort((a, b) => a.zPos - b.zPos);
}
