// Authoritative game simulation. Pure TypeScript, no Phaser, no network.
// Runs on the host only; clients render the snapshots it produces.

export const WORLD_W = 1280;
export const WORLD_H = 960;
export const BASE = { x: WORLD_W / 2, y: WORLD_H / 2, r: 92 };
export const ROUND_SECONDS = 180;
export const MAX_PLAYERS = 5;
export const CARRY_MAX = 3;

const BLOB_R = 17;
const ACCEL = 1000;
const DRAG = 2.4; // per second; low drag = long glide
const MAX_SPEED = 240;
const BOOST_SPEED = 340;
const DASH_IMPULSE = 360;
const DASH_COOLDOWN = 1.1;
const TREE_R = 15;
/** Resource nodes: 0-2 trees (green, orange, pine) give wood; 3 small rock and 4 boulder give stone;
 *  5 berry bush gives berries. Hit them with the action button. Trees and rocks are solid, bushes not. */
export const OBSTACLE_R = [15, 15, 12, 12, 24, 14];
export const isSolid = (kind: number) => kind !== 5;
export type Tool = 'axe' | 'pickaxe' | 'rake';
export const nodeTool = (kind: number): Tool => (kind < 3 ? 'axe' : kind < 5 ? 'pickaxe' : 'rake');
export const nodeRes = (kind: number): ItemKind => (kind < 3 ? 'wood' : kind < 5 ? 'stone' : 'berry');
// per kind:            tree tree tree rock boulder bush
export const NODE_HITS = [3, 3, 3, 3, 4, 2]; // hits per item
export const NODE_YIELD = [3, 3, 3, 2, 4, 3]; // items before it is used up (stump / rubble / empty bush)
export const NODE_REGROW = [25, 25, 25, 30, 40, 20]; // seconds until it is full again
const TOOL_REACH = 26; // extra reach beyond touching
const TOOL_COOLDOWN = 0.28;
const GEM_R = 22;
const GEM_GRAB_R = 62;
const PICKUP_R = 26;
const MAGNET_R = 150;

export type ItemKind = 'wood' | 'stone' | 'berry';
export const RES: ItemKind[] = ['wood', 'stone', 'berry'];
export type Res = Record<ItemKind, number>;
export const res = (w = 0, st = 0, b = 0): Res => ({ wood: w, stone: st, berry: b });
export type PowerKind = 'speed' | 'magnet';
/** Bundles: the big co-op chest (carried by 2) and the puzzle pen chest give this much of each resource. */
export const GEM_BUNDLE = 2;
export const CHEST_BUNDLE = 3;
export const QUEST_BASE: Res = res(10, 6, 5); // for 1-2 players
/** Round goal: deliver this much of each resource; every finished bar is a star. x(1 + 0.35*(n-2)) for 3-5. */
export function questTargets(players: number): Res {
  const f = 1 + 0.35 * Math.max(0, Math.min(MAX_PLAYERS, players) - 2);
  return res(Math.ceil(QUEST_BASE.wood * f - 1e-9), Math.ceil(QUEST_BASE.stone * f - 1e-9), Math.ceil(QUEST_BASE.berry * f - 1e-9));
}
export const starsFor = (delivered: Res, quest: Res) => RES.filter((k) => delivered[k] >= quest[k]).length;

// ---- co-op puzzles: pressure plates open a fenced pen with a bonus chest ----
export const PEN_W = 168; // outer size of the fenced pen
export const PEN_H = 128;
export const WALL = 14; // fence thickness
export const GATE_W = 56; // gap in the fence that the gate closes
export const PLATE_R = 24; // a blob centre this close stands on the plate
const CHEST_R = 30;
const PLATE_DIST = 86; // plates sit this far outside the gate
const PLATE_SPREAD = 96;
export interface Rect { x0: number; y0: number; x1: number; y1: number }
/** Static puzzle geometry, rebuilt from the seed on every phone (never sent over the network). */
export interface PuzzleLayout {
  cx: number; cy: number;
  gateDown: boolean; // gate on the bottom fence (pen above the base) or the top one
  walls: Rect[];
  gate: Rect;
  plates: { x: number; y: number }[]; // 3 spots; the first `need` are used
  chest: { x: number; y: number };
  zone: Rect; // pen + plates, kept clear of trees and spawns
}
/** Live puzzle state (host-authoritative, synced in snapshots). */
export interface Puzzle { need: number; mask: number; open: boolean; taken: boolean }

const inRect = (r: Rect, x: number, y: number, pad = 0) => x > r.x0 - pad && x < r.x1 + pad && y > r.y0 - pad && y < r.y1 + pad;

/** Two pens in two of the four map corners, gate facing the base. Deterministic from the seed. */
export function makePuzzles(seed: number): PuzzleLayout[] {
  const r = rng(seed * 13 + 5);
  const corners = [[250, 210], [WORLD_W - 250, 210], [250, WORLD_H - 210], [WORLD_W - 250, WORLD_H - 210]];
  const first = Math.floor(r() * 4);
  const second = (first + 1 + Math.floor(r() * 3)) % 4; // any other corner
  return [first, second].map((ci) => {
    const [bx, by] = corners[ci];
    const cx = Math.round(bx + (r() - 0.5) * 80), cy = Math.round(by + (r() - 0.5) * 50);
    const gateDown = cy < BASE.y;
    const x0 = cx - PEN_W / 2, x1 = cx + PEN_W / 2, y0 = cy - PEN_H / 2, y1 = cy + PEN_H / 2;
    const g0 = cx - GATE_W / 2, g1 = cx + GATE_W / 2;
    const gy = gateDown ? y1 - WALL : y0; // fence row that holds the gate
    const solid = gateDown ? { y0, y1: y0 + WALL } : { y0: y1 - WALL, y1 };
    const walls: Rect[] = [
      { x0, x1, ...solid },
      { x0, x1: x0 + WALL, y0, y1 },
      { x0: x1 - WALL, x1, y0, y1 },
      { x0, x1: g0, y0: gy, y1: gy + WALL },
      { x0: g1, x1, y0: gy, y1: gy + WALL },
    ];
    const gate = { x0: g0, x1: g1, y0: gy, y1: gy + WALL };
    const py = gateDown ? y1 + PLATE_DIST : y0 - PLATE_DIST;
    const plates = [{ x: cx - PLATE_SPREAD, y: py }, { x: cx + PLATE_SPREAD, y: py }, { x: cx, y: py + (gateDown ? 70 : -70) }];
    const ys = plates.map((p) => p.y);
    const zone = { x0: x0 - 10, x1: x1 + 10, y0: Math.min(y0, ...ys) - PLATE_R - 10, y1: Math.max(y1, ...ys) + PLATE_R + 10 };
    return { cx, cy, gateDown, walls, gate, plates, chest: { x: cx, y: cy - (gateDown ? 10 : -10) }, zone };
  });
}

// ---- base totems: spend the team bank on team-wide upgrades ----
export type TotemKind = 'speed' | 'magnet' | 'shield' | 'double';
export const TOTEM_KINDS: TotemKind[] = ['speed', 'magnet', 'shield', 'double'];
/** Resource cost per level (1-2 trips of 3 items buy level 1). */
export const TOTEM_PRICES: Record<TotemKind, [Partial<Res>, Partial<Res>, Partial<Res>]> = {
  speed: [{ wood: 4 }, { wood: 8 }, { wood: 14 }],
  magnet: [{ stone: 4 }, { stone: 8 }, { stone: 14 }],
  shield: [{ wood: 2, stone: 2 }, { wood: 4, stone: 4 }, { wood: 7, stone: 7 }],
  double: [{ berry: 4 }, { berry: 8 }, { berry: 14 }],
};
export const canAfford = (bank: Res, price: Partial<Res>) => RES.every((k) => bank[k] >= (price[k] ?? 0));
export const TOTEM_MAX = 3;
export const PAD_R = 30; // stand this close to the pad in front of a totem to buy
export const BUY_SECONDS = 1;
export const DOUBLE_SECONDS = 20;
export const SHIELD_RECHARGE = 8;
/** Pads on the four diagonals around the cottage (same order as TOTEM_KINDS). */
export const TOTEM_PADS = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy]) => ({ x: BASE.x + dx * 112, y: BASE.y + dy * 104 }));
export interface Totem { kind: TotemKind; level: number; buy: number; armed: boolean }
export const totemPrice = (t: { kind: TotemKind; level: number }): Partial<Res> => (t.level >= TOTEM_MAX ? {} : TOTEM_PRICES[t.kind][t.level]);
const totemLevel = (s: State, k: TotemKind) => s.totems.find((t) => t.kind === k)?.level ?? 0;

/** Plates per puzzle: 2 and 3, but never more than the players at round start (min 1). */
export function puzzleNeeds(players: number): number[] {
  const n = Math.max(1, players);
  return [Math.min(2, n), Math.min(3, n)];
}

export interface PlayerInfo { id: string; name: string; color: number; shape: number; eyes: number; mouth: number; hat: number }
export interface Player extends PlayerInfo {
  x: number; y: number; vx: number; vy: number;
  carry: ItemKind[];
  shield: number; shieldT: number; // shield totem charges (protect carried items from goo)
  dashCd: number; dashT: number; boostT: number; magnetT: number; toolCd: number;
  lastDash: number; // last dash counter seen from input
}
export interface Item { id: number; kind: ItemKind; x: number; y: number }
export interface Gem { id: number; x: number; y: number; vx: number; vy: number; holders: number }
export interface Power { id: number; kind: PowerKind; x: number; y: number }
/** A resource node. `left` items remain; 0 = stump / rubble / empty bush until `regrow` runs out. */
export interface Tree { x: number; y: number; kind: number; cd: number; left: number; hits: number; regrow: number }
export interface Input { x: number; y: number; dash: number }
export type FxEvent =
  | { t: 'gain'; x: number; y: number; r: Res } // resources added to the bank
  | { t: 'hit'; id: string; x: number; y: number; node: number; tool: Tool; drop: boolean }
  | { t: 'pick'; x: number; y: number }
  | { t: 'bump'; x: number; y: number }
  | { t: 'power'; x: number; y: number; kind: PowerKind }
  | { t: 'gate'; x: number; y: number }
  | { t: 'totem'; x: number; y: number; kind: TotemKind; level: number };

export interface State {
  phase: 'play' | 'end';
  time: number; // seconds of daylight left
  bank: Res; // spendable team resources (totems)
  delivered: Res; // everything brought home this round (quest progress, never spent)
  quest: Res;
  players: Player[];
  items: Item[];
  gems: Gem[];
  powers: Power[];
  trees: Tree[];
  layout: PuzzleLayout[];
  puzzles: Puzzle[];
  totems: Totem[];
  doubleT: number; // seconds of 2x points left
  fx: FxEvent[]; // events since last snapshot (cleared by caller)
  nextId: number;
  gemT: number; powerT: number;
}

/** Small seeded RNG so the map layout is reproducible from a seed. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}


function nearBase(x: number, y: number, extra: number) {
  return Math.hypot(x - BASE.x, y - BASE.y) < BASE.r + extra;
}

export function makeTrees(seed: number): Tree[] {
  const r = rng(seed);
  const zones = makePuzzles(seed).map((p) => p.zone);
  const trees: Tree[] = [];
  let tries = 0;
  while (trees.length < 34 && tries++ < 2000) {
    const x = 60 + r() * (WORLD_W - 120);
    const y = 70 + r() * (WORLD_H - 130);
    if (nearBase(x, y, 90)) continue;
    if (zones.some((z) => inRect(z, x, y, 40))) continue;
    if (TOTEM_PADS.some((p) => Math.hypot(p.x - x, p.y - y) < 70)) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.y - y) < 70)) continue;
    const roll = r();
    const kind = roll < 0.58 ? Math.floor(r() * 3) : roll < 0.7 ? 3 : roll < 0.8 ? 4 : 5;
    trees.push({ x, y, kind, cd: 0, left: 0, hits: 0, regrow: 0 });
  }
  // every map gets ~8 berry bushes and enough stone: turn trees (from the end of the list) into them
  const count = (f: (k: number) => boolean) => trees.filter((t) => f(t.kind)).length;
  for (let i = trees.length - 1; i >= 0; i--) {
    if (trees[i].kind >= 3) continue;
    if (count((k) => k === 5) < 8) trees[i].kind = 5;
    else if (count((k) => k === 3 || k === 4) < 5) trees[i].kind = 3;
    else break;
  }
  for (const t of trees) t.left = NODE_YIELD[t.kind];
  return trees;
}

export function createState(infos: PlayerInfo[], seed: number): State {
  const trees = makeTrees(seed);
  const layout = makePuzzles(seed);
  const needs = puzzleNeeds(infos.length);
  const s: State = {
    phase: 'play', time: ROUND_SECONDS,
    bank: res(), delivered: res(), quest: questTargets(infos.length),
    players: [], items: [], gems: [], powers: [], trees,
    layout, puzzles: layout.map((_, i) => ({ need: needs[i], mask: 0, open: false, taken: false })),
    totems: TOTEM_KINDS.map((kind) => ({ kind, level: 0, buy: 0, armed: true })), doubleT: 0,
    fx: [], nextId: 1,
    gemT: 8, powerT: 10,
  };
  infos.forEach((p, i) => addPlayer(s, p, i));
  return s;
}

export function addPlayer(s: State, p: PlayerInfo, slot = s.players.length) {
  if (s.players.some((q) => q.id === p.id) || s.players.length >= MAX_PLAYERS) return;
  const a = (slot / MAX_PLAYERS) * Math.PI * 2;
  s.players.push({
    ...p, x: BASE.x + Math.cos(a) * 50, y: BASE.y + Math.sin(a) * 50, vx: 0, vy: 0,
    carry: [], shield: 0, shieldT: 0, dashCd: 0, dashT: 0, boostT: 0, magnetT: 0, toolCd: 0, lastDash: 0,
  });
}

export function removePlayer(s: State, id: string) {
  s.players = s.players.filter((p) => p.id !== id);
}

function freeSpot(s: State, minBase = 60): { x: number; y: number } {
  for (let i = 0; i < 60; i++) {
    const x = 50 + Math.random() * (WORLD_W - 100);
    const y = 60 + Math.random() * (WORLD_H - 110);
    if (nearBase(x, y, minBase)) continue;
    if (s.trees.some((t) => Math.hypot(t.x - x, t.y - y) < 34)) continue;
    if (s.layout.some((l) => inRect(l.zone, x, y, 20))) continue;
    if (TOTEM_PADS.some((p) => Math.hypot(p.x - x, p.y - y) < PAD_R + 30)) continue;
    return { x, y };
  }
  return { x: 80, y: 80 };
}

/** Index of the nearest node with resources left that a blob at x,y can hit, or -1 (then the button dashes). */
export function toolNode(trees: { x: number; y: number; kind: number }[], left: (i: number) => number, x: number, y: number): number {
  let best = -1, bd = Infinity;
  trees.forEach((t, i) => {
    if (left(i) <= 0) return;
    const d = Math.hypot(t.x - x, t.y - y) - (isSolid(t.kind) ? OBSTACLE_R[t.kind] ?? TREE_R : 0);
    if (d < BLOB_R + TOOL_REACH && d < bd) { bd = d; best = i; }
  });
  return best;
}

/** Add resources to the bank and the quest tally (2x while the double totem runs). */
function award(s: State, x: number, y: number, r: Res) {
  const m = s.doubleT > 0 ? 2 : 1;
  const got = res(r.wood * m, r.stone * m, r.berry * m);
  for (const k of RES) { s.bank[k] += got[k]; s.delivered[k] += got[k]; }
  s.fx.push({ t: 'gain', x, y, r: got });
}

/** One tool hit on node i by player p. Every NODE_HITS hits pops one item out towards the blob. */
function hitNode(s: State, p: Player, i: number) {
  const t = s.trees[i];
  const tool = nodeTool(t.kind);
  t.hits++;
  let drop = false;
  if (t.hits >= NODE_HITS[t.kind]) {
    t.hits = 0; t.left--; drop = true;
    const a = Math.atan2(p.y - t.y, p.x - t.x) + (Math.random() - 0.5) * 0.9;
    const d = (OBSTACLE_R[t.kind] ?? TREE_R) + 24;
    s.items.push({ id: s.nextId++, kind: nodeRes(t.kind), x: t.x + Math.cos(a) * d, y: t.y + Math.sin(a) * d });
    if (t.left <= 0) t.regrow = NODE_REGROW[t.kind];
  }
  s.fx.push({ t: 'hit', id: p.id, x: t.x, y: t.y, node: i, tool, drop });
}

function clampSpeed(p: Player, speedMul: number) {
  const max = (p.boostT > 0 ? BOOST_SPEED : MAX_SPEED) * speedMul * (p.dashT > 0 ? 1.7 : 1);
  const sp = Math.hypot(p.vx, p.vy);
  if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }
}

export function step(s: State, inputs: Map<string, Input>, dt: number) {
  if (s.phase !== 'play') return;
  s.time = Math.max(0, s.time - dt);
  s.doubleT = Math.max(0, s.doubleT - dt);
  const speedMul = 1 + 0.1 * totemLevel(s, 'speed');
  const pickR = PICKUP_R + 10 * totemLevel(s, 'magnet');
  const shieldMax = totemLevel(s, 'shield');

  // --- players: glide physics ---
  for (const p of s.players) {
    const inp = inputs.get(p.id) ?? { x: 0, y: 0, dash: p.lastDash };
    let ix = inp.x, iy = inp.y;
    const il = Math.hypot(ix, iy);
    if (il > 1) { ix /= il; iy /= il; }
    p.vx += ix * ACCEL * speedMul * dt;
    p.vy += iy * ACCEL * speedMul * dt;
    // shield charges refill one at a time
    if (p.shield < shieldMax) { p.shieldT += dt; if (p.shieldT >= SHIELD_RECHARGE) { p.shield++; p.shieldT = 0; } } else p.shieldT = 0;
    const drag = Math.exp(-DRAG * dt);
    p.vx *= drag; p.vy *= drag;
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.dashT = Math.max(0, p.dashT - dt);
    p.boostT = Math.max(0, p.boostT - dt);
    p.magnetT = Math.max(0, p.magnetT - dt);
    p.toolCd = Math.max(0, p.toolCd - dt);
    if (inp.dash !== p.lastDash) {
      p.lastDash = inp.dash;
      // contextual action: a node in reach gets the right tool, otherwise dash
      const node = toolNode(s.trees, (i) => s.trees[i].left, p.x, p.y);
      if (node >= 0) {
        if (p.toolCd <= 0) { hitNode(s, p, node); p.toolCd = TOOL_COOLDOWN; }
      } else if (p.dashCd <= 0) {
        let dx = il > 0.2 ? ix : p.vx, dy = il > 0.2 ? iy : p.vy;
        const dl = Math.hypot(dx, dy) || 1;
        dx /= dl; dy /= dl;
        if (dx === 0 && dy === 0) dy = -1;
        p.vx += dx * DASH_IMPULSE; p.vy += dy * DASH_IMPULSE;
        p.dashCd = DASH_COOLDOWN; p.dashT = 0.3;
      }
    }
    clampSpeed(p, speedMul);
    p.x += p.vx * dt; p.y += p.vy * dt;
    // world edges: soft bounce
    if (p.x < BLOB_R) { p.x = BLOB_R; p.vx = Math.abs(p.vx) * 0.6; }
    if (p.x > WORLD_W - BLOB_R) { p.x = WORLD_W - BLOB_R; p.vx = -Math.abs(p.vx) * 0.6; }
    if (p.y < BLOB_R) { p.y = BLOB_R; p.vy = Math.abs(p.vy) * 0.6; }
    if (p.y > WORLD_H - BLOB_R) { p.y = WORLD_H - BLOB_R; p.vy = -Math.abs(p.vy) * 0.6; }
  }

  // --- nodes: solid; used-up nodes regrow ---
  for (const t of s.trees) {
    t.cd = Math.max(0, t.cd - dt);
    if (t.left <= 0) { t.regrow -= dt; if (t.regrow <= 0) { t.left = NODE_YIELD[t.kind]; t.hits = 0; t.regrow = 0; } }
    if (!isSolid(t.kind)) continue; // blobz glide through berry bushes
    for (const p of s.players) {
      const dx = p.x - t.x, dy = p.y - t.y;
      const d = Math.hypot(dx, dy);
      const min = BLOB_R + (OBSTACLE_R[t.kind] ?? TREE_R);
      if (d < min && d > 0.001) {
        const nx = dx / d, ny = dy / d;
        const vn = p.vx * nx + p.vy * ny;
        p.x = t.x + nx * min; p.y = t.y + ny * min;
        if (vn < 0) {
          p.vx -= 1.6 * vn * nx; p.vy -= 1.6 * vn * ny;
          if (-vn > 170 && t.cd <= 0) { t.cd = 1; s.fx.push({ t: 'bump', x: t.x, y: t.y }); } // crash: just a thud
        }
      }
    }
  }

  // --- fences + closed gates: solid boxes ---
  s.layout.forEach((l, i) => {
    const boxes = s.puzzles[i].open ? l.walls : [...l.walls, l.gate];
    for (const p of s.players) for (const b of boxes) collideBox(p, b);
  });

  // --- blob vs blob: bouncy bumps ---
  for (let i = 0; i < s.players.length; i++) {
    for (let j = i + 1; j < s.players.length; j++) {
      const a = s.players[i], b = s.players[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d < BLOB_R * 2 && d > 0.001) {
        const nx = dx / d, ny = dy / d;
        const push = (BLOB_R * 2 - d) / 2;
        a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rel < 0) {
          const imp = -rel * 0.9;
          a.vx -= imp * nx; a.vy -= imp * ny; b.vx += imp * nx; b.vy += imp * ny;
        }
      }
    }
  }

  // --- pickups ---
  for (const p of s.players) {
    if (p.magnetT > 0) {
      for (const it of s.items) {
        const dx = p.x - it.x, dy = p.y - it.y, d = Math.hypot(dx, dy);
        if (d < MAGNET_R && d > 1 && p.carry.length < CARRY_MAX) { it.x += (dx / d) * 260 * dt; it.y += (dy / d) * 260 * dt; }
      }
    }
    if (p.carry.length < CARRY_MAX) {
      const idx = s.items.findIndex((it) => Math.hypot(p.x - it.x, p.y - it.y) < pickR);
      if (idx >= 0) {
        const it = s.items[idx];
        p.carry.push(it.kind);
        s.items.splice(idx, 1);
        s.fx.push({ t: 'pick', x: it.x, y: it.y });
      }
    }
    const pw = s.powers.findIndex((w) => Math.hypot(p.x - w.x, p.y - w.y) < PICKUP_R + 4);
    if (pw >= 0) {
      const w = s.powers[pw];
      if (w.kind === 'speed') p.boostT = 7; else p.magnetT = 9;
      s.powers.splice(pw, 1);
      s.fx.push({ t: 'power', x: w.x, y: w.y, kind: w.kind });
    }
    // deposit at base
    if (p.carry.length && nearBase(p.x, p.y, -10)) {
      const got = res();
      for (const k of p.carry) got[k]++;
      award(s, p.x, p.y - 30, got);
      p.carry = [];
    }
  }

  // --- pressure plates: every used plate held at the same time opens the gate (stays open) ---
  s.layout.forEach((l, i) => {
    const pz = s.puzzles[i];
    let mask = 0;
    for (let k = 0; k < pz.need; k++) {
      const pl = l.plates[k];
      if (s.players.some((p) => Math.hypot(p.x - pl.x, p.y - pl.y) < PLATE_R)) mask |= 1 << k;
    }
    pz.mask = mask;
    if (!pz.open && mask === (1 << pz.need) - 1) {
      pz.open = true;
      s.fx.push({ t: 'gate', x: l.cx, y: (l.gate.y0 + l.gate.y1) / 2 });
    }
    if (pz.open && !pz.taken && s.players.some((p) => Math.hypot(p.x - l.chest.x, p.y - l.chest.y) < CHEST_R)) {
      pz.taken = true;
      award(s, l.chest.x, l.chest.y - 30, res(CHEST_BUNDLE, CHEST_BUNDLE, CHEST_BUNDLE));
    }
  });

  // --- big gems: need 2+ blobz together to move them ---
  for (let gi = s.gems.length - 1; gi >= 0; gi--) {
    const g = s.gems[gi];
    const near = s.players.filter((p) => Math.hypot(p.x - g.x, p.y - g.y) < GEM_GRAB_R);
    g.holders = near.length;
    if (near.length >= 2) {
      const ax = near.reduce((a, p) => a + p.vx, 0) / near.length;
      const ay = near.reduce((a, p) => a + p.vy, 0) / near.length;
      const k = Math.min(1, 0.55 + 0.15 * near.length); // more friends, easier carry
      g.vx = ax * k; g.vy = ay * k;
    } else {
      g.vx *= Math.exp(-6 * dt); g.vy *= Math.exp(-6 * dt);
    }
    g.x = Math.min(WORLD_W - GEM_R, Math.max(GEM_R, g.x + g.vx * dt));
    g.y = Math.min(WORLD_H - GEM_R, Math.max(GEM_R, g.y + g.vy * dt));
    if (nearBase(g.x, g.y, -20)) {
      award(s, g.x, g.y - 30, res(GEM_BUNDLE, GEM_BUNDLE, GEM_BUNDLE));
      s.gems.splice(gi, 1);
      s.gemT = 6;
    }
  }

  // --- totems: stand on a pad for a second to buy the next level; step off before buying again ---
  s.totems.forEach((t, i) => {
    const pad = TOTEM_PADS[i];
    const on = s.players.some((p) => Math.hypot(p.x - pad.x, p.y - pad.y) < PAD_R);
    if (!on) { t.buy = 0; t.armed = true; return; }
    const price = totemPrice(t);
    if (!t.armed || t.level >= TOTEM_MAX || !canAfford(s.bank, price)) { t.buy = 0; return; }
    t.buy = Math.min(1, t.buy + dt / BUY_SECONDS);
    if (t.buy >= 1) {
      for (const k of RES) s.bank[k] -= price[k] ?? 0;
      t.level++; t.buy = 0; t.armed = false;
      if (t.kind === 'double') s.doubleT = DOUBLE_SECONDS;
      if (t.kind === 'shield') for (const p of s.players) p.shield = Math.max(p.shield, t.level); // first charge right away
      s.fx.push({ t: 'totem', x: pad.x, y: pad.y, kind: t.kind, level: t.level });
    }
  });

  // --- spawners ---
  s.gemT -= dt;
  const gemMax = s.players.length >= 2 ? 2 : 0; // gems need a team
  if (s.gemT <= 0 && s.gems.length < gemMax) {
    s.gemT = 10;
    const p = freeSpot(s, 260);
    s.gems.push({ id: s.nextId++, x: p.x, y: p.y, vx: 0, vy: 0, holders: 0 });
  }
  s.powerT -= dt;
  if (s.powerT <= 0) {
    s.powerT = 14;
    if (s.powers.length < 2) {
      const p = freeSpot(s, 120);
      s.powers.push({ id: s.nextId++, kind: Math.random() < 0.5 ? 'speed' : 'magnet', x: p.x, y: p.y });
    }
  }

  if (s.time <= 0) s.phase = 'end';
}

/** Push a blob out of an axis-aligned box and bounce it off. */
function collideBox(p: Player, b: Rect) {
  const qx = Math.max(b.x0, Math.min(p.x, b.x1)), qy = Math.max(b.y0, Math.min(p.y, b.y1));
  let dx = p.x - qx, dy = p.y - qy;
  let d = Math.hypot(dx, dy);
  if (d >= BLOB_R) return;
  if (d < 0.001) { // centre inside the box: leave along the shortest side
    const l = p.x - b.x0, r = b.x1 - p.x, t = p.y - b.y0, bo = b.y1 - p.y;
    const m = Math.min(l, r, t, bo);
    [dx, dy] = m === l ? [-1, 0] : m === r ? [1, 0] : m === t ? [0, -1] : [0, 1];
    d = 0; p.x = m === l ? b.x0 : m === r ? b.x1 : p.x; p.y = m === t ? b.y0 : m === bo ? b.y1 : p.y;
  } else { dx /= d; dy /= d; }
  p.x += dx * (BLOB_R - d); p.y += dy * (BLOB_R - d);
  const vn = p.vx * dx + p.vy * dy;
  if (vn < 0) { p.vx -= 1.5 * vn * dx; p.vy -= 1.5 * vn * dy; }
}

// ---- network snapshot (compact, rounded) ----
export interface Snapshot {
  ph: State['phase']; tm: number;
  r: number[]; // bank w,s,b, delivered w,s,b, quest w,s,b
  n: string; // items left per node, one digit each
  p: [string, number, number, number, number, string, number, number, number, number?][]; // id,x,y,vx,vy,carry,boost,magnet,dashCd,shield
  i: [number, string, number, number][];
  g: [number, number, number, number][];
  w: [number, string, number, number][];
  z: [number, number, number, number][]; // puzzles: need, plate mask, open, chest taken
  k: [number, number][]; d: number; // totems [level, buy%], double seconds left
  fx: FxEvent[];
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const KIND_CODE: Record<ItemKind, string> = { wood: 'w', stone: 's', berry: 'b' };
const CODE_KIND: Record<string, ItemKind> = { w: 'wood', s: 'stone', b: 'berry' };
const resArr = (r: Res) => RES.map((k) => r[k]);
const arrRes = (a: number[] | undefined, o: number): Res => res(a?.[o] ?? 0, a?.[o + 1] ?? 0, a?.[o + 2] ?? 0);

export function snapshot(s: State): Snapshot {
  return {
    ph: s.phase, tm: r1(s.time),
    r: [...resArr(s.bank), ...resArr(s.delivered), ...resArr(s.quest)],
    n: s.trees.map((t) => Math.max(0, Math.min(9, t.left))).join(''),
    p: s.players.map((p) => [p.id, r1(p.x), r1(p.y), r1(p.vx), r1(p.vy), p.carry.map((k) => KIND_CODE[k]).join(''), r1(p.boostT), r1(p.magnetT), r1(p.dashCd), p.shield]),
    i: s.items.map((i) => [i.id, KIND_CODE[i.kind], r1(i.x), r1(i.y)]),
    g: s.gems.map((g) => [g.id, r1(g.x), r1(g.y), g.holders]),
    w: s.powers.map((w) => [w.id, w.kind, r1(w.x), r1(w.y)]),
    z: s.puzzles.map((z) => [z.need, z.mask, +z.open, +z.taken]),
    k: s.totems.map((t) => [t.level, Math.round(t.buy * 100)]), d: r1(s.doubleT),
    fx: s.fx,
  };
}

/** View model shared by host (from State) and clients (from Snapshot). */
export interface View {
  phase: State['phase']; time: number;
  bank: Res; delivered: Res; quest: Res;
  nodes: number[]; // items left per node (same order as makeTrees)
  players: { id: string; x: number; y: number; vx: number; vy: number; carry: ItemKind[]; boostT: number; magnetT: number; dashCd: number; shield: number }[];
  items: Item[]; gems: { id: number; x: number; y: number; holders: number }[]; powers: Power[];
  puzzles: Puzzle[];
  totems: { kind: TotemKind; level: number; buy: number }[]; doubleT: number;
}

export function viewFromState(s: State): View {
  return {
    phase: s.phase, time: s.time, bank: s.bank, delivered: s.delivered, quest: s.quest,
    nodes: s.trees.map((t) => t.left),
    players: s.players.map((p) => ({ id: p.id, x: p.x, y: p.y, vx: p.vx, vy: p.vy, carry: p.carry, boostT: p.boostT, magnetT: p.magnetT, dashCd: p.dashCd, shield: p.shield })),
    items: s.items, gems: s.gems, powers: s.powers, puzzles: s.puzzles,
    totems: s.totems, doubleT: s.doubleT,
  };
}

export function viewFromSnapshot(n: Snapshot): View {
  return {
    phase: n.ph, time: n.tm,
    bank: arrRes(n.r, 0), delivered: arrRes(n.r, 3), quest: arrRes(n.r, 6),
    nodes: [...(n.n ?? '')].map(Number),
    players: n.p.map(([id, x, y, vx, vy, c, b, m, d, sh]) => ({ id, x, y, vx, vy, carry: c.split('').filter(Boolean).map((k) => CODE_KIND[k]), boostT: b, magnetT: m, dashCd: d, shield: sh ?? 0 })),
    items: n.i.map(([id, k, x, y]) => ({ id, kind: CODE_KIND[k], x, y })),
    gems: n.g.map(([id, x, y, h]) => ({ id, x, y, holders: h })),
    powers: n.w.map(([id, k, x, y]) => ({ id, kind: k as PowerKind, x, y })),
    puzzles: (n.z ?? []).map(([need, mask, open, taken]) => ({ need, mask, open: !!open, taken: !!taken })),
    totems: TOTEM_KINDS.map((kind, i) => ({ kind, level: n.k?.[i]?.[0] ?? 0, buy: (n.k?.[i]?.[1] ?? 0) / 100 })), doubleT: n.d ?? 0,
  };
}
