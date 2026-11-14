// Test dungeon v1: generated floors, weapons, goo enemies, gold, team XP. Pure TypeScript (no Phaser).
// The host runs it inside the normal sim (sim.ts, mode 'dungeon'); clients rebuild the same map from
// seed + floor and render the snapshot.
import { rng } from './rng';

export const DT = 32; // one dungeon tile in world px (Kenney Tiny Dungeon 16 px at 2x)
export const GW = 40;
export const GH = 30;
export const FLOORS = 3;
const BLOB_R = 17;

export type Weapon = 'sword' | 'hammer' | 'spear';
export const WEAPONS: Weapon[] = ['sword', 'hammer', 'spear'];
export const WEAPON_NAMES: Record<Weapon, string> = { sword: 'Svärd', hammer: 'Hammare', spear: 'Spjut' };
/** reach (px from the blob centre), half-arc (radians, PI = all around), damage, cooldown (s), knockback */
export const WEAPON_STATS: Record<Weapon, { reach: number; arc: number; dmg: number; cd: number; kb: number }> = {
  sword: { reach: 58, arc: 1.0, dmg: 1, cd: 0.32, kb: 160 },
  hammer: { reach: 60, arc: Math.PI, dmg: 2, cd: 0.75, kb: 380 },
  spear: { reach: 92, arc: 0.36, dmg: 1, cd: 0.45, kb: 200 },
};

export type EnemyKind = 0 | 1 | 2; // small, medium, boss goo
export const ENEMY_HP = [1, 3, 15];
export const ENEMY_R = [14, 20, 34];
export const ENEMY_SPEED = [72, 54, 40];
export const ENEMY_GOLD = [1, 3, 15];
export const ENEMY_XP = [1, 3, 10];
const ENEMY_SIGHT = 300; // they wake up and chase within this range
export const SLAM_EVERY = 4; // boss: telegraphed slam
export const SLAM_WARN = 1.1; // shadow circle on the ground before it lands
export const SLAM_R = 72;
export const START_HEARTS = 5;
export const KO_SECONDS = 5;
const HURT_INV = 1; // invulnerable after a hit
/** Team XP needed to reach level n+1 (index = current level - 1). */
export const LEVEL_XP = [5, 12, 22, 35, 52, 75];

export interface Room { x: number; y: number; w: number; h: number } // tiles
export interface Floor {
  floor: number;
  solid: Uint8Array; // GW*GH, 1 = wall
  rooms: Room[];
  start: { x: number; y: number }; // world px: arrival (and revive) point
  exit: { x: number; y: number }; // stairs up in the first room's corner (used on floor 1 to leave)
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
export interface Hero { hearts: number; maxHearts: number; ko: number; inv: number; weapon: Weapon; fx: number; fy: number; atkCd: number; swing: number; lastAtk: number }
export interface DState {
  floor: number;
  map: Floor; // rebuilt from seed + floor, never sent
  enemies: Enemy[];
  coins: Coin[];
  opened: boolean[]; // chests
  gold: number; xp: number; level: number; dmgBonus: number; kills: number;
  ready: number; // seconds every blob has stood on the stairs (goes down / out at 1.5)
  done: number; // > 0: "Dungeon klar!" shows, counts down, then back to the meadow
  heroes: Record<string, Hero>;
  nextId: number;
}
export type DFx =
  | { t: 'swing'; id: string; w: Weapon; a: number }
  | { t: 'hurt'; x: number; y: number; kind: EnemyKind }
  | { t: 'kill'; x: number; y: number; kind: EnemyKind }
  | { t: 'ouch'; id: string; x: number; y: number }
  | { t: 'ko'; id: string; x: number; y: number }
  | { t: 'coin'; x: number; y: number; n: number }
  | { t: 'chest'; x: number; y: number; n: number }
  | { t: 'level'; level: number; bonus: 'heart' | 'dmg' }
  | { t: 'floor'; floor: number }
  | { t: 'slam'; x: number; y: number };

export const STAIRS_R = 40;
export const READY_SECONDS = 1.5;
const CHEST_GOLD = 8;
const COIN_R = 28;

export function newHero(weapon: Weapon, maxHearts = START_HEARTS): Hero {
  return { hearts: maxHearts, maxHearts, ko: 0, inv: 0, weapon, fx: 0, fy: 1, atkCd: 0, swing: 0, lastAtk: 0 };
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
  return enterFloor({ floor: 1, enemies: [], coins: [], opened: [], gold: 0, xp: 0, level: 1, dmgBonus: 0, kills: 0, ready: 0, done: 0, heroes, nextId: 1 }, seed, 1, Object.keys(picks).length);
}

interface Body { id: string; x: number; y: number; vx: number; vy: number; dashT: number }

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

/** One dungeon tick after the players have moved (sim.ts moves them with the usual glide physics). */
export function stepDungeon(d: DState, bodies: Body[], atk: Map<string, number>, seed: number, dt: number, fx: DFx[]): 'stay' | 'out' {
  const f = d.map;
  if (d.done > 0) { d.done -= dt; return d.done <= 0 ? 'out' : 'stay'; }
  const alive = bodies.filter((b) => (d.heroes[b.id]?.ko ?? 0) <= 0);
  // heroes: facing, timers, attacks, KO/revive
  for (const b of bodies) {
    const h = d.heroes[b.id] ??= newHero('sword', START_HEARTS + Math.floor((d.level - 1) / 2));
    collideWalls(f, b, BLOB_R);
    h.atkCd = Math.max(0, h.atkCd - dt); h.inv = Math.max(0, h.inv - dt); h.swing = Math.max(0, h.swing - dt);
    if (h.ko > 0) {
      h.ko -= dt;
      b.vx = 0; b.vy = 0;
      if (h.ko <= 0) { h.ko = 0; h.hearts = h.maxHearts; h.inv = 2; b.x = f.start.x; b.y = f.start.y; }
      continue;
    }
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > 30) { h.fx = b.vx / sp; h.fy = b.vy / sp; }
    const a = atk.get(b.id) ?? h.lastAtk;
    if (a !== h.lastAtk) {
      h.lastAtk = a;
      if (h.atkCd <= 0) {
        const st = WEAPON_STATS[h.weapon];
        h.atkCd = st.cd; h.swing = 0.22;
        fx.push({ t: 'swing', id: b.id, w: h.weapon, a: Math.atan2(h.fy, h.fx) });
        for (const e of d.enemies) {
          if (e.hp <= 0 || !inSwing(h.weapon, b.x, b.y, h.fx, h.fy, e.x, e.y, ENEMY_R[e.kind])) continue;
          e.hp -= st.dmg + d.dmgBonus;
          e.awake = true;
          const dx = e.x - b.x, dy = e.y - b.y, dl = Math.hypot(dx, dy) || 1;
          const kb = st.kb * (e.kind === 2 ? 0.25 : 1);
          e.vx = (dx / dl) * kb; e.vy = (dy / dl) * kb; e.stun = 0.35;
          fx.push(e.hp > 0 ? { t: 'hurt', x: e.x, y: e.y, kind: e.kind } : { t: 'kill', x: e.x, y: e.y, kind: e.kind });
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
          for (const b of alive) if (Math.hypot(b.x - e.slam.x, b.y - e.slam.y) < SLAM_R + BLOB_R) hurt(d, b, e.slam.x, e.slam.y, fx);
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
      const nx = (b.x - e.x) / dd, ny = (b.y - e.y) / dd;
      b.x = e.x + nx * min; b.y = e.y + ny * min;
      hurt(d, b, e.x, e.y, fx);
    }
  }
  // coins + chests
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
    if (exitUp && !onStairs) return 'out';
    if (last) { d.done = 4; return 'stay'; }
    enterFloor(d, seed, d.floor + 1, bodies.length);
    for (const b of bodies) { b.x = d.map.start.x + (Math.random() - 0.5) * 20; b.y = d.map.start.y + (Math.random() - 0.5) * 20; b.vx = 0; b.vy = 0; }
    fx.push({ t: 'floor', floor: d.floor });
  }
  return 'stay';
}

function hurt(d: DState, b: Body, fromX: number, fromY: number, fx: DFx[]) {
  const h = d.heroes[b.id];
  if (!h || h.inv > 0 || h.ko > 0 || b.dashT > 0) return; // a dash dodges
  h.hearts--; h.inv = HURT_INV;
  const dx = b.x - fromX, dy = b.y - fromY, dl = Math.hypot(dx, dy) || 1;
  b.vx = (dx / dl) * 260; b.vy = (dy / dl) * 260;
  if (h.hearts <= 0) { h.hearts = 0; h.ko = KO_SECONDS; fx.push({ t: 'ko', id: b.id, x: b.x, y: b.y }); }
  else fx.push({ t: 'ouch', id: b.id, x: b.x, y: b.y });
}
