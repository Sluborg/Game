// Presets + the bridge from the engine's appearance to an LPC unit visual. The
// engine is untouched: it still emits Appearance {body, weapon, armor} sprite
// ids; this UI layer maps those to LPC items, tints, scale and facing.

import type { Appearance } from "../../../game/battle";
import { ITEMS, layerUrl } from "./manifest";
import type { Preset, ResolvedLayer, Slot, Tint, TintMap } from "./types";

/** Named tints. Generic now; Norse/Greek/Egyptian "divine" tints are more rows. */
export const TINTS: Record<string, Tint> = {
  divine: { color: "#ffcf4a", strength: 0.42 }, // gilded gear, toward the Godblood palette
  goblinSkin: { color: "#74b24a", strength: 0.6 },
  orcSkin: { color: "#3f6b39", strength: 0.62 },
  trollSkin: { color: "#8b94a0", strength: 0.6 },
};

/** Everything the renderer needs for one unit. */
export interface UnitVisual {
  items: Partial<Record<Slot, string>>;
  tints: TintMap;
  /** Display size multiplier (deliberate hierarchy; a goblin never exceeds a troll). */
  scale: number;
  /** +1 lunges right (party), -1 lunges left (enemies). */
  lungeDir: 1 | -1;
}

/** Generic presets — a named bundle of layer ids + tints. Themed presets (e.g.
 * an "Aesir Champion") are just more rows like these, added as data. */
const HUMAN = { body: "body_male_light", head: "head_human_male_light", hair: "hair_chestnut" } as const;

export const PRESETS: Record<string, Preset> = {
  squire: { id: "squire", label: "Squire", items: { ...HUMAN, torso: "torso_leather", weapon: "weapon_dagger" } },
  knight: { id: "knight", label: "Knight", items: { ...HUMAN, torso: "torso_plate_steel", weapon: "weapon_arming" } },
  champion: {
    id: "champion",
    label: "Champion",
    items: { ...HUMAN, torso: "torso_plate_gold", weapon: "weapon_longsword" },
    tints: { gear: TINTS.divine },
  },
};

// --- Engine appearance -> LPC visual --------------------------------------------
// Pure presentation lookups keyed by the engine's sprite ids.

const WEAPON_ITEM: Record<Appearance["weapon"], string> = {
  dagger: "weapon_dagger",
  sword: "weapon_arming",
  greataxe: "weapon_longsword",
  cleaver: "weapon_arming",
  club: "weapon_dagger",
  greatclub: "weapon_longsword",
};

const ARMOR_ITEM: Record<Appearance["armor"], string | null> = {
  none: null,
  leather: "torso_leather",
  hide: "torso_leather",
  mail: "torso_plate_steel",
  plate: "torso_plate_gold",
};

const MONSTER_SKIN: Partial<Record<Appearance["body"], Tint>> = {
  goblin: TINTS.goblinSkin,
  orc: TINTS.orcSkin,
  troll: TINTS.trollSkin,
};

const SCALE: Record<Appearance["body"], number> = { knight: 1, goblin: 0.82, orc: 1.02, troll: 1.22 };

/** Build the LPC visual for an engine appearance. `divine` gilds hero gear. */
export function visualForAppearance(appearance: Appearance, divine = false): UnitVisual {
  const isHero = appearance.body === "knight";
  const items: Partial<Record<Slot, string>> = {
    body: "body_male_light",
    head: "head_human_male_light",
    weapon: WEAPON_ITEM[appearance.weapon],
  };
  if (isHero) items.hair = "hair_chestnut";
  const torso = ARMOR_ITEM[appearance.armor];
  if (torso) items.torso = torso;

  const tints: TintMap = {};
  if (isHero && divine) tints.gear = TINTS.divine;
  if (!isHero) tints.skin = MONSTER_SKIN[appearance.body];

  return { items, tints, scale: SCALE[appearance.body], lungeDir: isHero ? 1 : -1 };
}

// Stable, value-keyed cache: the arena re-renders every frame, but a unit's
// layer set only changes when its gear/tint does — so we hand back the same
// array identity and avoid reloading images each frame.
const visualCache = new Map<string, { layers: ResolvedLayer[]; scale: number; lungeDir: 1 | -1 }>();

export function visualFor(appearance: Appearance, divine = false) {
  const key = `${appearance.body}|${appearance.weapon}|${appearance.armor}|${divine ? "d" : ""}`;
  let cached = visualCache.get(key);
  if (!cached) {
    const v = visualForAppearance(appearance, divine);
    cached = { layers: resolveLayers(v.items, v.tints), scale: v.scale, lungeDir: v.lungeDir };
    visualCache.set(key, cached);
  }
  return cached;
}

/** Resolve item ids (+ per-group tints) into ordered, drawable layers. */
export function resolveLayers(items: Partial<Record<Slot, string>>, tints: TintMap = {}): ResolvedLayer[] {
  const resolved: ResolvedLayer[] = [];
  for (const itemId of Object.values(items)) {
    if (!itemId) continue;
    const item = ITEMS[itemId];
    if (!item) continue;
    for (const layer of item.layers) {
      const tint = layer.tintGroup ? tints[layer.tintGroup] : undefined;
      resolved.push({ url: layerUrl(layer), zPos: layer.zPos, tint });
    }
  }
  return resolved.sort((a, b) => a.zPos - b.zPos);
}
