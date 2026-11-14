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
const GEM_R = 22;
const GEM_GRAB_R = 62;
const PICKUP_R = 26;
const MAGNET_R = 150;

export type ItemKind = 'wood' | 'shroom' | 'coin';
export type PowerKind = 'speed' | 'magnet';
export const ITEM_POINTS: Record<ItemKind, number> = { wood: 1, shroom: 2, coin: 3 };
export const GEM_POINTS = 15;

export interface PlayerInfo { id: string; name: string; color: number; eyes: number; mouth: number; hat: number }
export interface Player extends PlayerInfo {
  x: number; y: number; vx: number; vy: number;
  carry: ItemKind[];
  dashCd: number; dashT: number; boostT: number; magnetT: number;
  lastDash: number; // last dash counter seen from input
}
export interface Item { id: number; kind: ItemKind; x: number; y: number }
export interface Gem { id: number; x: number; y: number; vx: number; vy: number; holders: number }
export interface Power { id: number; kind: PowerKind; x: number; y: number }
export interface Tree { x: number; y: number; kind: number; cd: number }
export interface Input { x: number; y: number; dash: number }
export type FxEvent =
  | { t: 'score'; x: number; y: number; pts: number }
  | { t: 'pick'; x: number; y: number }
  | { t: 'bump'; x: number; y: number }
  | { t: 'power'; x: number; y: number; kind: PowerKind };

export interface State {
  phase: 'play' | 'end';
  time: number; // seconds left
  score: number;
  players: Player[];
  items: Item[];
  gems: Gem[];
  powers: Power[];
  trees: Tree[];
  stars: [number, number, number];
  fx: FxEvent[]; // events since last snapshot (cleared by caller)
  nextId: number;
  spawnT: number; gemT: number; powerT: number;
}

/** Small seeded RNG so the map layout is reproducible from a seed. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

export function starThresholds(players: number): [number, number, number] {
  const f = 0.6 + 0.4 * Math.max(1, players);
  return [Math.round(40 * f), Math.round(85 * f), Math.round(140 * f)];
}

export function starsFor(score: number, t: [number, number, number]): number {
  return t.filter((v) => score >= v).length;
}

function nearBase(x: number, y: number, extra: number) {
  return Math.hypot(x - BASE.x, y - BASE.y) < BASE.r + extra;
}

export function makeTrees(seed: number): Tree[] {
  const r = rng(seed);
  const trees: Tree[] = [];
  let tries = 0;
  while (trees.length < 34 && tries++ < 2000) {
    const x = 60 + r() * (WORLD_W - 120);
    const y = 70 + r() * (WORLD_H - 130);
    if (nearBase(x, y, 90)) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.y - y) < 70)) continue;
    trees.push({ x, y, kind: Math.floor(r() * 3), cd: 0 });
  }
  return trees;
}

export function createState(infos: PlayerInfo[], seed: number): State {
  const trees = makeTrees(seed);
  const s: State = {
    phase: 'play', time: ROUND_SECONDS, score: 0,
    players: [], items: [], gems: [], powers: [], trees,
    stars: starThresholds(infos.length), fx: [], nextId: 1,
    spawnT: 0, gemT: 8, powerT: 10,
  };
  infos.forEach((p, i) => addPlayer(s, p, i));
  for (let i = 0; i < 18; i++) spawnItem(s);
  return s;
}

export function addPlayer(s: State, p: PlayerInfo, slot = s.players.length) {
  if (s.players.some((q) => q.id === p.id) || s.players.length >= MAX_PLAYERS) return;
  const a = (slot / MAX_PLAYERS) * Math.PI * 2;
  s.players.push({
    ...p, x: BASE.x + Math.cos(a) * 50, y: BASE.y + Math.sin(a) * 50, vx: 0, vy: 0,
    carry: [], dashCd: 0, dashT: 0, boostT: 0, magnetT: 0, lastDash: 0,
  });
  s.stars = starThresholds(s.players.length);
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
    return { x, y };
  }
  return { x: 80, y: 80 };
}

function spawnItem(s: State, at?: { x: number; y: number }, kind?: ItemKind) {
  const p = at ?? freeSpot(s);
  const roll = Math.random();
  const k: ItemKind = kind ?? (roll < 0.5 ? 'shroom' : roll < 0.8 ? 'wood' : 'coin');
  s.items.push({ id: s.nextId++, kind: k, x: p.x, y: p.y });
}

function clampSpeed(p: Player) {
  const max = (p.boostT > 0 ? BOOST_SPEED : MAX_SPEED) * (p.dashT > 0 ? 1.7 : 1);
  const sp = Math.hypot(p.vx, p.vy);
  if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }
}

export function step(s: State, inputs: Map<string, Input>, dt: number) {
  if (s.phase !== 'play') return;
  s.time = Math.max(0, s.time - dt);

  // --- players: glide physics ---
  for (const p of s.players) {
    const inp = inputs.get(p.id) ?? { x: 0, y: 0, dash: p.lastDash };
    let ix = inp.x, iy = inp.y;
    const il = Math.hypot(ix, iy);
    if (il > 1) { ix /= il; iy /= il; }
    p.vx += ix * ACCEL * dt;
    p.vy += iy * ACCEL * dt;
    const drag = Math.exp(-DRAG * dt);
    p.vx *= drag; p.vy *= drag;
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.dashT = Math.max(0, p.dashT - dt);
    p.boostT = Math.max(0, p.boostT - dt);
    p.magnetT = Math.max(0, p.magnetT - dt);
    if (inp.dash !== p.lastDash) {
      p.lastDash = inp.dash;
      if (p.dashCd <= 0) {
        let dx = il > 0.2 ? ix : p.vx, dy = il > 0.2 ? iy : p.vy;
        const dl = Math.hypot(dx, dy) || 1;
        dx /= dl; dy /= dl;
        if (dx === 0 && dy === 0) dy = -1;
        p.vx += dx * DASH_IMPULSE; p.vy += dy * DASH_IMPULSE;
        p.dashCd = DASH_COOLDOWN; p.dashT = 0.3;
      }
    }
    clampSpeed(p);
    p.x += p.vx * dt; p.y += p.vy * dt;
    // world edges: soft bounce
    if (p.x < BLOB_R) { p.x = BLOB_R; p.vx = Math.abs(p.vx) * 0.6; }
    if (p.x > WORLD_W - BLOB_R) { p.x = WORLD_W - BLOB_R; p.vx = -Math.abs(p.vx) * 0.6; }
    if (p.y < BLOB_R) { p.y = BLOB_R; p.vy = Math.abs(p.vy) * 0.6; }
    if (p.y > WORLD_H - BLOB_R) { p.y = WORLD_H - BLOB_R; p.vy = -Math.abs(p.vy) * 0.6; }
  }

  // --- trees: solid, bump hard to shake loose a log ---
  for (const t of s.trees) {
    t.cd = Math.max(0, t.cd - dt);
    for (const p of s.players) {
      const dx = p.x - t.x, dy = p.y - t.y;
      const d = Math.hypot(dx, dy);
      const min = BLOB_R + TREE_R;
      if (d < min && d > 0.001) {
        const nx = dx / d, ny = dy / d;
        const vn = p.vx * nx + p.vy * ny;
        p.x = t.x + nx * min; p.y = t.y + ny * min;
        if (vn < 0) {
          p.vx -= 1.6 * vn * nx; p.vy -= 1.6 * vn * ny;
          if (-vn > 170 && t.cd <= 0) {
            t.cd = 3;
            const a = Math.atan2(ny, nx) + (Math.random() - 0.5) * 2;
            spawnItem(s, { x: t.x + Math.cos(a) * 42, y: t.y + Math.sin(a) * 42 }, 'wood');
            s.fx.push({ t: 'bump', x: t.x, y: t.y });
          }
        }
      }
    }
  }

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
      const idx = s.items.findIndex((it) => Math.hypot(p.x - it.x, p.y - it.y) < PICKUP_R);
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
      const pts = p.carry.reduce((sum, k) => sum + ITEM_POINTS[k], 0) + (p.carry.length === CARRY_MAX ? 2 : 0);
      s.score += pts;
      s.fx.push({ t: 'score', x: p.x, y: p.y - 30, pts });
      p.carry = [];
    }
  }

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
      s.score += GEM_POINTS;
      s.fx.push({ t: 'score', x: g.x, y: g.y - 30, pts: GEM_POINTS });
      s.gems.splice(gi, 1);
      s.gemT = 6;
    }
  }

  // --- spawners ---
  s.spawnT -= dt;
  if (s.spawnT <= 0) { s.spawnT = 1.6; if (s.items.length < 26) spawnItem(s); }
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

// ---- network snapshot (compact, rounded) ----
export interface Snapshot {
  ph: State['phase']; tm: number; sc: number; st: [number, number, number];
  p: [string, number, number, number, number, string, number, number, number][]; // id,x,y,vx,vy,carry,boost,magnet,dashCd
  i: [number, string, number, number][];
  g: [number, number, number, number][];
  w: [number, string, number, number][];
  fx: FxEvent[];
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const KIND_CODE: Record<ItemKind, string> = { wood: 'w', shroom: 's', coin: 'c' };
const CODE_KIND: Record<string, ItemKind> = { w: 'wood', s: 'shroom', c: 'coin' };

export function snapshot(s: State): Snapshot {
  return {
    ph: s.phase, tm: r1(s.time), sc: s.score, st: s.stars,
    p: s.players.map((p) => [p.id, r1(p.x), r1(p.y), r1(p.vx), r1(p.vy), p.carry.map((k) => KIND_CODE[k]).join(''), r1(p.boostT), r1(p.magnetT), r1(p.dashCd)]),
    i: s.items.map((i) => [i.id, KIND_CODE[i.kind], r1(i.x), r1(i.y)]),
    g: s.gems.map((g) => [g.id, r1(g.x), r1(g.y), g.holders]),
    w: s.powers.map((w) => [w.id, w.kind, r1(w.x), r1(w.y)]),
    fx: s.fx,
  };
}

/** View model shared by host (from State) and clients (from Snapshot). */
export interface View {
  phase: State['phase']; time: number; score: number; stars: [number, number, number];
  players: { id: string; x: number; y: number; vx: number; vy: number; carry: ItemKind[]; boostT: number; magnetT: number; dashCd: number }[];
  items: Item[]; gems: { id: number; x: number; y: number; holders: number }[]; powers: Power[];
}

export function viewFromState(s: State): View {
  return {
    phase: s.phase, time: s.time, score: s.score, stars: s.stars,
    players: s.players.map((p) => ({ id: p.id, x: p.x, y: p.y, vx: p.vx, vy: p.vy, carry: p.carry, boostT: p.boostT, magnetT: p.magnetT, dashCd: p.dashCd })),
    items: s.items, gems: s.gems, powers: s.powers,
  };
}

export function viewFromSnapshot(n: Snapshot): View {
  return {
    phase: n.ph, time: n.tm, score: n.sc, stars: n.st,
    players: n.p.map(([id, x, y, vx, vy, c, b, m, d]) => ({ id, x, y, vx, vy, carry: c.split('').filter(Boolean).map((k) => CODE_KIND[k]), boostT: b, magnetT: m, dashCd: d })),
    items: n.i.map(([id, k, x, y]) => ({ id, kind: CODE_KIND[k], x, y })),
    gems: n.g.map(([id, x, y, h]) => ({ id, x, y, holders: h })),
    powers: n.w.map(([id, k, x, y]) => ({ id, kind: k as PowerKind, x, y })),
  };
}
