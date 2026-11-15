// The dirt path from the yard to the dungeon cave, on the 48 px ground grid (one Ninja tile at 3x).
// It is 2 tiles wide and routed AROUND resource nodes, water, puzzle pens and building spots (Lead world part 2,
// point 9: no props on path tiles). Pure and seeded, so every phone draws the same path.
import { BASE, BUILDING_ENABLED, BUILD_SPOTS, COTTAGE_PAD, entranceOf, makePuzzles, makeTrees, makeWater, WATER_TILE, WORLD_H, WORLD_W } from './sim';
import { waterTiles } from './water';

/** Clearance (world px) between the centre of a 2x2 path block and a node; near a building spot the path may pass
 *  (the building stands on its own dirt patch) but it costs extra, so it goes around when it can. */
const NODE_CLEAR = 58;
/** Crowded maps: a node this close to a block centre blocks it outright; between this and NODE_CLEAR it only costs. */
const NODE_HARD = 40;
const NODE_COST = 25;
const SPOT_CLEAR = 60;
const SPOT_COST = 8;
/** Extra cost of a turn, so the path runs in long straight legs instead of a staircase. */
const TURN_COST = 4;

const memo = new Map<number, Set<string>>();

/** Tile keys "tx,ty" covered by the path (empty when no route exists; the caller falls back). */
export function cavePath(seed: number): Set<string> {
  const hit = memo.get(seed);
  if (hit) return hit;
  const T = WATER_TILE, cols = Math.ceil(WORLD_W / T), rows = Math.ceil(WORLD_H / T);
  const wet = new Set(BUILDING_ENABLED ? waterTiles(makeWater(seed).water).map((t) => t.tx + ',' + t.ty) : []);
  const nodes = makeTrees(seed);
  const pens = makePuzzles(seed).map((l) => l.zone);
  const spots = BUILDING_ENABLED ? Object.values(BUILD_SPOTS) : [];
  const e = entranceOf(seed);
  const near = (x: number, y: number, p: { x: number; y: number }, r: number) => Math.hypot(p.x - x, p.y - y) < r;
  /** Extra cost of a 2x2 block with its top-left tile at (tx, ty); Infinity = blocked. Yard and cave mouth are free. */
  const cost = (tx: number, ty: number) => {
    if (tx < 0 || ty < 0 || tx + 1 >= cols || ty + 1 >= rows) return Infinity;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (wet.has(tx + dx + ',' + (ty + dy))) return Infinity;
    const x = (tx + 1) * T, y = (ty + 1) * T;
    if (near(x, y, BASE, BASE.r + 40) || (BUILDING_ENABLED && near(x, y, COTTAGE_PAD, 60)) || near(x, y, e, 90)) return 0; // yard + cave mouth
    if (nodes.some((n) => near(x, y, n, NODE_HARD))) return Infinity;
    if (pens.some((z) => x > z.x0 - T && x < z.x1 + T && y > z.y0 - T && y < z.y1 + T)) return Infinity;
    return (nodes.some((n) => near(x, y, n, NODE_CLEAR)) ? NODE_COST : 0) + (spots.some((s) => near(x, y, s, SPOT_CLEAR)) ? SPOT_COST : 0);
  };
  const sx = Math.floor(BASE.x / T), sy = Math.floor(BASE.y / T);
  const gx = Math.floor(e.x / T), gy = Math.floor(e.y / T);
  // Dijkstra over (tile, heading); cells are tiny (about 27 x 20 x 4), a plain array queue is fast enough
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const id = (x: number, y: number, d: number) => (y * cols + x) * 4 + d;
  const dist = new Float64Array(cols * rows * 4).fill(Infinity);
  const prev = new Int32Array(cols * rows * 4).fill(-1);
  const open: number[] = [];
  for (let d = 0; d < 4; d++) { dist[id(sx, sy, d)] = 0; open.push(id(sx, sy, d)); }
  let goal = -1;
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (dist[open[i]] < dist[open[bi]]) bi = i;
    const cur = open[bi];
    open[bi] = open[open.length - 1]; open.pop();
    const d = cur % 4, cell = (cur - d) / 4, x = cell % cols, y = (cell - x) / cols;
    if (Math.abs(x - gx) <= 1 && Math.abs(y - gy) <= 1) { goal = cur; break; }
    for (let nd = 0; nd < 4; nd++) {
      const nx = x + DIRS[nd][0], ny = y + DIRS[nd][1];
      const extra = cost(nx, ny);
      if (extra === Infinity) continue;
      const nid = id(nx, ny, nd), c = dist[cur] + 1 + extra + (nd === d ? 0 : TURN_COST);
      if (c < dist[nid]) { if (dist[nid] === Infinity) open.push(nid); dist[nid] = c; prev[nid] = cur; }
    }
  }
  const out = new Set<string>();
  for (let cur = goal; cur >= 0; cur = prev[cur]) {
    const cell = (cur - (cur % 4)) / 4, x = cell % cols, y = (cell - x) / cols;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) out.add(x + dx + ',' + (y + dy));
  }
  memo.set(seed, out);
  return out;
}
