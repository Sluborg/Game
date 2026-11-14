// Dungeon words through the shared i18n table (src/i18n.ts, area 'dg'). Ids from dungeon.ts -> keys.
import { effectLines, type HeroClass, type Mods, type Weapon } from './dungeon';
import { lang, t, type Key } from './i18n';

const camel = (id: string) => id.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
export const tClass = (c: HeroClass) => t(`dg.class.${c}` as Key);
export const tClassHint = (c: HeroClass) => t(`dg.classHint.${c}` as Key);
export const tWeapon = (w: Weapon) => t(`dg.weapon.${w}` as Key);
/** Only the Krigare/Rogue weapons have a hint line on the weapon card. */
export const tWeaponHint = (w: Weapon) => (['dagger', 'sword', 'hammer', 'spear'].includes(w) ? t(`dg.weaponHint.${w}` as Key) : '');
/** The special belongs to the weapon (one weapon per special). */
export const tSpecial = (w: Weapon) => t(`dg.special.${w}` as Key);
/** 'rogue-rage' -> dg.skill.rogueRage */
export const tSkill = (id: string) => t(`dg.skill.${camel(id)}` as Key);
export const tItem = (id: string) => t(`dg.item.${id}` as Key);
/** "+20% skada · +25 hälsa": every effect of a skill or item as numbers (decimal comma in Swedish). */
export const tEffects = (mod: Partial<Mods>) => effectLines(mod).map(({ key, n }) => {
  const num = lang() === 'sv' ? String(n).replace('.', ',') : String(n);
  return t(`dg.fx.${key}` as Key, { n: num });
}).join(' · ');
export { t };
