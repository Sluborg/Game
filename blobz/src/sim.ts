// Authoritative game simulation. Pure TypeScript, no Phaser, no network.
// Runs on the host only; clients render the snapshots it produces.

/** Base building: build spots, cottage upgrades, the water corner and the saved village. */
export const BUILDING_ENABLED = true;
export const MAIN_W = 1280;
export const WORLD_W = MAIN_W;
export const WORLD_H = 960;
export const BRIDGE_HALF = 34; // half-width of the walkable bridge deck
export const BASE = { x: MAIN_W / 2, y: WORLD_H / 2, r: 92 };
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
export const OBSTACLE_R = [18, 18, 18, 24, 30, 14]; // trunks + rocks match the 3x Ninja art (one pixel density)
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
/** Stone is ARCHIVED for now (Stefan 2026-11-15 meadow declutter, docs/ARCHIVED.md): no rock nodes on the meadow, no
 *  stone goal, and every stone price is paid in wood instead. Code kept: flip the flag to bring stone back. */
export const STONE_ENABLED = false;
/** Resources the round asks for (the quest goal, its stars and the HUD rows). */
export const ACTIVE_RES: ItemKind[] = RES.filter((k) => STONE_ENABLED || k !== 'stone');
/** With stone off a stone price moves into wood, so nothing becomes free or impossible. */
const priced = (c: Res): Res => (STONE_ENABLED ? c : { wood: c.wood + c.stone, stone: 0, berry: c.berry });
/** Meadow declutter: how many nodes the map gets (was 34 + 8 bushes + 7 in the water corner). */
const NODE_COUNT = 10, BUSH_MIN = 3, CORNER_NODES = 3;
export type Res = Record<ItemKind, number>;
export const res = (w = 0, st = 0, b = 0): Res => ({ wood: w, stone: st, berry: b });
export type PowerKind = 'speed' | 'magnet';
/** Bundles: the big co-op chest (carried by 2) and the puzzle pen chest give this much of each resource. */
export const GEM_BUNDLE = 2;
export const CHEST_BUNDLE = 3;
export const QUEST_BASE: Res = res(10, 6, 5); // for 1-2 players
/** Round goal: deliver this much of each resource; every finished bar is a star. x(1 + 0.35*(n-2)) for 3-5. */
export function questTargets(players: number, cottage = 1): Res {
  // bigger cottage, bigger goals: +20% per level
  const f = (1 + 0.35 * Math.max(0, Math.min(MAX_PLAYERS, players) - 2)) * (1 + 0.2 * (Math.max(1, Math.min(3, cottage)) - 1));
  return res(Math.ceil(QUEST_BASE.wood * f - 1e-9), STONE_ENABLED ? Math.ceil(QUEST_BASE.stone * f - 1e-9) : 0, Math.ceil(QUEST_BASE.berry * f - 1e-9));
}
/** Finished goal bars among the active resources. */
export const barsDone = (delivered: Res, quest: Res) => ACTIVE_RES.filter((k) => delivered[k] >= quest[k]).length;
/** The round's 0-3 stars: finished bars scaled to three stars (with two resources: 0, 2, 3). */
export const starsFor = (delivered: Res, quest: Res) => Math.round((3 * barsDone(delivered, quest)) / ACTIVE_RES.length);
/** Every active goal bar is full: the round is won. */
export const questDone = (delivered: Res, quest: Res) => barsDone(delivered, quest) === ACTIVE_RES.length;

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

const puzzleCornerOrder = (c: number[]) => c;
/** The two map corners the puzzle pens use (0 TL, 1 TR, 2 BL, 3 BR). */
export function puzzleCorners(seed: number): number[] {
  const r = rng(seed * 13 + 5);
  const first = Math.floor(r() * 4);
  return [first, (first + 1 + Math.floor(r() * 3)) % 4];
}
/** Co-op puzzle pens are ON HOLD (Stefan 2026-11-15, docs/ARCHIVED.md): no pressure plates, "0/1" counters, fences,
 *  gates or reward chests on the meadow. Code kept: flip the flag to bring them back. */
export const PUZZLES_ENABLED = false;
/** Two pens in two of the four map corners, gate facing the base. Deterministic from the seed. Empty while archived. */
export function makePuzzles(seed: number): PuzzleLayout[] {
  return PUZZLES_ENABLED ? penLayouts(seed) : [];
}
/** The seeded pen geometry, also while archived: the cave entrance keeps the spot it had next to the pens. */
function penLayouts(seed: number): PuzzleLayout[] {
  const r = rng(seed * 13 + 5);
  const corners = [[250, 210], [MAIN_W - 250, 210], [250, WORLD_H - 210], [MAIN_W - 250, WORLD_H - 210]];
  const first = Math.floor(r() * 4);
  const second = (first + 1 + Math.floor(r() * 3)) % 4; // any other corner
  return puzzleCornerOrder([first, second]).map((ci) => {
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

export const canAfford = (bank: Res, price: Partial<Res>) => RES.every((k) => bank[k] >= (price[k] ?? 0));
export const BUILD_LOCK = 1; // seconds between two builds (one build at a time)

// ---- base building: 6 build spots, buildings with team effects, cottage upgrades; the village is
// saved on the host and continues next round ----
export type BuildKind = 'bridge' | 'watchtower' | 'garden' | 'workshop' | 'storage' | 'well';
export const BUILD_KINDS: BuildKind[] = ['bridge', 'watchtower', 'garden', 'workshop', 'storage', 'well'];
// Building names and effect lines are UI text: see i18n.ts ('build.name.*', 'build.eff.*').
export const BUILD_COST: Record<BuildKind, Res> = Object.fromEntries(Object.entries({
  storage: res(6, 0, 0), workshop: res(8, 4, 0), garden: res(6, 0, 4),
  well: res(0, 6, 0), watchtower: res(10, 6, 0), bridge: res(12, 8, 0),
}).map(([k, c]) => [k, priced(c)])) as Record<BuildKind, Res>;
/** Six fixed spots in a ring ~180 px around the cottage, one building each. */
export const BUILD_RING = 180;
const RING_ORDER: BuildKind[] = ['workshop', 'storage', 'garden', 'well', 'watchtower', 'bridge']; // 0, 60, ... 300 degrees
/** Spots moved off the ring: the level-3 hall is 192 px wide at 3x (x 544-736) and hid the watchtower at 240 deg,
 *  so the tower stands further out to the upper left (Lead 2026-11-15). */
const SPOT_OVERRIDE: Partial<Record<BuildKind, { x: number; y: number }>> = { watchtower: { x: 470, y: 318 } };
export const BUILD_SPOTS = Object.fromEntries(RING_ORDER.map((k, i) => {
  const a = (i * 60 * Math.PI) / 180;
  return [k, SPOT_OVERRIDE[k] ?? { x: Math.round(BASE.x + Math.cos(a) * BUILD_RING), y: Math.round(BASE.y + Math.sin(a) * BUILD_RING) }];
})) as Record<BuildKind, { x: number; y: number }>;
export const COTTAGE_PAD = { x: BASE.x, y: BASE.y + 124 };
export const COTTAGE_COST: Res[] = [res(20, 15, 10), res(40, 30, 20)].map(priced); // to level 2, to level 3
export const COTTAGE_MAX = 3;
/** First thing the bank pays for right now: a missing building (BUILD_KINDS order), else the next cottage level. */
export function affordable(bank: Res, builds: { kind: BuildKind; state: number }[], cottageLevel: number): BuildKind | 'cottage' | null {
  const b = builds.find((x) => x.state !== 2 && canAfford(bank, BUILD_COST[x.kind]));
  if (b) return b.kind;
  return cottageLevel < COTTAGE_MAX && canAfford(bank, COTTAGE_COST[cottageLevel - 1]) ? 'cottage' : null;
}
// cottage team bonus (besides +20% quest): level 2 carries one more, level 3 regrows faster
export const BUILD_R = 30; // stand this close to a spot to build
/** state: 0 = empty spot, 2 = built (1 is unused: buildings are bought at once, like totems). */
export interface Build { kind: BuildKind; state: 0 | 1 | 2; paid: Res; buy: number; armed: boolean }
export interface Cottage { level: number; state: 0 | 1; paid: Res; buy: number; armed: boolean }
/** What the host saves between rounds (localStorage 'blobz.village'): buildings, cottage level, bank. */
export interface Village { v: 2; cottage: number; builds: Record<BuildKind, boolean>; bank: Res; dungeon?: number } // dungeon: the next unlocked dungeon (Code 2 hook)
export const VILLAGE_VERSION = 2;
export const newVillage = (): Village => ({
  v: 2, cottage: 1, builds: Object.fromEntries(BUILD_KINDS.map((k) => [k, false])) as Village['builds'], bank: res(), dungeon: 1,
});
const cleanRes = (r: unknown): Res => {
  const o = (r ?? {}) as Partial<Res>;
  const n = (x: unknown) => Math.max(0, Math.min(9999, Math.floor(Number(x)) || 0));
  return res(n(o.wood), n(o.stone), n(o.berry));
};
/** Validate a saved village (untrusted storage); another version or junk starts fresh. */
export function cleanVillage(raw: unknown): Village {
  const v = raw as Partial<Village> | null;
  const out = newVillage();
  if (!v || typeof v !== 'object' || v.v !== VILLAGE_VERSION) return out;
  out.cottage = Math.max(1, Math.min(COTTAGE_MAX, Math.floor(Number(v.cottage)) || 1));
  for (const k of BUILD_KINDS) out.builds[k] = v.builds?.[k] === true;
  out.bank = cleanRes(v.bank);
  out.dungeon = Math.max(1, Math.min(99, Math.floor(Number(v.dungeon)) || 1)); // [dungeon hook] unlocked dungeon
  return out;
}
export const built = (s: { builds: { kind: BuildKind; state: number }[] }, k: BuildKind) => s.builds.some((b) => b.kind === k && b.state === 2);

// ---- the water corner: a seeded corner (not a puzzle corner) behind water; the bridge opens it ----
/** Ninja ground tiles are 16 px drawn at 3x = 48 world px. The water channel is 2 tiles wide and every water edge sits
 *  on that 48 px grid (counted from the world's top-left), so the shore autotiles line up with the collision. */
export const WATER_TILE = 48;
export const WATER_W = 2 * WATER_TILE;
const AREA_W = 6 * WATER_TILE, AREA_H = 5 * WATER_TILE;
const snapDown = (v: number) => Math.floor(v / WATER_TILE) * WATER_TILE;
export interface WaterLayout { corner: number; area: Rect; water: Rect[]; withBridge: Rect[]; bridge: { x: number; y: number } }
export function makeWater(seed: number): WaterLayout {
  const used = puzzleCorners(seed);
  const free = [0, 1, 2, 3].filter((c) => !used.includes(c));
  const corner = free[Math.floor(rng(seed * 17 + 3)() * free.length)];
  const left = corner % 2 === 0, top = corner < 2;
  // an L of water along the area's two inner sides, on the 48 px grid; the right/bottom areas run to the map edge
  const vx0 = left ? AREA_W : snapDown(WORLD_W - AREA_W - WATER_W);
  const hy0 = top ? AREA_H : snapDown(WORLD_H - AREA_H - WATER_W);
  const area: Rect = { x0: left ? 0 : vx0 + WATER_W, x1: left ? vx0 : WORLD_W, y0: top ? 0 : hy0 + WATER_W, y1: top ? hy0 : WORLD_H };
  const vert = { x0: vx0, x1: vx0 + WATER_W, y0: top ? -60 : hy0, y1: top ? hy0 + WATER_W : WORLD_H + 60 };
  const horiz = { x0: left ? -60 : vx0, x1: left ? vx0 + WATER_W : WORLD_W + 60, y0: hy0, y1: hy0 + WATER_W };
  const by = (area.y0 + area.y1) / 2;
  const bridge = { x: vx0 + WATER_W / 2, y: by };
  const withBridge = [{ ...vert, y1: by - BRIDGE_HALF }, { ...vert, y0: by + BRIDGE_HALF }, horiz];
  return { corner, area, water: [vert, horiz], withBridge, bridge };
}
const GARDEN_EVERY = 12; // the garden grows a berry this often (max 3 waiting)

// ---- test dungeon v1: everyone stands on the entrance, picks a weapon, goes down together ----
/** Dungeon (handed off to Code 2, WIP): OFF = no entrance on the meadow, nothing of it shows. */
export const DUNGEON_ENABLED = true;
export const ENTRANCE_R = 60; // Stefan 2026-11-15: ~30% bigger (was 46) so 5 blobz fit without crowding
/** The portal's gather ring: an ellipse (top-down 3/4 view) in front of the portal, below its two pillars, so all 5
 *  fit on open ground. The sim test and the drawn ring (gatherRing.ts, game.ts) use these same numbers. */
export const ENTRANCE_RING = { dy: 20, rx: ENTRANCE_R, ry: Math.round(ENTRANCE_R * 0.6) };
export const onEntrance = (e: { x: number; y: number }, x: number, y: number) =>
  ((x - e.x) / ENTRANCE_RING.rx) ** 2 + ((y - e.y - ENTRANCE_RING.dy) / ENTRANCE_RING.ry) ** 2 < 1;
/** Where the cave entrance goes on this map: the first of four spots around the base (west, east, south,
 *  north) that is clear of the puzzle pens, the water corner, build spots and totem pads. Seeded, so every
 *  phone puts it in the same place. */
export function entranceOf(seed: number): { x: number; y: number } {
  const zones = penLayouts(seed).map((l) => l.zone); // pens archived or not: the cave stays where it was
  if (BUILDING_ENABLED) { const w = makeWater(seed); zones.push(w.area, ...w.water); }
  const spots = [[BASE.x - 330, BASE.y], [BASE.x + 330, BASE.y], [BASE.x, BASE.y + 330], [BASE.x, BASE.y - 300]].map(([x, y]) => ({ x, y }));
  const clear = (p: { x: number; y: number }) => !zones.some((z) => inRect(z, p.x, p.y, ENTRANCE_R + 20))
    && !(BUILDING_ENABLED && Object.values(BUILD_SPOTS).some((b) => Math.hypot(b.x - p.x, b.y - p.y) < 120));
  return spots.find(clear) ?? spots[0];
}
export const PICK_SECONDS = 20; // unpicked blobz get the sword after this (only with the pick timer on)
/** Stefan 2026-11-15 (Code 2 hook): no class-pick timer, the run starts when everyone has picked (docs/ARCHIVED.md). */
export const PICK_TIMER_ENABLED = false;
export type Mode = 'meadow' | 'pick' | 'dungeon';
export const MODES: Mode[] = ['meadow', 'pick', 'dungeon'];

/** Plates per puzzle: 2 and 3, but never more than the players at round start (min 1). */
export function puzzleNeeds(players: number): number[] {
  const n = Math.max(1, players);
  return [Math.min(2, n), Math.min(3, n)];
}

export interface PlayerInfo { id: string; name: string; color: number; shape: number; eyes: number; mouth: number; hat: number }
export interface Player extends PlayerInfo {
  x: number; y: number; vx: number; vy: number;
  carry: ItemKind[];
  shield: number; shieldT: number; // unused since the totems went (kept for the snapshot shape)
  dashCd: number; dashT: number; boostT: number; magnetT: number; toolCd: number;
  lastDash: number; // last dash counter seen from input
}
export interface Item { id: number; kind: ItemKind; x: number; y: number }
export interface Gem { id: number; x: number; y: number; vx: number; vy: number; holders: number }
export interface Power { id: number; kind: PowerKind; x: number; y: number }
/** A resource node. `left` items remain; 0 = stump / rubble / empty bush until `regrow` runs out. */
export interface Tree { x: number; y: number; kind: number; cd: number; left: number; hits: number; regrow: number }
export interface Input { x: number; y: number; dash: number; atk?: number }
export type FxEvent =
  | { t: 'gain'; x: number; y: number; r: Res } // resources added to the bank
  | { t: 'hit'; id: string; x: number; y: number; node: number; tool: Tool; drop: boolean }
  | { t: 'pick'; x: number; y: number }
  | { t: 'bump'; x: number; y: number }
  | { t: 'power'; x: number; y: number; kind: PowerKind }
  | { t: 'gate'; x: number; y: number }
  | { t: 'build'; x: number; y: number; kind: BuildKind | 'cottage'; done: boolean }
  | { t: 'enter' } | { t: 'leave'; done: boolean }
  | DFx
  | MiniFx
  | { t: 'minigame' } | { t: 'minidone'; caught: number; stars: number };

export interface State {
  phase: 'play' | 'mini' | 'end';
  mini: Mini | null; // Bärregn while phase is 'mini'
  miniResult: { caught: number; stars: number } | null; // shown on the end screen
  time: number; // seconds of daylight left
  seed: number;
  biome: Biome;
  ice: { x: number; y: number }[]; // frozen ponds (snow only)
  entrance: { x: number; y: number }; // dungeon cave on the meadow (entranceOf(seed))
  mode: Mode;
  entry: number; // seconds every blob has stood on the dungeon entrance
  picks: Record<string, Weapon>; // weapon chosen per blob (pick screen)
  pickT: number;
  runs: number; // dungeon runs this round (seeds a new dungeon each time)
  dg: DState | null;
  bank: Res; // spendable team resources (buildings, cottage)
  dungeon: number; // [dungeon hook] the dungeon the entrance leads to (beat its boss -> the next one); saved with the village
  buildLock: number; // seconds until the next build may start
  builds: Build[];
  cottage: Cottage;
  builtNow: BuildKind[]; // finished this round (quest goal)
  water: WaterLayout;
  villageDirty: boolean; // the host should save the village
  gardenT: number;
  delivered: Res; // everything brought home this round (quest progress, never spent)
  quest: Res;
  players: Player[];
  items: Item[];
  gems: Gem[];
  powers: Power[];
  trees: Tree[];
  layout: PuzzleLayout[];
  puzzles: Puzzle[];
  fx: FxEvent[]; // events since last snapshot (cleared by caller)
  nextId: number;
  gemT: number; powerT: number;
}

export { rng } from './rng';
import { rng } from './rng';
import { ARENA, keepInArena, miniStars, newMini, stepMini, type Mini, type MiniFx } from './mini';
/** "Bärregn" co-op mini game after sunset, before the end screen. */
/** Bärregn mini game is ARCHIVED (Stefan 2026-11-15, docs/ARCHIVED.md): the round goes straight to the end screen. */
export const MINI_ENABLED = false;
/** Day cycle (sun bar + time limit) is ARCHIVED (Stefan 2026-11-15, docs/ARCHIVED.md): with it off the meadow has no
 *  time limit and the round ends when all three quest goals are filled, then Bärregn as before. Code kept. */
export const DAY_CYCLE_ENABLED = false;
import { dsnap, dungeonChoice, dview, newRun, READY_SECONDS, stepDungeon, WEAPONS, type DFx, type DSnap, type DState, type DView, type Weapon } from './dungeon';


function nearBase(x: number, y: number, extra: number) {
  return Math.hypot(x - BASE.x, y - BASE.y) < BASE.r + extra;
}

export function makeTrees(seed: number): Tree[] {
  const r = rng(seed);
  const zones = makePuzzles(seed).map((p) => p.zone);
  const wl = makeWater(seed);
  if (BUILDING_ENABLED) zones.push(wl.area, ...wl.water);
  const spots = BUILDING_ENABLED ? [...Object.values(BUILD_SPOTS), COTTAGE_PAD] : [];
  const trees: Tree[] = [];
  let tries = 0;
  while (trees.length < NODE_COUNT && tries++ < 2000) {
    const x = 60 + r() * (MAIN_W - 120);
    const y = 70 + r() * (WORLD_H - 130);
    if (nearBase(x, y, 90)) continue;
    if (spots.some((p) => Math.hypot(p.x - x, p.y - y) < 80)) continue;
    if (zones.some((z) => inRect(z, x, y, 40))) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.y - y) < 150)) continue; // spread out (declutter)
    const roll = r();
    let kind = roll < 0.58 ? Math.floor(r() * 3) : roll < 0.7 ? 3 : roll < 0.8 ? 4 : 5;
    if (!STONE_ENABLED && (kind === 3 || kind === 4)) kind = Math.floor(r() * 3); // no rocks: a tree instead
    trees.push({ x, y, kind, cd: 0, left: 0, hits: 0, regrow: 0 });
  }
  // [dungeon hook, Code 2] keep the cave entrance clear (filtered afterwards so the seeded layout stays the same)
  const ent = entranceOf(seed);
  // (Lead 2026-11-15: every node at least 2 tiles (96 px) clear of the cave mouth, so the entrance reads)
  if (DUNGEON_ENABLED) for (let i = trees.length - 1; i >= 0; i--) if (Math.hypot(trees[i].x - ent.x, trees[i].y - ent.y) < 140) trees.splice(i, 1);
  // every map gets ~8 berry bushes and enough stone: turn trees (from the end of the list) into them
  const count = (f: (k: number) => boolean) => trees.filter((t) => f(t.kind)).length;
  for (let i = trees.length - 1; i >= 0; i--) {
    if (trees[i].kind >= 3) continue;
    if (count((k) => k === 5) < BUSH_MIN) trees[i].kind = 5;
    else if (STONE_ENABLED && count((k) => k === 3 || k === 4) < 5) trees[i].kind = 3;
    else break;
  }
  // the water corner: a rich patch (more stone and berries), reachable over the bridge
  const e = rng(seed * 31 + 7);
  const a = wl.area;
  let n = 0;
  for (let tries2 = 0; BUILDING_ENABLED && n < CORNER_NODES && tries2 < 600; tries2++) {
    const x = a.x0 + 40 + e() * (a.x1 - a.x0 - 80), y = a.y0 + 40 + e() * (a.y1 - a.y0 - 80);
    if (Math.hypot(x - wl.bridge.x, y - wl.bridge.y) < 110) continue; // keep the bridge landing clear
    if (trees.some((t) => Math.hypot(t.x - x, t.y - y) < 110)) continue;
    const roll = e();
    let kind = roll < 0.3 ? Math.floor(e() * 3) : roll < 0.5 ? 3 : roll < 0.7 ? 4 : 5;
    if (!STONE_ENABLED && (kind === 3 || kind === 4)) kind = roll < 0.6 ? 5 : 0;
    trees.push({ x, y, kind, cd: 0, left: 0, hits: 0, regrow: 0 });
    n++;
  }
  for (const t of trees) t.left = NODE_YIELD[t.kind];
  return trees;
}

// ---- biomes: the same loop on a green meadow or a snowy one with slippery frozen ponds ----
export type Biome = 'meadow' | 'snow';
export const BIOMES: Biome[] = ['meadow', 'snow'];
/** Archived (Stefan 2026-11-14): the snow map code and art stay, but the game only offers the meadow. */
export const SNOW_MAP_ENABLED = false;
export const cleanBiome = (b: unknown): Biome => (SNOW_MAP_ENABLED && b === 'snow' ? 'snow' : 'meadow');
export const ICE_RX = 64, ICE_RY = 34; // frozen pond ellipse (world px)
const ICE_DRAG = 0.55; // on ice: long glide ...
const ICE_GRIP = 0.4; // ... and little grip
/** Frozen ponds on the snow map: 3 spots clear of nodes, the base, build spots, puzzles, the dungeon cave and the water corner. */
export function makeIce(seed: number): { x: number; y: number }[] {
  const r = rng(seed * 43 + 19);
  const trees = makeTrees(seed);
  const zones = [...makePuzzles(seed).map((p) => p.zone)];
  const w = makeWater(seed);
  if (BUILDING_ENABLED) zones.push(w.area, ...w.water);
  const pads = [...(BUILDING_ENABLED ? [...Object.values(BUILD_SPOTS), COTTAGE_PAD] : []), entranceOf(seed)];
  const out: { x: number; y: number }[] = [];
  for (let tries = 0; out.length < 3 && tries < 3000; tries++) {
    const x = 90 + r() * (WORLD_W - 180), y = 70 + r() * (WORLD_H - 140);
    if (Math.hypot(x - BASE.x, y - BASE.y) < BASE.r + BUILD_RING + 30) continue;
    if (trees.some((t) => Math.hypot((t.x - x) / (ICE_RX + 16), (t.y - y) / (ICE_RY + 16)) < 1)) continue;
    if (zones.some((z) => inRect(z, x, y, ICE_RX + 10))) continue;
    if (pads.some((p) => Math.hypot(p.x - x, p.y - y) < ICE_RX + 50)) continue;
    if (out.some((o) => Math.hypot(o.x - x, o.y - y) < 200)) continue;
    out.push({ x, y });
  }
  return out;
}
export const onIce = (ice: { x: number; y: number }[], x: number, y: number) => ice.some((i) => ((x - i.x) / ICE_RX) ** 2 + ((y - i.y) / ICE_RY) ** 2 < 1);

export function createState(infos: PlayerInfo[], seed: number, village: Village = newVillage(), biome: Biome = 'meadow'): State {
  const trees = makeTrees(seed);
  const layout = makePuzzles(seed);
  const needs = puzzleNeeds(infos.length);
  const vil = BUILDING_ENABLED ? cleanVillage(village) : newVillage();
  const water = makeWater(seed);
  const s: State = {
    phase: 'play', time: ROUND_SECONDS,
    mini: null, miniResult: null,
    seed, biome: cleanBiome(biome), ice: cleanBiome(biome) === 'snow' ? makeIce(seed) : [], entrance: entranceOf(seed), mode: 'meadow', entry: 0, picks: {}, pickT: 0, runs: 0, dg: null,
    bank: { ...vil.bank }, dungeon: vil.dungeon ?? 1, delivered: res(), quest: questTargets(infos.length, vil.cottage),
    builds: BUILD_KINDS.map((kind) => ({ kind, state: vil.builds[kind] ? 2 : 0, paid: res(), buy: 0, armed: true })),
    cottage: { level: vil.cottage, state: 0, paid: res(), buy: 0, armed: true }, water,
    builtNow: [], villageDirty: false, gardenT: GARDEN_EVERY,
    players: [], items: [], gems: [], powers: [], trees,
    layout, puzzles: layout.map((_, i) => ({ need: needs[i], mask: 0, open: false, taken: false })),
    buildLock: 0,
    fx: [], nextId: 1,
    gemT: 8, powerT: 10,
  };
  infos.forEach((p, i) => addPlayer(s, p, i));
  return s;
}

/** Village spawn (Stefan 2026-11-15): a row on open ground just SOUTH of the main building, never on it. The building
 *  stands on BASE.y + 30; the flag (BASE + 58, foot at + 62) and the delivery pile (BASE + 52, 40) end above the row
 *  (a blob is about 40 px tall). The host stands in the middle, the others alternate left / right, 48 px apart. */
export const SPAWN_Y = BASE.y + 108;
const SPAWN_DX = [0, -48, 48, -96, 96];
export const spawnSpot = (slot: number) => ({ x: BASE.x + SPAWN_DX[((slot % MAX_PLAYERS) + MAX_PLAYERS) % MAX_PLAYERS], y: SPAWN_Y });

export function addPlayer(s: State, p: PlayerInfo, slot = s.players.length) {
  if (s.players.some((q) => q.id === p.id) || s.players.length >= MAX_PLAYERS) return;
  // a late joiner during a dungeon run appears at the floor's start (the host creates their hero)
  const home = s.mode === 'dungeon' && s.dg ? s.dg.map.start : spawnSpot(slot);
  s.players.push({
    ...p, x: home.x, y: home.y, vx: 0, vy: 0,
    carry: [], shield: 0, shieldT: 0, dashCd: 0, dashT: 0, boostT: 0, magnetT: 0, toolCd: 0, lastDash: 0,
  });
}

export function removePlayer(s: State, id: string) {
  s.players = s.players.filter((p) => p.id !== id);
}

function freeSpot(s: State, minBase = 60): { x: number; y: number } {
  for (let i = 0; i < 60; i++) {
    const x = 50 + Math.random() * (MAIN_W - 100);
    const y = 60 + Math.random() * (WORLD_H - 110);
    if (nearBase(x, y, minBase)) continue;
    if (s.trees.some((t) => Math.hypot(t.x - x, t.y - y) < 34)) continue;
    if (s.layout.some((l) => inRect(l.zone, x, y, 20))) continue;
    if ([...Object.values(BUILD_SPOTS), COTTAGE_PAD].some((p) => Math.hypot(p.x - x, p.y - y) < BUILD_R + 40)) continue;
    if (DUNGEON_ENABLED && Math.hypot(s.entrance.x - x, s.entrance.y - y) < ENTRANCE_R + 40) continue; // [dungeon hook]
    if (BUILDING_ENABLED && [s.water.area, ...s.water.water].some((r) => inRect(r, x, y, 30))) continue;
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

/** Add resources to the bank and the quest tally (the well doubles delivered berries). */
function award(s: State, x: number, y: number, r: Res) {
  const got = res(r.wood, r.stone, r.berry * (built(s, 'well') ? 2 : 1));
  for (const k of RES) { s.bank[k] += got[k]; s.delivered[k] += got[k]; }
  s.villageDirty = true; // the bank is part of the saved village
  s.fx.push({ t: 'gain', x, y, r: got });
}

/** One tool hit on node i by player p. Every NODE_HITS hits pops one item out towards the blob. */
function hitNode(s: State, p: Player, i: number) {
  const t = s.trees[i];
  const tool = nodeTool(t.kind);
  t.hits++;
  let drop = false;
  // workshop: better tools, one hit less per resource
  if (t.hits >= Math.max(1, NODE_HITS[t.kind] - (built(s, 'workshop') ? 1 : 0))) {
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

/** A blob picks its weapon on the pick screen (host applies its own and the joiners' messages). */
export function pickWeapon(s: State, id: string, w: string) {
  // [dungeon hook] level-up cards and loot votes travel the same way: 'skill:<id>', 'loot:roll', 'loot:pass'
  if (s.mode === 'dungeon' && s.dg && /^(skill|loot):/.test(w)) { dungeonChoice(s.dg, id, w, s.fx as DFx[]); return; }
  if (s.mode === 'pick' && (WEAPONS as string[]).includes(w) && s.players.some((p) => p.id === id)) s.picks[id] = w as Weapon;
}

function enterDungeon(s: State) {
  for (const p of s.players) s.picks[p.id] ??= 'dagger'; // [dungeon hook] unpicked = Rogue with two daggers
  s.runs++;
  s.dg = newRun(s.seed * 7919 + s.runs * 104729, s.picks, s.dungeon);
  s.mode = 'dungeon';
  for (const p of s.players) { p.x = s.dg.map.start.x + (Math.random() - 0.5) * 30; p.y = s.dg.map.start.y + (Math.random() - 0.5) * 30; p.vx = 0; p.vy = 0; p.carry = []; }
  s.fx.push({ t: 'floor', floor: 1 });
}

function leaveDungeon(s: State) {
  const done = !!s.dg && s.dg.done !== 0;
  // [dungeon hook] the boss of the last floor beaten: the entrance leads to the next dungeon (saved with the village)
  if (s.dg?.why === 'boss' && s.dg.dungeon >= s.dungeon) { s.dungeon = Math.min(99, s.dg.dungeon + 1); s.villageDirty = true; }
  s.mode = 'meadow'; s.dg = null; s.entry = 0; s.picks = {};
  s.players.forEach((p, i) => { p.x = s.entrance.x - 40 + i * 20; p.y = s.entrance.y + 70; p.vx = 0; p.vy = 0; });
  s.fx.push({ t: 'leave', done });
}

/** Sunset: everyone into the Bärregn field. */
function startMini(s: State) {
  s.phase = 'mini';
  s.mini = newMini(s.players.length);
  const cx = (ARENA.x0 + ARENA.x1) / 2, cy = (ARENA.y0 + ARENA.y1) / 2;
  s.players.forEach((p, i) => Object.assign(p, { x: cx + (i - (s.players.length - 1) / 2) * 50, y: cy, vx: 0, vy: 0, dashT: 0 }));
  s.fx.push({ t: 'minigame' });
}

/** End Bärregn (time up, or the host skipped): caught berries go into the village bank. */
export function finishMini(s: State) {
  if (s.phase !== 'mini' || !s.mini) return;
  const caught = s.mini.caught, stars = miniStars(s.mini);
  s.bank.berry += caught;
  s.villageDirty = true;
  s.miniResult = { caught, stars };
  s.mini = null;
  s.phase = 'end';
  s.fx.push({ t: 'minidone', caught, stars });
}

function stepMiniPhase(s: State, inputs: Map<string, Input>, dt: number) {
  const m = s.mini!;
  for (const p of s.players) {
    const inp = inputs.get(p.id) ?? { x: 0, y: 0, dash: p.lastDash };
    const stunned = !!m.stun[p.id];
    let ix = stunned ? 0 : inp.x, iy = stunned ? 0 : inp.y;
    const il = Math.hypot(ix, iy);
    if (il > 1) { ix /= il; iy /= il; }
    p.vx += ix * ACCEL * dt; p.vy += iy * ACCEL * dt;
    const drag = Math.exp(-(stunned ? 6 : DRAG) * dt);
    p.vx *= drag; p.vy *= drag;
    p.dashCd = Math.max(0, p.dashCd - dt); p.dashT = Math.max(0, p.dashT - dt);
    if (inp.dash !== p.lastDash) {
      p.lastDash = inp.dash;
      if (!stunned && p.dashCd <= 0) {
        let dx = il > 0.2 ? ix : p.vx, dy = il > 0.2 ? iy : p.vy;
        const dl = Math.hypot(dx, dy) || 1;
        if (dx === 0 && dy === 0) dy = -1;
        p.vx += (dx / dl) * DASH_IMPULSE; p.vy += (dy / dl) * DASH_IMPULSE;
        p.dashCd = DASH_COOLDOWN; p.dashT = 0.3;
      }
    }
    clampSpeed(p, 1);
    p.x += p.vx * dt; p.y += p.vy * dt;
    keepInArena(p);
  }
  if (stepMini(m, s.players, dt, s.fx as MiniFx[])) finishMini(s);
}

export function step(s: State, inputs: Map<string, Input>, dt: number) {
  if (s.phase === 'mini') { stepMiniPhase(s, inputs, dt); return; }
  if (s.phase !== 'play') return;
  if (s.mode === 'pick') {
    // weapon cards on every phone; go down when all picked (or after PICK_SECONDS)
    if (PICK_TIMER_ENABLED) s.pickT -= dt;
    if (s.players.every((p) => s.picks[p.id]) || (PICK_TIMER_ENABLED && s.pickT <= 0)) enterDungeon(s);
    return;
  }
  const inDungeon = s.mode === 'dungeon';
  if (!inDungeon && DAY_CYCLE_ENABLED) s.time = Math.max(0, s.time - dt); // the sun waits while the team is underground
  s.buildLock = Math.max(0, s.buildLock - dt);
  // former totem effects now come from buildings: workshop boots (+10% speed), storage reach (+10 px pickup)
  const speedMul = built(s, 'workshop') ? 1.1 : 1;
  const pickR = PICKUP_R + (built(s, 'storage') ? 10 : 0);
  const carryMax = CARRY_MAX + (built(s, 'storage') ? 1 : 0) + (s.cottage.level >= 2 ? 1 : 0);

  // --- players: glide physics ---
  for (const p of s.players) {
    const inp = inputs.get(p.id) ?? { x: 0, y: 0, dash: p.lastDash };
    let ix = inp.x, iy = inp.y;
    const il = Math.hypot(ix, iy);
    if (il > 1) { ix /= il; iy /= il; }
    const mul = speedMul;
    const ice = s.mode === 'meadow' && s.ice.length > 0 && onIce(s.ice, p.x, p.y); // frozen pond: slippery
    p.vx += ix * ACCEL * mul * (ice ? ICE_GRIP : 1) * dt;
    p.vy += iy * ACCEL * mul * (ice ? ICE_GRIP : 1) * dt;
    const drag = Math.exp(-(ice ? ICE_DRAG : DRAG) * dt);
    p.vx *= drag; p.vy *= drag;
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.dashT = Math.max(0, p.dashT - dt);
    p.boostT = Math.max(0, p.boostT - dt);
    p.magnetT = Math.max(0, p.magnetT - dt);
    p.toolCd = Math.max(0, p.toolCd - dt);
    if (inp.dash !== p.lastDash) {
      p.lastDash = inp.dash;
      // contextual action: a node in reach gets the right tool, otherwise dash
      const node = inDungeon ? -1 : toolNode(s.trees, (i) => s.trees[i].left, p.x, p.y);
      if (node >= 0) {
        if (p.toolCd <= 0) { hitNode(s, p, node); p.toolCd = TOOL_COOLDOWN; }
      } else if (!inDungeon && p.dashCd <= 0) { // dungeon hook (Code 2): underground the small button is a class move (dungeon.ts)
        let dx = il > 0.2 ? ix : p.vx, dy = il > 0.2 ? iy : p.vy;
        const dl = Math.hypot(dx, dy) || 1;
        dx /= dl; dy /= dl;
        if (dx === 0 && dy === 0) dy = -1;
        p.vx += dx * DASH_IMPULSE; p.vy += dy * DASH_IMPULSE;
        p.dashCd = DASH_COOLDOWN; p.dashT = 0.3;
      }
    }
    clampSpeed(p, mul);
    p.x += p.vx * dt; p.y += p.vy * dt;
    // world edges: soft bounce (the dungeon has its own walls: rooms are taller than the meadow) [dungeon hook (Code 2)]
    if (inDungeon) continue;
    if (p.x < BLOB_R) { p.x = BLOB_R; p.vx = Math.abs(p.vx) * 0.6; }
    if (p.x > WORLD_W - BLOB_R) { p.x = WORLD_W - BLOB_R; p.vx = -Math.abs(p.vx) * 0.6; }
    if (p.y < BLOB_R) { p.y = BLOB_R; p.vy = Math.abs(p.vy) * 0.6; }
    if (p.y > WORLD_H - BLOB_R) { p.y = WORLD_H - BLOB_R; p.vy = -Math.abs(p.vy) * 0.6; }
  }

  if (inDungeon && s.dg) {
    const atk = new Map<string, number>();
    for (const [id, inp] of inputs) if (inp.atk !== undefined) atk.set(id, inp.atk);
    if (stepDungeon(s.dg, s.players, atk, s.seed * 7919 + s.runs * 104729, dt, s.fx as DFx[]) === 'out') leaveDungeon(s);
    return;
  }

  // --- dungeon entrance: everyone on it for 1.5 s ---
  if (DUNGEON_ENABLED && s.players.length && s.players.every((p) => onEntrance(s.entrance, p.x, p.y))) {
    s.entry += dt;
    if (s.entry >= READY_SECONDS) { s.entry = 0; s.mode = 'pick'; s.picks = {}; s.pickT = PICK_SECONDS; s.fx.push({ t: 'enter' }); return; }
  } else s.entry = 0;

  // --- nodes: solid; used-up nodes regrow ---
  for (const t of s.trees) {
    t.cd = Math.max(0, t.cd - dt);
    // garden: berry bushes regrow 2x; cottage level 3: everything regrows 25% faster
    if (t.left <= 0) { t.regrow -= dt * (t.kind === 5 && built(s, 'garden') ? 2 : 1) * (s.cottage.level >= 3 ? 1.25 : 1); if (t.regrow <= 0) { t.left = NODE_YIELD[t.kind]; t.hits = 0; t.regrow = 0; } }
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

  // --- river: solid until the bridge is built ---
  // --- the water corner: solid water until the bridge is built ---
  const water = BUILDING_ENABLED ? (built(s, 'bridge') ? s.water.withBridge : s.water.water) : [];
  for (const p of s.players) for (const b of water) collideBox(p, b);

  // --- fences + closed gates: solid boxes ---
  s.layout.forEach((l, i) => {
    const boxes = s.puzzles[i].open ? l.walls : [...l.walls, l.gate];
    for (const p of s.players) for (const b of boxes) collideBox(p, b);
  });

  // --- buildings: their base (the walls at ground level) is solid; blobz walk round it and behind the roof ---
  for (const b of solidBoxes(s)) for (const p of s.players) collideBox(p, b);

  // --- blob vs blob: bouncy bumps (not on the portal ring: gathering there must not shove anyone off) ---
  for (let i = 0; i < s.players.length; i++) {
    for (let j = i + 1; j < s.players.length; j++) {
      const a = s.players[i], b = s.players[j];
      if (DUNGEON_ENABLED && onEntrance(s.entrance, a.x, a.y) && onEntrance(s.entrance, b.x, b.y)) continue;
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
        if (d < MAGNET_R && d > 1 && p.carry.length < carryMax) { it.x += (dx / d) * 260 * dt; it.y += (dy / d) * 260 * dt; }
      }
    }
    if (p.carry.length < carryMax) {
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
    g.x = Math.min(MAIN_W - GEM_R, Math.max(GEM_R, g.x + g.vx * dt));
    g.y = Math.min(WORLD_H - GEM_R, Math.max(GEM_R, g.y + g.vy * dt));
    if (nearBase(g.x, g.y, -20)) {
      award(s, g.x, g.y - 30, res(GEM_BUNDLE, GEM_BUNDLE, GEM_BUNDLE));
      s.gems.splice(gi, 1);
      s.gemT = 6;
    }
  }

  if (BUILDING_ENABLED) stepBuilding(s, dt);

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

  const over = DAY_CYCLE_ENABLED ? s.time <= 0 : questDone(s.delivered, s.quest); // sunset, or the quest is complete
  if (over) { if (MINI_ENABLED && s.players.length) startMini(s); else s.phase = 'end'; }
}

/** A player taps a card in the build panel at the cottage. Host-authoritative: needs the price in the bank,
 *  not built yet, the player at home, and no other build in the last BUILD_LOCK seconds. Returns success. */
export function requestBuild(s: State, playerId: string, kind: BuildKind | 'cottage'): boolean {
  if (!BUILDING_ENABLED || s.phase !== 'play' || s.mode !== 'meadow' || s.buildLock > 0) return false;
  const p = s.players.find((q) => q.id === playerId);
  if (!p || !atHome(p.x, p.y)) return false;
  const cost = kind === 'cottage' ? (s.cottage.level >= COTTAGE_MAX ? null : COTTAGE_COST[s.cottage.level - 1])
    : s.builds.find((b) => b.kind === kind)?.state === 2 ? null : BUILD_COST[kind as BuildKind];
  if (!cost || !canAfford(s.bank, cost)) return false;
  for (const k of RES) s.bank[k] -= cost[k];
  if (kind === 'cottage') {
    s.cottage.level++;
    s.quest = questTargets(s.players.length, s.cottage.level);
  } else {
    const b = s.builds.find((x) => x.kind === kind);
    if (!b) return false;
    b.state = 2; s.builtNow.push(kind);
  }
  s.buildLock = BUILD_LOCK;
  s.villageDirty = true;
  const at = kind === 'cottage' ? { x: BASE.x, y: BASE.y } : kind === 'bridge' ? s.water.bridge : BUILD_SPOTS[kind];
  s.fx.push({ t: 'build', x: at.x, y: at.y, kind, done: true });
  return true;
}
/** "At home": on the cottage yard; the build panel (hammer button) is offered here. */
export const HOME_R = 110;
export const atHome = (x: number, y: number) => Math.hypot(x - BASE.x, y - BASE.y) < HOME_R;

function stepBuilding(s: State, dt: number) {
  // garden: a small farm patch beside it grows berries (max 3 waiting)
  if (built(s, 'garden')) {
    s.gardenT -= dt;
    const g = BUILD_SPOTS.garden;
    if (s.gardenT <= 0) {
      s.gardenT = GARDEN_EVERY;
      if (s.items.filter((it) => Math.hypot(it.x - g.x, it.y - (g.y + 46)) < 70).length < 3) {
        s.items.push({ id: s.nextId++, kind: 'berry', x: g.x - 30 + Math.random() * 60, y: g.y + 36 + Math.random() * 24 });
      }
    }
  }
}

/** The village to save (host): buildings, cottage level and the bank. The quest resets each round. */
export function villageOf(s: State): Village {
  return {
    v: 2, cottage: s.cottage.level, bank: { ...s.bank }, dungeon: s.dungeon,
    builds: Object.fromEntries(s.builds.map((b) => [b.kind, b.state === 2])) as Village['builds'],
  };
}

/** Building footprints (Stefan 2026-11-15): the bottom third of each picture (Ninja art at 3x, 80% of its width) is
 *  solid, so blobz walk round the walls at ground level and still pass behind roofs (the world is y-sorted). Art sizes
 *  in art px, matching the crops in game.ts. The garden is flat soil plots (no walls) and the bridge is the river
 *  crossing, so neither is solid. */
const FOOT_ART: Record<string, [number, number]> = {
  'cottage-1': [42, 39], 'cottage-2': [64, 48], 'cottage-3': [64, 112],
  storage: [32, 32], workshop: [48, 48], well: [16, 21], watchtower: [24, 32],
};
const footBox = (cx: number, footY: number, [w, h]: [number, number]): Rect =>
  ({ x0: cx - w * 1.2, x1: cx + w * 1.2, y0: footY - h, y1: footY }); // 3x art: half of 80% width = 1.2 w, a third of 3h = h
/** Portal (N-28, 64x48 at 3x, bottom at entrance.y + 30): the two stone pillars beside the doorway, art columns 0-22 and
 *  42-64, rows 30-41 (ground level). The doorway between them (and the steps in front) stays open. */
const portalBoxes = (e: { x: number; y: number }): Rect[] => [
  { x0: e.x - 90, x1: e.x - 33, y0: e.y - 24, y1: e.y + 9 },
  { x0: e.x + 33, x1: e.x + 90, y0: e.y - 24, y1: e.y + 9 },
];
export function solidBoxes(s: Pick<State, 'cottage' | 'builds' | 'entrance' | 'mode'>): Rect[] {
  const out: Rect[] = [footBox(BASE.x, BASE.y + 30, FOOT_ART['cottage-' + Math.max(1, Math.min(3, s.cottage.level))])];
  if (BUILDING_ENABLED) for (const k of BUILD_KINDS) {
    const art = FOOT_ART[k];
    if (art && built(s, k)) out.push(footBox(BUILD_SPOTS[k].x, BUILD_SPOTS[k].y - BUILD_R + 4, art));
  }
  if (DUNGEON_ENABLED) out.push(...portalBoxes(s.entrance));
  return out;
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
  mn?: [number, number, [number, number, number], [number, number, number, number, number][], string[]]; // Bärregn: t, caught, goal, drops [id, bomb?, x, y, z], stunned ids
  mr?: [number, number]; // Bärregn result: caught, stars
  r: number[]; // bank w,s,b, delivered w,s,b, quest w,s,b
  n: string; // items left per node, one digit each
  p: [string, number, number, number, number, string, number, number, number, number?][]; // id,x,y,vx,vy,carry,boost,magnet,dashCd,shield
  i: [number, string, number, number][];
  g: [number, number, number, number][];
  w: [number, string, number, number][];
  z: [number, number, number, number][]; // puzzles: need, plate mask, open, chest taken
  bd: [number, number, number, number, number][]; // builds (BUILD_KINDS order) then cottage: state|level, paid w,s,b, buy%
  cs: number; // cottage: 0 idle, 1 upgrading
  md?: number; en?: number; pk?: string[]; pt?: number; // mode (MODES index), entrance ready %, picked blobz, pick seconds left
  dg?: DSnap;
  bn: string; // buildings finished this round (comma list)
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
    mn: s.mini ? [r1(s.mini.t), s.mini.caught, s.mini.goal, s.mini.drops.map((d) => [d.id, d.kind === 'bomb' ? 1 : 0, r1(d.x), r1(d.y), r1(d.z)]), Object.keys(s.mini.stun)] : undefined,
    mr: s.miniResult ? [s.miniResult.caught, s.miniResult.stars] : undefined,
    r: [...resArr(s.bank), ...resArr(s.delivered), ...resArr(s.quest)],
    n: s.trees.map((t) => Math.max(0, Math.min(9, t.left))).join(''),
    p: s.players.map((p) => [p.id, r1(p.x), r1(p.y), r1(p.vx), r1(p.vy), p.carry.map((k) => KIND_CODE[k]).join(''), r1(p.boostT), r1(p.magnetT), r1(p.dashCd), p.shield]),
    i: s.items.map((i) => [i.id, KIND_CODE[i.kind], r1(i.x), r1(i.y)]),
    g: s.gems.map((g) => [g.id, r1(g.x), r1(g.y), g.holders]),
    w: s.powers.map((w) => [w.id, w.kind, r1(w.x), r1(w.y)]),
    z: s.puzzles.map((z) => [z.need, z.mask, +z.open, +z.taken]),
    bd: [...s.builds.map((b) => [b.state, ...resArr(b.paid), Math.round(b.buy * 100)] as [number, number, number, number, number]),
      [s.cottage.level, ...resArr(s.cottage.paid), Math.round(s.cottage.buy * 100)] as [number, number, number, number, number]],
    cs: s.cottage.state, bn: s.builtNow.join(','),
    md: MODES.indexOf(s.mode), en: Math.round((s.entry / READY_SECONDS) * 100), pk: Object.keys(s.picks), pt: Math.ceil(s.pickT),
    dg: s.dg ? dsnap(s.dg, s.seed * 7919 + s.runs * 104729) : undefined,
    fx: s.fx,
  };
}

/** View model shared by host (from State) and clients (from Snapshot). */
export interface View {
  phase: State['phase']; time: number;
  mini: { t: number; caught: number; goal: [number, number, number]; drops: { id: number; kind: 'berry' | 'bomb'; x: number; y: number; z: number }[]; stunned: string[] } | null;
  miniResult: { caught: number; stars: number } | null;
  bank: Res; delivered: Res; quest: Res;
  nodes: number[]; // items left per node (same order as makeTrees)
  players: { id: string; x: number; y: number; vx: number; vy: number; carry: ItemKind[]; boostT: number; magnetT: number; dashCd: number; shield: number }[];
  items: Item[]; gems: { id: number; x: number; y: number; holders: number }[]; powers: Power[];
  puzzles: Puzzle[];
  builds: { kind: BuildKind; state: 0 | 1 | 2; paid: Res; buy: number }[];
  cottage: { level: number; state: 0 | 1; paid: Res; buy: number };
  builtNow: BuildKind[];
  mode: Mode; entry: number; picked: string[]; pickT: number;
  dungeon: DView | null;
}

export function viewFromState(s: State): View {
  return {
    phase: s.phase, time: s.time,
    mini: s.mini ? { t: s.mini.t, caught: s.mini.caught, goal: s.mini.goal, drops: s.mini.drops, stunned: Object.keys(s.mini.stun) } : null,
    miniResult: s.miniResult,
    bank: s.bank, delivered: s.delivered, quest: s.quest,
    nodes: s.trees.map((t) => t.left),
    players: s.players.map((p) => ({ id: p.id, x: p.x, y: p.y, vx: p.vx, vy: p.vy, carry: p.carry, boostT: p.boostT, magnetT: p.magnetT, dashCd: p.dashCd, shield: p.shield })),
    items: s.items, gems: s.gems, powers: s.powers, puzzles: s.puzzles,
    builds: s.builds, cottage: s.cottage, builtNow: s.builtNow,
    mode: s.mode, entry: s.entry / READY_SECONDS, picked: Object.keys(s.picks), pickT: s.pickT,
    dungeon: s.dg ? dview(dsnap(s.dg, s.seed * 7919 + s.runs * 104729)) : null,
  };
}

export function viewFromSnapshot(n: Snapshot): View {
  return {
    phase: n.ph, time: n.tm,
    mini: n.mn ? { t: n.mn[0], caught: n.mn[1], goal: n.mn[2], drops: n.mn[3].map(([id, b, x, y, z]) => ({ id, kind: b ? 'bomb' as const : 'berry' as const, x, y, z })), stunned: n.mn[4] } : null,
    miniResult: n.mr ? { caught: n.mr[0], stars: n.mr[1] } : null,
    bank: arrRes(n.r, 0), delivered: arrRes(n.r, 3), quest: arrRes(n.r, 6),
    nodes: [...(n.n ?? '')].map(Number),
    players: n.p.map(([id, x, y, vx, vy, c, b, m, d, sh]) => ({ id, x, y, vx, vy, carry: c.split('').filter(Boolean).map((k) => CODE_KIND[k]), boostT: b, magnetT: m, dashCd: d, shield: sh ?? 0 })),
    items: n.i.map(([id, k, x, y]) => ({ id, kind: CODE_KIND[k], x, y })),
    gems: n.g.map(([id, x, y, h]) => ({ id, x, y, holders: h })),
    powers: n.w.map(([id, k, x, y]) => ({ id, kind: k as PowerKind, x, y })),
    puzzles: (n.z ?? []).map(([need, mask, open, taken]) => ({ need, mask, open: !!open, taken: !!taken })),
    builds: BUILD_KINDS.map((kind, i) => {
      const b = n.bd?.[i] ?? [0, 0, 0, 0, 0];
      return { kind, state: (b[0] === 2 ? 2 : b[0] === 1 ? 1 : 0) as 0 | 1 | 2, paid: res(b[1], b[2], b[3]), buy: b[4] / 100 };
    }),
    cottage: (() => { const c = n.bd?.[BUILD_KINDS.length] ?? [1, 0, 0, 0, 0]; return { level: c[0] || 1, state: (n.cs ? 1 : 0) as 0 | 1, paid: res(c[1], c[2], c[3]), buy: c[4] / 100 }; })(),
    mode: MODES[n.md ?? 0] ?? 'meadow', entry: (n.en ?? 0) / 100, picked: n.pk ?? [], pickT: n.pt ?? 0,
    dungeon: n.dg ? dview(n.dg) : null,
    builtNow: (n.bn ?? '').split(',').filter((k): k is BuildKind => (BUILD_KINDS as string[]).includes(k)),
  };
}
