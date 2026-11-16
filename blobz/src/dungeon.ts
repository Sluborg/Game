// Dungeon: generated floors, classes, goo enemies, gold, team XP. Pure TypeScript (no Phaser).
// The host runs it inside the normal sim (sim.ts, mode 'dungeon'); clients rebuild the same map from
// seed + floor and render the snapshot (dsnap/dview below).
// Started by Code (sim + tests), continued by Code 2. Balance pass after Stefan's playtest: health in points
// (shown as a bar), tougher goo that gang up, spitting goo, a two-phase boss, fewer and clearer items/skills.
import { rng } from './rng';

export const DT = 32; // one dungeon tile in world px
export const GW = 40;
export const GH = 30;
/** Floors per dungeon (Stefan 2026-11-15: Dungeon 1 = 5 floors, Dungeon 2 = 5 floors, ...; the boss on the last). */
export const FLOORS = 5;
const BLOB_R = 17;

// ---- classes, weapons, specials, sidesteps, level-up skills, loot items (all data) ----
export type HeroClass = 'rogue' | 'healer' | 'marksman' | 'tank';
export const CLASSES: HeroClass[] = ['healer', 'rogue', 'tank', 'marksman'];
// Player-facing names live in src/i18n.ts ('dg.class.*', 'dg.weapon.*', 'dg.skill.*' ...), see dungeonText.ts.
/** Art's skill icon: art/dungeon/skills/<class>-<id>.png (file names = skill ids). */
/** Ninja Adventure skill icons (24x24, Ui/Skill Icon/..., docs/OLD_ART_CHECKLIST.md) per level-up skill. */
const NA_SKILL: Record<string, string> = {
  // interim Ninja picks matching the texts, no duplicates (ChatGPT N-23 icons replace them)
  'rogue-rage': 'Items & Weapon/Boot', 'rogue-knockback': 'Spell/Explosion', 'rogue-whirlwind': 'Items & Weapon/Shuriken', 'rogue-extraheart': 'Job & Action/Dish',
  'rogue-lifesteal': 'Job & Action/Potion', 'rogue-power': 'Spell/AttackUpgrade',
  'healer-heal': 'Spell/Heal', 'healer-regen': 'Spell/OrbPlant', 'healer-bubble': 'Spell/OrbWater', 'healer-revive': 'Spell/OrbLight',
  'healer-holy': 'Spell/BookLight', 'healer-cleanse': 'Spell/MagicWeapon',
  'marksman-multishot': 'Items & Weapon/Kunai', 'marksman-pierce': 'Items & Weapon/Arrow', 'marksman-crit': 'Spell/Vision', 'marksman-speed': 'Spell/Upgrade',
  'marksman-poison': 'Spell/BookIce', 'marksman-trap': 'Meteo/Snow',
  'tank-block': 'Spell/DefenseUpgrade', 'tank-taunt': 'Job & Action/Sing', 'tank-armor': 'Items & Weapon/Armor', 'tank-charge': 'Spell/Cut',
  'tank-stun': 'Spell/BookThunder', 'tank-guard': 'Items & Weapon/Guard',
};
/** ChatGPT N-23 skill icons (16 px, art/dungeon/skills/<id>.png); the Ninja picks above stay as the fallback for unknown ids. */
export const skillIcon = (id: string) => (id in NA_SKILL ? `art/dungeon/skills/${id}.png` : `assets/ninja-adventure/Ui/Skill Icon/${NA_SKILL[id] ?? 'Spell/Upgrade'}.png`);
/** (Ninja icons for the special button per weapon live in dungeonUi.ts.) */
/** ChatGPT N-23 item icons: drawn objects (16 px), shown in a square wood cell. */
export const ITEM_ICON: Record<string, string> = Object.fromEntries(['ring', 'helm', 'gloves', 'amulet', 'stone'].map((k) => [k, `art/dungeon/items/${k}.png`]));
/** Health points per class (the HUD shows a bar). */
export const CLASS_HP: Record<HeroClass, number> = { rogue: 100, healer: 100, marksman: 80, tank: 140 };
export type Weapon = 'sword' | 'hammer' | 'spear' | 'staff' | 'bow' | 'shield' | 'dagger';
/** Order is the snapshot index: only append. */
export const WEAPONS: Weapon[] = ['sword', 'hammer', 'spear', 'staff', 'bow', 'shield', 'dagger'];
// the spear stays in the code but is not offered (Stefan: too strong for now); classOf('spear') still gives 'rogue'
// Stefan: ONE weapon per class (rogue dagger, healer wand, knight sword + shield, marksman crossbow); the other weapons
// stay in the code, not offered
export const CLASS_WEAPONS: Record<HeroClass, Weapon[]> = { rogue: ['dagger'], healer: ['staff'], marksman: ['bow'], tank: ['shield'] };
export const classOf = (w: Weapon): HeroClass => CLASSES.find((c) => CLASS_WEAPONS[c].includes(w)) ?? 'rogue';
/** Auto-attack: reach (px from the blob centre to the goo's edge), half-arc (radians, PI = all around),
 *  damage (goo hit points), seconds between attacks, knockback; ranged = a bolt at the nearest goo in sight. */
export const WEAPON_STATS: Record<Weapon, { reach: number; arc: number; dmg: number; cd: number; kb: number; ranged?: boolean }> = {
  sword: { reach: 56, arc: 1.0, dmg: 12, cd: 0.4, kb: 160 }, // fast, medium reach
  hammer: { reach: 58, arc: Math.PI, dmg: 26, cd: 0.9, kb: 380 }, // slow, hits all around, big knockback
  spear: { reach: 96, arc: 0.3, dmg: 14, cd: 0.55, kb: 200 }, // long and narrow
  staff: { reach: 170, arc: 0, dmg: 8, cd: 0.6, kb: 80, ranged: true }, // the healer's wand: bolts (damage or heal mode)
  bow: { reach: 200, arc: 0, dmg: 7, cd: 0.6, kb: 90, ranged: true }, // crossbow: safe at range, so clearly less damage than melee (~42% of the sword)
  shield: { reach: 56, arc: 1.0, dmg: 10, cd: 0.5, kb: 280 }, // the Riddare: a heavier, slower sword slash with big knockback (id stays 'shield')
  dagger: { reach: 44, arc: 1.2, dmg: 7, cd: 0.25, kb: 80 }, // the rogue's two daggers: very fast, short (Stefan: rogue runs too easy, 8 -> 7)
};
export type SpecialKind = 'spin' | 'slam' | 'lunge' | 'heal' | 'wall' | 'volley';
export interface SpecialDef { kind: SpecialKind; cd: number; r: number; dmg: number; kb: number; stun: number }
export const SPECIALS: Record<string, SpecialDef> = {
  'rogue:dagger': { kind: 'spin', cd: 5, r: 72, dmg: 22, kb: 200, stun: 0.6 },
  'rogue:sword': { kind: 'spin', cd: 6, r: 84, dmg: 25, kb: 300, stun: 0.5 },
  'rogue:hammer': { kind: 'slam', cd: 8, r: 110, dmg: 35, kb: 480, stun: 0.9 },
  'rogue:spear': { kind: 'lunge', cd: 7, r: 30, dmg: 25, kb: 220, stun: 0.4 },
  'healer:staff': { kind: 'heal', cd: 9, r: 150, dmg: 0, kb: 0, stun: 0 }, // heals + revives friends around
  'marksman:bow': { kind: 'volley', cd: 7, r: 260, dmg: 14, kb: 160, stun: 0.3 }, // bolts at several goo
  'tank:shield': { kind: 'wall', cd: 10, r: 120, dmg: 0, kb: 360, stun: 0.6 }, // friends inside take no damage
};
export const specialOf = (cls: HeroClass, w: Weapon): SpecialDef => SPECIALS[`${cls}:${w}`] ?? SPECIALS['rogue:dagger'];
export const HEAL_HP = 25; // healer's light, per friend (old special)
export const HEAL_BOLT = 10; // the healer's wand in heal mode, per bolt
export const STILL_SPEED = 25; // the marksman only shoots standing still (slower than this)
const HOLD_GAP = 0.4; // the big button repeats every 0.3 s while held: held = a press within this long
/** The small round button = a CLASS MOVE (Stefan): rogue dodge sideways (2 charges), marksman jump back, knight shield
 *  charge ending in a slash, healer phase out (untouchable, can't attack). Seconds until it is ready again (per charge). */
export const CLASS_MOVE_COOLDOWN: Record<HeroClass, number> = { rogue: 6, marksman: 8, tank: 8, healer: 8 };
export const ROGUE_CHARGES = 2;
export const MOVE_SPEED = 400; // the sim lets a dashing blob reach 1.7x its top speed (~408)
export const MOVE_DODGE: Record<HeroClass, number> = { rogue: 0.4, marksman: 0.45, tank: 0, healer: 2 }; // untouchable (s); healer = the phase
export const CHARGE_T = 0.45; // knight shield charge (stops early once the sword reaches a monster)
const LUNGE_SPEED = 400; // the sim lets a dashing blob reach 1.7x its top speed (~408)
const LUNGE_T = 0.35;
export const DODGE_T = 0.4; // rogue dodge (see MOVE_DODGE)
export const WALL_T = 3;

/** What skills and items change on a hero. `dmg`, `rate`, `spCd`, `spR`, `kb`, `heal` multiply (start 1), the rest add.
 *  Every field must change something you can see in play (unit test per skill and item). */
export interface Mods {
  dmg: number; rate: number; reach: number; hp: number; spCd: number; spR: number; heal: number; shieldAll: number; regen: number;
  arrows: number; pierce: number; wallT: number; taunt: number; killHeal: number;
  kb: number; stun: number; crit: number; trap: number; dodge: number; koFast: number;
  mvCd: number; // class move recharge time (x)
}
const NO_MODS: Mods = {
  dmg: 1, rate: 1, reach: 0, hp: 0, spCd: 1, spR: 1, heal: 1, shieldAll: 0, regen: 0, arrows: 0, pierce: 0, wallT: 0, taunt: 0, killHeal: 0,
  kb: 1, stun: 0, crit: 0, trap: 0, dodge: 0, koFast: 0, mvCd: 1,
};
const MULT: (keyof Mods)[] = ['mvCd', 'dmg', 'rate', 'spCd', 'spR', 'kb', 'heal'];
export const REGEN_EVERY = 4; // seconds; regen heals `regen` points each time
/** One line per effect for the cards: a number the player can read ("+20% skada"). Keys: dg.fx.<key>. */
export function effectLines(mod: Partial<Mods>): { key: string; n: number }[] {
  const out: { key: string; n: number }[] = [];
  const pct = (v: number) => Math.round(Math.abs(v - 1) * 100);
  for (const [k, v] of Object.entries(mod) as [keyof Mods, number][]) {
    if (k === 'rate' || k === 'spCd' || k === 'mvCd') out.push({ key: k, n: pct(v) }); // shorter wait = faster
    else if (MULT.includes(k)) out.push({ key: k, n: pct(v) });
    else out.push({ key: k, n: k === 'crit' ? Math.round(v * 100) : v });
  }
  return out;
}
/** Level-up cards: 6 per class. Ids match Art's icons art/dungeon/skills/<id>.png; `icon` = Kenney tile fallback. */
export interface SkillDef { id: string; cls: HeroClass; icon: number; mod: Partial<Mods> }
export const SKILLS: SkillDef[] = [
  { id: 'rogue-rage', cls: 'rogue', icon: 103, mod: { rate: 0.8 } }, // attacks 20% faster
  { id: 'rogue-knockback', cls: 'rogue', icon: 118, mod: { kb: 1.5 } }, // 50% harder push
  { id: 'rogue-whirlwind', cls: 'rogue', icon: 107, mod: { spR: 1.3 } }, // special 30% bigger
  { id: 'rogue-extraheart', cls: 'rogue', icon: 115, mod: { hp: 25 } },
  { id: 'rogue-lifesteal', cls: 'rogue', icon: 127, mod: { killHeal: 1 } }, // +1 health per splat, at most LIFESTEAL_CAP a second (Stefan: was 5, far too strong)
  { id: 'rogue-power', cls: 'rogue', icon: 104, mod: { dmg: 1.25 } },
  { id: 'healer-heal', cls: 'healer', icon: 115, mod: { heal: 1.5 } },
  { id: 'healer-regen', cls: 'healer', icon: 114, mod: { regen: 4 } }, // +4 health every 4 s
  { id: 'healer-bubble', cls: 'healer', icon: 102, mod: { shieldAll: 1 } }, // a heal bolt also blocks 1 hit
  { id: 'healer-revive', cls: 'healer', icon: 127, mod: { koFast: 2 } }, // knocked-out friends wake 2 s sooner
  { id: 'healer-holy', cls: 'healer', icon: 129, mod: { dmg: 1.4 } },
  { id: 'healer-cleanse', cls: 'healer', icon: 130, mod: { rate: 0.8 } }, // wand bolts 20% faster
  { id: 'marksman-multishot', cls: 'marksman', icon: 131, mod: { arrows: 2 } },
  { id: 'marksman-pierce', cls: 'marksman', icon: 107, mod: { pierce: 1 } },
  { id: 'marksman-crit', cls: 'marksman', icon: 104, mod: { crit: 0.25 } }, // 1 in 4 bolts hits double
  { id: 'marksman-speed', cls: 'marksman', icon: 105, mod: { rate: 0.8 } },
  { id: 'marksman-poison', cls: 'marksman', icon: 114, mod: { stun: 0.5 } }, // hit goo freeze longer
  { id: 'marksman-trap', cls: 'marksman', icon: 64, mod: { trap: 1.5 } }, // the volley freezes goo
  { id: 'tank-block', cls: 'tank', icon: 101, mod: { dodge: 0.4 } },
  { id: 'tank-taunt', cls: 'tank', icon: 108, mod: { taunt: 100 } },
  { id: 'tank-armor', cls: 'tank', icon: 96, mod: { hp: 40 } },
  { id: 'tank-charge', cls: 'tank', icon: 102, mod: { dmg: 1.3 } },
  { id: 'tank-stun', cls: 'tank', icon: 117, mod: { stun: 0.6 } },
  { id: 'tank-guard', cls: 'tank', icon: 65, mod: { rate: 0.85 } }, // sword 15% faster
];
export const skillOf = (id: string) => SKILLS.find((k) => k.id === id);
/** Rare loot (boss, chests): ITEM_SLOTS (3) item slots per blob, each item with one clear effect. */
export interface ItemDef { id: string; icon: number; mod: Partial<Mods> }
export const ITEMS: ItemDef[] = [
  { id: 'ring', icon: 113, mod: { dmg: 1.2 } },
  { id: 'helm', icon: 96, mod: { hp: 30 } },
  { id: 'gloves', icon: 105, mod: { rate: 0.85 } },
  { id: 'amulet', icon: 126, mod: { mvCd: 0.7 } }, // class move recharges 30% faster (works for every class)
  { id: 'stone', icon: 114, mod: { regen: 5 } },
];
export const itemOf = (id: string | null | undefined) => ITEMS.find((i) => i.id === id);
export const LOOT_SECONDS = 20;
export const CHEST_ITEM_CHANCE = 0.5; // the boss always drops one

// ---- goo ----
/** Ninja Adventure monsters: 0 small = Bat (telegraphed dash, hit and run), 1 medium = Slime (telegraphed dash, then a
 *  bite where it lands), 2 boss = Giant Slime (telegraphed jump slam), 3 spitter = Eye (aims, then a burst of 3 shots) */
export type EnemyKind = 0 | 1 | 2 | 3;
export const ENEMY_HP = [20, 50, 300, 30];
/** Visible size of each monster's first frame (px) and its world scale: the hitbox is the drawn sprite. */
export const GOO_ART: [number, number][] = [[16, 15], [16, 12], [40, 22], [14, 16]];
export const GOO_SCALE = [2, 3, 3, 3]; // whole numbers only (integer pixels); the eye was 2.5
export const ENEMY_R = GOO_ART.map(([w, h], k) => Math.round(((w + h) / 4) * GOO_SCALE[k]));
export const ENEMY_SPEED = [92, 68, 46, 70];
export const ENEMY_TOUCH = [8, 12, 18, 6]; // health lost per touch (floor 1)
export const ENEMY_GOLD = [1, 3, 15, 2];
export const ENEMY_XP = [1, 3, 10, 2];
const ENEMY_SIGHT = 300; // they wake up and chase within this range
const ALERT_R = 240; // a goo that wakes calls the goo around it: they gang up
/** Difficulty (Stefan: gentle start, slow scaling, each dungeon a step harder; the old 3-floor difficulty is about
 *  Dungeon 3). tier = 0 on Dungeon 1 floor 1, +1 per dungeon, +0.25 per floor. */
export const tierOf = (dungeon: number, floor: number) => Math.max(0, dungeon - 1) + (Math.max(1, floor) - 1) / (FLOORS - 1);
/** monster health: 60% at the start, the old floor-1 health from Dungeon 3 */
export const hpMul = (dungeon: number, floor: number) => 0.6 + 0.2 * tierOf(dungeon, floor);
/** monster damage: half at the start, the old floor-1 damage from Dungeon 3 */
export const dmgMulOf = (dungeon: number, floor: number) => 0.5 + 0.25 * tierOf(dungeon, floor);
/** pause between telegraphed attacks: 1.5x at the start, the old pause from Dungeon 3 */
export const actMul = (dungeon: number, floor: number) => Math.max(1, 1.5 - 0.25 * tierOf(dungeon, floor));
/** how crowded a floor is (the old floor number 1..3+): 1 on Dungeon 1's first floors */
export const crowdOf = (dungeon: number, floor: number) => Math.min(5, 1 + Math.round(tierOf(dungeon, floor)));
/** Monster health on a floor; more blobz = more health. */
export const floorHp = (floor: number, players: number, dungeon = 1) => hpMul(dungeon, floor) * (1 + 0.25 * Math.max(0, Math.min(5, players) - 1));
export const floorDmg = (floor: number, dungeon = 1) => dmgMulOf(dungeon, floor);
export const SPIT_EVERY = 2.2;
export const SPIT_SPEED = 210;
export const SPIT_DMG = 10;
const SPIT_LIFE = 2.2;
const SPIT_R = 7;
// telegraphed monster attacks (the warning is long enough to sidestep): dash -> (slime) bite / (bat) back off; aim -> burst
export const DASH_WARN = 0.6, DASH_SPEED = 430, DASH_TIME = 0.32, DASH_MIN = 50, DASH_MAX = 210;
export const BITE_WARN = 0.35, BITE_SPEED = 360, BITE_TIME = 0.18, FLEE_TIME = 0.7;
export const AIM_WARN = 0.55, BURST = 3, BURST_GAP = 0.11, BURST_SPREAD = 0.09, BURST_DMG = 6;
export const ACT_CD = [2.6, 3.2, 0, 3.0]; // seconds between attacks per kind
/** Enemy action: 0 none, 1 dash wind-up, 2 dashing, 3 bite wind-up, 4 biting, 5 aiming, 6 firing the burst, 7 backing off */
export type Act = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const SLAM_EVERY = 4; // boss: telegraphed slam (phase 2: every 2.5 s, plus a ring of spit and 2 small goo)
export const SLAM_EVERY_2 = 2.5;
export const SLAM_WARN = 1.1; // red ring on the ground before it lands
export const SLAM_R = 72;
export const SLAM_DMG = 25;
/** rooms: the bosses are tougher (Stefan: too easy): health / slam damage, a ring of 6 shots in phase 1, faster slams in phase 2 */
export const ROOM_BOSS = { hp: 1.4, dmg: 1.25, ringEvery: 5, ring: 6, slamEvery2: 1.9 };
export const KO_SECONDS = 5;
export const RUN_SECONDS = 300; // a run ends (back to the meadow) after 5 minutes at the latest (only with the timer on)
/** Stefan 2026-11-15: no time limit underground (docs/ARCHIVED.md). The clock is hidden and never ends a run. */
export const DUNGEON_TIMER_ENABLED = false;
export const DONE_SECONDS = 6; // "Dungeon klar!" stays this long
const HURT_INV = 0.8; // invulnerable after a hit
/** Team XP needed to reach level n+1 (index = current level - 1). */
export const LEVEL_XP = [5, 12, 22, 35, 52, 75];
/** Boss health grows with the team: 300 for one blob, +60% per extra blob. */
/** Boss health: the old 300 (x team size) on Dungeon 3, less before (Dungeon 1: 200), more after. */
export const bossHp = (players: number, dungeon = 3) => Math.round(ENEMY_HP[2] * (hpMul(dungeon, FLOORS) / hpMul(3, FLOORS)) * (1 + 0.6 * Math.max(0, Math.min(5, players) - 1)));
export const POTION_HP = 25;


export interface Room { x: number; y: number; w: number; h: number } // tiles
export interface Floor {
  floor: number;
  solid: Uint8Array; // gw*gh (default GW*GH), 1 = wall
  gw?: number; gh?: number; // grid size when not GW x GH (the tall Archero rooms)
  inset?: number; // rooms: the side walls are only this thick (world px); the edge columns are floor up to them
  columns?: { x: number; y: number }[]; // rooms: 0x72 columns as cover (tile x, base row y; rows y-1..y are solid)
  walls?: { x: number; y: number }[]; // rooms: 0x72 brick wall tiles inside the room (each solid)
  dt?: number; // tile size in world px when not DT (rooms: 48 = the 0x72 16 px tiles at 3x)
  waves?: { kind: EnemyKind; x: number; y: number }[][]; // rooms mode: the waves of this room (spawned one after another)
  lines?: number[]; // rooms mode (corridor): wave k+1 also starts when a blob climbs above lines[k] (world y)
  rooms: Room[];
  start: { x: number; y: number }; // world px: arrival (and revive) point
  exit: { x: number; y: number }; // stairs up in the first room's corner: leave the dungeon
  stairs: { x: number; y: number }; // stairs down (floors 1-2) or the exit after the boss (floor 3)
  chests: { x: number; y: number }[];
  spawns: { kind: EnemyKind; x: number; y: number; calm?: boolean }[]; // calm = no telegraphed attacks (a calm start)
}

const cx = (r: Room) => (r.x + r.w / 2) * DT;
const cy = (r: Room) => (r.y + r.h / 2) * DT;

// ---- Archero-style rooms (behind ROOMS_ENABLED; docs/dungeon-rooms-plan.md) ----
/** Off until Stefan rates it; `?rooms` in the host's URL turns it on for testing. */
export const ROOMS_ENABLED = true;
const urlHas = (k: string) => typeof location !== 'undefined' && new URLSearchParams(location.search).has(k);
/** rooms on: the default (Stefan 2026-11-15); ?classic on the host's URL = the old 5-floor dungeon, ?rooms forces rooms */
export const roomsOn = () => urlHas('rooms') || (ROOMS_ENABLED && !urlHas('classic'));

export const ROOMS = 10; // rooms per dungeon (boss room last)
export const MINIBOSS_ROOM = 5;
export const ROOM_W = 7; // floor tiles between the side walls in the widest room (0x72 tiles at 3x: 9 x 48 = 432 px)
/** Integer scale (Stefan 2026-11-15): the room is drawn at exactly 3x, so its width in tiles follows the NARROWEST
 *  player's portrait screen width: floor(width / 48), 7..9 tiles (360 px -> 7, 390 / 412 -> 8, 432+ -> 9).
 *  0 = unknown (tests, before any input) -> the widest room. */
export const roomTiles = (sw = 0) => (sw > 0 ? Math.max(7, Math.min(9, Math.floor(sw / 48))) : ROOM_W + 2);
/** the bottom wall's entrance gap: 3 tiles in an odd-width room, 2 in an even one (centred under the door) */
export const roomGap = (W: number) => (W % 2 ? [Math.floor(W / 2) - 1, Math.floor(W / 2), Math.floor(W / 2) + 1] : [W / 2 - 1, W / 2]);
const ROOM_FIRST_WAVE = 1.2; // seconds before the first wave lands (a calm arrival)
const WAVE_GAP = 0.8; // seconds between a cleared wave and the next
export const SPAWN_WARN = 0.8; // a landing ring shows this long before the monster appears
export type RoomType = 'arena' | 'corridor' | 'boss';
export const roomType = (room: number): RoomType => (room === ROOMS || room === MINIBOSS_ROOM ? 'boss' : room % 2 === 1 ? 'arena' : 'corridor');
/** the last floor / room of the run */
export const lastFloor = (d: { rooms?: boolean }) => (d.rooms ? ROOMS : FLOORS);
/** the floor the difficulty reads (rooms spread one dungeon's 5 floors over its 10 rooms) */
export const diffFloor = (d: { rooms?: boolean; floor: number }) => (d.rooms ? 1 + ((Math.max(1, d.floor) - 1) * (FLOORS - 1)) / (ROOMS - 1) : d.floor);
/** rooms: every wave started and nothing left alive or landing = the door opens */
export const roomClear = (d: DState) => !!d.rooms && (d.wave ?? 0) >= (d.map.waves?.length ?? 0) && !d.pending?.length && d.enemies.length === 0;

/** One tall room on the 0x72 DungeonTileset II grid: 48 px tiles (16 px art at 3x). 7 floor tiles wide between the
 *  thin side walls (9 tiles = 432 px = the screen width in portrait); rows: 0 = room for the door frame, 1 = wall cap,
 *  2 = wall face (the door sits in it), 3.. = floor, last = the bottom wall with the entrance gap. Floor 27 (arena) /
 *  36 (corridor) / 31 (boss) tiles tall, +1 per player above 2. Start at the bottom, the door at the top. */
export const ROOM_T = 48;
/** rows of entrance hallway below the bottom wall (Stefan: arrive from a hallway, no bare black squares) */
export const ROOM_STUB = 2;
/** the 0x72 side wall strip (wall_edge_mid) is 5 art px = 15 world px thick */
export const ROOM_INSET = 15;
/** the room change (Stefan: it must feel like going FORWARD): slide up through the door + fade (s), then walk in from
 *  the new room's hallway (s) at WALK_SPEED */
export const ROOM_TRANS = 0.7, ROOM_WALK_IN = 0.8, WALK_SPEED = 170;
/** rooms 1-3: max 1 shooter per wave, ~30 % slower shots, a longer wind-up (the ramp starts in room 4) */
export const EARLY_ROOMS = 3;
/** Rooms: how many monsters attack and how often (Stefan's playtest 2026-11-15; our own numbers, tune here; also in
 *  docs/dungeon-rooms-plan.md). "Specials" = shooters (eye) + dashers (bat / slime); every other monster only chases
 *  and bumps. The ramp makes attacks more frequent over the 10 rooms (never faster projectiles). */
export const ROOM_TUNE = {
  specialFrac: 1 / 3, // at most this share of a wave shoots or dashes (lateFrac from room lateRoom) ...
  lateFrac: 0.4, lateRoom: 6,
  earlySpecials: 1, // ... and in rooms 1..EARLY_ROOMS at most 1 per wave
  shootEvery: [2.5, 3.5] as const, // seconds between a shooter's bursts (random per burst)
  aimWarn: 0.8, // the shooter's aim line before it fires
  dashEvery: 4, // a dasher dashes at most this often (+0-25 % random)
  ramp: 0.25, // room 10 attacks this much more often than room 1 (intervals x 0.75)
  dungeonStep: 0.1, // each later dungeon: intervals 10 % shorter (down to x 0.75)
  spitSpeed: 0.7, // monster shots fly at 70 % of SPIT_SPEED in every room (same range)
};
/** rooms: the interval multiplier for room / dungeon (1 = room 1 of Dungeon 1) */
const roomPace = (d: DState) => (1 - ROOM_TUNE.ramp * (Math.min(ROOMS, Math.max(1, d.floor)) - 1) / (ROOMS - 1)) * Math.max(0.75, 1 - ROOM_TUNE.dungeonStep * ((d.dungeon ?? 1) - 1));
/** rooms: seconds until this monster's next attack */
const roomEvery = (d: DState, kind: EnemyKind) => roomPace(d) * (kind === 3 ? ROOM_TUNE.shootEvery[0] + Math.random() * (ROOM_TUNE.shootEvery[1] - ROOM_TUNE.shootEvery[0]) : ROOM_TUNE.dashEvery * (1 + Math.random() * 0.25));
/** rooms: how many shooters + dashers one wave of `n` monsters may have */
export const roomSpecials = (room: number, n: number) => (room <= EARLY_ROOMS ? ROOM_TUNE.earlySpecials : Math.max(1, Math.floor(n * (room >= ROOM_TUNE.lateRoom ? ROOM_TUNE.lateFrac : ROOM_TUNE.specialFrac))));
export function makeRoom(seed: number, room: number, players = 1, dungeon = 1, tiles = ROOM_W + 2): Floor {
  const rw = Math.max(5, Math.min(ROOM_W, tiles - 2)); // floor tiles between the side walls
  const r = rng(seed * 89 + room * 157 + 7);
  const T = ROOM_T;
  const type = roomType(room);
  const h = (type === 'arena' ? 27 : type === 'corridor' ? 36 : 31) + Math.max(0, Math.min(5, players) - 2);
  const gw = rw + 2, gh = 3 + h + 1 + ROOM_STUB, y0 = 3, y1 = 3 + h - 1; // floor rows y0..y1, then the bottom wall, then the hallway stub
  const solid = new Uint8Array(gw * gh).fill(1);
  for (let y = y0; y <= y1; y++) for (let x = 1; x <= rw; x++) solid[y * gw + x] = 0;
  for (let y = y1 + 1; y < gh; y++) for (const x of roomGap(gw)) solid[y * gw + x] = 0; // the entrance gap + the hallway below it
  for (let y = y0; y <= y1; y++) { solid[y * gw] = 0; solid[y * gw + gw - 1] = 0; } // the floor under the thin 0x72 side walls is walkable (Stefan: it looked like floor); isWall keeps the 15 px wall strip
  const o: Room = { x: 1, y: y0, w: rw, h };
  const mx = (gw / 2) * T;
  const start = { x: mx, y: (y1 + 0.3) * T }; // in the entrance gap at the bottom (the camera starts there too)
  const stairs = { x: mx, y: (y0 + 0.5) * T }; // in front of the door
  const exit = { x: 1.5 * T, y: (y1 + 0.5) * T - 8 };
  const chests = type === 'arena' ? [{ x: mx, y: (y0 + h / 2) * T }] : [];
  const crowd = crowdOf(dungeon, 1 + ((room - 1) * (FLOORS - 1)) / (ROOMS - 1));
  const extra = Math.max(0, Math.min(5, players) - 1);
  const band = (a: number, b: number) => ({ x: (1.4 + r() * (rw - 1.8)) * T, y: (a + r() * (b - a)) * T });
  const top = y0 + 1, safe = y1 - 4; // never spawn in the arrival area at the bottom
  const wave = (a: number, b: number, n: number, mediums: number, spitters: number) => {
    const out: { kind: EnemyKind; x: number; y: number }[] = [];
    for (let k = 0; k < n; k++) out.push({ kind: 0, ...band(a, b) });
    for (let k = 0; k < mediums; k++) out.push({ kind: 1, ...band(a, b) });
    for (let k = 0; k < Math.min(spitters, roomSpecials(room, n + mediums + spitters)); k++) out.push({ kind: 3, ...band(a, Math.min(b, a + (b - a) / 2)) });
    return out;
  };
  const n = 2 + crowd + Math.min(3, extra) + (room >= 7 ? 2 : room >= 4 ? 1 : 0); // later rooms: more monsters per wave (Stefan: too easy)
  let waves: Floor['waves'] = [];
  let lines: number[] | undefined;
  const midY = (top + safe) / 2;
  if (type === 'arena') waves = [wave(top, safe, n, 1, 0), wave(top, midY, n - 1, crowd >= 2 ? 1 : 0, 2)];
  else if (type === 'corridor') {
    const third = (safe - top) / 3;
    waves = [wave(top + 2 * third, safe, n, 1, 0), wave(top + third, top + 2 * third, n, 1, 1), wave(top, top + third, n, crowd >= 2 ? 2 : 1, 1)];
    lines = [(top + 2 * third) * T, (top + third) * T]; // climbing above a line starts the next wave early
  } else waves = [[{ kind: 2, x: mx, y: (y0 + h * 0.3) * T }, ...wave(y0 + h * 0.4, safe, 2 + Math.min(3, extra), 0, 0)], wave(top, safe, n - 1, 1, 1)];
  // cover (Stefan 2026-11-15): a seeded room layout of 0x72 pieces: half-walls, L-shapes, pillar rows, an off-centre
  // block, alcoves along the side walls. Rules: the entrance -> door path stays open (flood fill), every row keeps a free
  // run of >= 2 tiles (5 blobz get through), pieces sit >= 3 rows apart, never in the arrival rows or under the door.
  const { columns, walls } = roomLayout(r, type, rw, gw, gh, solid, top, safe, start, stairs, T);
  // spawn spots inside or right next to cover move to the nearest open floor (below, flood fill)
  for (const sp of waves.flat()) { const tx = Math.floor(sp.x / T), ty = Math.floor(sp.y / T); if (solid[ty * gw + tx]) { sp.x = -1; sp.y = -1; } }
  // every spawn on floor the blobz can reach from the entrance (flood fill; anything else moves to the nearest reached tile)
  const seen = new Uint8Array(gw * gh), q = [[Math.floor(start.x / T), Math.floor(start.y / T)]];
  while (q.length) {
    const [x, y] = q.pop()!;
    if (x < 0 || y < 0 || x >= gw || y >= gh || seen[y * gw + x] || solid[y * gw + x]) continue;
    seen[y * gw + x] = 1;
    q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  for (const sp of waves.flat()) {
    if (sp.x < 0) { sp.x = mx; sp.y = (top + 1 + r() * (safe - top - 1)) * T; } // was inside cover: retry in the middle
    const tx = Math.floor(sp.x / T), ty = Math.floor(sp.y / T);
    if (seen[ty * gw + tx]) continue;
    let best = [Math.floor(mx / T), ty], bd = Infinity;
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) if (seen[y * gw + x] && Math.hypot(x - tx, y - ty) < bd) { bd = Math.hypot(x - tx, y - ty); best = [x, y]; }
    sp.x = (best[0] + 0.5) * T; sp.y = (best[1] + 0.5) * T;
  }
  const spawns: Floor['spawns'] = [];
  return { floor: room, solid, rooms: [o], start, exit, stairs, chests, spawns, gw, gh, dt: T, waves, lines, columns, walls, inset: ROOM_INSET };
}

/** rooms: which floor tiles show a crack (floor_2..8): 1-2 per 3x3 block (~11-20 % of the floor), random spots, never two
 *  cracked tiles touching (also not diagonally). Only floor between the side walls and in the entrance gap. */
export function roomCracks(f: Floor, seed: number): Set<number> {
  const W = fw(f), H = fh(f), gap = roomGap(W);
  let n = seed | 0 || 1;
  const rnd = () => { n = (n * 1103515245 + 12345) & 0x7fffffff; return n / 0x7fffffff; };
  const floorT = (x: number, y: number) => x >= 1 && x <= W - 2 && y >= 3 && (y < H - 1 - ROOM_STUB || gap.includes(x));
  const out = new Set<number>();
  const touches = (x: number, y: number) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (out.has((y + dy) * W + x + dx)) return true; return false; };
  for (let by = 3; by < H; by += 3) for (let bx = 1; bx < W - 1; bx += 3) {
    const want = rnd() < 0.4 ? 2 : 1;
    for (let k = 0, got = 0; k < 14 && got < want; k++) {
      const x = bx + Math.floor(rnd() * 3), y = by + Math.floor(rnd() * 3);
      if (!floorT(x, y) || touches(x, y)) continue;
      out.add(y * W + x); got++;
    }
  }
  return out;
}

/** Rooms: the seeded cover layout (see makeRoom). Marks `solid` and returns the pillars (column art, 2 tiles solid) and
 *  brick wall tiles (1 tile solid each). Templates: 0 zigzag half-walls, 1 pillar rows + a block, 2 L-shapes + alcoves,
 *  3 mixed; the whole layout may be mirrored. The boss room only gets a pillar row or two (room to move). */
export function roomLayout(r: () => number, type: RoomType, rw: number, gw: number, gh: number, solid: Uint8Array, top: number, safe: number,
  start: { x: number; y: number }, door: { x: number; y: number }, T: number) {
  const columns: { x: number; y: number }[] = [], walls: { x: number; y: number }[] = [];
  const flip = r() < 0.5, X = (x: number) => (flip ? rw + 1 - x : x); // x in 1..rw (floor), mirrored
  type Cell = [number, number, 'w' | 'p']; // x, y, wall / pillar base (a pillar also fills y-1)
  const halfWall = (y: number, side: 0 | 1): Cell[] => { const len = 3 + Math.floor(r() * (Math.min(5, rw - 2) - 2)); return [...Array(len).keys()].map((k) => [side ? rw - k : 1 + k, y, 'w']); };
  const lShape = (y: number, side: 0 | 1): Cell[] => { const e = side ? rw - 2 : 3; return [...halfWall(y, side).slice(0, 3), [e, y + 1, 'w'], [e, y + 2, 'w']]; };
  const pillars = (y: number): Cell[] => { const out: Cell[] = []; for (let x = 2; x <= rw - 1; x += 3) out.push([x, y, 'p']); return out; };
  const block = (y: number, side: 0 | 1): Cell[] => { const a = side ? rw - 2 : 2; return [[a, y, 'w'], [a + 1, y, 'w'], [a, y + 1, 'w'], [a + 1, y + 1, 'w']]; };
  const alcove = (y: number, side: 0 | 1): Cell[] => { const s0 = side ? rw : 1, s1 = side ? rw - 1 : 2; return [[s0, y, 'w'], [s1, y, 'w'], [s1, y + 1, 'w'], [s1, y + 2, 'w']]; };
  const side = (): 0 | 1 => (r() < 0.5 ? 0 : 1), z0 = side();
  const T0 = (k: number, y: number) => halfWall(y, ((k + z0) % 2) as 0 | 1); // zigzag
  const T1 = (k: number, y: number) => (k % 2 ? block(y, side()) : r() < 0.6 ? pillars(y) : halfWall(y, side()));
  const T2 = (k: number, y: number) => (k % 2 ? alcove(y, side()) : lShape(y, side()));
  const ALL = [T0, T1, T2];
  const tpl = Math.floor(r() * 4);
  const piece = (k: number, y: number) => (type === 'boss' ? pillars(y) : tpl < 3 ? ALL[tpl](k, y) : ALL[Math.floor(r() * 3)](k, (y)));
  const y0 = top + 2, y1 = safe - 3, span = Math.max(0, y1 - y0);
  const n = type === 'boss' ? Math.min(2, 1 + Math.floor(span / 12)) : Math.max(3, Math.floor(span / 4.5)); // bigger rooms get more
  const at = (x: number, y: number) => y * gw + x;
  const doorX = Math.floor(door.x / T), startT = [Math.floor(start.x / T), Math.floor(start.y / T)];
  const reaches = () => {
    const seen = new Uint8Array(gw * gh), q = [startT];
    while (q.length) { const [x, y] = q.pop()!; if (x < 0 || y < 0 || x >= gw || y >= gh || seen[at(x, y)] || solid[at(x, y)]) continue; seen[at(x, y)] = 1; q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
    return seen[at(doorX, Math.floor(door.y / T))] === 1;
  };
  const rowOk = (y: number) => { let run = 0, best = 0; for (let x = 1; x <= rw; x++) { run = solid[at(x, y)] ? 0 : run + 1; best = Math.max(best, run); } return best >= 2; };
  for (let k = 0; k < n; k++) {
    const y = Math.max(y0, Math.min(y1, Math.round(y0 + (n === 1 ? span / 2 : (span * k) / (n - 1)) + Math.floor(r() * 3) - 1))); // +-1 row
    const base = piece(k, y);
    // try the piece as it is, then mirrored; skip it if both would block the way or crowd a row
    for (const mir of [false, true]) {
      const cells = base.map(([x, yy, w]) => [mir ? rw + 1 - X(x) : X(x), yy, w] as Cell).filter(([x, yy]) => x >= 1 && x <= rw && yy >= y0 - 1 && yy <= y1 + 2);
      const tiles = cells.flatMap(([x, yy, w]) => (w === 'p' ? [[x, yy], [x, yy - 1]] : [[x, yy]]));
      if (tiles.some(([x, yy]) => solid[at(x, yy)] || solid[at(x, yy + 1)] && !tiles.some(([a, b]) => a === x && b === yy + 1))) continue;
      for (const [x, yy] of tiles) solid[at(x, yy)] = 1;
      const rows = [...new Set(tiles.map(([, yy]) => yy))];
      if (!rows.every(rowOk) || !reaches()) { for (const [x, yy] of tiles) solid[at(x, yy)] = 0; continue; }
      for (const [x, yy, w] of cells) (w === 'p' ? columns : walls).push({ x, y: yy });
      break;
    }
  }
  return { columns, walls };
}

/** rooms: start the next wave when the last one is gone (or a blob climbed past the corridor line); spawns land after
 *  their ring; the first room of Dungeon 1 stays calm (no telegraphed attacks). */
function stepWaves(d: DState, alive: Body[], dt: number, fx: DFx[]) {
  const waves = d.map.waves ?? [];
  d.pending ??= [];
  for (let i = d.pending.length - 1; i >= 0; i--) {
    const p = d.pending[i];
    p.t -= dt;
    if (p.t > 0) continue;
    d.pending.splice(i, 1);
    const e = makeGoo(d, p.kind, p.x, p.y);
    e.awake = true;
    if (p.calm || (d.dungeon === 1 && d.floor === 1)) e.calm = true; // calm = chases and bumps only
    e.cd = roomEvery(d, e.kind) * (0.5 + Math.random() * 0.5); // the first attack comes a little sooner
    d.enemies.push(e);
  }
  const w = d.wave ?? 0;
  if (w >= waves.length) return;
  const climbed = w > 0 && d.map.lines?.[w - 1] !== undefined && alive.some((b) => b.y < d.map.lines![w - 1]);
  if (d.enemies.length === 0 && !d.pending.length) d.waveT = (d.waveT ?? 0) - dt;
  if ((d.waveT ?? 0) > 0 && !climbed) return;
  d.wave = w + 1; d.waveT = WAVE_GAP;
  // at most ROOM_TUNE.specialFrac of the wave shoots or dashes (rooms 1-3: one): shooters count first, the remaining
  // slots go to random bats / slimes, every other monster only chases
  const wv = waves[w], slots = Math.max(0, roomSpecials(d.floor, wv.filter((sp) => sp.kind !== 2).length) - wv.filter((sp) => sp.kind === 3).length); // (the boss is not counted)
  const dashers = new Set(wv.map((_, i) => i).filter((i) => wv[i].kind <= 1).sort(() => Math.random() - 0.5).slice(0, slots));
  for (const [i, sp] of wv.entries()) {
    // never land on a blob: slide the spot away from anyone within 80 px
    let { x, y } = sp;
    for (const b of alive) if (Math.hypot(b.x - x, b.y - y) < 80) y = Math.max(4 * ft(d.map), b.y - 120);
    { const o = { x, y, vx: 0, vy: 0 }; unstick(d.map, o); x = o.x; y = o.y; } // never in a wall / column
    d.pending.push({ kind: sp.kind, x, y, t: SPAWN_WARN, calm: sp.kind <= 1 && !dashers.has(i) });
    fx.push({ t: 'spawn', x, y });
  }
}

/** Rooms + corridors for one floor, from the run seed. The last room is the farthest from the start;
 *  on the last floor it is the boss room. */
export function makeFloor(seed: number, floor: number, players = 1, dungeon = 1): Floor {
  const r = rng(seed * 97 + floor * 131 + 11);
  const solid = new Uint8Array(GW * GH).fill(1);
  const rooms: Room[] = [];
  const want = Math.min(9, 6 + floor);
  const boss = floor === FLOORS;
  for (let tries = 0; rooms.length < want && tries < 3000; tries++) {
    const big = boss && rooms.length === 0; // the boss room is placed first so it always fits
    const shrink = tries > 1500 ? 2 : 0; // crowded floor: smaller rooms
    const w = big ? 12 : 6 + Math.floor(r() * (5 - shrink)), h = big ? 9 : 5 + Math.floor(r() * (4 - shrink));
    const x = 1 + Math.floor(r() * (GW - w - 2)), y = 1 + Math.floor(r() * (GH - h - 2));
    if (rooms.some((o) => x < o.x + o.w + 1 && x + w + 1 > o.x && y < o.y + o.h + 1 && y + h + 1 > o.y)) continue;
    rooms.push({ x, y, w, h });
  }
  const carve = (x: number, y: number) => { if (x > 0 && y > 0 && x < GW - 1 && y < GH - 1) solid[y * GW + x] = 0; };
  for (const o of rooms) for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) carve(x, y);
  // order rooms into a chain (nearest neighbour from the boss/first room), corridors 2 tiles wide
  const chain = [rooms[0]];
  const left = rooms.slice(1);
  while (left.length) {
    const last = chain[chain.length - 1];
    let bi = 0;
    left.forEach((o, i) => { if (Math.hypot(cx(o) - cx(last), cy(o) - cy(last)) < Math.hypot(cx(left[bi]) - cx(last), cy(left[bi]) - cy(last))) bi = i; });
    chain.push(left.splice(bi, 1)[0]);
  }
  for (let i = 1; i < chain.length; i++) {
    const a = chain[i - 1], b = chain[i];
    const ax = Math.floor(a.x + a.w / 2), ay = Math.floor(a.y + a.h / 2), bx = Math.floor(b.x + b.w / 2), by = Math.floor(b.y + b.h / 2);
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) { carve(x, ay); carve(x, ay + 1); }
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) { carve(bx, y); carve(bx + 1, y); }
  }
  // start = one end of the chain, goal = the other (the boss room on the last floor)
  const goal = boss ? rooms[0] : chain[chain.length - 1];
  const first = boss ? chain[chain.length - 1] : chain[0];
  const order = boss ? [...chain].reverse() : chain;
  const start = { x: cx(first), y: cy(first) };
  const exit = { x: (first.x + 1) * DT, y: (first.y + 1) * DT };
  const stairs = { x: cx(goal), y: cy(goal) };
  const middle = order.slice(1, -1);
  const chests = [middle[Math.floor(middle.length / 3)], middle[Math.floor((middle.length * 2) / 3)]]
    .filter(Boolean).map((o) => ({ x: (o.x + 1.5) * DT, y: (o.y + 1.5) * DT }));
  // goo per room: more and tougher further down; mediums from floor 1, spitters from floor 1 (one) and every other room later
  const spawns: Floor['spawns'] = [];
  const extra = Math.floor(Math.max(1, players) / 2);
  const crowd = crowdOf(dungeon, floor); // monsters per room follow the difficulty, not the floor number (the map does)
  order.slice(1).forEach((o, i) => {
    const isGoal = o === goal;
    const at = () => ({ x: (o.x + 1 + r() * (o.w - 2)) * DT, y: (o.y + 1 + r() * (o.h - 2)) * DT });
    const smalls = (isGoal && boss ? 2 : 1 + Math.floor(r() * 2) + (crowd >= 2 ? 1 : 0)) + (crowd - 1) + extra;
    for (let k = 0; k < smalls; k++) spawns.push({ kind: 0, ...at() });
    if (crowd >= 2 || i % 2 === 0 || isGoal) spawns.push({ kind: 1, x: cx(o) + DT, y: cy(o) });
    if ((crowd >= 2 && i % 2 === 1) || (crowd === 1 && i === 2)) spawns.push({ kind: 3, ...at() });
    if (isGoal && boss) spawns.push({ kind: 2, x: cx(o), y: cy(o) - DT });
    // a calm start (Stefan via Lead): the first monster room of Dungeon 1 floor 1 has no telegraphed attacks
    if (i === 0 && dungeon === 1 && floor === 1) for (const sp of spawns) sp.calm = true;
  });
  return { floor, solid, rooms, start, exit, stairs, chests, spawns };
}

export const fw = (f: Floor) => f.gw ?? GW;
export const ft = (f: Floor) => f.dt ?? DT;
export const fh = (f: Floor) => f.gh ?? GH;
export const isWall = (f: Floor, x: number, y: number) => {
  const T = ft(f), tx = Math.floor(x / T), ty = Math.floor(y / T), w = fw(f);
  return tx < 0 || ty < 0 || tx >= w || ty >= fh(f) || f.solid[ty * w + tx] === 1 || (!!f.inset && (x < f.inset || x > w * T - f.inset));
};

/** Push a circle out of wall tiles (and stop its velocity into them). */
export function collideWalls(f: Floor, o: { x: number; y: number; vx: number; vy: number }, rad: number) {
  const T = ft(f);
  const tx0 = Math.floor((o.x - rad) / T), tx1 = Math.floor((o.x + rad) / T);
  const ty0 = Math.floor((o.y - rad) / T), ty1 = Math.floor((o.y + rad) / T);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    if (!(tx < 0 || ty < 0 || tx >= fw(f) || ty >= fh(f) || f.solid[ty * fw(f) + tx])) continue;
    const qx = Math.max(tx * T, Math.min(o.x, (tx + 1) * T)), qy = Math.max(ty * T, Math.min(o.y, (ty + 1) * T));
    let dx = o.x - qx, dy = o.y - qy;
    const d = Math.hypot(dx, dy);
    if (d >= rad) continue;
    if (d < 0.001) { dx = 0; dy = -1; } else { dx /= d; dy /= d; }
    o.x += dx * (rad - d); o.y += dy * (rad - d);
    const vn = o.vx * dx + o.vy * dy;
    if (vn < 0) { o.vx -= vn * dx; o.vy -= vn * dy; }
  }
  if (f.inset) { // rooms: the thin side walls
    const lo = f.inset + rad, hi = fw(f) * T - f.inset - rad;
    if (o.x < lo) { o.x = lo; if (o.vx < 0) o.vx = 0; } else if (o.x > hi) { o.x = hi; if (o.vx > 0) o.vx = 0; }
  }
}

/** Anything whose centre ended up inside a wall or outside the room (big knockback, crowding) snaps to the nearest
 *  floor tile, so nobody gets locked in a wall. */
export function unstick(f: Floor, o: { x: number; y: number; vx: number; vy: number }) {
  if (!isWall(f, o.x, o.y)) return;
  const T = ft(f), W = fw(f), H = fh(f);
  const tx = Math.max(0, Math.min(W - 1, Math.floor(o.x / T))), ty = Math.max(0, Math.min(H - 1, Math.floor(o.y / T)));
  let best: [number, number] | null = null, bd = Infinity;
  for (let rr = 0; rr < Math.max(W, H) && !best; rr++) for (let y = ty - rr; y <= ty + rr; y++) for (let x = tx - rr; x <= tx + rr; x++) {
    if (x < 0 || y < 0 || x >= W || y >= H || f.solid[y * W + x]) continue;
    const dd = Math.hypot((x + 0.5) * T - o.x, (y + 0.5) * T - o.y);
    if (dd < bd) { bd = dd; best = [x, y]; }
  }
  if (!best) return;
  o.x = (best[0] + 0.5) * T; o.y = (best[1] + 0.5) * T; o.vx = 0; o.vy = 0;
}

export interface Enemy {
  id: number; kind: EnemyKind; x: number; y: number; vx: number; vy: number; hp: number; mx: number; awake: boolean; stun: number;
  slamT: number; slam: { x: number; y: number; t: number } | null; by?: string; cd?: number; p2?: boolean; // attack cooldown, boss phase 2
  act?: Act; actT?: number; ang?: number; shots?: number; // telegraphed attack in progress: state, time left, direction, burst left
  calm?: boolean; // the first room of Dungeon 1 floor 1: these monsters only chase and bump, no telegraphed attacks
}
/** Floor pickups: kind 0 = coin (team gold), 1 = potion (+POTION_HP for everyone). */
export interface Coin { id: number; x: number; y: number; v: number; k?: 0 | 1 }
/** Goo spit in flight (spitters, boss phase 2). */
export interface Spit { id: number; x: number; y: number; vx: number; vy: number; t: number; dmg?: number }
export interface Hero {
  cls: HeroClass; hp: number; maxHp: number; ko: number; inv: number; weapon: Weapon;
  fx: number; fy: number; aim: number; // facing; aim > 0: facing the last target (movement does not turn it)
  atkCd: number; swing: number;
  spCd: number; spT: number; lastAtk: number; // special: cooldown, active time, last button counter
  lunge: number[]; // goo ids already hit by the current lunge
  dodge: number; lastDash: number; // sidestep invulnerability, last dash counter
  kx: number; ky: number; // where a knocked-out blob lies
  skills: string[]; items: string[]; // level-up picks, loot items (up to ITEM_SLOTS)
  offer: string[]; offerT: number; pending: number; // 1-of-3 cards on screen (no timer), level-ups still to pick
  zx: number; zy: number; picking: boolean; // frozen + safe while the cards are open
  shield: number; wallT: number; regenT: number; kills: number; // healer shield charges, tank wall, regen clock, own kills
  mode: 0 | 1; held: number; guard: boolean; // healer wand mode (1 = heal), big button held (s left), knight shield up
  mvCd: number; charges: number; side: number; chargeT: number; phase: number; // class move: recharge clock, rogue charges, last dodge side, knight charge, healer phase
  lsBud?: number; // lifesteal budget: refills LIFESTEAL_CAP health a second
  tgt?: number; tgtT?: number; // sticky auto-aim: the monster id it keeps shooting, how long a clearly closer one has been there
}
export type EndWhy = 'boss' | 'exit' | 'time';
export interface LootVote { item: string; t: number; rolls: Record<string, number> } // -1 undecided, 0 pass, 1-100 roll
export interface DState {
  floor: number;
  map: Floor; // rebuilt from seed + floor, never sent
  enemies: Enemy[];
  coins: Coin[];
  spit: Spit[];
  opened: boolean[]; // chests
  gold: number; xp: number; level: number; kills: number;
  bossMax: number; players: number;
  dungeon: number; // which dungeon (1, 2, ...): its difficulty step
  trans?: number; walkIn?: number; // rooms: sliding up through the door (s left), walking in from the new hallway (s left)
  sw?: number; rw?: number; // narrowest player's portrait screen width (CSS px), this room's width in tiles
  rooms?: boolean; // Archero-style rooms mode (ROOMS_ENABLED / ?rooms): floor = room number
  wave?: number; waveT?: number; // rooms: waves started so far, delay before the next one
  pending?: { kind: EnemyKind; x: number; y: number; t: number; calm?: boolean }[]; // rooms: spawns showing their landing ring
  time: number; // seconds left of the run
  ready: number; // seconds every blob has stood on the stairs (goes down / out at 1.5)
  done: number; // > 0: "Dungeon klar!" shows, counts down, then back to the meadow
  why: EndWhy;
  heroes: Record<string, Hero>;
  loot: LootVote | null; lootQ: string[]; lootLast: { item: string; win: string | null; roll: number; t: number } | null;
  nextId: number;
}
export type DFx =
  | { t: 'swing'; id: string; w: Weapon; a: number }
  | { t: 'shot'; x: number; y: number; tx: number; ty: number; k?: number } // k 1 = a heal bolt
  | { t: 'mode'; id: string; x: number; y: number; m: number }
  | { t: 'special'; id: string; k: SpecialKind; x: number; y: number; a: number; r: number }
  | { t: 'dodge'; id: string; x: number; y: number }
  | { t: 'move'; id: string; x: number; y: number; k: HeroClass; a: number } // a class move started (a = its direction)
  | { t: 'hurt'; e: number; x: number; y: number; kind: EnemyKind }
  | { t: 'kill'; x: number; y: number; kind: EnemyKind }
  | { t: 'mdash'; x: number; y: number; a: number }
  | { t: 'bite'; x: number; y: number; a: number }
  | { t: 'ouch'; id: string; x: number; y: number }
  | { t: 'block'; id: string; x: number; y: number }
  | { t: 'heal'; id: string; x: number; y: number }
  | { t: 'ko'; id: string; x: number; y: number }
  | { t: 'revive'; id: string; x: number; y: number }
  | { t: 'coin'; x: number; y: number; n: number }
  | { t: 'potion'; x: number; y: number }
  | { t: 'chest'; x: number; y: number; n: number }
  | { t: 'level'; level: number }
  | { t: 'skill'; id: string; s: string }
  | { t: 'loot'; item: string; win: string | null; roll: number }
  | { t: 'floor'; floor: number }
  | { t: 'spawn'; x: number; y: number } // rooms: a monster lands here soon (landing ring)
  | { t: 'spit'; x: number; y: number }
  | { t: 'phase2'; x: number; y: number }
  | { t: 'slam'; x: number; y: number };

export const STAIRS_R = 40;
/** loot item slots per blob (Stefan 2026-11-15: 3); a new item replaces the oldest only when all are full */
export const ITEM_SLOTS = 3;
/** which of my items a new one would replace (null = a free slot, or I already have it) */
export const lootReplaces = (items: string[], item: string) => (items.includes(item) || items.length < ITEM_SLOTS ? null : items[0]);
/** lifesteal heals at most this much health a second (a nice-to-have, not a full heal) */
export const LIFESTEAL_CAP = 3;
/** rooms: the open doorway = the leaf's tiles in the wall face + 1 floor tile below (gathering there counts; blobz
 *  don't push each other inside it) */
export const inDoorway = (f: Floor, x: number, y: number) => Math.abs(x - f.stairs.x) < 1.5 * ft(f) && y > 1.8 * ft(f) && y < 4.3 * ft(f);
export const READY_SECONDS = 1.5;
const CHEST_GOLD = 8;
const CHEST_XP = 2;
const COIN_R = 28;
const COIN_MAGNET = 70; // coins slide to a blob this close (easier for small thumbs)

export function heroMods(h: Pick<Hero, 'skills' | 'items'>): Mods {
  const m: Mods = { ...NO_MODS };
  const add = (mod: Partial<Mods>) => {
    for (const [k, v] of Object.entries(mod) as [keyof Mods, number][]) m[k] = MULT.includes(k) ? m[k] * v : m[k] + v;
  };
  for (const s of h.skills) { const d = skillOf(s); if (d) add(d.mod); }
  for (const i of h.items) { const it = itemOf(i); if (it) add(it.mod); }
  return m;
}
/** Max health follows class + skills + item; gained max health is filled, lost max health cut. */
export function refresh(h: Hero) {
  const max = CLASS_HP[h.cls] + heroMods(h).hp;
  if (max > h.maxHp) h.hp += max - h.maxHp;
  h.maxHp = max;
  h.hp = Math.min(h.hp, max);
}

export function newHero(weapon: Weapon, maxHp?: number): Hero {
  const cls = classOf(weapon);
  const max = maxHp ?? CLASS_HP[cls];
  return {
    cls, hp: max, maxHp: max, ko: 0, inv: 0, weapon, fx: 0, fy: 1, aim: 0, atkCd: 0, swing: 0,
    spCd: 0, spT: 0, lastAtk: -1, lunge: [], dodge: 0, lastDash: -1, kx: 0, ky: 0,
    skills: [], items: [], offer: [], offerT: 0, pending: 0, zx: 0, zy: 0, picking: false, shield: 0, wallT: 0, regenT: 0, kills: 0, mode: 0, held: 0, guard: false, mvCd: 0, charges: cls === 'rogue' ? ROGUE_CHARGES : 1, side: 1, chargeT: 0, phase: 0,
  };
}

/** A goo of `kind` with health for this floor and team size. */
export function makeGoo(d: Pick<DState, 'nextId' | 'floor' | 'players' | 'bossMax'> & { dungeon?: number; rooms?: boolean }, kind: EnemyKind, x: number, y: number): Enemy {
  const mini = kind === 2 && !!d.rooms && d.floor === MINIBOSS_ROOM; // the mid-run mini-boss: half the boss
  const mx = kind === 2 ? Math.round(d.bossMax * (mini ? 0.5 : 1)) : Math.round(ENEMY_HP[kind] * floorHp(diffFloor(d), d.players, d.dungeon ?? 1));
  return { id: d.nextId++, kind, x, y, vx: 0, vy: 0, hp: mx, mx, awake: false, stun: 0, slamT: SLAM_EVERY, slam: null, cd: SPIT_EVERY * (0.5 + Math.random()) };
}

export function enterFloor(d: Omit<DState, 'map'> & { map?: Floor }, seed: number, floor: number, players: number): DState {
  const out = d as DState;
  out.dungeon ??= 1;
  if (out.rooms) out.rw = roomTiles(out.sw); // fixed for the whole room (a narrower phone joining counts from the next room)
  const map = out.rooms ? makeRoom(seed, floor, players, out.dungeon, out.rw) : makeFloor(seed, floor, players, out.dungeon);
  out.floor = floor; out.map = map; out.ready = 0; out.players = players;
  if (out.rooms) { out.wave = 0; out.waveT = ROOM_FIRST_WAVE; out.pending = []; }
  out.bossMax = Math.round(bossHp(players, out.dungeon) * (out.rooms ? ROOM_BOSS.hp : 1));
  out.enemies = map.spawns.map((sp) => Object.assign(makeGoo(out, sp.kind, sp.x, sp.y), sp.calm ? { calm: true } : {}));
  out.coins = []; out.spit = [];
  out.opened = map.chests.map(() => false);
  return out;
}

export function newRun(seed: number, picks: Record<string, Weapon>, dungeon = 1, rooms = roomsOn(), sw = 0): DState {
  const heroes: Record<string, Hero> = {};
  for (const [id, w] of Object.entries(picks)) heroes[id] = newHero(w);
  return enterFloor({
    floor: 1, dungeon: Math.max(1, Math.floor(dungeon)), rooms, sw: sw || undefined, enemies: [], coins: [], spit: [], opened: [], gold: 0, xp: 0, level: 1, kills: 0, bossMax: ENEMY_HP[2], players: 1,
    time: RUN_SECONDS, ready: 0, done: 0, why: 'exit', heroes, loot: null, lootQ: [], lootLast: null, nextId: 1,
  }, seed, 1, Object.keys(picks).length);
}

interface Body { id: string; x: number; y: number; vx: number; vy: number; dashT: number; lastDash?: number }

/** Is a point inside a weapon's swing from (px,py) facing (fx,fy)? `extra` = reach from skills/items. */
export function inSwing(w: Weapon, px: number, py: number, fx: number, fy: number, tx: number, ty: number, tr: number, extra = 0): boolean {
  const st = WEAPON_STATS[w];
  const dx = tx - px, dy = ty - py, d = Math.hypot(dx, dy);
  if (d - tr > st.reach + extra) return false;
  if (st.arc >= Math.PI || d < 1) return true;
  const fl = Math.hypot(fx, fy) || 1;
  const cos = (dx * fx + dy * fy) / (d * fl);
  // generous for kids: the target's radius widens the arc
  return Math.acos(Math.max(-1, Math.min(1, cos))) <= st.arc + Math.atan2(tr, d);
}

/** No wall tile between two points (bolts, volley, spit aim). */
export function lineOfSight(f: Floor, x0: number, y0: number, x1: number, y1: number): boolean {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 10);
  for (let i = 1; i < n; i++) if (isWall(f, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n)) return false;
  return true;
}

/** Nearest living goo whose edge is within `reach` of (x,y) (and in sight when `f` is given), or null. */
export function nearestEnemy(d: DState, x: number, y: number, reach: number, f?: Floor): Enemy | null {
  let best: Enemy | null = null, bd = Infinity;
  for (const e of d.enemies) {
    if (e.hp <= 0) continue;
    const dd = Math.hypot(e.x - x, e.y - y) - ENEMY_R[e.kind];
    if (dd <= reach && dd < bd && (!f || lineOfSight(f, x, y, e.x, e.y))) { bd = dd; best = e; }
  }
  return best;
}

function makeOffer(h: Hero) {
  const pool = SKILLS.filter((k) => k.cls === h.cls).map((k) => k.id);
  const out: string[] = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  h.offer = out; h.offerT = 0; // no timer: the cards wait for the player (who is frozen and safe meanwhile)
}

function takeSkill(h: Hero, id: string, who: string, fx: DFx[]) {
  if (!h.offer.includes(id)) return;
  h.skills.push(id);
  h.offer = []; h.pending = Math.max(0, h.pending - 1);
  refresh(h);
  fx.push({ t: 'skill', id: who, s: id });
  if (h.pending > 0) makeOffer(h);
}

function gainXp(d: DState, xp: number, fx: DFx[]) {
  d.xp += xp;
  while (d.level - 1 < LEVEL_XP.length && d.xp >= LEVEL_XP[d.level - 1]) {
    d.level++;
    // every blob picks 1 of 3 cards from its own class
    // rooms: the cards wait until the room is clear (shown before the door); the classic dungeon shows them at once
    for (const h of Object.values(d.heroes)) { h.pending++; if (!h.offer.length && !(d.rooms && !roomClear(d))) makeOffer(h); }
    fx.push({ t: 'level', level: d.level });
  }
}

/** A blob's choice from the card screens: 'skill:<id>', 'loot:roll' (alone: take) or 'loot:pass'. */
export function dungeonChoice(d: DState, id: string, msg: string, fx: DFx[] = []) {
  const h = d.heroes[id];
  if (!h) return;
  if (msg === 'skill:open') { if (h.pending > 0 && !h.offer.length && h.ko <= 0) makeOffer(h); } // the HUD level-up button: open the cards now
  else if (msg.startsWith('skill:')) takeSkill(h, msg.slice(6), id, fx);
  else if (d.loot && d.loot.rolls[id] === -1 && (msg === 'loot:roll' || msg === 'loot:pass')) {
    const solo = Object.keys(d.heroes).length === 1; // alone: no dice, "Använd" just takes it
    d.loot.rolls[id] = msg === 'loot:pass' ? 0 : solo ? 100 : 1 + Math.floor(Math.random() * 100);
  }
}

/** Damage + knockback on one goo from (fromX, fromY). */
function hitEnemy(d: DState, e: Enemy, dmg: number, kb: number, stun: number, fromX: number, fromY: number, fx: DFx[], by?: string) {
  if (e.hp <= 0) return;
  e.hp -= dmg;
  e.awake = true;
  const dx = e.x - fromX, dy = e.y - fromY, dl = Math.hypot(dx, dy) || 1;
  const k = kb * (e.kind === 2 ? 0.25 : 1);
  e.vx = (dx / dl) * k; e.vy = (dy / dl) * k; e.stun = Math.max(e.stun, e.kind === 2 ? stun * 0.4 : stun);
  if (e.hp <= 0) e.by = by;
  fx.push(e.hp > 0 ? { t: 'hurt', e: e.id, x: e.x, y: e.y, kind: e.kind } : { t: 'kill', x: e.x, y: e.y, kind: e.kind });
}

/** Start the class move (charge already paid). */
function classMove(d: DState, h: Hero, b: Body, m: Mods, fx: DFx[]) {
  let ax = h.fx, ay = h.fy;
  const go = (x: number, y: number) => { const l = Math.hypot(x, y) || 1; b.vx = (x / l) * MOVE_SPEED; b.vy = (y / l) * MOVE_SPEED; b.dashT = 0.3; };
  if (h.cls === 'rogue') {
    // sideways relative to the aim: the stick's side if it points sideways, else alternate left / right
    const px = -h.fy, py = h.fx, v = Math.hypot(b.vx, b.vy), side = b.vx * px + b.vy * py;
    h.side = v > 30 && Math.abs(side) > v * 0.3 ? Math.sign(side) : -h.side;
    ax = px * h.side; ay = py * h.side; go(ax, ay);
    h.dodge = MOVE_DODGE.rogue + m.dodge;
  } else if (h.cls === 'marksman') {
    // jump back: away from the current target (else the nearest monster, else away from the aim)
    const e = (h.tgt !== undefined ? d.enemies.find((q) => q.id === h.tgt && q.hp > 0) : undefined) ?? nearestEnemy(d, b.x, b.y, 2000);
    if (e) { ax = b.x - e.x; ay = b.y - e.y; } else { ax = -h.fx; ay = -h.fy; }
    go(ax, ay);
    h.dodge = MOVE_DODGE.marksman + m.dodge;
  } else if (h.cls === 'tank') {
    const e = nearestEnemy(d, b.x, b.y, 240);
    if (e) face(h, b, e.x, e.y);
    ax = h.fx; ay = h.fy;
    h.chargeT = CHARGE_T; b.dashT = CHARGE_T; h.dodge = MOVE_DODGE.tank + m.dodge; // (tank-block: a short untouchable start)
  } else {
    h.phase = MOVE_DODGE.healer; h.dodge = MOVE_DODGE.healer + m.dodge;
  }
  fx.push({ t: 'move', id: b.id, x: b.x, y: b.y, k: h.cls, a: Math.atan2(ay, ax) });
}

function face(h: Hero, b: Body, tx: number, ty: number) {
  const dx = tx - b.x, dy = ty - b.y, dl = Math.hypot(dx, dy);
  if (dl > 0.5) { h.fx = dx / dl; h.fy = dy / dl; }
  h.aim = 0.45;
}

export function healHero(h: Hero, n: number) { if (h.ko <= 0) h.hp = Math.min(h.maxHp, h.hp + n); }

/** Big button: the class/weapon special. */
function special(d: DState, h: Hero, b: Body, bodies: Body[], m: Mods, fx: DFx[]) {
  const sp = specialOf(h.cls, h.weapon);
  h.spCd = sp.cd * m.spCd;
  const dmg = Math.round(sp.dmg * m.dmg);
  const r = sp.r * m.spR;
  const at = { t: 'special' as const, id: b.id, k: sp.kind, x: b.x, y: b.y, a: Math.atan2(h.fy, h.fx), r };
  if (sp.kind === 'lunge') {
    // charge towards the nearest goo in sight (else the facing direction), piercing everything on the way
    const t = nearestEnemy(d, b.x, b.y, 220);
    if (t) face(h, b, t.x, t.y);
    b.vx = h.fx * LUNGE_SPEED; b.vy = h.fy * LUNGE_SPEED; b.dashT = Math.max(b.dashT, LUNGE_T);
    h.spT = LUNGE_T; h.lunge = [];
    fx.push({ ...at, a: Math.atan2(h.fy, h.fx) });
    return;
  }
  h.spT = 0.35;
  if (sp.kind === 'heal') {
    // every friend in the light gets health, knocked-out friends get up at once
    for (const o of bodies) {
      const oh = d.heroes[o.id];
      if (!oh || Math.hypot(o.x - b.x, o.y - b.y) > r) continue;
      if (oh.ko > 0) { oh.ko = 0; oh.hp = Math.max(1, Math.round(oh.maxHp / 2)); oh.inv = 1.5; fx.push({ t: 'revive', id: o.id, x: o.x, y: o.y }); }
      else healHero(oh, Math.round(HEAL_HP * m.heal));
      if (m.shieldAll) oh.shield = Math.max(oh.shield, m.shieldAll);
      fx.push({ t: 'heal', id: o.id, x: o.x, y: o.y });
    }
  } else if (sp.kind === 'volley') {
    // bolts at the nearest goo in sight (3, more with skills)
    const n = 3 + m.arrows;
    const targets = d.enemies.filter((e) => e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) - ENEMY_R[e.kind] <= r && lineOfSight(d.map, b.x, b.y, e.x, e.y))
      .sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y)).slice(0, n);
    for (const e of targets) { fx.push({ t: 'shot', x: b.x, y: b.y, tx: e.x, ty: e.y }); hitEnemy(d, e, dmg, sp.kb * m.kb, sp.stun + m.trap, b.x, b.y, fx, b.id); }
  } else if (sp.kind === 'wall') {
    // shield wall: goo inside are shoved out, friends inside take no damage while it stands
    h.wallT = WALL_T + m.wallT;
    for (const e of d.enemies) if (e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) - ENEMY_R[e.kind] <= r) hitEnemy(d, e, 0, sp.kb * m.kb, sp.stun + m.stun, b.x, b.y, fx, b.id);
  } else {
    // spin and slam: everything around the blob
    for (const e of d.enemies) if (e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) - ENEMY_R[e.kind] <= r) hitEnemy(d, e, dmg, sp.kb * m.kb, sp.stun + m.stun, b.x, b.y, fx, b.id);
  }
  fx.push(at);
}

const STICK_CLOSER = 0.75, STICK_T = 0.5; // switch only to a monster >25 % closer, after it stayed closer 0.5 s
/** Sticky auto-aim, run every tick: keep the current target while it lives and stays in reach (and sight for bolts);
 *  a clearly closer monster (>25 %) for STICK_T takes over. */
function aimTick(d: DState, h: Hero, b: Body, reach: number, f: Floor | undefined, dt: number) {
  const near = nearestEnemy(d, b.x, b.y, reach, f);
  const cur = h.tgt !== undefined ? d.enemies.find((e) => e.id === h.tgt && e.hp > 0) : undefined;
  const dist = (e: Enemy) => Math.hypot(e.x - b.x, e.y - b.y) - ENEMY_R[e.kind];
  if (!cur || dist(cur) > reach || (f && !lineOfSight(f, b.x, b.y, cur.x, cur.y))) { h.tgt = near?.id; h.tgtT = 0; return; }
  if (near && near !== cur && dist(near) < dist(cur) * STICK_CLOSER) {
    h.tgtT = (h.tgtT ?? 0) + dt;
    if (h.tgtT >= STICK_T) { h.tgt = near.id; h.tgtT = 0; }
  } else h.tgtT = 0;
}
function stickyTarget(d: DState, h: Hero, b: Body, reach: number, f?: Floor): Enemy | null {
  const cur = h.tgt !== undefined ? d.enemies.find((e) => e.id === h.tgt && e.hp > 0) : undefined;
  if (cur && Math.hypot(cur.x - b.x, cur.y - b.y) - ENEMY_R[cur.kind] <= reach && (!f || lineOfSight(f, b.x, b.y, cur.x, cur.y))) return cur;
  const near = nearestEnemy(d, b.x, b.y, reach, f);
  h.tgt = near?.id; h.tgtT = 0;
  return near;
}

/** Auto-attack: melee swing at the nearest goo in reach, or a bolt at the nearest goo in sight. */
function autoAttack(d: DState, h: Hero, b: Body, m: Mods, fx: DFx[], bodies: Body[]) {
  const st = WEAPON_STATS[h.weapon];
  const reach = st.reach + m.reach;
  if (h.weapon === 'bow' && Math.hypot(b.vx, b.vy) > STILL_SPEED) return; // the marksman shoots only standing still
  if (h.weapon === 'staff' && h.mode === 1) {
    // heal mode: a green bolt at the most hurt friend in reach (knocked-out friends first: it wakes them)
    let best: { o: Body; need: number } | null = null;
    for (const o of bodies) {
      const oh = d.heroes[o.id];
      if (!oh || o.id === b.id || Math.hypot(o.x - b.x, o.y - b.y) > reach || !lineOfSight(d.map, b.x, b.y, o.x, o.y)) continue;
      const need = oh.ko > 0 ? 1e9 : oh.maxHp - oh.hp;
      if (need > 0 && (!best || need > best.need)) best = { o, need };
    }
    if (!best) return;
    const o = best.o, oh = d.heroes[o.id];
    face(h, b, o.x, o.y);
    h.atkCd = st.cd * m.rate; h.swing = Math.min(0.3, h.atkCd * 0.8);
    fx.push({ t: 'swing', id: b.id, w: h.weapon, a: Math.atan2(h.fy, h.fx) });
    fx.push({ t: 'shot', x: b.x, y: b.y, tx: o.x, ty: o.y, k: 1 });
    if (oh.ko > 0) { oh.ko = 0; oh.hp = Math.max(1, Math.round(oh.maxHp / 2)); oh.inv = 1.5; fx.push({ t: 'revive', id: o.id, x: o.x, y: o.y }); }
    else healHero(oh, Math.round(HEAL_BOLT * m.heal));
    if (m.shieldAll) oh.shield = Math.max(oh.shield, m.shieldAll);
    fx.push({ t: 'heal', id: o.id, x: o.x, y: o.y });
    return;
  }
  const t = stickyTarget(d, h, b, reach, st.ranged ? d.map : undefined);
  if (!t) return;
  face(h, b, t.x, t.y);
  h.atkCd = st.cd * m.rate; h.swing = Math.min(0.3, h.atkCd * 0.8);
  fx.push({ t: 'swing', id: b.id, w: h.weapon, a: Math.atan2(h.fy, h.fx) });
  const dmg = Math.round(st.dmg * m.dmg * (m.crit > 0 && Math.random() < m.crit ? 2 : 1));
  const kb = st.kb * m.kb;
  if (st.ranged) {
    fx.push({ t: 'shot', x: b.x, y: b.y, tx: t.x, ty: t.y, ...(h.weapon === 'staff' ? { k: 0 } : {}) });
    hitEnemy(d, t, dmg, kb, 0.25 + m.stun, b.x, b.y, fx, b.id);
    // pierce: the bolt flies on through the next goo in the line
    let left = m.pierce;
    for (const e of d.enemies) {
      if (left <= 0) break;
      if (e === t || e.hp <= 0) continue;
      const ex = e.x - b.x, ey = e.y - b.y, along = ex * h.fx + ey * h.fy;
      if (along <= 0 || along > reach + 40 || Math.abs(ex * h.fy - ey * h.fx) > ENEMY_R[e.kind]) continue;
      hitEnemy(d, e, dmg, kb, 0.25 + m.stun, b.x, b.y, fx, b.id); left--;
    }
    return;
  }
  for (const e of d.enemies) {
    if (e.hp <= 0 || !inSwing(h.weapon, b.x, b.y, h.fx, h.fy, e.x, e.y, ENEMY_R[e.kind], m.reach)) continue;
    hitEnemy(d, e, dmg, kb, 0.35 + m.stun, b.x, b.y, fx, b.id);
  }
}

function spitAt(d: DState, x: number, y: number, a: number, fx: DFx[], dmg?: number) {
  const k = d.rooms ? ROOM_TUNE.spitSpeed : 1, sp = SPIT_SPEED * k, life = SPIT_LIFE / k; // rooms: slower, same range
  d.spit.push({ id: d.nextId++, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: life, dmg });
  fx.push({ t: 'spit', x, y });
}

/** Run a telegraphed monster attack. Wind-ups stand still (the warning is drawn from the snapshot), then the attack
 *  goes the way it was aimed when the warning started, so a sidestep during the warning avoids it. */
function stepAct(d: DState, e: Enemy, tgt: Body | null, dt: number, fx: DFx[]) {
  e.actT = (e.actT ?? 0) - dt;
  const a = e.ang ?? 0, ux = Math.cos(a), uy = Math.sin(a);
  const still = () => { e.vx *= Math.exp(-10 * dt); e.vy *= Math.exp(-10 * dt); };
  const go = (sp: number) => { e.vx = ux * sp; e.vy = uy * sp; };
  const done = () => { e.act = 0; e.cd = d.rooms ? roomEvery(d, e.kind) : ACT_CD[e.kind] * actMul(d.dungeon ?? 1, diffFloor(d)) * (0.85 + Math.random() * 0.3); };
  switch (e.act) {
    case 1: still(); if (e.actT <= 0) { e.act = 2; e.actT = DASH_TIME; go(DASH_SPEED); fx.push({ t: 'mdash', x: e.x, y: e.y, a }); } break;
    case 2:
      go(DASH_SPEED);
      if (e.actT <= 0) {
        if (e.kind === 1) { e.act = 3; e.actT = BITE_WARN; if (tgt) e.ang = Math.atan2(tgt.y - e.y, tgt.x - e.x); } // slime: bite where it lands
        else { e.act = 7; e.actT = FLEE_TIME; e.ang = a + Math.PI; } // bat: hit and run
      }
      break;
    case 3: still(); if (e.actT <= 0) { e.act = 4; e.actT = BITE_TIME; go(BITE_SPEED); fx.push({ t: 'bite', x: e.x, y: e.y, a }); } break;
    case 4: go(BITE_SPEED); if (e.actT <= 0) done(); break;
    case 5: still(); if (e.actT <= 0) { e.act = 6; e.actT = 0; e.shots = BURST; } break;
    case 6:
      still();
      if (e.actT <= 0 && (e.shots ?? 0) > 0) {
        const k = BURST - (e.shots ?? 0);
        const r0 = ENEMY_R[e.kind] + 6; // shots leave from the monster's edge, never on top of it
        spitAt(d, e.x + ux * r0, e.y + uy * r0, a + (k - 1) * BURST_SPREAD, fx, BURST_DMG);
        e.shots = (e.shots ?? 1) - 1; e.actT = BURST_GAP;
      }
      if ((e.shots ?? 0) <= 0) done();
      break;
    case 7: go(ENEMY_SPEED[e.kind] * 1.6); if (e.actT <= 0) done(); break;
    default: e.act = 0;
  }
}

/** One dungeon tick after the players have moved (sim.ts moves them with the usual glide physics).
 *  `atk` = each blob's special-button counter (Input.atk). */
export function stepDungeon(d: DState, bodies: Body[], atk: Map<string, number>, seed: number, dt: number, fx: DFx[]): 'stay' | 'out' {
  const f = d.map;
  d.spit ??= [];
  if (d.done > 0) {
    d.done -= dt;
    for (const b of bodies) { b.vx = 0; b.vy = 0; collideWalls(f, b, BLOB_R); }
    return d.done <= 0 ? 'out' : 'stay';
  }
  if ((d.trans ?? 0) > 0) {
    // rooms: everyone slides up through the open door (no fighting, no input), then the next room
    d.trans = (d.trans ?? 0) - dt;
    for (const b of bodies) { b.vx = 0; b.vy = 0; b.x += (f.stairs.x - b.x) * Math.min(1, dt * 6); b.y -= WALK_SPEED * dt; }
    if ((d.trans ?? 0) <= 0) { d.trans = 0; nextFloor(d, seed, bodies, fx); }
    return 'stay';
  }
  if ((d.walkIn ?? 0) > 0) {
    // ... and walk in from the hallway below, still moving up (input takes over when this ends)
    d.walkIn = Math.max(0, (d.walkIn ?? 0) - dt);
    for (const b of bodies) { b.vx = 0; b.vy = 0; b.y -= WALK_SPEED * dt; }
  }
  if (DUNGEON_TIMER_ENABLED) d.time = Math.max(0, d.time - dt);
  if (DUNGEON_TIMER_ENABLED && d.time <= 0) { d.done = DONE_SECONDS; d.why = 'time'; return 'stay'; }
  const mods = new Map<string, Mods>();
  // heroes: facing, timers, auto-attack, special, sidestep, KO/revive, cards
  for (const b of bodies) {
    const h = d.heroes[b.id] ??= newHero('dagger');
    const m = heroMods(h);
    mods.set(b.id, m);
    collideWalls(f, b, BLOB_R); unstick(f, b);
    h.atkCd = Math.max(0, h.atkCd - dt); h.inv = Math.max(0, h.inv - dt); h.swing = Math.max(0, h.swing - dt);
    h.spCd = Math.max(0, h.spCd - dt); h.spT = Math.max(0, h.spT - dt); h.dodge = Math.max(0, h.dodge - dt); h.aim = Math.max(0, h.aim - dt);
    h.wallT = Math.max(0, h.wallT - dt);
    h.lsBud = Math.min(LIFESTEAL_CAP, (h.lsBud ?? LIFESTEAL_CAP) + LIFESTEAL_CAP * dt);
    const a = atk.get(b.id) ?? h.lastAtk;
    if (h.lastAtk < 0) h.lastAtk = a; // first tick: whatever the counter was on the meadow
    if (h.lastDash < 0) h.lastDash = b.lastDash ?? 0;
    if (h.ko > 0) {
      h.ko -= dt;
      b.x = h.kx; b.y = h.ky; b.vx = 0; b.vy = 0;
      h.lastAtk = a; h.lastDash = b.lastDash ?? h.lastDash;
      if (h.ko <= 0) {
        h.ko = 0; h.hp = h.maxHp; h.inv = 2; b.x = f.start.x; b.y = f.start.y;
        fx.push({ t: 'revive', id: b.id, x: b.x, y: b.y });
      }
      continue;
    }
    // level-up cards open: frozen in place and untouchable until a card is picked (no timer)
    if (h.offer.length) {
      if (!h.picking) { h.picking = true; h.zx = b.x; h.zy = b.y; }
      b.x = h.zx; b.y = h.zy; b.vx = 0; b.vy = 0;
      h.lastAtk = a; h.lastDash = b.lastDash ?? h.lastDash;
      continue;
    }
    h.picking = false;
    if (m.regen > 0 && h.hp < h.maxHp) {
      h.regenT += dt;
      if (h.regenT >= REGEN_EVERY) { h.regenT = 0; healHero(h, m.regen); fx.push({ t: 'heal', id: b.id, x: b.x, y: b.y }); }
    } else h.regenT = 0;
    // the class move (small button; the sim gives no dash impulse underground, the class decides the move)
    const maxCh = h.cls === 'rogue' ? ROGUE_CHARGES : 1, mvMax = CLASS_MOVE_COOLDOWN[h.cls] * m.mvCd;
    if (h.charges < maxCh) { h.mvCd -= dt; if (h.mvCd <= 0) { h.charges++; h.mvCd = h.charges < maxCh ? mvMax : 0; } }
    if (b.lastDash !== undefined && b.lastDash !== h.lastDash) {
      const first = h.lastDash === -1; // the first frame only syncs the counter
      h.lastDash = b.lastDash;
      if (!first && h.charges > 0 && h.chargeT <= 0 && h.phase <= 0) {
        if (h.charges === maxCh) h.mvCd = mvMax;
        h.charges--;
        classMove(d, h, b, m, fx);
      }
    }
    h.phase = Math.max(0, h.phase - dt);
    if (h.chargeT > 0) {
      // knight shield charge: rush on with the shield forward (blocks), then a sword slash at the end
      h.chargeT -= dt; b.dashT = Math.max(b.dashT, 0.05);
      b.vx = h.fx * MOVE_SPEED; b.vy = h.fy * MOVE_SPEED;
      const hit = nearestEnemy(d, b.x, b.y, (WEAPON_STATS[h.weapon].reach + m.reach) * 0.8);
      if (h.chargeT <= 0 || hit) { h.chargeT = 0; b.vx *= 0.2; b.vy *= 0.2; h.atkCd = 0; }
    }
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > 30 && h.aim <= 0 && h.spT <= 0 && h.dodge <= 0 && h.chargeT <= 0) { h.fx = b.vx / sp; h.fy = b.vy / sp; } // a dodge / jump does not turn the blob
    // special attack (big button)
    // the big button: healer = toggle the wand's mode (per press), knight = hold the shield up, others = special
    if (a !== h.lastAtk) {
      const fresh = h.held <= 0; // a new press, not the button's auto-repeat while it is held
      h.lastAtk = a; h.held = HOLD_GAP;
      if (h.cls === 'healer') { if (fresh) { h.mode = h.mode ? 0 : 1; fx.push({ t: 'mode', id: b.id, x: b.x, y: b.y, m: h.mode }); } }
      else if (h.cls !== 'tank' && h.spCd <= 0) special(d, h, b, bodies, m, fx);
    } else h.held = Math.max(0, h.held - dt);
    h.guard = h.cls === 'tank' && (h.held > 0 || h.chargeT > 0);
    if (h.guard && h.chargeT <= 0) { const v = Math.hypot(b.vx, b.vy); if (v > 70) { b.vx *= 70 / v; b.vy *= 70 / v; } } // shield up: slow
    // lunge in progress: pierce every goo it touches once
    if (h.spT > 0 && specialOf(h.cls, h.weapon).kind === 'lunge') {
      const def = specialOf(h.cls, h.weapon);
      for (const e of d.enemies) {
        if (e.hp <= 0 || h.lunge.includes(e.id) || Math.hypot(e.x - b.x, e.y - b.y) > BLOB_R + ENEMY_R[e.kind] + def.r) continue;
        h.lunge.push(e.id);
        hitEnemy(d, e, Math.round(def.dmg * m.dmg), def.kb * m.kb, def.stun + m.stun, b.x, b.y, fx, b.id);
      }
    }
    { const st = WEAPON_STATS[h.weapon]; aimTick(d, h, b, st.reach + m.reach, st.ranged ? d.map : undefined, dt); }
    if (h.atkCd <= 0 && h.phase <= 0) autoAttack(d, h, b, m, fx, bodies); // phased out: no attacks
  }
  // standing blobz: not knocked out and not busy with the level-up cards (goo ignore those, stairs don't wait for them)
  const alive = bodies.filter((b) => (d.heroes[b.id]?.ko ?? 0) <= 0 && !d.heroes[b.id]?.offer.length);
  // dead enemies: coins (+ sometimes a potion; the boss drops rare loot) + XP
  for (let i = d.enemies.length - 1; i >= 0; i--) {
    const e = d.enemies[i];
    if (e.hp > 0) continue;
    d.enemies.splice(i, 1);
    d.kills++;
    const killer = e.by ? d.heroes[e.by] : undefined;
    if (killer) {
      killer.kills++;
      const km = mods.get(e.by!);
      if (km?.killHeal) { const n = Math.min(km.killHeal, Math.floor(killer.lsBud ?? LIFESTEAL_CAP)); if (n > 0) { healHero(killer, n); killer.lsBud = (killer.lsBud ?? LIFESTEAL_CAP) - n; } }
    }
    const n = ENEMY_GOLD[e.kind];
    const pieces = Math.min(5, n);
    for (let k = 0; k < pieces; k++) {
      const a = (k / pieces) * Math.PI * 2;
      dropAt(d, e.x + Math.cos(a) * 18, e.y + Math.sin(a) * 18, Math.floor(n / pieces) + (k < n % pieces ? 1 : 0), 0);
    }
    if (Math.random() < [0.04, 0.2, 1, 0.1][e.kind]) dropAt(d, e.x, e.y + 10, 0, 1);
    if (e.kind === 2) d.lootQ.push(ITEMS[Math.floor(Math.random() * ITEMS.length)].id);
    gainXp(d, ENEMY_XP[e.kind], fx);
  }
  const dmgMul = floorDmg(diffFloor(d), d.dungeon ?? 1);
  // enemies: wake up (and call friends), chase the nearest standing blob (tanks pull them in), touching hurts;
  // spitters keep their distance and spit; the boss slams, and below half health gets angry (phase 2)
  const woke: Enemy[] = [];
  for (const e of d.enemies) {
    e.stun = Math.max(0, e.stun - dt);
    let tgt: Body | null = null, best = Infinity, dist = Infinity;
    for (const b of alive) {
      const dd = Math.hypot(b.x - e.x, b.y - e.y);
      if (!e.awake && dd > ENEMY_SIGHT) continue;
      const h = d.heroes[b.id];
      const pull = h?.cls === 'tank' ? 120 + (mods.get(b.id)?.taunt ?? 0) + (h.wallT > 0 ? 200 : 0) : 0;
      if (dd - pull < best) { best = dd - pull; tgt = b; dist = dd; }
    }
    if (tgt && !e.awake) { e.awake = true; woke.push(e); }
    const angry = e.kind === 2 && e.hp < e.mx / 2;
    // telegraphed attacks: start one when ready (in range, line of sight), then run it; a stun pauses it
    if (e.kind !== 2 && e.stun <= 0 && tgt && !e.act) {
      e.cd = (e.cd ?? ACT_CD[e.kind]) - dt;
      const a = Math.atan2(tgt.y - e.y, tgt.x - e.x);
      if (e.cd <= 0 && !e.calm && lineOfSight(f, e.x, e.y, tgt.x, tgt.y)) {
        if (e.kind === 3 && dist < 320) { e.act = 5; e.actT = d.rooms ? ROOM_TUNE.aimWarn : AIM_WARN; e.ang = a; }
        else if (e.kind <= 1 && dist > DASH_MIN && dist < DASH_MAX) { e.act = 1; e.actT = DASH_WARN; e.ang = a; }
      }
    }
    if (e.act) {
      if (e.stun <= 0) stepAct(d, e, tgt, dt, fx);
      else { e.vx *= Math.exp(-5 * dt); e.vy *= Math.exp(-5 * dt); }
    } else if (e.stun <= 0 && tgt) {
      const dx = tgt.x - e.x, dy = tgt.y - e.y, dl = Math.hypot(dx, dy) || 1;
      let spd = ENEMY_SPEED[e.kind] * (e.slam ? 0.2 : 1) * (angry ? 1.6 : 1);
      // spitters hold at 150-230 px: back off when close, close in when far
      let dir = 1;
      if (e.kind === 3) { if (dist < 150) dir = -1; else if (dist < 230) { dir = 0; spd *= 0.3; } }
      e.vx += ((dx / dl) * spd * dir - e.vx) * Math.min(1, dt * 5);
      e.vy += ((dy / dl) * spd * dir - e.vy) * Math.min(1, dt * 5);
    } else { e.vx *= Math.exp(-5 * dt); e.vy *= Math.exp(-5 * dt); }
    e.x += e.vx * dt; e.y += e.vy * dt;
    collideWalls(f, e, ENEMY_R[e.kind]); unstick(f, e);
    if (e.kind === 2 && e.awake) {
      if (e.slam) {
        e.slam.t -= dt;
        if (e.slam.t <= 0) {
          // it lands there (the leap is drawn during the warning), then the shockwave
          e.x = e.slam.x; e.y = e.slam.y; e.vx = 0; e.vy = 0;
          collideWalls(f, e, ENEMY_R[e.kind]); unstick(f, e);
          fx.push({ t: 'slam', x: e.slam.x, y: e.slam.y });
          for (const b of alive) if (Math.hypot(b.x - e.slam.x, b.y - e.slam.y) < SLAM_R + BLOB_R) hurt(d, b, e.slam.x, e.slam.y, SLAM_DMG * dmgMul * (d.rooms ? ROOM_BOSS.dmg : 1), fx, bodies);
          if (angry) {
            // phase 2: a ring of spit and two small goo from every slam
            for (let k = 0; k < 8; k++) { const ak = (k / 8) * Math.PI * 2, r0 = ENEMY_R[e.kind] + 6; spitAt(d, e.x + Math.cos(ak) * r0, e.y + Math.sin(ak) * r0, ak, fx); } // from the boss's edge
            if (d.enemies.length < 40) for (const s of [-1, 1]) { const g = makeGoo(d, 0, e.x + s * 50, e.y + 30); g.awake = true; d.enemies.push(g); }
          }
          e.slam = null;
        }
      } else if ((e.slamT -= dt) <= 0 && tgt) {
        e.slamT = angry ? (d.rooms ? ROOM_BOSS.slamEvery2 : SLAM_EVERY_2) : SLAM_EVERY;
        e.slam = { x: tgt.x, y: tgt.y, t: SLAM_WARN };
      }
      // rooms, phase 1: a ring of shots now and then (more to dodge than one slam)
      if (d.rooms && !angry && !e.slam && tgt && (e.cd = (e.cd ?? ROOM_BOSS.ringEvery) - dt) <= 0) {
        e.cd = ROOM_BOSS.ringEvery;
        for (let k = 0; k < ROOM_BOSS.ring; k++) { const ak = (k / ROOM_BOSS.ring) * Math.PI * 2 + Math.random() * 0.5, r0 = ENEMY_R[e.kind] + 6; spitAt(d, e.x + Math.cos(ak) * r0, e.y + Math.sin(ak) * r0, ak, fx); }
      }
      if (angry && !e.p2) { e.p2 = true; fx.push({ t: 'phase2', x: e.x, y: e.y }); } // once: the boss turns red
    }
    for (const b of alive) {
      const dd = Math.hypot(b.x - e.x, b.y - e.y), min = BLOB_R + ENEMY_R[e.kind];
      if (dd >= min || dd < 0.001) continue;
      const hb = d.heroes[b.id];
      if (hb && hb.spT > 0 && specialOf(hb.cls, hb.weapon).kind === 'lunge') continue; // a lunge goes right through
      const nx = (b.x - e.x) / dd, ny = (b.y - e.y) / dd;
      b.x = e.x + nx * min; b.y = e.y + ny * min; collideWalls(f, b, BLOB_R); unstick(f, b); // a monster never shoves a blob into a wall
      hurt(d, b, e.x, e.y, ENEMY_TOUCH[e.kind] * dmgMul * (angry ? 1.3 : 1), fx, bodies);
    }
  }
  // the goo around a goo that just woke up come too (they gang up)
  for (const w of woke) for (const e of d.enemies) if (!e.awake && Math.hypot(e.x - w.x, e.y - w.y) < ALERT_R) e.awake = true;
  // spit in flight: walls stop it, a blob takes damage (a sidestep dodges it)
  for (let i = d.spit.length - 1; i >= 0; i--) {
    const s = d.spit[i];
    s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
    let gone = s.t <= 0 || isWall(f, s.x, s.y);
    for (const b of alive) {
      if (gone || Math.hypot(b.x - s.x, b.y - s.y) > BLOB_R + SPIT_R) continue;
      const h = d.heroes[b.id];
      if (h && (h.dodge > 0 || b.dashT > 0)) continue; // dodged: it flies past
      hurt(d, b, s.x - s.vx, s.y - s.vy, (s.dmg ?? SPIT_DMG) * dmgMul, fx, bodies);
      gone = true;
    }
    if (gone) d.spit.splice(i, 1);
  }
  // goo don't stack on each other
  for (let i = 0; i < d.enemies.length; i++) for (let j = i + 1; j < d.enemies.length; j++) {
    const p = d.enemies[i], q = d.enemies[j];
    const dx = q.x - p.x, dy = q.y - p.y, dd = Math.hypot(dx, dy), min = ENEMY_R[p.kind] + ENEMY_R[q.kind];
    if (dd >= min || dd < 0.001) continue;
    const push = (min - dd) / 2, nx = dx / dd, ny = dy / dd;
    p.x -= nx * push; p.y -= ny * push; q.x += nx * push; q.y += ny * push;
  }
  // blobz don't stack either (the meadow's bouncy bumps are off underground)
  const doorOpen = !!d.rooms && roomClear(d);
  for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
    const p = alive[i], q = alive[j];
    if (doorOpen && inDoorway(f, p.x, p.y) && inDoorway(f, q.x, q.y)) continue; // gathering at the door: no bumping
    const dx = q.x - p.x, dy = q.y - p.y, dd = Math.hypot(dx, dy), min = BLOB_R * 2 - 4;
    if (dd >= min) continue;
    const nx = dd > 0.001 ? dx / dd : 1, ny = dd > 0.001 ? dy / dd : 0, push = (min - dd) / 2;
    p.x -= nx * push; p.y -= ny * push; q.x += nx * push; q.y += ny * push;
    collideWalls(f, p, BLOB_R); collideWalls(f, q, BLOB_R); unstick(f, p); unstick(f, q);
  }
  // pickups (slide to a near blob): coins -> team gold, potions -> health for everyone; chests
  for (const c of d.coins) {
    let tb: Body | null = null, bd = COIN_MAGNET;
    for (const b of alive) { const dd = Math.hypot(c.x - b.x, c.y - b.y); if (dd < bd) { bd = dd; tb = b; } }
    if (tb && bd > 1) { c.x += ((tb.x - c.x) / bd) * 220 * dt; c.y += ((tb.y - c.y) / bd) * 220 * dt; }
  }
  for (const b of alive) {
    for (let i = d.coins.length - 1; i >= 0; i--) {
      const c = d.coins[i];
      if (Math.hypot(c.x - b.x, c.y - b.y) > COIN_R) continue;
      d.coins.splice(i, 1);
      if (c.k === 1) { for (const h of Object.values(d.heroes)) healHero(h, POTION_HP); fx.push({ t: 'potion', x: c.x, y: c.y }); }
      else { d.gold += c.v; fx.push({ t: 'coin', x: c.x, y: c.y, n: c.v }); }
    }
    f.chests.forEach((c, i) => {
      if (d.opened[i] || Math.hypot(c.x - b.x, c.y - b.y) > BLOB_R + 20) return;
      if (d.rooms && !roomClear(d)) return; // rooms: the chest appears after the last wave
      d.opened[i] = true; d.gold += CHEST_GOLD;
      fx.push({ t: 'chest', x: c.x, y: c.y, n: CHEST_GOLD });
      // a rare item only sometimes; else a potion
      if (Math.random() < CHEST_ITEM_CHANCE) d.lootQ.push(ITEMS[Math.floor(Math.random() * ITEMS.length)].id);
      else dropAt(d, c.x, c.y + 24, 0, 1);
      gainXp(d, CHEST_XP, fx);
    });
  }
  stepLoot(d, dt, fx);
  // stairs: everyone standing (KO'd blobz don't count) on them for 1.5 s; the last floor's exit needs the boss gone
  if (d.rooms) stepWaves(d, alive, dt, fx);
  if (d.rooms && roomClear(d)) for (const h of Object.values(d.heroes)) if (h.pending > 0 && !h.offer.length) makeOffer(h); // the level-ups gained in the room
  const last = d.floor === lastFloor(d);
  const open = d.rooms ? roomClear(d) : !last || !d.enemies.some((e) => e.kind === 2);
  const exitUp = d.floor === 1 && alive.length > 0 && alive.every((b) => Math.hypot(b.x - f.exit.x, b.y - f.exit.y) < STAIRS_R);
  if (d.rooms && open) { const w = fw(f), T = ft(f); for (let x = Math.floor(f.stairs.x / T - 1); x <= Math.floor((f.stairs.x + T - 1) / T); x++) f.solid[2 * w + x] = 0; } // the open doorway (under the 2-tile leaf) is walkable
  const picking = !!d.rooms && (Object.values(d.heroes).some((h) => h.offer.length > 0) || !!d.loot || d.lootQ.length > 0 || !!d.lootLast); // rooms: cards picked and loot decided (and its result card gone) before the door counts
  const onStairs = open && !picking && alive.length > 0 && alive.every((b) => (d.rooms ? inDoorway(f, b.x, b.y) : Math.hypot(b.x - f.stairs.x, b.y - f.stairs.y) < STAIRS_R));
  if (onStairs || exitUp) d.ready += dt; else d.ready = 0;
  if (d.ready >= READY_SECONDS) {
    d.ready = 0;
    if (exitUp && !onStairs) { d.done = DONE_SECONDS; d.why = 'exit'; return 'stay'; }
    if (last) { d.done = DONE_SECONDS; d.why = 'boss'; return 'stay'; }
    if (d.rooms) { d.trans = ROOM_TRANS; return 'stay'; } // rooms: first everyone slides up through the door (Stefan: always forward)
    nextFloor(d, seed, bodies, fx);
  }
  return 'stay';
}

/** Into the next floor / room. Rooms: the blobz start at the bottom of the new room's hallway and walk in (upward). */
function nextFloor(d: DState, seed: number, bodies: Body[], fx: DFx[]) {
    enterFloor(d, seed, d.floor + 1, bodies.length);
    const T = ft(d.map), gap = d.rooms ? roomGap(fw(d.map)) : [];
    for (const [i, b] of bodies.entries()) {
      if (d.rooms) { b.x = (gap[i % gap.length] + 0.5) * T + (Math.random() - 0.5) * 10; b.y = (fh(d.map) - 0.6) * T + Math.floor(i / gap.length) * 20; }
      else { b.x = d.map.start.x + (Math.random() - 0.5) * 20; b.y = d.map.start.y + (Math.random() - 0.5) * 20; }
      b.vx = 0; b.vy = 0;
      const h = d.heroes[b.id];
      if (h?.ko) { h.ko = 0.01; h.kx = b.x; h.ky = b.y; } // knocked-out blobz come along and wake up at once
      if (h) h.picking = false; // a blob picking cards is frozen again at the new start
    }
    if (d.rooms) d.walkIn = ROOM_WALK_IN;
    fx.push({ t: 'floor', floor: d.floor });
}

function dropAt(d: DState, x: number, y: number, v: number, k: 0 | 1) {
  const c = { id: d.nextId++, x, y, v, k, vx: 0, vy: 0 };
  collideWalls(d.map, c, 6);
  d.coins.push({ id: c.id, x: c.x, y: c.y, v, k });
}

/** Rare loot: one vote at a time. Alone: "Använd" takes it. 2+: everyone sees their item vs the new one and
 *  rolls or passes; the highest roll wears it (replacing their old item). Undecided after 10 s = pass. */
function stepLoot(d: DState, dt: number, fx: DFx[]) {
  if (d.lootLast) { d.lootLast.t -= dt; if (d.lootLast.t <= 0) d.lootLast = null; }
  if (!d.loot && d.lootQ.length && !d.lootLast) {
    // a player who already wears that item passes automatically (one item slot; items have no tiers)
    const item = d.lootQ.shift()!;
    d.loot = { item, t: LOOT_SECONDS, rolls: Object.fromEntries(Object.keys(d.heroes).map((id) => [id, d.heroes[id].items.includes(item) ? 0 : -1])) };
  }
  const v = d.loot;
  if (!v) return;
  v.t -= dt;
  const ids = Object.keys(d.heroes);
  for (const id of ids) v.rolls[id] ??= -1;
  if (v.t > 0 && ids.some((id) => v.rolls[id] === -1)) return;
  let win: string | null = null, roll = 0;
  for (const id of ids) if ((v.rolls[id] ?? 0) > roll) { roll = v.rolls[id]; win = id; }
  if (win) { const h = d.heroes[win]; if (!h.items.includes(v.item)) { if (h.items.length >= ITEM_SLOTS) h.items.shift(); h.items.push(v.item); } refresh(h); } // a 4th item replaces the oldest
  fx.push({ t: 'loot', item: v.item, win, roll });
  d.lootLast = { item: v.item, win, roll, t: 2.5 };
  d.loot = null;
}

/** Returns true when the hit landed. */
function hurt(d: DState, b: Body, fromX: number, fromY: number, dmg: number, fx: DFx[], bodies: Body[]): boolean {
  const h = d.heroes[b.id];
  if (!h || h.inv > 0 || h.ko > 0 || h.dodge > 0 || b.dashT > 0 || h.offer.length) return false; // a sidestep (or lunge) dodges
  // a tank's shield wall covers every friend inside it
  const wall = bodies.some((o) => { const oh = d.heroes[o.id]; return oh?.wallT > 0 && oh.ko <= 0 && Math.hypot(o.x - b.x, o.y - b.y) <= specialOf(oh.cls, oh.weapon).r * heroMods(oh).spR; });
  // the knight's raised shield blocks everything from the front (the way it faces)
  const front = h.guard && (fromX - b.x) * h.fx + (fromY - b.y) * h.fy > 0;
  if (wall || front || h.shield > 0) {
    if (!wall && !front) h.shield--;
    h.inv = HURT_INV * 0.5;
    fx.push({ t: 'block', id: b.id, x: b.x, y: b.y });
    return true;
  }
  h.hp = Math.max(0, h.hp - Math.round(dmg)); h.inv = HURT_INV;
  const dx = b.x - fromX, dy = b.y - fromY, dl = Math.hypot(dx, dy) || 1;
  b.vx = (dx / dl) * 260; b.vy = (dy / dl) * 260;
  const fast = Math.max(0, ...Object.values(d.heroes).map((o) => (o.ko > 0 ? 0 : heroMods(o).koFast)));
  if (h.hp <= 0) { h.ko = KO_SECONDS - fast; h.kx = b.x; h.ky = b.y; fx.push({ t: 'ko', id: b.id, x: b.x, y: b.y }); }
  else fx.push({ t: 'ouch', id: b.id, x: b.x, y: b.y });
  return true;
}

// ---- network snapshot / view (sim.ts puts it in its Snapshot as `dg`) ----
const r1 = (n: number) => Math.round(n * 10) / 10;
type HeroTuple = [string, number, number, number, number, number, number, number?, number?, number?, number?, number?, string?, string?, string?, number?, number?, number?, number?]; // ..., charges, pending level-ups
export interface DSnap {
  sd: number; f: number; du?: number; rm?: [number, number, number, number?, number?, number?, number?]; g: number; xp: number; lv: number; k: number; rd: number; dn: number; tm?: number; wy?: number; bm?: number; // rm: rooms mode [1, wave, waves]
  e: [number, number, number, number, number, number, number, number, number?, number?, number?, number?][]; // id, kind, x, y, hp, slam x, slam y, slam t (-1 none), max hp, act, angle*100, act time*100
  c: [number, number, number, number?][]; // pickup id, x, y, kind
  sp?: [number, number, number][]; // spit id, x, y
  op: string; // opened chests '0101'
  // id, hp, max hp, ko, weapon, facing (rad*100), swing (s*100), special cd (s*10), special active (s*100), dodge/inv flags,
  // shield, wall (s*10), item, skills (comma list), offered cards (comma list), card seconds
  h: HeroTuple[];
  lt?: [string, number, [string, number][]] | null; // loot vote: item, seconds, rolls
  ll?: [string, string, number] | null; // last loot result: item, winner ('' none), roll
}
export interface DHeroView {
  cls: HeroClass; hp: number; maxHp: number; ko: number; weapon: Weapon; face: number; swing: number; spCd: number; spMax: number; spT: number; dodge: boolean; inv: boolean;
  mode: number; guard: boolean; phase: boolean; mvCd: number; mvMax: number; charges: number; maxCharges: number; shield: number; wallT: number; items: string[]; skills: string[]; offer: string[]; offerT: number; pending: number;
}
export interface DView {
  seed: number; floor: number; dungeon: number; rooms: boolean; roomTiles: number; trans: number; walkIn: number; wave: number; waves: number; landing: number; gold: number; xp: number; level: number; kills: number; ready: number; done: number; time: number; why: EndWhy; bossMax: number;
  enemies: { id: number; kind: EnemyKind; x: number; y: number; hp: number; mx: number; slam: { x: number; y: number; t: number } | null; act: Act; ang: number; at: number }[];
  coins: { id: number; x: number; y: number; k: number }[];
  spit: { id: number; x: number; y: number }[];
  opened: boolean[];
  heroes: Record<string, DHeroView>;
  loot: { item: string; t: number; rolls: Record<string, number> } | null;
  lootLast: { item: string; win: string | null; roll: number } | null;
}
const WHY: EndWhy[] = ['boss', 'exit', 'time'];
export function dsnap(d: DState, seed: number): DSnap {
  return {
    sd: seed, f: d.floor, du: d.dungeon ?? 1, rm: d.rooms ? [1, d.wave ?? 0, d.map.waves?.length ?? 0, d.pending?.length ?? 0, d.rw ?? roomTiles(), Math.round((d.trans ?? 0) * 100), Math.round((d.walkIn ?? 0) * 100)] : undefined, g: d.gold, xp: d.xp, lv: d.level, k: d.kills, rd: Math.round((d.ready / READY_SECONDS) * 100), dn: r1(d.done),
    tm: Math.ceil(d.time), wy: WHY.indexOf(d.why), bm: d.bossMax,
    e: d.enemies.map((e) => [e.id, e.kind, r1(e.x), r1(e.y), Math.ceil(e.hp), e.slam ? r1(e.slam.x) : 0, e.slam ? r1(e.slam.y) : 0, e.slam ? r1(e.slam.t) : -1, e.mx, e.act ?? 0, Math.round((e.ang ?? 0) * 100), Math.round((e.actT ?? 0) * 100)]),
    c: d.coins.map((c) => [c.id, r1(c.x), r1(c.y), c.k ?? 0]),
    sp: (d.spit ?? []).map((s) => [s.id, r1(s.x), r1(s.y)]),
    op: d.opened.map((o) => (o ? '1' : '0')).join(''),
    h: Object.entries(d.heroes).map(([id, h]): HeroTuple => [id, Math.ceil(h.hp), h.maxHp, r1(h.ko), WEAPONS.indexOf(h.weapon), Math.round(Math.atan2(h.fy, h.fx) * 100),
      Math.round(h.swing * 100), Math.ceil(h.spCd * 10), Math.round(h.spT * 100), (h.dodge > 0 ? 1 : 0) | (h.inv > 0 ? 2 : 0) | (h.mode ? 4 : 0) | (h.guard ? 8 : 0) | (h.phase > 0 ? 16 : 0),
      h.shield, Math.ceil(h.wallT * 10), h.items.join(','), h.skills.join(','), h.offer.join(','), Math.ceil(h.offerT), Math.ceil(h.mvCd * 10), h.charges, h.pending]),
    lt: d.loot ? [d.loot.item, Math.ceil(d.loot.t), Object.entries(d.loot.rolls)] : null,
    ll: d.lootLast ? [d.lootLast.item, d.lootLast.win ?? '', d.lootLast.roll] : null,
  };
}
const list = (s: string | undefined) => (s ? s.split(',').filter(Boolean) : []);
export function dview(n: DSnap): DView {
  return {
    seed: n.sd, floor: n.f, dungeon: n.du ?? 1, rooms: !!n.rm, roomTiles: n.rm?.[4] ?? roomTiles(), trans: (n.rm?.[5] ?? 0) / 100, walkIn: (n.rm?.[6] ?? 0) / 100, wave: n.rm?.[1] ?? 0, waves: n.rm?.[2] ?? 0, landing: n.rm?.[3] ?? 0, gold: n.g, xp: n.xp, level: n.lv, kills: n.k, ready: n.rd / 100, done: n.dn, time: n.tm ?? 0, why: WHY[n.wy ?? 1] ?? 'exit', bossMax: n.bm ?? ENEMY_HP[2],
    enemies: n.e.map(([id, kind, x, y, hp, sx, sy, st, mx, act, ang, at]) => ({ id, kind: kind as EnemyKind, x, y, hp, mx: mx ?? hp, slam: st >= 0 ? { x: sx, y: sy, t: st } : null, act: (act ?? 0) as Act, ang: (ang ?? 0) / 100, at: (at ?? 0) / 100 })),
    coins: n.c.map(([id, x, y, k]) => ({ id, x, y, k: k ?? 0 })),
    spit: (n.sp ?? []).map(([id, x, y]) => ({ id, x, y })),
    opened: [...n.op].map((c) => c === '1'),
    heroes: Object.fromEntries(n.h.map(([id, hp, maxHp, ko, w, face, swing, cd, spT, fl, sh, wl, it, sk, of, ot, mv, ch, pd]) => {
      const weapon = WEAPONS[w] ?? 'sword', cls = classOf(weapon);
      return [id, {
        cls, hp, maxHp, ko, weapon, face: face / 100, swing: swing / 100,
        spCd: (cd ?? 0) / 10, spMax: specialOf(cls, weapon).cd, spT: (spT ?? 0) / 100, dodge: !!((fl ?? 0) & 1), inv: !!((fl ?? 0) & 2), mode: (fl ?? 0) & 4 ? 1 : 0, guard: !!((fl ?? 0) & 8), phase: !!((fl ?? 0) & 16),
        shield: sh ?? 0, wallT: (wl ?? 0) / 10, items: list(it), skills: list(sk), offer: list(of), offerT: ot ?? 0, pending: pd ?? 0,
        mvCd: (mv ?? 0) / 10, mvMax: CLASS_MOVE_COOLDOWN[cls] * list(it).reduce((k, i) => k * (itemOf(i)?.mod.mvCd ?? 1), 1), charges: ch ?? 1, maxCharges: cls === 'rogue' ? ROGUE_CHARGES : 1,
      }];
    })),
    loot: n.lt ? { item: n.lt[0], t: n.lt[1], rolls: Object.fromEntries(n.lt[2]) } : null,
    lootLast: n.ll ? { item: n.ll[0], win: n.ll[1] || null, roll: n.ll[2] } : null,
  };
}
