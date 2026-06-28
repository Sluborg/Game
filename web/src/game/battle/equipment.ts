// Equipment catalogue. Gear is config-driven and the single source of truth for
// both stats (weapon swing speed, armor mitigation) AND appearance (which SVG
// layer renders on the model). Add a row here to add a weapon/armor everywhere.

export type WeaponSprite = "dagger" | "sword" | "greataxe" | "cleaver" | "club" | "greatclub";
export type ArmorSprite = "none" | "leather" | "mail" | "plate" | "hide";

export interface Weapon {
  id: string;
  name: string;
  /** Base seconds per swing before the Dex speed-up. */
  baseSeconds: number;
  sprite: WeaponSprite;
}

export interface Armor {
  id: string;
  name: string;
  /** Feeds armorMitigation(); 0 = unarmored. */
  value: number;
  sprite: ArmorSprite;
}

export const WEAPONS = {
  dagger: { id: "dagger", name: "Dagger", baseSeconds: 1.0, sprite: "dagger" },
  sword: { id: "sword", name: "Sword", baseSeconds: 1.6, sprite: "sword" },
  greataxe: { id: "greataxe", name: "Greataxe", baseSeconds: 2.6, sprite: "greataxe" },
  crudeBlade: { id: "crudeBlade", name: "Crude blade", baseSeconds: 1.4, sprite: "cleaver" },
  cleaver: { id: "cleaver", name: "Cleaver", baseSeconds: 1.7, sprite: "cleaver" },
  greatclub: { id: "greatclub", name: "Greatclub", baseSeconds: 2.4, sprite: "greatclub" },
} as const satisfies Record<string, Weapon>;

export const ARMORS = {
  none: { id: "none", name: "Unarmored", value: 0, sprite: "none" },
  scraps: { id: "scraps", name: "Scraps", value: 2, sprite: "leather" },
  leather: { id: "leather", name: "Leather", value: 5, sprite: "leather" },
  hide: { id: "hide", name: "Thick hide", value: 8, sprite: "hide" },
  mail: { id: "mail", name: "Mail", value: 10, sprite: "mail" },
  plate: { id: "plate", name: "Plate", value: 16, sprite: "plate" },
} as const satisfies Record<string, Armor>;

export type WeaponId = keyof typeof WEAPONS;
export type ArmorId = keyof typeof ARMORS;
