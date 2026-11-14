// Test dungeon v1: generated floors, weapons, goo enemies, gold, team XP. Pure TypeScript (no Phaser).
// The host runs it inside the normal sim (sim.ts, mode 'dungeon'); clients rebuild the same map from
// seed + floor and render the snapshot (dsnap/dview below).
// Started by Code (sim + tests), continued by Code 2: auto-attack, classes, specials, sidesteps, skills, loot.
import { rng } from './rng';

export const DT = 32; // one dungeon tile in world px (Kenney Tiny Dungeon 16 px at 2x)
export const GW = 40;
export const GH = 30;
export const FLOORS = 3;
const BLOB_R = 17;

// ---- classes, weapons, specials, sidesteps, level-up skills, loot items (all data) ----
export type HeroClass = 'rogue' | 'healer' | 'marksman' | 'tank';
export const CLASSES: HeroClass[] = ['healer', 'rogue', 'tank', 'marksman'];
/** Player-facing names (sv; en kept for the coming i18n table). Stefan: "Rogue" in Swedish too. */
export const CLASS_NAMES: Record<HeroClass, string> = { healer: 'Helare', rogue: 'Rogue', tank: 'Riddare', marksman: 'Skytt' };
export const CLASS_NAMES_EN: Record<HeroClass, string> = { healer: 'Healer', rogue: 'Rogue', tank: 'Tank', marksman: 'Marksman' };
export const CLASS_HINT: Record<HeroClass, string> = { healer: 'Läker kompisar', rogue: 'Snabb, två dolkar', tank: 'Skyddar laget', marksman: 'Skjuter långt' };
/** Art's file names still use the old class ids (card-class-<x>.png, skills/<x>-<id>.png) until Art renames them. */
export const ART_CLASS: Record<HeroClass, string> = { healer: 'healer', rogue: 'rogue', tank: 'tank', marksman: 'marksman' }; // art files use the class ids since the rename
export const skillIcon = (id: string) => { const [c, ...rest] = id.split('-'); return `art/dungeon/skills/${ART_CLASS[c as HeroClass] ?? c}-${rest.join('-')}.png`; };
export const CLASS_HEARTS: Record<HeroClass, number> = { rogue: 5, healer: 5, marksman: 4, tank: 7 };
export type Weapon = 'sword' | 'hammer' | 'spear' | 'staff' | 'bow' | 'shield' | 'dagger';
/** Order is the snapshot index: only append. */
export const WEAPONS: Weapon[] = ['sword', 'hammer', 'spear', 'staff', 'bow', 'shield', 'dagger'];
export const CLASS_WEAPONS: Record<HeroClass, Weapon[]> = { rogue: ['dagger', 'sword', 'hammer', 'spear'], healer: ['staff'], marksman: ['bow'], tank: ['shield'] };
export const classOf = (w: Weapon): HeroClass => CLASSES.find((c) => CLASS_WEAPONS[c].includes(w)) ?? 'rogue';
export const WEAPON_NAMES: Record<Weapon, string> = { sword: 'Svärd', hammer: 'Hammare', spear: 'Spjut', staff: 'Stav', bow: 'Armborst', shield: 'Sköld', dagger: 'Två dolkar' }; // 'bow' = the crossbow (id kept for the snapshot)
/** Auto-attack: reach (px from the blob centre to the goo's edge), half-arc (radians, PI = all around),
 *  damage, seconds between attacks, knockback; ranged = an arrow at the nearest goo in sight. */
export const WEAPON_STATS: Record<Weapon, { reach: number; arc: number; dmg: number; cd: number; kb: number; ranged?: boolean }> = {
  sword: { reach: 56, arc: 1.0, dmg: 1, cd: 0.4, kb: 160 }, // fast, medium reach
  hammer: { reach: 58, arc: Math.PI, dmg: 2, cd: 0.9, kb: 380 }, // slow, hits all around, big knockback
  spear: { reach: 96, arc: 0.3, dmg: 1, cd: 0.55, kb: 200 }, // long and narrow, pierces a line
  staff: { reach: 52, arc: 1.2, dmg: 1, cd: 0.6, kb: 140 }, // the priest's bonk
  bow: { reach: 250, arc: 0, dmg: 1, cd: 0.6, kb: 110, ranged: true },
  shield: { reach: 50, arc: 1.1, dmg: 1, cd: 0.55, kb: 260 }, // shield bash: big knockback
  dagger: { reach: 44, arc: 1.2, dmg: 1, cd: 0.25, kb: 80 }, // the rogue's two daggers: very fast, short
};
export type SpecialKind = 'spin' | 'slam' | 'lunge' | 'heal' | 'wall' | 'volley';
export interface SpecialDef { kind: SpecialKind; name: string; cd: number; r: number; dmg: number; kb: number; stun: number }
export const SPECIALS: Record<string, SpecialDef> = {
  'rogue:dagger': { kind: 'spin', name: 'Dolkvirvel', cd: 5, r: 72, dmg: 2, kb: 200, stun: 0.6 },
  'rogue:sword': { kind: 'spin', name: 'Snurr', cd: 6, r: 84, dmg: 2, kb: 300, stun: 0.5 },
  'rogue:hammer': { kind: 'slam', name: 'Markslag', cd: 8, r: 110, dmg: 3, kb: 480, stun: 0.9 },
  'rogue:spear': { kind: 'lunge', name: 'Utfall', cd: 7, r: 30, dmg: 2, kb: 220, stun: 0.4 },
  'healer:staff': { kind: 'heal', name: 'Läkljus', cd: 9, r: 150, dmg: 0, kb: 0, stun: 0 }, // heals + revives friends around
  'marksman:bow': { kind: 'volley', name: 'Pilregn', cd: 7, r: 300, dmg: 2, kb: 160, stun: 0.3 }, // arrows at several goo
  'tank:shield': { kind: 'wall', name: 'Sköldmur', cd: 10, r: 120, dmg: 0, kb: 360, stun: 0.6 }, // friends inside take no damage
};
export const specialOf = (cls: HeroClass, w: Weapon): SpecialDef => SPECIALS[`${cls}:${w}`] ?? SPECIALS['rogue:dagger'];
/** Small button per class: how long the blob is untouchable, plus a twist. */
export const SIDESTEPS: Record<HeroClass, { name: string; dodge: number; heal?: number; away?: boolean; hold?: boolean }> = {
  rogue: { name: 'Rulla', dodge: 0.4 },
  healer: { name: 'Ljushopp', dodge: 0.4, heal: 0.5 }, // a little self-heal
  marksman: { name: 'Bakåthopp', dodge: 0.5, away: true }, // jumps away from the nearest goo
  tank: { name: 'Blockera', dodge: 0.7, hold: true }, // stands its ground, blocks longer
};
const LUNGE_SPEED = 400; // the sim lets a dashing blob reach 1.7x its top speed (~408)
const LUNGE_T = 0.35;
export const DODGE_T = 0.4; // rogue sidestep (see SIDESTEPS)
export const WALL_T = 3;

/** What skills and items change on a hero. Multipliers start at 1, the rest at 0. */
export interface Mods {
  dmg: number; rate: number; reach: number; hearts: number; spCd: number; spR: number; heal: number; shieldAll: number; regen: number;
  arrows: number; pierce: number; thorns: number; wallT: number; taunt: number; killHeal: number;
  kb: number; stun: number; crit: number; trap: number; dodge: number; koFast: number;
}
const NO_MODS: Mods = {
  dmg: 0, rate: 1, reach: 0, hearts: 0, spCd: 1, spR: 1, heal: 0, shieldAll: 0, regen: 0, arrows: 0, pierce: 0, thorns: 0, wallT: 0, taunt: 0, killHeal: 0,
  kb: 1, stun: 0, crit: 0, trap: 0, dodge: 0, koFast: 0,
};
const MULT: (keyof Mods)[] = ['rate', 'spCd', 'spR', 'kb'];
/** Level-up cards: 6 per class, picture + 2-3 words. Ids match Art's icons art/dungeon/skills/<id>.png;
 *  `icon` = Kenney Tiny Dungeon tile fallback. */
export interface SkillDef { id: string; cls: HeroClass; name: string; icon: number; mod: Partial<Mods> }
export const SKILLS: SkillDef[] = [
  { id: 'rogue-rage', cls: 'rogue', name: 'Raseri', icon: 103, mod: { rate: 0.85 } },
  { id: 'rogue-knockback', cls: 'rogue', name: 'Stor knuff', icon: 118, mod: { kb: 1.5 } },
  { id: 'rogue-whirlwind', cls: 'rogue', name: 'Virvelvind', icon: 107, mod: { spR: 1.25, spCd: 0.85 } },
  { id: 'rogue-extraheart', cls: 'rogue', name: 'Extra hjärta', icon: 115, mod: { hearts: 1 } },
  { id: 'rogue-lifesteal', cls: 'rogue', name: 'Läk vid splat', icon: 127, mod: { killHeal: 1 } },
  { id: 'rogue-power', cls: 'rogue', name: 'Kraft', icon: 104, mod: { dmg: 1 } },
  { id: 'healer-heal', cls: 'healer', name: 'Mer läkning', icon: 115, mod: { heal: 0.5 } },
  { id: 'healer-regen', cls: 'healer', name: 'Läk dig själv', icon: 114, mod: { regen: 1 } },
  { id: 'healer-bubble', cls: 'healer', name: 'Sköldbubbla', icon: 102, mod: { shieldAll: 1 } },
  { id: 'healer-revive', cls: 'healer', name: 'Snabb väckning', icon: 127, mod: { koFast: 2 } }, // knocked-out friends wake 2 s sooner
  { id: 'healer-holy', cls: 'healer', name: 'Helig träff', icon: 129, mod: { dmg: 1 } },
  { id: 'healer-cleanse', cls: 'healer', name: 'Större ljus', icon: 130, mod: { spR: 1.25, spCd: 0.85 } },
  { id: 'marksman-multishot', cls: 'marksman', name: 'Fler pilar', icon: 131, mod: { arrows: 2 } },
  { id: 'marksman-pierce', cls: 'marksman', name: 'Genomskott', icon: 107, mod: { pierce: 1 } },
  { id: 'marksman-crit', cls: 'marksman', name: 'Fullträff', icon: 104, mod: { crit: 0.25 } }, // 1 in 4 arrows hits double
  { id: 'marksman-speed', cls: 'marksman', name: 'Snabba pilar', icon: 105, mod: { rate: 0.85 } },
  { id: 'marksman-poison', cls: 'marksman', name: 'Giftpilar', icon: 114, mod: { stun: 0.4 } }, // hit goo stand still longer
  { id: 'marksman-trap', cls: 'marksman', name: 'Fälla', icon: 64, mod: { trap: 1.2 } }, // the volley freezes goo
  { id: 'tank-block', cls: 'tank', name: 'Längre block', icon: 101, mod: { dodge: 0.3 } },
  { id: 'tank-taunt', cls: 'tank', name: 'Lockar goo', icon: 108, mod: { taunt: 80 } },
  { id: 'tank-armor', cls: 'tank', name: 'Tjock rustning', icon: 96, mod: { hearts: 2 } },
  { id: 'tank-charge', cls: 'tank', name: 'Sköldknuff', icon: 102, mod: { kb: 1.5, dmg: 1 } },
  { id: 'tank-stun', cls: 'tank', name: 'Bedöva', icon: 117, mod: { stun: 0.5 } },
  { id: 'tank-guard', cls: 'tank', name: 'Lång mur', icon: 65, mod: { wallT: 1, spR: 1.2 } },
];
export const skillOf = (id: string) => SKILLS.find((k) => k.id === id);
/** Rare loot: one item slot per blob. `icon` = Kenney tile until Art's item-<id>.png exists. */
export interface ItemDef { id: string; name: string; icon: number; mod: Partial<Mods> }
export const ITEMS: ItemDef[] = [
  { id: 'ring', name: 'Rubinring', icon: 113, mod: { dmg: 1 } },
  { id: 'helm', name: 'Järnhjälm', icon: 96, mod: { hearts: 2 } },
  { id: 'gloves', name: 'Snabbhandskar', icon: 105, mod: { rate: 0.8 } },
  { id: 'amulet', name: 'Stjärnamulett', icon: 126, mod: { spCd: 0.7 } },
  { id: 'cape', name: 'Fjäderkappa', icon: 72, mod: { reach: 16 } },
  { id: 'stone', name: 'Läkesten', icon: 114, mod: { regen: 1 } },
];
export const itemOf = (id: string | null | undefined) => ITEMS.find((i) => i.id === id);
export const LOOT_SECONDS = 10;
const REGEN_EVERY = 8;

/** Boss HP grows with the team: 15 for one blob, +50% per extra blob. */
export const bossHp = (players: number) => Math.round(15 * (1 + 0.5 * Math.max(0, Math.min(5, players) - 1)));

export type EnemyKind = 0 | 1 | 2; // small, medium, boss goo
export const ENEMY_HP = [1, 3, 15];
/** Goo art (art/enemies/goo-*.png, opaque to the edges) and its world scale: the hitbox is the drawn sprite,
 *  a circle with the mean half-size of what is on screen (small 28x24 -> 13, medium 44x36 -> 20, boss 87x87 -> 44). */
export const GOO_ART: [number, number][] = [[14, 12], [22, 18], [29, 29]];
export const GOO_SCALE = [2, 2, 3];
export const ENEMY_R = GOO_ART.map(([w, h], k) => Math.round(((w + h) / 4) * GOO_SCALE[k]));
export const ENEMY_SPEED = [72, 54, 40];
export const ENEMY_GOLD = [1, 3, 15];
export const ENEMY_XP = [1, 3, 10];
const ENEMY_SIGHT = 300; // they wake up and chase within this range
export const SLAM_EVERY = 4; // boss: telegraphed slam
export const SLAM_WARN = 1.1; // red ring on the ground before it lands
export const SLAM_R = 72;
export const START_HEARTS = 5;
export const TOUCH_DMG = 0.5; // goo touch: half a heart
export const SLAM_DMG = 1;
export const KO_SECONDS = 5;
export const RUN_SECONDS = 300; // a run ends (back to the meadow) after 5 minutes at the latest
export const DONE_SECONDS = 6; // "Dungeon klar!" stays this long
const HURT_INV = 1; // invulnerable after a hit
/** Team XP needed to reach level n+1 (index = current level - 1). */
export const LEVEL_XP = [5, 12, 22, 35, 52, 75];

export interface Room { x: number; y: number; w: number; h: number } // tiles
export interface Floor {
  floor: number;
  solid: Uint8Array; // GW*GH, 1 = wall
  rooms: Room[];
  start: { x: number; y: number }; // world px: arrival (and revive) point
  exit: { x: number; y: number }; // stairs up in the first room's corner: leave the dungeon
  stairs: { x: number; y: number }; // stairs down (floors 1-2) or the exit after the boss (floor 3)
  chests: { x: number; y: number }[];
  spawns: { kind: EnemyKind; x: number; y: number }[];
}

const cx = (r: Room) => (r.x + r.w / 2) * DT;
const cy = (r: Room) => (r.y + r.h / 2) * DT;

/** Rooms + corridors for one floor, from the run seed. The last room is the farthest from the start;
 *  on the last floor it is the boss room. */
export function makeFloor(seed: number, floor: number, players = 1): Floor {
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
  const spawns: Floor['spawns'] = [];
  const extra = Math.floor(Math.max(1, players) / 2);
  order.slice(1).forEach((o, i) => {
    const isGoal = o === goal;
    const smalls = (isGoal && boss ? 2 : 1 + Math.floor(r() * 2)) + (floor - 1) + extra;
    for (let k = 0; k < smalls; k++) spawns.push({ kind: 0, x: (o.x + 1 + r() * (o.w - 2)) * DT, y: (o.y + 1 + r() * (o.h - 2)) * DT });
    if (floor >= 2 && (i % 2 === 0 || isGoal)) spawns.push({ kind: 1, x: cx(o) + DT, y: cy(o) });
    if (isGoal && boss) spawns.push({ kind: 2, x: cx(o), y: cy(o) - DT });
  });
  return { floor, solid, rooms, start, exit, stairs, chests, spawns };
}

export const isWall = (f: Floor, x: number, y: number) => {
  const tx = Math.floor(x / DT), ty = Math.floor(y / DT);
  return tx < 0 || ty < 0 || tx >= GW || ty >= GH || f.solid[ty * GW + tx] === 1;
};

/** Push a circle out of wall tiles (and stop its velocity into them). */
export function collideWalls(f: Floor, o: { x: number; y: number; vx: number; vy: number }, rad: number) {
  const tx0 = Math.floor((o.x - rad) / DT), tx1 = Math.floor((o.x + rad) / DT);
  const ty0 = Math.floor((o.y - rad) / DT), ty1 = Math.floor((o.y + rad) / DT);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    if (!(tx < 0 || ty < 0 || tx >= GW || ty >= GH || f.solid[ty * GW + tx])) continue;
    const qx = Math.max(tx * DT, Math.min(o.x, (tx + 1) * DT)), qy = Math.max(ty * DT, Math.min(o.y, (ty + 1) * DT));
    let dx = o.x - qx, dy = o.y - qy;
    const d = Math.hypot(dx, dy);
    if (d >= rad) continue;
    if (d < 0.001) { dx = 0; dy = -1; } else { dx /= d; dy /= d; }
    o.x += dx * (rad - d); o.y += dy * (rad - d);
    const vn = o.vx * dx + o.vy * dy;
    if (vn < 0) { o.vx -= vn * dx; o.vy -= vn * dy; }
  }
}

export interface Enemy { id: number; kind: EnemyKind; x: number; y: number; vx: number; vy: number; hp: number; awake: boolean; stun: number; slamT: number; slam: { x: number; y: number; t: number } | null; by?: string }
/** Floor pickups: kind 0 = coin (team gold), 1 = potion (+1 heart for everyone). */
export interface Coin { id: number; x: number; y: number; v: number; k?: 0 | 1 }
export interface Hero {
  cls: HeroClass; hearts: number; maxHearts: number; ko: number; inv: number; weapon: Weapon;
  fx: number; fy: number; aim: number; // facing; aim > 0: facing the last target (movement does not turn it)
  atkCd: number; swing: number;
  spCd: number; spT: number; lastAtk: number; // special: cooldown, active time, last button counter
  lunge: number[]; // goo ids already hit by the current lunge
  dodge: number; lastDash: number; // sidestep invulnerability, last dash counter
  kx: number; ky: number; // where a knocked-out blob lies
  skills: string[]; item: string | null; // level-up picks, the one loot item
  offer: string[]; offerT: number; pending: number; // 1-of-3 cards on screen (no timer: offerT stays 0), level-ups still to pick
  zx: number; zy: number; picking: boolean; // frozen + safe while the cards are open
  shield: number; wallT: number; regenT: number; kills: number; // priest shield charges, knight wall, regen clock, own kills
}
export type EndWhy = 'boss' | 'exit' | 'time';
export interface LootVote { item: string; t: number; rolls: Record<string, number> } // -1 undecided, 0 pass, 1-100 roll
export interface DState {
  floor: number;
  map: Floor; // rebuilt from seed + floor, never sent
  enemies: Enemy[];
  coins: Coin[];
  opened: boolean[]; // chests
  gold: number; xp: number; level: number; kills: number;
  bossMax: number;
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
  | { t: 'shot'; x: number; y: number; tx: number; ty: number }
  | { t: 'special'; id: string; k: SpecialKind; x: number; y: number; a: number; r: number }
  | { t: 'dodge'; id: string; x: number; y: number }
  | { t: 'hurt'; e: number; x: number; y: number; kind: EnemyKind }
  | { t: 'kill'; x: number; y: number; kind: EnemyKind }
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
  | { t: 'slam'; x: number; y: number };

export const STAIRS_R = 40;
export const READY_SECONDS = 1.5;
const CHEST_GOLD = 8;
const CHEST_XP = 2;
const COIN_R = 28;
const COIN_MAGNET = 70; // coins slide to a blob this close (easier for small thumbs)

export function heroMods(h: Pick<Hero, 'skills' | 'item'>): Mods {
  const m: Mods = { ...NO_MODS };
  const add = (mod: Partial<Mods>) => {
    for (const [k, v] of Object.entries(mod) as [keyof Mods, number][]) m[k] = MULT.includes(k) ? m[k] * v : m[k] + v;
  };
  for (const s of h.skills) { const d = skillOf(s); if (d) add(d.mod); }
  const it = itemOf(h.item);
  if (it) add(it.mod);
  return m;
}
/** Max hearts follow class + skills + item; gained hearts are filled, lost ones cut. */
function refresh(h: Hero) {
  const max = CLASS_HEARTS[h.cls] + heroMods(h).hearts;
  if (max > h.maxHearts) h.hearts += max - h.maxHearts;
  h.maxHearts = max;
  h.hearts = Math.min(h.hearts, max);
}

export function newHero(weapon: Weapon, maxHearts?: number): Hero {
  const cls = classOf(weapon);
  const max = maxHearts ?? CLASS_HEARTS[cls];
  return {
    cls, hearts: max, maxHearts: max, ko: 0, inv: 0, weapon, fx: 0, fy: 1, aim: 0, atkCd: 0, swing: 0,
    spCd: 0, spT: 0, lastAtk: -1, lunge: [], dodge: 0, lastDash: -1, kx: 0, ky: 0,
    skills: [], item: null, offer: [], offerT: 0, pending: 0, zx: 0, zy: 0, picking: false, shield: 0, wallT: 0, regenT: 0, kills: 0,
  };
}

export function enterFloor(d: Omit<DState, 'map'> & { map?: Floor }, seed: number, floor: number, players: number): DState {
  const map = makeFloor(seed, floor, players);
  const out = d as DState;
  out.floor = floor; out.map = map; out.ready = 0;
  out.bossMax = bossHp(players);
  out.enemies = map.spawns.map((sp) => ({ id: out.nextId++, kind: sp.kind, x: sp.x, y: sp.y, vx: 0, vy: 0, hp: sp.kind === 2 ? out.bossMax : ENEMY_HP[sp.kind], awake: false, stun: 0, slamT: SLAM_EVERY, slam: null }));
  out.coins = [];
  out.opened = map.chests.map(() => false);
  return out;
}

export function newRun(seed: number, picks: Record<string, Weapon>): DState {
  const heroes: Record<string, Hero> = {};
  for (const [id, w] of Object.entries(picks)) heroes[id] = newHero(w);
  return enterFloor({
    floor: 1, enemies: [], coins: [], opened: [], gold: 0, xp: 0, level: 1, kills: 0, bossMax: 15,
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

/** No wall tile between two points (arrows, volley). */
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
    // every blob picks 1 of 3 cards from its own class (10 s, then the first card is taken)
    for (const h of Object.values(d.heroes)) { h.pending++; if (!h.offer.length) makeOffer(h); }
    fx.push({ t: 'level', level: d.level });
  }
}

/** A blob's choice from the card screens: 'skill:<id>', 'loot:roll' or 'loot:pass'. */
export function dungeonChoice(d: DState, id: string, msg: string, fx: DFx[] = []) {
  const h = d.heroes[id];
  if (!h) return;
  if (msg.startsWith('skill:')) takeSkill(h, msg.slice(6), id, fx);
  else if (d.loot && d.loot.rolls[id] === -1 && (msg === 'loot:roll' || msg === 'loot:pass')) d.loot.rolls[id] = msg === 'loot:roll' ? 1 + Math.floor(Math.random() * 100) : 0;
}

/** Damage + knockback on one goo from (fromX, fromY). */
function hitEnemy(d: DState, e: Enemy, dmg: number, kb: number, stun: number, fromX: number, fromY: number, fx: DFx[], by?: string) {
  if (e.hp <= 0) return;
  e.hp -= dmg;
  e.awake = true;
  const dx = e.x - fromX, dy = e.y - fromY, dl = Math.hypot(dx, dy) || 1;
  const k = kb * (e.kind === 2 ? 0.25 : 1);
  e.vx = (dx / dl) * k; e.vy = (dy / dl) * k; e.stun = Math.max(e.stun, stun);
  if (e.hp <= 0) e.by = by;
  fx.push(e.hp > 0 ? { t: 'hurt', e: e.id, x: e.x, y: e.y, kind: e.kind } : { t: 'kill', x: e.x, y: e.y, kind: e.kind });
}

function face(h: Hero, b: Body, tx: number, ty: number) {
  const dx = tx - b.x, dy = ty - b.y, dl = Math.hypot(dx, dy);
  if (dl > 0.5) { h.fx = dx / dl; h.fy = dy / dl; }
  h.aim = 0.45;
}

function healHero(h: Hero, n: number) { if (h.ko <= 0) h.hearts = Math.min(h.maxHearts, h.hearts + n); }

/** Big button: the class/weapon special. */
function special(d: DState, h: Hero, b: Body, bodies: Body[], m: Mods, fx: DFx[]) {
  const sp = specialOf(h.cls, h.weapon);
  h.spCd = sp.cd * m.spCd;
  const dmg = sp.dmg + m.dmg;
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
    // every friend in the light: +1 heart (more with skills), knocked-out friends get up at once
    for (const o of bodies) {
      const oh = d.heroes[o.id];
      if (!oh || Math.hypot(o.x - b.x, o.y - b.y) > r) continue;
      if (oh.ko > 0) { oh.ko = 0; oh.hearts = Math.max(1, oh.maxHearts / 2); oh.inv = 1.5; fx.push({ t: 'revive', id: o.id, x: o.x, y: o.y }); }
      else healHero(oh, 1 + m.heal);
      if (m.shieldAll) oh.shield = Math.max(oh.shield, m.shieldAll);
      fx.push({ t: 'heal', id: o.id, x: o.x, y: o.y });
    }
  } else if (sp.kind === 'volley') {
    // arrows at the nearest goo in sight (3, more with skills)
    const n = 3 + m.arrows;
    const targets = d.enemies.filter((e) => e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) - ENEMY_R[e.kind] <= r && lineOfSight(d.map, b.x, b.y, e.x, e.y))
      .sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y)).slice(0, n);
    for (const e of targets) { fx.push({ t: 'shot', x: b.x, y: b.y, tx: e.x, ty: e.y }); hitEnemy(d, e, dmg, sp.kb * m.kb, sp.stun + m.trap, b.x, b.y, fx, b.id); }
  } else if (sp.kind === 'wall') {
    // shield wall: goo inside are shoved out, friends inside take no damage while it stands
    h.wallT = WALL_T + m.wallT;
    for (const e of d.enemies) if (e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) - ENEMY_R[e.kind] <= r) hitEnemy(d, e, 0, sp.kb * m.kb, sp.stun + m.stun, b.x, b.y, fx, b.id);
  } else {
    // spin (sword) and slam (hammer): everything around the blob
    for (const e of d.enemies) if (e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) - ENEMY_R[e.kind] <= r) hitEnemy(d, e, dmg, sp.kb * m.kb, sp.stun + m.stun, b.x, b.y, fx, b.id);
  }
  fx.push(at);
}

/** Auto-attack: melee swing at the nearest goo in reach, or an arrow at the nearest goo in sight. */
function autoAttack(d: DState, h: Hero, b: Body, m: Mods, fx: DFx[]) {
  const st = WEAPON_STATS[h.weapon];
  const reach = st.reach + m.reach;
  const t = nearestEnemy(d, b.x, b.y, reach, st.ranged ? d.map : undefined);
  if (!t) return;
  face(h, b, t.x, t.y);
  h.atkCd = st.cd * m.rate; h.swing = Math.min(0.3, h.atkCd * 0.8);
  fx.push({ t: 'swing', id: b.id, w: h.weapon, a: Math.atan2(h.fy, h.fx) });
  const dmg = (st.dmg + m.dmg) * (m.crit > 0 && Math.random() < m.crit ? 2 : 1);
  const kb = st.kb * m.kb;
  if (st.ranged) {
    fx.push({ t: 'shot', x: b.x, y: b.y, tx: t.x, ty: t.y });
    hitEnemy(d, t, dmg, kb, 0.25 + m.stun, b.x, b.y, fx, b.id);
    // pierce: the arrow flies on through the next goo in the line
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

/** One dungeon tick after the players have moved (sim.ts moves them with the usual glide physics).
 *  `atk` = each blob's special-button counter (Input.atk). */
export function stepDungeon(d: DState, bodies: Body[], atk: Map<string, number>, seed: number, dt: number, fx: DFx[]): 'stay' | 'out' {
  const f = d.map;
  if (d.done > 0) {
    d.done -= dt;
    for (const b of bodies) { b.vx = 0; b.vy = 0; collideWalls(f, b, BLOB_R); }
    return d.done <= 0 ? 'out' : 'stay';
  }
  d.time = Math.max(0, d.time - dt);
  if (d.time <= 0) { d.done = DONE_SECONDS; d.why = 'time'; return 'stay'; }
  const mods = new Map<string, Mods>();
  // heroes: facing, timers, auto-attack, special, sidestep, KO/revive, cards
  for (const b of bodies) {
    const h = d.heroes[b.id] ??= newHero('dagger');
    const m = heroMods(h);
    mods.set(b.id, m);
    collideWalls(f, b, BLOB_R);
    h.atkCd = Math.max(0, h.atkCd - dt); h.inv = Math.max(0, h.inv - dt); h.swing = Math.max(0, h.swing - dt);
    h.spCd = Math.max(0, h.spCd - dt); h.spT = Math.max(0, h.spT - dt); h.dodge = Math.max(0, h.dodge - dt); h.aim = Math.max(0, h.aim - dt);
    h.wallT = Math.max(0, h.wallT - dt);
    const a = atk.get(b.id) ?? h.lastAtk;
    if (h.lastAtk < 0) h.lastAtk = a; // first tick: whatever the counter was on the meadow
    if (h.lastDash < 0) h.lastDash = b.lastDash ?? 0;
    if (h.ko > 0) {
      h.ko -= dt;
      b.x = h.kx; b.y = h.ky; b.vx = 0; b.vy = 0;
      h.lastAtk = a; h.lastDash = b.lastDash ?? h.lastDash;
      if (h.ko <= 0) {
        h.ko = 0; h.hearts = h.maxHearts; h.inv = 2; b.x = f.start.x; b.y = f.start.y;
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
    if (m.regen > 0 && h.hearts < h.maxHearts) {
      h.regenT += dt;
      if (h.regenT >= REGEN_EVERY) { h.regenT = 0; healHero(h, 0.5 * m.regen); fx.push({ t: 'heal', id: b.id, x: b.x, y: b.y }); }
    } else h.regenT = 0;
    // sidestep: the sim already gave the dash impulse; the class decides the twist
    if (b.lastDash !== undefined && b.lastDash !== h.lastDash) {
      h.lastDash = b.lastDash;
      if (b.dashT > 0.25) {
        const ss = SIDESTEPS[h.cls];
        h.dodge = ss.dodge + m.dodge;
        if (ss.heal) healHero(h, ss.heal);
        if (ss.hold) { b.vx *= 0.3; b.vy *= 0.3; }
        if (ss.away) {
          const e = nearestEnemy(d, b.x, b.y, 220);
          if (e) { const sp = Math.max(300, Math.hypot(b.vx, b.vy)), dx = b.x - e.x, dy = b.y - e.y, dl = Math.hypot(dx, dy) || 1; b.vx = (dx / dl) * sp; b.vy = (dy / dl) * sp; }
        }
        fx.push({ t: 'dodge', id: b.id, x: b.x, y: b.y });
      }
    }
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > 30 && h.aim <= 0 && h.spT <= 0) { h.fx = b.vx / sp; h.fy = b.vy / sp; }
    // special attack (big button)
    if (a !== h.lastAtk) {
      h.lastAtk = a;
      if (h.spCd <= 0) special(d, h, b, bodies, m, fx);
    }
    // lunge in progress: pierce every goo it touches once
    if (h.spT > 0 && specialOf(h.cls, h.weapon).kind === 'lunge') {
      const def = specialOf(h.cls, h.weapon);
      for (const e of d.enemies) {
        if (e.hp <= 0 || h.lunge.includes(e.id) || Math.hypot(e.x - b.x, e.y - b.y) > BLOB_R + ENEMY_R[e.kind] + def.r) continue;
        h.lunge.push(e.id);
        hitEnemy(d, e, def.dmg + m.dmg, def.kb, def.stun, b.x, b.y, fx, b.id);
      }
    }
    if (h.atkCd <= 0) autoAttack(d, h, b, m, fx);
  }
  // standing blobz: not knocked out and not busy with the level-up cards (goo ignore those, stairs don't wait for them)
  const alive = bodies.filter((b) => (d.heroes[b.id]?.ko ?? 0) <= 0 && !d.heroes[b.id]?.offer.length);
  // dead enemies: coins (+ sometimes a potion or rare loot) + XP
  for (let i = d.enemies.length - 1; i >= 0; i--) {
    const e = d.enemies[i];
    if (e.hp > 0) continue;
    d.enemies.splice(i, 1);
    d.kills++;
    const killer = e.by ? d.heroes[e.by] : undefined;
    if (killer) {
      killer.kills++;
      const km = mods.get(e.by!);
      if (km?.killHeal && killer.kills % 4 === 0) healHero(killer, 0.5 * km.killHeal);
    }
    const n = ENEMY_GOLD[e.kind];
    const pieces = Math.min(5, n);
    for (let k = 0; k < pieces; k++) {
      const a = (k / pieces) * Math.PI * 2;
      dropAt(d, e.x + Math.cos(a) * 18, e.y + Math.sin(a) * 18, Math.floor(n / pieces) + (k < n % pieces ? 1 : 0), 0);
    }
    if (Math.random() < [0.05, 0.3, 1][e.kind]) dropAt(d, e.x, e.y + 10, 0, 1);
    if (e.kind === 2 || (e.kind === 1 && Math.random() < 0.15)) d.lootQ.push(ITEMS[Math.floor(Math.random() * ITEMS.length)].id);
    gainXp(d, ENEMY_XP[e.kind], fx);
  }
  // enemies: wake up, chase the nearest standing blob (knights pull them in), touching hurts; the boss also slams
  for (const e of d.enemies) {
    e.stun = Math.max(0, e.stun - dt);
    let tgt: Body | null = null, best = Infinity;
    for (const b of alive) {
      const dd = Math.hypot(b.x - e.x, b.y - e.y);
      if (!e.awake && dd > ENEMY_SIGHT) continue;
      const h = d.heroes[b.id];
      const pull = h?.cls === 'tank' ? 120 + (mods.get(b.id)?.taunt ?? 0) + (h.wallT > 0 ? 200 : 0) : 0;
      if (dd - pull < best) { best = dd - pull; tgt = b; }
    }
    if (tgt) e.awake = true;
    if (e.stun <= 0 && tgt) {
      const dx = tgt.x - e.x, dy = tgt.y - e.y, dl = Math.hypot(dx, dy) || 1;
      const spd = ENEMY_SPEED[e.kind] * (e.slam ? 0.2 : 1);
      e.vx += ((dx / dl) * spd - e.vx) * Math.min(1, dt * 5);
      e.vy += ((dy / dl) * spd - e.vy) * Math.min(1, dt * 5);
    } else { e.vx *= Math.exp(-5 * dt); e.vy *= Math.exp(-5 * dt); }
    e.x += e.vx * dt; e.y += e.vy * dt;
    collideWalls(f, e, ENEMY_R[e.kind]);
    if (e.kind === 2 && e.awake) {
      if (e.slam) {
        e.slam.t -= dt;
        if (e.slam.t <= 0) {
          fx.push({ t: 'slam', x: e.slam.x, y: e.slam.y });
          for (const b of alive) if (Math.hypot(b.x - e.slam.x, b.y - e.slam.y) < SLAM_R + BLOB_R) hurt(d, b, e.slam.x, e.slam.y, SLAM_DMG, fx, bodies);
          e.slam = null;
        }
      } else if ((e.slamT -= dt) <= 0 && tgt) {
        e.slamT = SLAM_EVERY;
        e.slam = { x: tgt.x, y: tgt.y, t: SLAM_WARN };
      }
    }
    for (const b of alive) {
      const dd = Math.hypot(b.x - e.x, b.y - e.y), min = BLOB_R + ENEMY_R[e.kind];
      if (dd >= min || dd < 0.001) continue;
      const hb = d.heroes[b.id];
      if (hb && hb.spT > 0 && specialOf(hb.cls, hb.weapon).kind === 'lunge') continue; // a lunge goes right through
      const nx = (b.x - e.x) / dd, ny = (b.y - e.y) / dd;
      b.x = e.x + nx * min; b.y = e.y + ny * min;
      if (hurt(d, b, e.x, e.y, TOUCH_DMG, fx, bodies) && hb) {
        const th = mods.get(b.id)?.thorns ?? 0;
        if (th > 0) hitEnemy(d, e, th, 200, 0.4, b.x, b.y, fx, b.id); // spiky shield bites back
      }
    }
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
  for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
    const p = alive[i], q = alive[j];
    const dx = q.x - p.x, dy = q.y - p.y, dd = Math.hypot(dx, dy), min = BLOB_R * 2 - 4;
    if (dd >= min) continue;
    const nx = dd > 0.001 ? dx / dd : 1, ny = dd > 0.001 ? dy / dd : 0, push = (min - dd) / 2;
    p.x -= nx * push; p.y -= ny * push; q.x += nx * push; q.y += ny * push;
    collideWalls(f, p, BLOB_R); collideWalls(f, q, BLOB_R);
  }
  // pickups (slide to a near blob): coins -> team gold, potions -> +1 heart for everyone; chests
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
      if (c.k === 1) { for (const h of Object.values(d.heroes)) healHero(h, 1); fx.push({ t: 'potion', x: c.x, y: c.y }); }
      else { d.gold += c.v; fx.push({ t: 'coin', x: c.x, y: c.y, n: c.v }); }
    }
    f.chests.forEach((c, i) => {
      if (d.opened[i] || Math.hypot(c.x - b.x, c.y - b.y) > BLOB_R + 20) return;
      d.opened[i] = true; d.gold += CHEST_GOLD;
      fx.push({ t: 'chest', x: c.x, y: c.y, n: CHEST_GOLD });
      d.lootQ.push(ITEMS[Math.floor(Math.random() * ITEMS.length)].id); // every chest holds a rare item
      gainXp(d, CHEST_XP, fx);
    });
  }
  stepLoot(d, dt, fx);
  // stairs: everyone standing (KO'd blobz don't count) on them for 1.5 s; the last floor's exit needs the boss gone
  const last = d.floor === FLOORS;
  const open = !last || !d.enemies.some((e) => e.kind === 2);
  const exitUp = d.floor === 1 && alive.length > 0 && alive.every((b) => Math.hypot(b.x - f.exit.x, b.y - f.exit.y) < STAIRS_R);
  const onStairs = open && alive.length > 0 && alive.every((b) => Math.hypot(b.x - f.stairs.x, b.y - f.stairs.y) < STAIRS_R);
  if (onStairs || exitUp) d.ready += dt; else d.ready = 0;
  if (d.ready >= READY_SECONDS) {
    d.ready = 0;
    if (exitUp && !onStairs) { d.done = DONE_SECONDS; d.why = 'exit'; return 'stay'; }
    if (last) { d.done = DONE_SECONDS; d.why = 'boss'; return 'stay'; }
    enterFloor(d, seed, d.floor + 1, bodies.length);
    for (const b of bodies) {
      b.x = d.map.start.x + (Math.random() - 0.5) * 20; b.y = d.map.start.y + (Math.random() - 0.5) * 20; b.vx = 0; b.vy = 0;
      const h = d.heroes[b.id];
      if (h?.ko) { h.ko = 0.01; h.kx = b.x; h.ky = b.y; } // knocked-out blobz come along and wake up at once
      if (h) h.picking = false; // a blob picking cards is frozen again at the new start
    }
    fx.push({ t: 'floor', floor: d.floor });
  }
  return 'stay';
}

function dropAt(d: DState, x: number, y: number, v: number, k: 0 | 1) {
  const c = { id: d.nextId++, x, y, v, k, vx: 0, vy: 0 };
  collideWalls(d.map, c, 6);
  d.coins.push({ id: c.id, x: c.x, y: c.y, v, k });
}

/** Rare loot: one vote at a time. Everyone sees their item vs the new one and rolls or passes;
 *  the highest roll wears it (replacing their old item). Undecided after 10 s = pass. */
function stepLoot(d: DState, dt: number, fx: DFx[]) {
  if (d.lootLast) { d.lootLast.t -= dt; if (d.lootLast.t <= 0) d.lootLast = null; }
  if (!d.loot && d.lootQ.length && !d.lootLast) {
    d.loot = { item: d.lootQ.shift()!, t: LOOT_SECONDS, rolls: Object.fromEntries(Object.keys(d.heroes).map((id) => [id, -1])) };
  }
  const v = d.loot;
  if (!v) return;
  v.t -= dt;
  const ids = Object.keys(d.heroes);
  for (const id of ids) v.rolls[id] ??= -1;
  if (v.t > 0 && ids.some((id) => v.rolls[id] === -1)) return;
  let win: string | null = null, roll = 0;
  for (const id of ids) if ((v.rolls[id] ?? 0) > roll) { roll = v.rolls[id]; win = id; }
  if (win) { const h = d.heroes[win]; h.item = v.item; refresh(h); }
  fx.push({ t: 'loot', item: v.item, win, roll });
  d.lootLast = { item: v.item, win, roll, t: 2.5 };
  d.loot = null;
}

/** Returns true when the hit landed (thorns bite back only then). */
function hurt(d: DState, b: Body, fromX: number, fromY: number, dmg: number, fx: DFx[], bodies: Body[]): boolean {
  const h = d.heroes[b.id];
  if (!h || h.inv > 0 || h.ko > 0 || h.dodge > 0 || b.dashT > 0 || h.offer.length) return false; // a sidestep (or lunge) dodges
  // a knight's shield wall covers every friend inside it
  const wall = bodies.some((o) => { const oh = d.heroes[o.id]; return oh?.wallT > 0 && oh.ko <= 0 && Math.hypot(o.x - b.x, o.y - b.y) <= specialOf(oh.cls, oh.weapon).r * heroMods(oh).spR; });
  if (wall || h.shield > 0) {
    if (!wall) h.shield--;
    h.inv = HURT_INV * 0.5;
    fx.push({ t: 'block', id: b.id, x: b.x, y: b.y });
    return true;
  }
  h.hearts = Math.max(0, h.hearts - dmg); h.inv = HURT_INV;
  const dx = b.x - fromX, dy = b.y - fromY, dl = Math.hypot(dx, dy) || 1;
  b.vx = (dx / dl) * 260; b.vy = (dy / dl) * 260;
  const fast = Math.max(0, ...Object.values(d.heroes).map((o) => (o.ko > 0 ? 0 : heroMods(o).koFast)));
  if (h.hearts <= 0) { h.ko = KO_SECONDS - fast; h.kx = b.x; h.ky = b.y; fx.push({ t: 'ko', id: b.id, x: b.x, y: b.y }); }
  else fx.push({ t: 'ouch', id: b.id, x: b.x, y: b.y });
  return true;
}

// ---- network snapshot / view (sim.ts puts it in its Snapshot as `dg`) ----
const r1 = (n: number) => Math.round(n * 10) / 10;
type HeroTuple = [string, number, number, number, number, number, number, number?, number?, number?, number?, number?, string?, string?, string?, number?];
export interface DSnap {
  sd: number; f: number; g: number; xp: number; lv: number; k: number; rd: number; dn: number; tm?: number; wy?: number; bm?: number;
  e: [number, number, number, number, number, number, number, number][]; // id, kind, x, y, hp, slam x, slam y, slam t (-1 none)
  c: [number, number, number, number?][]; // pickup id, x, y, kind
  op: string; // opened chests '0101'
  // id, hearts*2, max, ko, weapon, facing (rad*100), swing (s*100), special cd (s*10), special active (s*100), dodge/inv flags,
  // shield, wall (s*10), item, skills (comma list), offered cards (comma list), card seconds
  h: HeroTuple[];
  lt?: [string, number, [string, number][]] | null; // loot vote: item, seconds, rolls
  ll?: [string, string, number] | null; // last loot result: item, winner ('' none), roll
}
export interface DHeroView {
  cls: HeroClass; hearts: number; maxHearts: number; ko: number; weapon: Weapon; face: number; swing: number; spCd: number; spMax: number; spT: number; dodge: boolean; inv: boolean;
  shield: number; wallT: number; item: string | null; skills: string[]; offer: string[]; offerT: number;
}
export interface DView {
  seed: number; floor: number; gold: number; xp: number; level: number; kills: number; ready: number; done: number; time: number; why: EndWhy; bossMax: number;
  enemies: { id: number; kind: EnemyKind; x: number; y: number; hp: number; slam: { x: number; y: number; t: number } | null }[];
  coins: { id: number; x: number; y: number; k: number }[];
  opened: boolean[];
  heroes: Record<string, DHeroView>;
  loot: { item: string; t: number; rolls: Record<string, number> } | null;
  lootLast: { item: string; win: string | null; roll: number } | null;
}
const WHY: EndWhy[] = ['boss', 'exit', 'time'];
export function dsnap(d: DState, seed: number): DSnap {
  return {
    sd: seed, f: d.floor, g: d.gold, xp: d.xp, lv: d.level, k: d.kills, rd: Math.round((d.ready / READY_SECONDS) * 100), dn: r1(d.done),
    tm: Math.ceil(d.time), wy: WHY.indexOf(d.why), bm: d.bossMax,
    e: d.enemies.map((e) => [e.id, e.kind, r1(e.x), r1(e.y), e.hp, e.slam ? r1(e.slam.x) : 0, e.slam ? r1(e.slam.y) : 0, e.slam ? r1(e.slam.t) : -1]),
    c: d.coins.map((c) => [c.id, r1(c.x), r1(c.y), c.k ?? 0]),
    op: d.opened.map((o) => (o ? '1' : '0')).join(''),
    h: Object.entries(d.heroes).map(([id, h]): HeroTuple => [id, Math.round(h.hearts * 2), h.maxHearts, r1(h.ko), WEAPONS.indexOf(h.weapon), Math.round(Math.atan2(h.fy, h.fx) * 100),
      Math.round(h.swing * 100), Math.ceil(h.spCd * 10), Math.round(h.spT * 100), (h.dodge > 0 ? 1 : 0) | (h.inv > 0 ? 2 : 0),
      h.shield, Math.ceil(h.wallT * 10), h.item ?? '', h.skills.join(','), h.offer.join(','), Math.ceil(h.offerT)]),
    lt: d.loot ? [d.loot.item, Math.ceil(d.loot.t), Object.entries(d.loot.rolls)] : null,
    ll: d.lootLast ? [d.lootLast.item, d.lootLast.win ?? '', d.lootLast.roll] : null,
  };
}
const list = (s: string | undefined) => (s ? s.split(',').filter(Boolean) : []);
export function dview(n: DSnap): DView {
  return {
    seed: n.sd, floor: n.f, gold: n.g, xp: n.xp, level: n.lv, kills: n.k, ready: n.rd / 100, done: n.dn, time: n.tm ?? 0, why: WHY[n.wy ?? 1] ?? 'exit', bossMax: n.bm ?? 15,
    enemies: n.e.map(([id, kind, x, y, hp, sx, sy, st]) => ({ id, kind: kind as EnemyKind, x, y, hp, slam: st >= 0 ? { x: sx, y: sy, t: st } : null })),
    coins: n.c.map(([id, x, y, k]) => ({ id, x, y, k: k ?? 0 })),
    opened: [...n.op].map((c) => c === '1'),
    heroes: Object.fromEntries(n.h.map(([id, hearts2, maxHearts, ko, w, face, swing, cd, spT, fl, sh, wl, it, sk, of, ot]) => {
      const weapon = WEAPONS[w] ?? 'sword', cls = classOf(weapon);
      return [id, {
        cls, hearts: hearts2 / 2, maxHearts, ko, weapon, face: face / 100, swing: swing / 100,
        spCd: (cd ?? 0) / 10, spMax: specialOf(cls, weapon).cd, spT: (spT ?? 0) / 100, dodge: !!((fl ?? 0) & 1), inv: !!((fl ?? 0) & 2),
        shield: sh ?? 0, wallT: (wl ?? 0) / 10, item: it || null, skills: list(sk), offer: list(of), offerT: ot ?? 0,
      }];
    })),
    loot: n.lt ? { item: n.lt[0], t: n.lt[1], rolls: Object.fromEntries(n.lt[2]) } : null,
    lootLast: n.ll ? { item: n.ll[0], win: n.ll[1] || null, roll: n.ll[2] } : null,
  };
}
