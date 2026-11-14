// Test dungeon v1: generated floors, weapons, goo enemies, gold, team XP. Pure TypeScript (no Phaser).
// The host runs it inside the normal sim (sim.ts, mode 'dungeon'); clients rebuild the same map from
// seed + floor and render the snapshot (dsnap/dview below).
// Started by Code (sim + tests), continued by Code 2: auto-attack, specials, sidestep, run timer.
import { rng } from './rng';

export const DT = 32; // one dungeon tile in world px (Kenney Tiny Dungeon 16 px at 2x)
export const GW = 40;
export const GH = 30;
export const FLOORS = 3;
const BLOB_R = 17;

// ---- classes, weapons, specials (data, so Präst / Riddare / Bågskytt can be added later) ----
export type HeroClass = 'krigare';
export type Weapon = 'sword' | 'hammer' | 'spear';
export const WEAPONS: Weapon[] = ['sword', 'hammer', 'spear'];
export const WEAPON_NAMES: Record<Weapon, string> = { sword: 'Svärd', hammer: 'Hammare', spear: 'Spjut' };
/** Auto-attack: reach (px from the blob centre to the goo's edge), half-arc (radians, PI = all around),
 *  damage, seconds between swings, knockback. */
export const WEAPON_STATS: Record<Weapon, { reach: number; arc: number; dmg: number; cd: number; kb: number }> = {
  sword: { reach: 56, arc: 1.0, dmg: 1, cd: 0.4, kb: 160 }, // fast, medium reach
  hammer: { reach: 58, arc: Math.PI, dmg: 2, cd: 0.9, kb: 380 }, // slow, hits all around, big knockback
  spear: { reach: 96, arc: 0.3, dmg: 1, cd: 0.55, kb: 200 }, // long and narrow, pierces a line
};
/** Special attack kinds. 'heal' (Präst), 'wall' (Riddare), 'volley' (Bågskytt) are reserved for later classes. */
export type SpecialKind = 'spin' | 'slam' | 'lunge' | 'heal' | 'wall' | 'volley';
export interface SpecialDef { kind: SpecialKind; name: string; cd: number; r: number; dmg: number; kb: number; stun: number }
export const SPECIALS: Record<string, SpecialDef> = {
  'krigare:sword': { kind: 'spin', name: 'Snurr', cd: 6, r: 84, dmg: 2, kb: 300, stun: 0.5 },
  'krigare:hammer': { kind: 'slam', name: 'Markslag', cd: 8, r: 110, dmg: 3, kb: 480, stun: 0.9 },
  'krigare:spear': { kind: 'lunge', name: 'Utfall', cd: 7, r: 30, dmg: 2, kb: 220, stun: 0.4 },
};
export const specialOf = (cls: HeroClass, w: Weapon): SpecialDef => SPECIALS[`${cls}:${w}`] ?? SPECIALS['krigare:sword'];
const LUNGE_SPEED = 400; // the sim lets a dashing blob reach 1.7x its top speed (~408)
const LUNGE_T = 0.35;
export const DODGE_T = 0.4; // sidestep: invulnerable this long

export type EnemyKind = 0 | 1 | 2; // small, medium, boss goo
export const ENEMY_HP = [1, 3, 15];
export const ENEMY_R = [14, 20, 34];
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

export interface Enemy { id: number; kind: EnemyKind; x: number; y: number; vx: number; vy: number; hp: number; awake: boolean; stun: number; slamT: number; slam: { x: number; y: number; t: number } | null }
export interface Coin { id: number; x: number; y: number; v: number }
export interface Hero {
  cls: HeroClass; hearts: number; maxHearts: number; ko: number; inv: number; weapon: Weapon;
  fx: number; fy: number; aim: number; // facing; aim > 0: facing the last target (movement does not turn it)
  atkCd: number; swing: number;
  spCd: number; spT: number; lastAtk: number; // special: cooldown, active time, last button counter
  lunge: number[]; // goo ids already hit by the current lunge
  dodge: number; lastDash: number; // sidestep invulnerability, last dash counter
  kx: number; ky: number; // where a knocked-out blob lies
}
export type EndWhy = 'boss' | 'exit' | 'time';
export interface DState {
  floor: number;
  map: Floor; // rebuilt from seed + floor, never sent
  enemies: Enemy[];
  coins: Coin[];
  opened: boolean[]; // chests
  gold: number; xp: number; level: number; dmgBonus: number; kills: number;
  time: number; // seconds left of the run
  ready: number; // seconds every blob has stood on the stairs (goes down / out at 1.5)
  done: number; // > 0: "Dungeon klar!" shows, counts down, then back to the meadow
  why: EndWhy;
  heroes: Record<string, Hero>;
  nextId: number;
}
export type DFx =
  | { t: 'swing'; id: string; w: Weapon; a: number }
  | { t: 'special'; id: string; k: SpecialKind; x: number; y: number; a: number; r: number }
  | { t: 'dodge'; id: string; x: number; y: number }
  | { t: 'hurt'; e: number; x: number; y: number; kind: EnemyKind }
  | { t: 'kill'; x: number; y: number; kind: EnemyKind }
  | { t: 'ouch'; id: string; x: number; y: number }
  | { t: 'ko'; id: string; x: number; y: number }
  | { t: 'revive'; id: string; x: number; y: number }
  | { t: 'coin'; x: number; y: number; n: number }
  | { t: 'chest'; x: number; y: number; n: number }
  | { t: 'level'; level: number; bonus: 'heart' | 'dmg' }
  | { t: 'floor'; floor: number }
  | { t: 'slam'; x: number; y: number };

export const STAIRS_R = 40;
export const READY_SECONDS = 1.5;
const CHEST_GOLD = 8;
const CHEST_XP = 2;
const COIN_R = 28;
const COIN_MAGNET = 70; // coins slide to a blob this close (easier for small thumbs)

export function newHero(weapon: Weapon, maxHearts = START_HEARTS, cls: HeroClass = 'krigare'): Hero {
  return {
    cls, hearts: maxHearts, maxHearts, ko: 0, inv: 0, weapon, fx: 0, fy: 1, aim: 0, atkCd: 0, swing: 0,
    spCd: 0, spT: 0, lastAtk: -1, lunge: [], dodge: 0, lastDash: -1, kx: 0, ky: 0,
  };
}

export function enterFloor(d: Omit<DState, 'map'> & { map?: Floor }, seed: number, floor: number, players: number): DState {
  const map = makeFloor(seed, floor, players);
  const out = d as DState;
  out.floor = floor; out.map = map; out.ready = 0;
  out.enemies = map.spawns.map((sp) => ({ id: out.nextId++, kind: sp.kind, x: sp.x, y: sp.y, vx: 0, vy: 0, hp: ENEMY_HP[sp.kind], awake: false, stun: 0, slamT: SLAM_EVERY, slam: null }));
  out.coins = [];
  out.opened = map.chests.map(() => false);
  return out;
}

export function newRun(seed: number, picks: Record<string, Weapon>): DState {
  const heroes: Record<string, Hero> = {};
  for (const [id, w] of Object.entries(picks)) heroes[id] = newHero(w);
  return enterFloor({
    floor: 1, enemies: [], coins: [], opened: [], gold: 0, xp: 0, level: 1, dmgBonus: 0, kills: 0,
    time: RUN_SECONDS, ready: 0, done: 0, why: 'exit', heroes, nextId: 1,
  }, seed, 1, Object.keys(picks).length);
}

interface Body { id: string; x: number; y: number; vx: number; vy: number; dashT: number; lastDash?: number }

/** Is a point inside a weapon's swing from (px,py) facing (fx,fy)? */
export function inSwing(w: Weapon, px: number, py: number, fx: number, fy: number, tx: number, ty: number, tr: number): boolean {
  const st = WEAPON_STATS[w];
  const dx = tx - px, dy = ty - py, d = Math.hypot(dx, dy);
  if (d - tr > st.reach) return false;
  if (st.arc >= Math.PI || d < 1) return true;
  const fl = Math.hypot(fx, fy) || 1;
  const cos = (dx * fx + dy * fy) / (d * fl);
  // generous for kids: the target's radius widens the arc
  return Math.acos(Math.max(-1, Math.min(1, cos))) <= st.arc + Math.atan2(tr, d);
}

/** Nearest living goo whose edge is within `reach` of (x,y), or null. */
export function nearestEnemy(d: DState, x: number, y: number, reach: number): Enemy | null {
  let best: Enemy | null = null, bd = Infinity;
  for (const e of d.enemies) {
    if (e.hp <= 0) continue;
    const dd = Math.hypot(e.x - x, e.y - y) - ENEMY_R[e.kind];
    if (dd <= reach && dd < bd) { bd = dd; best = e; }
  }
  return best;
}

function gainXp(d: DState, xp: number, fx: DFx[]) {
  d.xp += xp;
  while (d.level - 1 < LEVEL_XP.length && d.xp >= LEVEL_XP[d.level - 1]) {
    d.level++;
    // v1: alternate automatically (the 1-of-3 card choice comes later)
    const bonus = d.level % 2 === 0 ? 'heart' : 'dmg';
    if (bonus === 'heart') for (const h of Object.values(d.heroes)) { h.maxHearts++; h.hearts = Math.min(h.maxHearts, h.hearts + 1); }
    else d.dmgBonus++;
    fx.push({ t: 'level', level: d.level, bonus });
  }
}

/** Damage + knockback on one goo from (fromX, fromY). */
function hitEnemy(d: DState, e: Enemy, dmg: number, kb: number, stun: number, fromX: number, fromY: number, fx: DFx[]) {
  e.hp -= dmg;
  e.awake = true;
  const dx = e.x - fromX, dy = e.y - fromY, dl = Math.hypot(dx, dy) || 1;
  const k = kb * (e.kind === 2 ? 0.25 : 1);
  e.vx = (dx / dl) * k; e.vy = (dy / dl) * k; e.stun = Math.max(e.stun, stun);
  fx.push(e.hp > 0 ? { t: 'hurt', e: e.id, x: e.x, y: e.y, kind: e.kind } : { t: 'kill', x: e.x, y: e.y, kind: e.kind });
}

function face(h: Hero, b: Body, tx: number, ty: number) {
  const dx = tx - b.x, dy = ty - b.y, dl = Math.hypot(dx, dy);
  if (dl > 0.5) { h.fx = dx / dl; h.fy = dy / dl; }
  h.aim = 0.45;
}

/** Big button: the class/weapon special. */
function special(d: DState, h: Hero, b: Body, fx: DFx[]) {
  const sp = specialOf(h.cls, h.weapon);
  h.spCd = sp.cd;
  const dmg = sp.dmg + d.dmgBonus;
  if (sp.kind === 'lunge') {
    // charge towards the nearest goo in sight (else the facing direction), piercing everything on the way
    const t = nearestEnemy(d, b.x, b.y, 220);
    if (t) face(h, b, t.x, t.y);
    b.vx = h.fx * LUNGE_SPEED; b.vy = h.fy * LUNGE_SPEED; b.dashT = Math.max(b.dashT, LUNGE_T);
    h.spT = LUNGE_T; h.lunge = [];
    fx.push({ t: 'special', id: b.id, k: sp.kind, x: b.x, y: b.y, a: Math.atan2(h.fy, h.fx), r: sp.r });
    return;
  }
  // spin (sword) and slam (hammer): everything around the blob
  h.spT = 0.35;
  for (const e of d.enemies) if (e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) - ENEMY_R[e.kind] <= sp.r) hitEnemy(d, e, dmg, sp.kb, sp.stun, b.x, b.y, fx);
  fx.push({ t: 'special', id: b.id, k: sp.kind, x: b.x, y: b.y, a: Math.atan2(h.fy, h.fx), r: sp.r });
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
  const alive = bodies.filter((b) => (d.heroes[b.id]?.ko ?? 0) <= 0);
  // heroes: facing, timers, auto-attack, special, sidestep, KO/revive
  for (const b of bodies) {
    const h = d.heroes[b.id] ??= newHero('sword', START_HEARTS + Math.floor(d.level / 2));
    collideWalls(f, b, BLOB_R);
    h.atkCd = Math.max(0, h.atkCd - dt); h.inv = Math.max(0, h.inv - dt); h.swing = Math.max(0, h.swing - dt);
    h.spCd = Math.max(0, h.spCd - dt); h.spT = Math.max(0, h.spT - dt); h.dodge = Math.max(0, h.dodge - dt); h.aim = Math.max(0, h.aim - dt);
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
    // sidestep: the sim already gave the dash impulse; here it makes the blob untouchable
    if (b.lastDash !== undefined && b.lastDash !== h.lastDash) {
      h.lastDash = b.lastDash;
      if (b.dashT > 0.25) { h.dodge = DODGE_T; fx.push({ t: 'dodge', id: b.id, x: b.x, y: b.y }); }
    }
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > 30 && h.aim <= 0 && h.spT <= 0) { h.fx = b.vx / sp; h.fy = b.vy / sp; }
    // special attack (big button)
    if (a !== h.lastAtk) {
      h.lastAtk = a;
      if (h.spCd <= 0) special(d, h, b, fx);
    }
    // lunge in progress: pierce every goo it touches once
    if (h.spT > 0 && specialOf(h.cls, h.weapon).kind === 'lunge') {
      const def = specialOf(h.cls, h.weapon);
      for (const e of d.enemies) {
        if (e.hp <= 0 || h.lunge.includes(e.id) || Math.hypot(e.x - b.x, e.y - b.y) > BLOB_R + ENEMY_R[e.kind] + def.r) continue;
        h.lunge.push(e.id);
        hitEnemy(d, e, def.dmg + d.dmgBonus, def.kb, def.stun, b.x, b.y, fx);
      }
    }
    // auto-attack: the nearest goo in weapon reach, at the weapon's rate, facing it
    if (h.atkCd <= 0) {
      const st = WEAPON_STATS[h.weapon];
      const t = nearestEnemy(d, b.x, b.y, st.reach);
      if (t) {
        face(h, b, t.x, t.y);
        h.atkCd = st.cd; h.swing = Math.min(0.3, st.cd * 0.8);
        fx.push({ t: 'swing', id: b.id, w: h.weapon, a: Math.atan2(h.fy, h.fx) });
        for (const e of d.enemies) {
          if (e.hp <= 0 || !inSwing(h.weapon, b.x, b.y, h.fx, h.fy, e.x, e.y, ENEMY_R[e.kind])) continue;
          hitEnemy(d, e, st.dmg + d.dmgBonus, st.kb, 0.35, b.x, b.y, fx);
        }
      }
    }
  }
  // dead enemies: coins + XP
  for (let i = d.enemies.length - 1; i >= 0; i--) {
    const e = d.enemies[i];
    if (e.hp > 0) continue;
    d.enemies.splice(i, 1);
    d.kills++;
    const n = ENEMY_GOLD[e.kind];
    const pieces = Math.min(5, n);
    for (let k = 0; k < pieces; k++) {
      const a = (k / pieces) * Math.PI * 2;
      const c = { id: d.nextId++, x: e.x + Math.cos(a) * 18, y: e.y + Math.sin(a) * 18, v: Math.floor(n / pieces) + (k < n % pieces ? 1 : 0), vx: 0, vy: 0 };
      collideWalls(f, c, 6);
      d.coins.push({ id: c.id, x: c.x, y: c.y, v: c.v });
    }
    gainXp(d, ENEMY_XP[e.kind], fx);
  }
  // enemies: wake up, chase the nearest standing blob, touching hurts; the boss also slams
  for (const e of d.enemies) {
    e.stun = Math.max(0, e.stun - dt);
    let tgt: Body | null = null, best = e.awake ? Infinity : ENEMY_SIGHT;
    for (const b of alive) { const dd = Math.hypot(b.x - e.x, b.y - e.y); if (dd < best) { best = dd; tgt = b; } }
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
          for (const b of alive) if (Math.hypot(b.x - e.slam.x, b.y - e.slam.y) < SLAM_R + BLOB_R) hurt(d, b, e.slam.x, e.slam.y, SLAM_DMG, fx);
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
      hurt(d, b, e.x, e.y, TOUCH_DMG, fx);
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
  // coins (slide to a near blob) + chests
  for (const c of d.coins) {
    let tb: Body | null = null, bd = COIN_MAGNET;
    for (const b of alive) { const dd = Math.hypot(c.x - b.x, c.y - b.y); if (dd < bd) { bd = dd; tb = b; } }
    if (tb && bd > 1) { c.x += ((tb.x - c.x) / bd) * 220 * dt; c.y += ((tb.y - c.y) / bd) * 220 * dt; }
  }
  for (const b of alive) {
    for (let i = d.coins.length - 1; i >= 0; i--) {
      const c = d.coins[i];
      if (Math.hypot(c.x - b.x, c.y - b.y) > COIN_R) continue;
      d.gold += c.v; d.coins.splice(i, 1);
      fx.push({ t: 'coin', x: c.x, y: c.y, n: c.v });
    }
    f.chests.forEach((c, i) => {
      if (d.opened[i] || Math.hypot(c.x - b.x, c.y - b.y) > BLOB_R + 20) return;
      d.opened[i] = true; d.gold += CHEST_GOLD;
      fx.push({ t: 'chest', x: c.x, y: c.y, n: CHEST_GOLD });
      gainXp(d, CHEST_XP, fx);
    });
  }
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
    }
    fx.push({ t: 'floor', floor: d.floor });
  }
  return 'stay';
}

function hurt(d: DState, b: Body, fromX: number, fromY: number, dmg: number, fx: DFx[]) {
  const h = d.heroes[b.id];
  if (!h || h.inv > 0 || h.ko > 0 || h.dodge > 0 || b.dashT > 0) return; // a sidestep (or lunge) dodges
  h.hearts = Math.max(0, h.hearts - dmg); h.inv = HURT_INV;
  const dx = b.x - fromX, dy = b.y - fromY, dl = Math.hypot(dx, dy) || 1;
  b.vx = (dx / dl) * 260; b.vy = (dy / dl) * 260;
  if (h.hearts <= 0) { h.ko = KO_SECONDS; h.kx = b.x; h.ky = b.y; fx.push({ t: 'ko', id: b.id, x: b.x, y: b.y }); }
  else fx.push({ t: 'ouch', id: b.id, x: b.x, y: b.y });
}

// ---- network snapshot / view (sim.ts puts it in its Snapshot as `dg`) ----
const r1 = (n: number) => Math.round(n * 10) / 10;
export interface DSnap {
  sd: number; f: number; g: number; xp: number; lv: number; k: number; rd: number; dn: number; tm?: number; wy?: number;
  e: [number, number, number, number, number, number, number, number][]; // id, kind, x, y, hp, slam x, slam y, slam t (-1 none)
  c: [number, number, number][]; // coin id, x, y
  op: string; // opened chests '0101'
  // id, hearts*2, max, ko, weapon, facing (rad*100), swing (s*100), special cd (s*10), special active (s*100), dodge/inv flags
  h: [string, number, number, number, number, number, number, number?, number?, number?][];
}
export interface DHeroView { hearts: number; maxHearts: number; ko: number; weapon: Weapon; face: number; swing: number; spCd: number; spMax: number; spT: number; dodge: boolean; inv: boolean }
export interface DView {
  seed: number; floor: number; gold: number; xp: number; level: number; kills: number; ready: number; done: number; time: number; why: EndWhy;
  enemies: { id: number; kind: EnemyKind; x: number; y: number; hp: number; slam: { x: number; y: number; t: number } | null }[];
  coins: { id: number; x: number; y: number }[];
  opened: boolean[];
  heroes: Record<string, DHeroView>;
}
const WHY: EndWhy[] = ['boss', 'exit', 'time'];
export function dsnap(d: DState, seed: number): DSnap {
  return {
    sd: seed, f: d.floor, g: d.gold, xp: d.xp, lv: d.level, k: d.kills, rd: Math.round((d.ready / READY_SECONDS) * 100), dn: r1(d.done),
    tm: Math.ceil(d.time), wy: WHY.indexOf(d.why),
    e: d.enemies.map((e) => [e.id, e.kind, r1(e.x), r1(e.y), e.hp, e.slam ? r1(e.slam.x) : 0, e.slam ? r1(e.slam.y) : 0, e.slam ? r1(e.slam.t) : -1]),
    c: d.coins.map((c) => [c.id, r1(c.x), r1(c.y)]),
    op: d.opened.map((o) => (o ? '1' : '0')).join(''),
    h: Object.entries(d.heroes).map(([id, h]) => [id, Math.round(h.hearts * 2), h.maxHearts, r1(h.ko), WEAPONS.indexOf(h.weapon), Math.round(Math.atan2(h.fy, h.fx) * 100),
      Math.round(h.swing * 100), Math.ceil(h.spCd * 10), Math.round(h.spT * 100), (h.dodge > 0 ? 1 : 0) | (h.inv > 0 ? 2 : 0)]),
  };
}
export function dview(n: DSnap): DView {
  return {
    seed: n.sd, floor: n.f, gold: n.g, xp: n.xp, level: n.lv, kills: n.k, ready: n.rd / 100, done: n.dn, time: n.tm ?? 0, why: WHY[n.wy ?? 1] ?? 'exit',
    enemies: n.e.map(([id, kind, x, y, hp, sx, sy, st]) => ({ id, kind: kind as EnemyKind, x, y, hp, slam: st >= 0 ? { x: sx, y: sy, t: st } : null })),
    coins: n.c.map(([id, x, y]) => ({ id, x, y })),
    opened: [...n.op].map((c) => c === '1'),
    heroes: Object.fromEntries(n.h.map(([id, hearts2, maxHearts, ko, w, face, swing, cd, spT, fl]) => {
      const weapon = WEAPONS[w] ?? 'sword';
      return [id, {
        hearts: hearts2 / 2, maxHearts, ko, weapon, face: face / 100, swing: swing / 100,
        spCd: (cd ?? 0) / 10, spMax: specialOf('krigare', weapon).cd, spT: (spT ?? 0) / 100, dodge: !!((fl ?? 0) & 1), inv: !!((fl ?? 0) & 2),
      }];
    })),
  };
}
