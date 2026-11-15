// Phaser scene: renders a View (from the host sim or from network snapshots).
import Phaser from 'phaser';
import { blobCanvas, BLOB_FRAMES, BODY_CY, clampLook, facingFromVelocity, GRID_H, GRID_W, type Facing } from './blob';
import { sfx } from './sfx';
import { dungeonFrame } from './dungeonScene'; // [dungeon hook]
import { BASE, GATE_W, makePuzzles, makeTrees, PLATE_R, rng, WORLD_H, WORLD_W } from './sim';
import { isSolid, RES } from './sim';
import { affordable, BUILDING_ENABLED, BUILD_KINDS, BUILD_R, BUILD_SPOTS, COTTAGE_PAD, makeWater, nodeRes } from './sim';
import type { Biome, BuildKind } from './sim';
import { DUNGEON_ENABLED, entranceOf, ICE_RX, ICE_RY, makeIce, WATER_TILE } from './sim';
import { autotileMask, waterTiles, type Shore } from './water';
import { cavePath } from './cavePath';
import { RES_ART } from './resArt';
import { ARENA, BOMB_R, DROP_HEIGHT } from './mini';
import type { PuzzleLayout, Res, Tool } from './sim';
import type { FxEvent, Input, ItemKind, PlayerInfo, View } from './sim';

export interface Session {
  role: 'host' | 'client';
  myId: string;
  seed: number;
  biome?: Biome; // 'meadow' (default) or 'snow'
  infos(): Map<string, PlayerInfo>;
  tick(dt: number, input: Input): void;
  view(): View | null;
  drainFx(): FxEvent[];
  readInput(): Input;
}

const T = 32; // rendered tile size (16px tiles at 2x)
const ITEM_ICON: Record<ItemKind, string> = { wood: 'ic-log', stone: 'g-item-stone', berry: 'g-item-berries' };
/** Ground/carry scale per item so all three read the same size (log is a 16px icon, the others fine pixels). */
// Pixel density (ART_REVIEW.md): integer scales only. World props 3 world px per art pixel, small
// 16px icons 2 (items) / 1 (carried, tags); the camera zoom does the rest. Blobz keep BLOB_SCALE.
// Fine art (public/art/fine, README there): items, chips, dust, level-up and plate glow are redrawn with twice the
// pixels to match the blobz, so they are drawn at HALF the old scale.
// Ninja items are 16 px: 2x on the ground, 1x carried over the head
const ITEM_SCALE: Record<ItemKind, number> = { wood: 2, stone: 2, berry: 2 };
const CARRY_SCALE: Record<ItemKind, number> = { wood: 1, stone: 1, berry: 1 };
// Obstacles (sim kinds 0-4) and decor from ChatGPT order 30 (public/art/props)
const OBSTACLE_ART: [string, number][] = [['pr-tree-green', 3], ['pr-tree-orange', 3], ['pr-tree-pine', 3], ['pr-rock', 3], ['pr-boulder', 3], ['g-bush-berries', 3]];
/** Snow map: Art's winter props (art/props-winter), integer scales. Kinds without winter art yet use a
 *  cold-tinted meadow sprite; a dedicated file is picked up automatically once it exists (WINTER_WANTED). */
const WINTER_ART: [string, number][] = [['w-tree-snow-round', 2], ['w-tree-snow-pine', 2], ['w-tree-snow-small', 2], ['w-rock-snow', 2], ['w-ice-rock', 2], ['w-bush-berries-snow', 2]];
const WINTER_SPENT: [string, number][] = [['w-stump-snow', 2], ['w-stump-snow', 2], ['w-stump-snow', 2], ['w-rubble-snow', 2], ['w-rubble-snow', 2], ['w-bush-empty-snow', 2]];
/** Winter files Art has not drawn yet and their tinted stand-ins (key -> [placeholder, tint]). */
const WINTER_WANTED: Record<string, [string, number]> = {
  'w-stump-snow': ['pr-stump', 0xe8f2ff], 'w-rubble-snow': ['g-rubble', 0xe8f2ff],
};
const WINTER = ['tree-snow-round', 'tree-snow-pine', 'tree-snow-small', 'rock-snow', 'ice-rock', 'bush-berries-snow', 'bush-empty-snow', 'snowman', 'igloo', 'ice', 'tree-bare', ...Object.keys(WINTER_WANTED).map((k) => k.slice(2))];

/** Look of a used-up node: stump, rubble, picked bush. */
const SPENT_ART: [string, number][] = [['pr-stump', 3], ['pr-stump', 3], ['pr-stump', 3], ['g-rubble', 3], ['g-rubble', 3], ['g-bush-empty', 3]];
/** Ninja Adventure art for the meadow + snow world (docs/ART_MAP.md 3-6, 11): the old texture keys are rebuilt from
 *  crops of the Ninja sheets, so the game code keeps its keys. A crop is [sheet, x, y, w, h]; a list is laid side by
 *  side. Sheets 'n-*' are Ninja tilesets, 'nx-*' single Ninja item files (or Art's Ninja-style berry bush). */
type Crop = [string, number, number, number, number];
/** The three tree kinds (sim kinds 0-2), one crop each: easy to swap after Stefan's pick. */
/** A mined-out stone node: a little heap of grey pebbles (Nature 272,272: two small rocks), NOT the stump-like rock
 *  at 288,144 (Stefan: "stone shows a tree stump"). One line to swap after Art's options sheet. */
const RUBBLE_ART: Crop = ['n-nature', 272, 272, 32, 16];
/** At most this many blossom trees per map (they read as pink pillows in a crowd). */
const BLOSSOM_MAX = 2;
/** Meadow declutter: at most this many groves, at least ~3 grove widths (3 x 192 px) apart; no wild wheat tufts. */
const GROVE_MAX = 0, GROVE_GAP = 520, WILD_PATCHES = false; // groves removed (Stefan 2026-11-15): only single trees
const TREE_ART: Crop[] = [['n-nature', 96, 128, 32, 32], ['n-nature', 96, 128, 32, 32], ['n-nature', 96, 128, 32, 32]]; // round tree on a trunk (Stefan 2026-11-15)
/** Big groves (decor, no collision) near the map edges and around the cave: pine, green, lime (Stefan 2026-11-15). */
const GROVE_ART: Crop[] = [['n-nature', 0, 32, 64, 48], ['n-nature', 64, 32, 64, 48], ['n-nature', 256, 32, 64, 48]];
type Placed = [string, number, number, number, number, number, number]; // crop + where it goes (dx, dy)
/** Pieces placed on one canvas: the garden = two rows of soil plots (camp) with vegetables planted on them
 *  (scripts/ninja_crops.py GARDEN draws the same picture for the build card). */
const NINJA_COMPOSE: Record<string, { w: number; h: number; parts: Placed[] }> = {
  'b-garden': { w: 64, h: 42, parts: [
    ['n-camp', 0, 128, 64, 16, 0, 12], ...[0, 1, 2, 3].map((i): Placed => ['n-nature', 64, 176, 16, 16, i * 16, 3]),
    ['n-camp', 0, 128, 64, 16, 0, 26], ...[0, 1, 2, 3].map((i): Placed => ['n-nature', 80, 176, 16, 16, i * 16, 17]),
  ] },
};
/** Crops laid top to bottom (tall Ninja buildings split over two tileset rows). */
const NINJA_VSTACK: Record<string, Crop[]> = {
  'b-cottage-3': [['n-house', 400, 112, 64, 80], ['n-house', 400, 192, 64, 32]],
};
const NINJA_CROPS: Record<string, Crop | Crop[]> = {
  // resource nodes (sim kinds 0-5) and their used-up looks
  // trees (PLAN step 2): no mega-trunk round tree (Nature 0,0); the tree with roots, the blossom tree, the pine
  'pr-tree-green': TREE_ART[0], 'pr-tree-orange': TREE_ART[1], 'pr-tree-pine': TREE_ART[2],
  'pr-rock': ['n-nature', 112, 224, 32, 32], 'pr-boulder': ['n-nature', 144, 224, 32, 32],
  'pr-stump': ['n-nature', 64, 128, 16, 16], // a small stump (no enormous stump)
  'pr-grove-0': GROVE_ART[0], 'pr-grove-1': GROVE_ART[1], 'pr-grove-2': GROVE_ART[2], 'g-rubble': RUBBLE_ART,
  'pr-flowers': ['n-nature', 96, 176, 16, 16],
  // wild veg + wheat tufts near the yard (decor only, no farming)
  'pr-wheat': ['n-nature', 112, 176, 16, 16], 'pr-veg': ['n-nature', 64, 176, 16, 16], 'pr-veg2': ['n-nature', 80, 176, 16, 16],
  // puzzle pens: picket fence, posts, double gate, pressure plates, chest
  'pr-fence': ['n-house', 176, 80, 16, 16], 'pr-gate-post': ['n-house', 176, 64, 16, 16],
  'pr-gate': [['n-house', 128, 64, 16, 16], ['n-house', 144, 64, 16, 16]], 'pr-gate-open': ['n-house', 176, 64, 16, 16],
  'pr-plate': ['n-dungeon', 0, 16, 16, 16], 'pr-plate-down': ['n-dungeon', 16, 16, 16, 16],
  'ic-chest': ['nx-chest', 0, 0, 16, 14],
  // power-ups (speed boot, magnet = hook) and the home icon of the edge arrow
  'ic-magnet': ['nx-hook', 0, 0, 24, 24], 'ic-house': ['n-house', 48, 128, 47, 32],
  // carried resources
  // resources (resArt.ts): log, rock, food
  'ic-log': ['res-wood-src', RES_ART.wood.x, RES_ART.wood.y, RES_ART.wood.w, RES_ART.wood.h],
  'g-item-stone': ['res-stone-src', RES_ART.stone.x, RES_ART.stone.y, RES_ART.stone.w, RES_ART.stone.h],
  'g-item-berries': ['res-berry-src', RES_ART.berry.x, RES_ART.berry.y, RES_ART.berry.w, RES_ART.berry.h],
  // the base: cottage levels 1-3 and the six buildings
  // cottage levels (OLD_ART_CHECKLIST): 1 tent, 2 orange house, 3 the big hall (two crops stacked, NINJA_VSTACK)
  'b-cottage-1': ['n-house', 3, 120, 42, 39], 'b-cottage-2': ['n-house', 0, 0, 64, 48],
  'b-storage': ['n-house', 304, 224, 32, 32], 'b-workshop': ['n-house', 304, 304, 48, 48], 
  'b-well': ['n-element', 112, 27, 16, 21], 'b-watchtower': ['n-towers', 4, 0, 24, 32], 'b-bridge': ['n-house', 144, 240, 64, 46],
  // snow map
  'w-tree-snow-round': ['n-nature', 192, 0, 32, 32], 'w-tree-snow-pine': ['n-nature', 160, 0, 32, 32], 'w-tree-snow-small': ['n-nature', 128, 0, 32, 32],
  'w-rock-snow': ['n-nature', 32, 192, 32, 32], 'w-ice-rock': ['n-nature', 112, 256, 32, 32], 'w-bush-berries-snow': ['n-nature', 256, 0, 32, 32],
  'w-stump-snow': ['n-nature', 0, 128, 32, 32], 'w-rubble-snow': ['n-nature', 64, 192, 16, 16], 'w-bush-empty-snow': ['n-nature', 256, 0, 32, 32],
  'w-snowman': ['n-nature', 160, 192, 16, 16], 'w-tree-bare': ['n-nature', 64, 0, 32, 32], 'w-igloo': ['n-house', 0, 176, 48, 46],
  'w-ice': ['n-floor', 16, 352, 16, 16],
};
const NINJA_SHEETS: Record<string, string> = {
  'n-nature': 'Backgrounds/Tilesets/TilesetNature.png', 'n-house': 'Backgrounds/Tilesets/TilesetHouse.png',
  'n-element': 'Backgrounds/Tilesets/TilesetElement.png', 'n-camp': 'Backgrounds/Tilesets/tileset_camp.png', 'n-towers': 'Backgrounds/Tilesets/TilesetTowers.png',
  'n-dungeon': 'Backgrounds/Tilesets/TilesetDungeon.png',
  'nx-chest': 'Items/Treasure/BigTreasureChest.png',
  // resources: the files named in resArt.ts (one line each)
  'res-wood-src': RES_ART.wood.file, 'res-stone-src': RES_ART.stone.file, 'res-berry-src': RES_ART.berry.file,
  'n-shadow': 'Actor/Character/Shadow.png',
  'nx-hook': 'Ui/Skill Icon/Items & Weapon/Hook.png',
  'nt-axe': 'Items/Tool/Axe.png', 'nt-pickaxe': 'Items/Tool/Pickaxe.png', 'nt-rake': 'Items/Tool/Hoe.png',
};
/** Rebuilt keys survive scene restarts (the texture cache is global). */
const ninjaInstalled = new Set<string>();

/** Ninja Adventure world scale: 16 px tiles drawn at 3x = 48 world px (= WATER_TILE). */
const NINJA_SCALE = 3;
/** Props, nodes and buildings at 2x: a 32 px tree is 64 world px like the old trees, so it matches the collision. */
const PROP_SCALE = 3; // one pixel density: every Ninja pixel is 3 world px, like the ground
const NINJA_COLS = Math.ceil(WORLD_W / WATER_TILE), NINJA_ROWS = Math.ceil(WORLD_H / WATER_TILE);
/** Shore piece -> 16 px tile (x, y) in a Ninja 3x3 autotile block whose top-left is (bx, by), plus its inner corners. */
function autoFrame(sh: Shore, bx: number, by: number, inner: Record<'inw' | 'ine' | 'isw' | 'ise', [number, number]>, open2: [number, number]): [number, number] {
  const g: Record<string, [number, number]> = {
    nw: [bx, by], n: [bx + 16, by], ne: [bx + 32, by], w: [bx, by + 16], open: [bx + 16, by + 16], e: [bx + 32, by + 16],
    sw: [bx, by + 32], s: [bx + 16, by + 32], se: [bx + 32, by + 32],
  };
  if (sh === 'open2') return open2;
  return (g[sh] ?? inner[sh as 'inw']) ?? g.open;
}
/** The organic dirt yard around the cottage and under buildings. false = plain grass everywhere ("no ground" test). */
export const YARD_ENABLED = true;
const DEBUG = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');
const MAP_VIEW = DEBUG && new URLSearchParams(location.search).has('mapview');
/** Below this speed (px/s) the face looks straight ahead. */
const FACE_DEAD = 40;
const BLOB_SCALE = 3; // blobz v2: 16x18 grid on the Ninja 16 px grid, drawn at the Ninja world scale
const TOOL_SCALE = 2; // Ninja tool icons (16 px)
const DECOR: [string, number][] = [['pr-flowers', 3]]; // no decor bushes: bushes are berry nodes now

interface PuzzleGfx {
  l: PuzzleLayout;
  plates: Phaser.GameObjects.Image[];
  glows: Phaser.GameObjects.Image[];
  bubbles: Phaser.GameObjects.Text[];
  gate: Phaser.GameObjects.Image;
  chest: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Graphics;
  open: boolean;
  taken: boolean;
}


interface BlobGfx {
  shadow: Phaser.GameObjects.Image;
  body: Phaser.GameObjects.Image;
  eyes: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  carry: Phaser.GameObjects.Image[];
  aura: Phaser.GameObjects.Graphics;
  you?: Phaser.GameObjects.Image; // N-18 arrow over my own blob
  tool?: Phaser.GameObjects.Sprite;
  swingT: number; // seconds left of the current tool swing
  faceLeft: boolean; // tool swing direction
  facing: Facing; // body mirror (left = flipX)
  x: number; y: number; vx: number; vy: number;
  look: { x: number; y: number };
  trail: { x: number; y: number; a: number }[];
  texKey: string;
  blinkT: number;
  lastDir?: number;
  lastSp?: number;
  puffCd?: number;
  baseScale: number;
  pixel: boolean;
}

export class GameScene extends Phaser.Scene {
  private s!: Session;
  private blobs = new Map<string, BlobGfx>();
  private items = new Map<number, Phaser.GameObjects.Image>();
  private gems = new Map<number, { g: Phaser.GameObjects.Graphics; img: Phaser.GameObjects.Image; t: Phaser.GameObjects.Image[]; x: number; y: number }>();
  private powers = new Map<number, Phaser.GameObjects.Container>();
  private pz: PuzzleGfx[] = [];
  // Bärregn: the field is drawn over the base; blobz + drops get a depth boost to stay on top of it
  private dB = 0;
  private miniCenterY = 0;
  private miniG?: Phaser.GameObjects.Graphics;
  private yardImg?: Phaser.GameObjects.Image;
  private yardKey = '';
  private miniDeco: Phaser.GameObjects.GameObject[] = [];
  private miniBg?: Phaser.GameObjects.Image;
  private drops = new Map<number, { item: Phaser.GameObjects.Image; mark: Phaser.GameObjects.Image | Phaser.GameObjects.Ellipse }>();
  private bgfx = new Map<BuildKind, { img: Phaser.GameObjects.Image; sh?: Phaser.GameObjects.Image; built: boolean }>();
  private cottageImg!: Phaser.GameObjects.Image;
  private water!: ReturnType<typeof makeWater>;
  private nodes: { img: Phaser.GameObjects.Image; sh: Phaser.GameObjects.Image; kind: number; left: number; x: number; y: number; sc: number; fade: number; blossom: boolean }[] = [];
  /** Decor groves (no collision), faded like trees when a blob is behind them. */
  private groves: { img: Phaser.GameObjects.Image; x: number; y: number; fade: number }[] = [];
  private dusk!: Phaser.GameObjects.Rectangle;
  private pile!: Phaser.GameObjects.Container;
  private pileKey = '';
  private trailG!: Phaser.GameObjects.Graphics;
  private pickG!: Phaser.GameObjects.Graphics;
  private baseG!: Phaser.GameObjects.Graphics;
  private camTarget = { x: BASE.x, y: BASE.y };
  private lastView: View | null = null;
  onView: (v: View) => void = () => {};

  constructor() { super('game'); }

  /** Small white blob used as the "helpers needed" marker over chests. */
  private miniBlob(): string {
    if (!this.textures.exists('mini-blob')) {
      this.textures.addCanvas('mini-blob', blobCanvas({ color: 0xffffff, shape: 0, eyes: 0, mouth: 1, hat: 0 }, 1))!.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    return 'mini-blob';
  }


  init(data: { session: Session }) {
    this.s = data.session;
    this.registry.set('biome', this.s.biome ?? 'meadow'); // read by the dungeon entrance (snowy cave)
    this.blobs.clear(); this.items.clear(); this.gems.clear(); this.powers.clear(); this.drops.clear(); this.dB = 0; this.miniG = undefined; this.miniDeco = [];
    this.lastView = null;
    this.lastClock = 0;
  }

  preload() {
    // everything on the meadow comes from Ninja Adventure (docs/ART_MAP.md); old art is not loaded any more
    const NJ = 'assets/ninja-adventure/';
    const sheet = (key: string, file: string, w: number, h: number) => this.load.spritesheet(key, encodeURI(NJ + file), { frameWidth: w, frameHeight: h });
    for (const [k, f] of Object.entries(NINJA_SHEETS)) this.load.image(k, encodeURI(NJ + f));
    const tiles = NJ + 'Backgrounds/Tilesets/';
    this.load.image('n-floor', tiles + 'TilesetFloor.png');
    this.load.image('n-floordetail', tiles + 'TilesetFloorDetail.png');
    this.load.image('n-water', tiles + 'TilesetWater.png');
    // FX (ART_MAP 10): hit chips, glide dust, level-up spark, plate aura, pick-up sparkle, Berry Rain blast + ring
    sheet('chips-wood', 'FX/Particle/Wood.png', 16, 16);
    sheet('chips-stone', 'FX/Particle/RockGray.png', 16, 16);
    sheet('fx-dust', 'FX/Smoke/SmokeCircular/SpriteSheet.png', 30, 14);
    sheet('fx-levelup', 'FX/Magic/Spark/SpriteSheet.png', 45, 35);
    sheet('fx-plate-glow', 'FX/Magic/Aura/SpriteSheet.png', 25, 24);
    sheet('m-sparkle', 'FX/Particle/Spark.png', 10, 8);
    sheet('mini-wave', 'FX/Elemental/Explosion/SpriteSheet.png', 40, 40);
    sheet('mini-warn', 'FX/Magic/Circle/SpriteSheetWhite.png', 32, 32);
    sheet('mini-ko', 'Ui/Emote/emote3.png', 14, 13);
    sheet('m-flag', 'Backgrounds/Animated/Flag/FlagRed16x16.png', 16, 16);
    this.load.image('mini-bg', 'art/mini/bg.png');
    // berry bush ChatGPT N-16 (full / picked), 32 px art at 3x
    this.load.image('st-you', 'art/icons/state/you-arrow-16.png'); // ChatGPT N-18
    this.load.image('pw-speed-32', 'art/meadow/speed-32.png'); // ChatGPT N-15b speed power-up (32 px art)
    this.load.image('g-bush-berries', 'art/props/berry-bush-32.png');
    this.load.image('g-bush-empty', 'art/props/berry-bush-picked-32.png'); // Bärregn backdrop (ChatGPT N-9): sunset sky over the berry field
    if (this.s.biome === 'snow') { // archived snow map (SNOW_MAP_ENABLED): its own leftovers
      this.load.on('loaderror', () => { /* winter art not drawn yet: tinted stand-ins below */ });
      for (const n of WINTER) if (!(('w-' + n) in NINJA_CROPS)) this.load.image('w-' + n, `art/props-winter/${n}.png`);
    }
  }

  /** Texture, scale and tint for a node (biome aware, with stand-ins for missing winter art). */
  private nodeArt(kind: number, spent: boolean, blossom = true): [string, number, number] {
    if (kind === 1 && !blossom) kind = 0; // the blossom tree is used sparingly (BLOSSOM_MAX), the rest are the green tree
    if (this.s.biome !== 'snow') { const [k, sc] = (spent ? SPENT_ART : OBSTACLE_ART)[kind] ?? OBSTACLE_ART[0]; return [k, sc, 0xffffff]; }
    const [k, sc] = (spent ? WINTER_SPENT : WINTER_ART)[kind] ?? WINTER_ART[0];
    if (this.textures.exists(k)) return [k, sc, 0xffffff];
    const [stand, tint] = WINTER_WANTED[k] ?? ['pr-tree-green', 0xffffff];
    return [stand, (spent ? SPENT_ART : OBSTACLE_ART)[kind]?.[1] ?? sc, tint];
  }

  /** Build every NINJA_CROPS key as a canvas texture (nearest filtering) from the loaded Ninja sheets. */
  /** e2e: names of visible objects drawn above `o` that overlap it (a nameplate must never be covered). */
  private coversOf(o: Phaser.GameObjects.Text): string[] {
    const r = o.getBounds();
    return this.children.list.filter((c) => {
      const g = c as Phaser.GameObjects.Image;
      if (c === o || !g.visible || !g.getBounds || (g.depth ?? 0) <= o.depth || g.alpha === 0) return false;
      return Phaser.Geom.Rectangle.Overlaps(r, g.getBounds());
    }).map((c) => (c as Phaser.GameObjects.Image).texture?.key ?? c.type);
  }

  /** Put a node's shadow under the foot of its picture (the bottom edge), 70% of its width, just below its depth. */
  private footShadow(n: { img: Phaser.GameObjects.Image; sh: Phaser.GameObjects.Image }) {
    const im = n.img, foot = im.y + (1 - im.originY) * im.displayHeight;
    n.sh.setPosition(im.x, foot - 3).setDisplaySize(Math.max(42, im.displayWidth * 0.8), 24).setAlpha(0.34).setDepth(im.depth - 1);
  }

  /** Soft Ninja drop shadow (Actor/Character/Shadow.png, 12x7) stretched under a blob, prop or building. */
  private shadow(x: number, y: number, w: number, h = Math.max(15, w * 0.3), alpha = 0.28) {
    return this.add.image(x, y, 'n-shadow').setDisplaySize(w, h).setAlpha(alpha).setDepth(-500);
  }

  private installNinjaArt() {
    const all: [string, Crop[], boolean][] = [
      ...Object.entries(NINJA_CROPS).map(([k, spec]) => [k, (Array.isArray(spec[0]) ? spec : [spec]) as Crop[], false] as [string, Crop[], boolean]),
      ...Object.entries(NINJA_VSTACK).map(([k, parts]) => [k, parts, true] as [string, Crop[], boolean]),
    ];
    for (const [key, { w, h, parts }] of Object.entries(NINJA_COMPOSE)) {
      if (ninjaInstalled.has(key) && this.textures.exists(key)) continue;
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const cx = c.getContext('2d')!;
      for (const [sheet, sx, sy, pw, ph, dx, dy] of parts) cx.drawImage(this.textures.get(sheet).getSourceImage() as HTMLImageElement, sx, sy, pw, ph, dx, dy, pw, ph);
      if (this.textures.exists(key)) this.textures.remove(key);
      this.textures.addCanvas(key, c)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
      ninjaInstalled.add(key);
    }
    for (const [key, parts, vert] of all) {
      if (ninjaInstalled.has(key) && this.textures.exists(key)) continue;
      const c = document.createElement('canvas');
      c.width = vert ? Math.max(...parts.map((p) => p[3])) : parts.reduce((w, p) => w + p[3], 0);
      c.height = vert ? parts.reduce((h, p) => h + p[4], 0) : Math.max(...parts.map((p) => p[4]));
      const cx = c.getContext('2d')!;
      let x = 0, y = 0;
      for (const [sheet, sx, sy, w, h] of parts) {
        const src = this.textures.get(sheet).getSourceImage() as HTMLImageElement;
        if (vert) { cx.drawImage(src, sx, sy, w, h, 0, y, w, h); y += h; } else { cx.drawImage(src, sx, sy, w, h, x, c.height - h, w, h); x += w; }
      }
      if (this.textures.exists(key)) this.textures.remove(key);
      this.textures.addCanvas(key, c)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
      ninjaInstalled.add(key);
    }
  }

  create() {
    if (!this.anims.exists('mini-ko')) this.anims.create({ key: 'mini-ko', frames: this.anims.generateFrameNumbers('mini-ko', { frames: [0] }), frameRate: 6, repeat: -1 });
    if (!this.anims.exists('m-flag')) this.anims.create({ key: 'm-flag', frames: this.anims.generateFrameNumbers('m-flag', { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
    if (!this.anims.exists('plate-glow')) this.anims.create({ key: 'plate-glow', frames: this.anims.generateFrameNumbers('fx-plate-glow', { start: 0, end: 4 }), frameRate: 8, repeat: -1 });
    if (!this.anims.exists('mini-wave')) this.anims.create({ key: 'mini-wave', frames: this.anims.generateFrameNumbers('mini-wave', { start: 0, end: 8 }), frameRate: 18 });
    if (!this.anims.exists('dust')) this.anims.create({ key: 'dust', frames: this.anims.generateFrameNumbers('fx-dust', { start: 0, end: 7 }), frameRate: 18 });
    if (!this.anims.exists('m-sparkle')) this.anims.create({ key: 'm-sparkle', frames: this.anims.generateFrameNumbers('m-sparkle', { start: 0, end: 6 }), frameRate: 18 });
    if (!this.anims.exists('levelup')) this.anims.create({ key: 'levelup', frames: this.anims.generateFrameNumbers('fx-levelup', { start: 0, end: 5 }), frameRate: 12 });
    this.installNinjaArt();
    const r = rng(this.s.seed * 7 + 3);

    // ground: grass with variety + dirt yard around base
    const cols = WORLD_W / T, rows = WORLD_H / T;
    const data: number[][] = [];
    const bc = Math.floor(BASE.x / T), br = Math.floor(BASE.y / T);
    for (let y = 0; y < rows; y++) {
      const row: number[] = [];
      for (let x = 0; x < cols; x++) {
        const dx = x - bc, dy = y - br;
        if (dx === 99 && dy === 99) {
          row.push(0);
        } else {
          const v = r();
          // meadow: grass + a few flower tiles; snow: Tiny Ski snow with a few sparkly/drift tiles
          row.push(v < 0.8 ? 0 : v < 0.99 ? 1 : 2);
        }
      }
      data.push(row);
    }
    // Ground baked into ONE canvas (a tilemap layer shows seams between tiles at fractional zoom)
    const groundKey = `ground-${this.s.biome ?? 'meadow'}-${this.s.seed}`;
    if (!this.textures.exists(groundKey)) {
      const gc = document.createElement('canvas');
      gc.width = NINJA_COLS * 16; gc.height = NINJA_ROWS * 16;
      void data;
      this.bakeNinjaMeadow(gc, r);
      this.textures.addCanvas(groundKey, gc)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.add.image(0, 0, groundKey).setOrigin(0).setScale(NINJA_SCALE).setDepth(-1000);

    // base: round dirt yard with the cottage in the middle + glowing drop-off ring
    // the yard: an organic patch of dirt (packed snow on the snow map) that grows with the cottage and spreads
    // under every building as it is built; redrawn in drawYard() when that changes
    this.yardImg = undefined; this.yardKey = '';
    this.drawYard(1, []);
    this.baseG = this.add.graphics().setDepth(-900);
    this.add.ellipse(BASE.x, BASE.y + 26, 110, 26, 0x000000, 0.18).setDepth(-880);
    // cottage (Art's base set, level 1-3), integer scale 2, anchored bottom centre
    this.shadow(BASE.x, BASE.y + 30, 150, 27, 0.24).setDepth(BASE.y - 41);
    this.cottageImg = this.add.image(BASE.x, BASE.y + 30, this.s.biome === 'snow' ? 'w-igloo' : 'b-cottage-1').setScale(PROP_SCALE).setOrigin(0.5, 1).setDepth(BASE.y - 40);
    // the water corner (an L of water around a seeded corner; the bridge opens it)
    const water = makeWater(this.s.seed);
    this.water = water;
    if (BUILDING_ENABLED) {
      this.buildBase();
    }
    // "this is home": Art's base-marker sign (post foot = anchor), beside the drop-off (no reading needed; was BAS)
    this.add.sprite(BASE.x + 58, BASE.y + 62, 'm-flag', 0).setOrigin(0.5, 1).setScale(NINJA_SCALE).setDepth(BASE.y + 62).play('m-flag');

    // resource nodes (same layout as the host sim, from the shared seed); textures swap when used up
    // the pink blossom tree (sim kind 1) only for a couple of trees, away from the cave mouth
    const ent = entranceOf(this.s.seed);
    let blossoms = 0;
    this.nodes = makeTrees(this.s.seed).map((t) => {
      const blossom = t.kind === 1 && blossoms < BLOSSOM_MAX && Math.hypot(t.x - ent.x, t.y - ent.y) > 260 && ++blossoms > 0;
      const sh = this.shadow(t.x, t.y, 60, 21);
      const [key, sc, tint] = this.nodeArt(t.kind, false, blossom);
      const img = this.add.image(t.x, t.y + 10, key).setScale(sc).setTint(tint).setOrigin(0.5, t.kind < 3 ? 0.95 : 0.8).setDepth(isSolid(t.kind) ? t.y : t.y - 30);
      const n = { img, sh, kind: t.kind, left: t.left, x: t.x, y: t.y, sc, fade: 1, blossom };
      this.footShadow(n);
      return n;
    });

    // flat decorations (no collision), from the same seed on every phone; never on the puzzle pens/plates
    const trees = makeTrees(this.s.seed);
    const zones = makePuzzles(this.s.seed).map((l) => l.zone);
    const ice = this.s.biome === 'snow' ? makeIce(this.s.seed) : [];
    for (const i of ice) zones.push({ x0: i.x - 70, x1: i.x + 70, y0: i.y - 40, y1: i.y + 40 });
    const inZone = (x: number, y: number, pad: number) => zones.some((z) => x > z.x0 - pad && x < z.x1 + pad && y > z.y0 - pad && y < z.y1 + pad)
      || (BUILDING_ENABLED && [...Object.values(BUILD_SPOTS), COTTAGE_PAD].some((p) => Math.hypot(p.x - x, p.y - y) < 60 + pad))
      || (BUILDING_ENABLED && [water.area, ...water.water].some((z) => x > z.x0 - pad && x < z.x1 + pad && y > z.y0 - pad && y < z.y1 + pad));
    // meadow declutter (Stefan 2026-11-15): no scattered flowers or tufts any more; the archived snow map keeps its decor
    for (let i = 0; this.s.biome === 'snow' && i < 22; i++) {
      const x = 30 + r() * (WORLD_W - 60), y = 30 + r() * (WORLD_H - 60);
      const [key, sc] = this.s.biome === 'snow' ? (r() < 0.7 ? ['w-snowman', 2] as [string, number] : ['w-tree-bare', 2] as [string, number]) : DECOR[Math.floor(r() * DECOR.length)];
      if (Math.hypot(x - BASE.x, y - BASE.y) < BASE.r + 30 || trees.some((t) => Math.hypot(t.x - x, t.y - y) < 46) || inZone(x, y, 20)) continue;
      if (DUNGEON_ENABLED && cavePath(this.s.seed).has(Math.floor(x / WATER_TILE) + ',' + Math.floor(y / WATER_TILE))) continue; // never on the path
      this.add.image(x, y, key).setScale(sc).setOrigin(0.5, 0.9).setDepth(key === 'pr-flowers' ? -600 : y);
    }
    // 1-2 small wild patches of wheat / greens a little outside the yard (decor, no farming)
    if (WILD_PATCHES && this.s.biome !== 'snow') for (let i = 0, placed = 0; i < 60 && placed < 2; i++) {
      const a = r() * Math.PI * 2, d = BASE.r + 240 + r() * 120;
      const x = BASE.x + Math.cos(a) * d, y = BASE.y + Math.sin(a) * d * 0.8;
      if (x < 80 || y < 80 || x > WORLD_W - 80 || y > WORLD_H - 80 || trees.some((t) => Math.hypot(t.x - x, t.y - y) < 90) || inZone(x, y, 50)) continue;
      if (DUNGEON_ENABLED && Math.hypot(x - entranceOf(this.s.seed).x, y - entranceOf(this.s.seed).y) < 170) continue; // not at the cave mouth
      if (DUNGEON_ENABLED && [-1, 0, 1].some((dx) => [-1, 0, 1].some((dy) => cavePath(this.s.seed).has(Math.floor(x / WATER_TILE + dx) + ',' + Math.floor(y / WATER_TILE + dy))))) continue;
      const kinds = placed === 0 ? ['pr-wheat', 'pr-wheat', 'pr-wheat', 'pr-veg'] : ['pr-veg', 'pr-veg2', 'pr-veg', 'pr-wheat'];
      kinds.forEach((k, j) => this.add.image(x + (j % 2) * 44 - 22 + (j > 1 ? 14 : 0), y + Math.floor(j / 2) * 34, k).setScale(PROP_SCALE).setOrigin(0.5, 0.9).setDepth(y + Math.floor(j / 2) * 34));
      placed++;
    }
    // big groves (decor) along the map edges and a couple around the cave, never on the path, nodes, pens or water
    if (this.s.biome !== 'snow') {
      const spots: [number, number][] = [];
      for (let i = 0; i < 600 && spots.length < GROVE_MAX; i++) {
        const nearCave = spots.length < 1;
        let x: number, y: number;
        if (nearCave) { const a = r() * Math.PI * 2, d = 200 + r() * 90; x = ent.x + Math.cos(a) * d; y = ent.y + Math.sin(a) * d * 0.8; }
        else { const side = Math.floor(r() * 4), u = r(); x = side < 2 ? 80 + u * (WORLD_W - 160) : side === 2 ? 70 + r() * 60 : WORLD_W - 70 - r() * 60; y = side === 0 ? 90 + r() * 50 : side === 1 ? WORLD_H - 30 - r() * 50 : 120 + u * (WORLD_H - 200); }
        if (x < 60 || x > WORLD_W - 60 || y < 80 || y > WORLD_H - 10) continue;
        if (Math.hypot(x - BASE.x, y - BASE.y) < BASE.r + 220 || Math.hypot(x - ent.x, y - ent.y) < 180) continue;
        if (trees.some((t) => Math.hypot(t.x - x, t.y - y) < 175) || inZone(x, y, 90) || spots.some(([sx, sy]) => Math.hypot(sx - x, sy - y) < GROVE_GAP)) continue;
        if (DUNGEON_ENABLED && [-2, -1, 0, 1, 2].some((dx) => [-2, -1, 0].some((dy) => cavePath(this.s.seed).has(Math.floor(x / WATER_TILE + dx) + ',' + Math.floor(y / WATER_TILE + dy))))) continue;
        spots.push([x, y]);
      }
      this.groves = spots.map(([x, y], i) => {
        this.shadow(x, y - 6, 150, 27, 0.26).setDepth(y - 1);
        return { img: this.add.image(x, y, 'pr-grove-' + (Math.floor(r() * 3) + i) % 3).setScale(3).setOrigin(0.5, 1).setDepth(y), x, y, fade: 1 };
      });
    }
    if (this.s.biome === 'snow') {
      // frozen ponds (slippery in the sim) + an igloo or two
      // frozen ponds from Art's 3x3 autotile: 4x2 tiles at 2x = 128x64, the sim's ice ellipse
      // a few small ice patches as decor
      for (let i = 0, placed = 0; i < 40 && placed < 3; i++) {
        const x = 120 + r() * (WORLD_W - 240), y = 120 + r() * (WORLD_H - 240);
        if (Math.hypot(x - BASE.x, y - BASE.y) < BASE.r + 220 || trees.some((t) => Math.hypot(t.x - x, t.y - y) < 60) || inZone(x, y, 30)) continue;
        this.add.image(x, y, 'w-ice').setScale(PROP_SCALE).setDepth(-655); placed++;
      }
    }

    this.pz = makePuzzles(this.s.seed).map((l) => this.buildPuzzle(l));
    // team bank: small stacks of wood / stone / berries beside the cottage
    this.pile = this.add.container(BASE.x + 52, BASE.y + 40).setDepth(BASE.y + 40);
    // dusk: warm tint over the world in the last 20 s of daylight
    this.dusk = this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W * 3, WORLD_H * 3, 0xff7a2f, 0).setDepth(8000);

    this.trailG = this.add.graphics().setDepth(-400);
    this.pickG = this.add.graphics().setDepth(-450);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setBackgroundColor(this.s.biome === 'snow' ? '#dfeefa' : '#2b6b3a');
    this.fitCamera();
    this.scale.on('resize', this.fitCamera, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.fitCamera, this));
  }

  private fitCamera() {
    const w = this.scale.width, h = this.scale.height;
    if (MAP_VIEW) { // debug screenshots (?debug&mapview): the whole meadow on screen, camera centred, no follow
      const z = Math.min(w / WORLD_W, h / WORLD_H);
      this.cameras.main.removeBounds(); this.cameras.main.setZoom(z); this.cameras.main.centerOn(WORLD_W / 2, WORLD_H / 2);
      return;
    }
    if (this.miniG) {
      // Bärregn: the whole field on screen, below the mini HUD (~top 120 px) and above the buttons
      const top = 124, bottom = 24;
      const z = Math.min(w / (ARENA.x1 - ARENA.x0 + 40), (h - top - bottom) / (ARENA.y1 - ARENA.y0 + 30));
      this.cameras.main.setZoom(z);
      this.miniCenterY = (ARENA.y0 + ARENA.y1) / 2 - (top - bottom) / 2 / z;
      this.cameras.main.removeBounds();
      this.cameras.main.centerOn((ARENA.x0 + ARENA.x1) / 2, this.miniCenterY);
      if (this.miniBg?.active) { // cover the whole view, like CSS background-size: cover
        const vw = w / z, vh = h / z, sc = Math.max(vw / this.miniBg.width, vh / this.miniBg.height);
        this.miniBg.setScale(sc).setPosition((ARENA.x0 + ARENA.x1) / 2, this.miniCenterY);
      }
      return;
    }
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    const z = Math.max(0.55, Math.min(2.2, Math.min(Math.max(w, h) / 820, Math.min(w, h) / 430)));
    this.cameras.main.setZoom(z);
  }

  private lastClock = 0;

  update() {
    // Own wall clock (Phaser smooths/caps its delta): the sim must follow real time
    // on slow phones, visuals use a capped dt.
    const clock = performance.now();
    const realDt = this.lastClock ? Math.min(0.5, (clock - this.lastClock) / 1000) : 1 / 60;
    this.lastClock = clock;
    this.s.tick(realDt, this.s.readInput());
    const dt = Math.min(0.1, realDt);
    const v = this.s.view();
    if (!v) return;
    this.lastView = v;
    this.onView(v);
    if (dungeonFrame(this, v, this.s)) return; // [dungeon hook, Code 2] underground the dungeon scene draws
    const smooth = this.s.role === 'client';
    const k = Math.min(1, dt * 14);
    const now = this.time.now;

    // base ring pulse
    const pulse = 0;
    this.baseG.clear();
    void pulse; // the dirt yard itself marks the drop-off zone (no glow ring)

    // ---- items: pickups bob and sit on a pulsing light ring so they read as "take me" ----
    const seenI = new Set<number>();
    this.pickG.clear();
    for (const it of v.items) {
      seenI.add(it.id);
      let img = this.items.get(it.id);
      if (!img) {
        img = this.add.image(it.x, it.y, ITEM_ICON[it.kind] ?? 'ic-log').setScale(0.1);
        this.tweens.add({ targets: img, scale: ITEM_SCALE[it.kind] ?? 1.8, duration: 250, ease: 'Back.Out' });
        this.items.set(it.id, img);
      }
      const bob = Math.abs(Math.sin(now / 260 + it.id)) * 5;
      img.x = it.x; img.y = it.y - 4 - bob;
      img.setDepth(it.y - 10);
      const pr = 15;
      this.pickG.fillStyle(0x000000, 0.18).fillEllipse(it.x, it.y + 9, 22 - bob, 7);
      this.pickG.lineStyle(2, 0xffffff, 0.75).strokeEllipse(it.x, it.y + 6, pr * 2, pr);
    }
    for (const [id, img] of this.items) if (!seenI.has(id)) { img.destroy(); this.items.delete(id); }

    // ---- gems (co-op carry) ----
    const seenG = new Set<number>();
    for (const g of v.gems) {
      seenG.add(g.id);
      let e = this.gems.get(g.id);
      if (!e) {
        e = { g: this.add.graphics(), img: this.add.image(g.x, g.y, 'ic-chest').setScale(PROP_SCALE), t: [0, 1].map(() => this.add.image(0, 0, this.miniBlob()).setScale(1.45)), x: g.x, y: g.y };
        this.gems.set(g.id, e);
      }
      e.x += (g.x - e.x) * (smooth ? k : 1);
      e.y += (g.y - e.y) * (smooth ? k : 1);
      this.drawGem(e.g, e.x, e.y, g.holders, now);
      e.img.setPosition(e.x, e.y - 4 + (g.holders >= 2 ? Math.sin(now / 90) * 2 : 0)).setDepth(e.y);
      // two slime icons over the chest: lit = a blob is helping (needs 2)
      e.t.forEach((ic, n) => ic.setPosition(e!.x + (n - 0.5) * 24, e!.y - 46 + (g.holders >= 2 ? Math.sin(now / 120 + n) * 3 : 0))
        .setAlpha(n < g.holders ? 1 : 0.35).setTint(n < g.holders ? 0xffffff : 0x666666).setDepth(e!.y + 1000));
    }
    for (const [id, e] of this.gems) if (!seenG.has(id)) { e.g.destroy(); e.img.destroy(); e.t.forEach((ic) => ic.destroy()); this.gems.delete(id); }

    // ---- resource nodes: used up -> stump / rubble / empty bush, regrow pops back ----
    v.nodes?.forEach((left, i) => {
      const n = this.nodes[i];
      if (!n) return;
      if ((left > 0) === (n.left > 0)) { n.left = left; return; }
      n.left = left;
      const [key, sc, tint] = this.nodeArt(n.kind, left <= 0, n.blossom);
      n.img.setTexture(key).setScale(sc).setTint(tint).setOrigin(0.5, left > 0 && n.kind < 3 ? 0.95 : 0.8);
      this.footShadow(n);
      n.sc = sc;
      if (left > 0) { n.img.setScale(sc * 0.3); this.tweens.add({ targets: n.img, scale: sc, duration: 300, ease: 'Back.Out' }); }
    });
    // ---- foliage fades while a blob stands behind it (player visibility, PLAN step 2) ----
    for (const n of this.nodes) {
      if (n.kind >= 3 && n.kind !== 5) continue; // trees + berry bushes only
      const top = n.kind < 3 ? 96 : 66;
      let hidden = false;
      for (const b of this.blobs.values()) if (b.y < n.y + 4 && b.y > n.y - top && Math.abs(b.x - n.x) < 44) { hidden = true; break; }
      const want = hidden ? 0.45 : 1;
      if (n.fade !== want) { n.fade += Math.sign(want - n.fade) * Math.min(Math.abs(want - n.fade), dt * 4); n.img.setAlpha(n.fade); }
    }
    for (const g of this.groves) {
      let hidden = false;
      for (const b of this.blobs.values()) if (b.y < g.y - 6 && b.y > g.y - 140 && Math.abs(b.x - g.x) < 96) { hidden = true; break; }
      const want = hidden ? 0.45 : 1;
      if (g.fade !== want) { g.fade += Math.sign(want - g.fade) * Math.min(Math.abs(want - g.fade), dt * 4); g.img.setAlpha(g.fade); }
    }
    // ---- dusk ----
    this.dusk.setFillStyle(v.phase === 'end' ? 0x4a2a6a : 0xff7a2f, v.phase === 'end' ? 0.38 : v.time >= 20 ? 0 : 0.1 + Math.min(1, (20 - v.time) / 20) * 0.25);

    // ---- Bärregn mini game ----
    this.drawMini(v);

    // ---- co-op puzzles ----
    v.puzzles?.forEach((z, i) => this.drawPuzzle(this.pz[i], z, now));

    // ---- base building ----
    if (BUILDING_ENABLED) this.drawBuilds(v, now);

    // ---- bank pile ----
    this.drawPile(v.bank);

    // ---- power-ups ----
    const seenW = new Set<number>();
    for (const w of v.powers) {
      seenW.add(w.id);
      let c = this.powers.get(w.id);
      if (!c) {
        // speed: ChatGPT N-15b (winged boot inside its own glow circle), 16 px art at 3x; magnet: Ninja hook on a circle
        c = w.kind === 'speed'
          ? this.add.container(w.x, w.y, [this.add.image(0, 0, 'pw-speed-32').setScale(2)]) // N-15b 32 px art, 64 world px
          : this.add.container(w.x, w.y, [this.add.circle(0, 0, 32, 0xff6b8b, 0.4).setStrokeStyle(3, 0xffffff, 0.9), this.add.image(0, -1, 'ic-magnet').setScale(2)]);
        this.powers.set(w.id, c);
      }
      c.setPosition(w.x, w.y + Math.sin(now / 250 + w.id) * 4).setDepth(w.y);
    }
    for (const [id, c] of this.powers) if (!seenW.has(id)) { c.destroy(); this.powers.delete(id); }

    // ---- blobz ----
    const infos = this.s.infos();
    const seenP = new Set<string>();
    this.trailG.clear();
    for (const p of v.players) {
      seenP.add(p.id);
      const info = infos.get(p.id) ?? { id: p.id, name: '?', color: 0xcccccc, shape: 0, eyes: 0, mouth: 0, hat: 0 };
      let b = this.blobs.get(p.id);
      const look = clampLook(info);
      // blobz v2: one 3/4 view, frame 0 idle / 1 glide, mirrored (flipX) when facing left
      const lookKey = `blob2-${look.color}-${look.shape}-${look.eyes}-${look.mouth}-${look.hat}`;
      if (!this.textures.exists(lookKey + '-0')) for (let f = 0; f < BLOB_FRAMES; f++) {
        this.textures.addCanvas(`${lookKey}-${f}`, blobCanvas(look, 1, undefined, undefined, f));
        this.textures.get(`${lookKey}-${f}`).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      const frame = Math.hypot(p.vx, p.vy) >= FACE_DEAD ? 1 : 0;
      const texKey = `${lookKey}-${frame}`;
      const pixel = true;
      const baseScale = BLOB_SCALE;
      if (!b) {
        b = {
          shadow: this.shadow(p.x, p.y, 36, 21, 0.32),
          aura: this.add.graphics(),
          body: this.add.image(p.x, p.y, texKey).setOrigin(0.5, BODY_CY).setScale(baseScale),
          eyes: this.add.graphics(),
          label: this.add.text(p.x, p.y, info.name, { fontFamily: "'Fredoka', sans-serif", fontSize: '11px', color: '#fff8e8', fontStyle: '600', stroke: '#4a2f1c', strokeThickness: 3, resolution: 3 }).setOrigin(0.5, 0),
          carry: [], swingT: 0, faceLeft: false, facing: 'right', x: p.x, y: p.y, vx: 0, vy: 0, look: { x: 0, y: 1 }, trail: [], texKey, blinkT: 2 + Math.random() * 3, baseScale, pixel,
        };
        this.blobs.set(p.id, b);
      }
      if (b.texKey !== texKey) { b.body.setTexture(texKey); b.texKey = texKey; }
      // facing: from the glide direction, kept while still or moving straight up/down; a tool swing faces the node
      b.facing = b.swingT > 0 ? (b.faceLeft ? 'left' : 'right') : facingFromVelocity(p.vx, p.vy, FACE_DEAD, b.facing);
      b.body.setFlipX(b.facing === 'left');
      if (DEBUG) ((window as unknown as { __blobzFace?: Record<string, { facing: Facing; frame: number }> }).__blobzFace ??= {})[p.id] = { facing: b.facing, frame }; // e2e
      if (b.label.text !== info.name) b.label.setText(info.name);
      if (smooth) {
        b.x += (p.x + p.vx * 0.06 - b.x) * k; b.y += (p.y + p.vy * 0.06 - b.y) * k;
        b.vx = p.vx; b.vy = p.vy;
      } else { b.x = p.x; b.y = p.y; b.vx = p.vx; b.vy = p.vy; }
      this.drawBlob(b, p, now, dt, p.id === this.s.myId);
    }
    for (const [id, b] of this.blobs) if (!seenP.has(id)) {
      b.tool?.destroy();
      b.you?.destroy(); b.shadow.destroy(); b.body.destroy(); b.eyes.destroy(); b.label.destroy(); b.aura.destroy(); b.carry.forEach((c) => c.destroy());
      this.blobs.delete(id);
    }

    // ---- fx ----
    for (const f of this.s.drainFx()) this.playFx(f);

    // camera follows my blob (Bärregn: fixed on the field)
    const me = this.blobs.get(this.s.myId);
    if (MAP_VIEW) { this.camTarget.x = WORLD_W / 2; this.camTarget.y = WORLD_H / 2; }
    else if (this.miniG) { this.camTarget.x = (ARENA.x0 + ARENA.x1) / 2; this.camTarget.y = this.miniCenterY; }
    else if (me) { this.camTarget.x = me.x; this.camTarget.y = me.y; }
    const cam = this.cameras.main;
    cam.centerOn(cam.midPoint.x + (this.camTarget.x - cam.midPoint.x) * Math.min(1, dt * 6), cam.midPoint.y + (this.camTarget.y - cam.midPoint.y) * Math.min(1, dt * 6));
  }

  private drawBlob(b: BlobGfx, p: View['players'][number], now: number, dt: number, isMe: boolean) {
    const sp = Math.hypot(b.vx, b.vy);
    // smoke puffs when the blob turns sharply or bursts forward (dash)
    b.puffCd = Math.max(0, (b.puffCd ?? 0) - dt);
    if (sp > 70) {
      const dir = Math.atan2(b.vy, b.vx);
      const turn = b.lastDir === undefined ? 0 : Math.abs(Phaser.Math.Angle.Wrap(dir - b.lastDir));
      const burst = sp - (b.lastSp ?? sp) > 120;
      const start = (b.lastSp ?? 0) < 45;
      if ((turn > 0.55 || burst || start) && b.puffCd <= 0) { this.puff(b.x, b.y + 12, b.vx, b.vy, burst ? 8 : 5); b.puffCd = 0.12; }
      b.lastDir = dir;
    }
    b.lastSp = sp;
    const hover = 0; // no up/down bob: idle blobz breathe (squash below), moving blobz stretch + tilt
    const still = Math.max(0, 1 - sp / 40); // 1 when standing still
    const breath = 1 + Math.sin(now / 420 + b.x * 0.01) * 0.03 * still;
    // trail of little glide puffs
    const lastT = b.trail[b.trail.length - 1];
    if (sp > 80 && (!lastT || Math.hypot(lastT.x - b.x, lastT.y - b.y - 8) > 7)) b.trail.push({ x: b.x, y: b.y + 8, a: Math.min(0.55, sp / 550) });
    for (const t of b.trail) t.a -= dt * 0.55;
    b.trail = b.trail.filter((t) => t.a > 0).slice(-40);
    const color = this.s.infos().get(p.id)?.color ?? 0xffffff;
    for (const t of b.trail) this.trailG.fillStyle(color, t.a).fillCircle(t.x, t.y, 4 + t.a * 10);

    const stretch = Math.min(0.18, sp / 1600);
    b.shadow.setPosition(b.x, b.y + 12).setDepth(this.dB + b.y - 20);
    b.body.setPosition(b.x, b.y - 4 + hover).setDepth(this.dB + b.y);
    b.body.setScale(b.baseScale * (1 + stretch) / breath, b.baseScale * (1 - stretch * 0.6) * breath);
    this.drawTool(b, dt);
    b.body.setRotation(Phaser.Math.Clamp(b.vx / 1400, -0.18, 0.18));

    // eyes follow movement direction
    if (sp > 20) { b.look.x += (b.vx / sp - b.look.x) * 0.2; b.look.y += (b.vy / sp - b.look.y) * 0.2; }
    b.blinkT -= dt;
    const blink = b.blinkT < 0.12;
    if (b.blinkT < 0) b.blinkT = 2 + Math.random() * 4;
    const ex = b.x + b.look.x * 4, ey = b.y - 10 + hover + b.look.y * 3;
    b.eyes.clear().setDepth(this.dB + b.y + 0.5);
    if (!b.pixel) for (const s of [-1, 1]) {
      if (blink) { b.eyes.fillStyle(0x222222, 1).fillRect(ex + s * 6 - 4, ey - 1, 8, 2); continue; }
      b.eyes.fillStyle(0xffffff, 1).fillEllipse(ex + s * 6, ey, 9, 11);
      b.eyes.fillStyle(0x222222, 1).fillCircle(ex + s * 6 + b.look.x * 2, ey + b.look.y * 2, 2.6);
    }

    // power-up aura
    b.aura.clear().setDepth(this.dB + b.y - 1);
    if (p.boostT > 0) b.aura.lineStyle(3, 0xffc93c, 0.8).strokeCircle(b.x, b.y - 4 + hover, 26 + Math.sin(now / 60) * 2);
    if (p.magnetT > 0) b.aura.lineStyle(2, 0xff6b8b, 0.5).strokeCircle(b.x, b.y, 60 + Math.sin(now / 200) * 6);
    if (p.shield > 0) b.aura.fillStyle(0x5ec8ff, 0.16).fillCircle(b.x, b.y - 6 + hover, 30).lineStyle(2, 0x8fd3ff, 0.7).strokeCircle(b.x, b.y - 6 + hover, 30);
    if (isMe) b.aura.fillStyle(0xffffff, 0.9).fillTriangle(b.x - 6, b.y - 68 + hover, b.x + 6, b.y - 68 + hover, b.x, b.y - 60 + hover);

    // nameplate: always on top of the world (tools, the base flag, props), just under the "you" arrow
    b.label.setPosition(b.x, b.y + 14).setDepth(this.dB + 19990);
    if (DEBUG) ((window as unknown as { __blobzCovers?: Record<string, () => string[]> }).__blobzCovers ??= {})[p.id] = () => this.coversOf(b.label); // e2e
    // "you": the N-18 arrow over my own blob (3x), bobbing gently
    if (isMe) {
      b.you ??= this.add.image(0, 0, 'st-you').setScale(3).setOrigin(0.5, 1);
      b.you.setPosition(b.x, b.y - 46 + Math.sin(now / 260) * 3).setDepth(this.dB + 20000);
    }

    // carried items stack
    while (b.carry.length < p.carry.length) b.carry.push(this.add.image(0, 0, 'ic-log').setScale(1));
    while (b.carry.length > p.carry.length) b.carry.pop()!.destroy();
    p.carry.forEach((k, i) => {
      const img = b.carry[i];
      img.setTexture(ITEM_ICON[k] ?? 'ic-log').setScale(CARRY_SCALE[k] ?? 1);
      img.setPosition(b.x + (i - (p.carry.length - 1) / 2) * 14, b.y - 52 + hover - Math.abs(i - 1) * 2).setDepth(this.dB + b.y + 3);
    });
  }

  /** Buildings at their fixed spots (the bridge spans the water). Only what IS built shows on the map;
   *  building happens in the build panel at the cottage. */
  private buildBase() {
    this.bgfx.clear();
    const w = this.water;
    for (const k of BUILD_KINDS) {
      const at = BUILD_SPOTS[k];
      const img = k === 'bridge'
        ? this.add.image(w.bridge.x, w.bridge.y + 69, 'b-bridge').setScale(NINJA_SCALE).setOrigin(0.5, 1).setDepth(-930)
        : this.add.image(at.x, at.y - BUILD_R + 4, 'b-' + k).setScale(PROP_SCALE).setOrigin(0.5, 1).setDepth(at.y - BUILD_R + 4);
      const sh = k === 'bridge' ? undefined : this.shadow(at.x, at.y - BUILD_R + 2, img.displayWidth * 0.85, 24, 0.24).setDepth(at.y - BUILD_R + 3).setVisible(false);
      this.bgfx.set(k, { img: img.setVisible(false), sh, built: false });
    }
  }

  private drawBuilds(v: View, _now: number) {
    if (!v.builds || !v.cottage) return;
    // snow map: the igloo is the level-1 base (Art: cottage footprint); upgrades use the cottage art
    const lvl = Math.max(1, Math.min(3, v.cottage.level));
    const ck = this.s.biome === 'snow' && lvl === 1 ? 'w-igloo' : 'b-cottage-' + lvl;
    if (this.cottageImg.texture.key !== ck) this.cottageImg.setTexture(ck).setScale(PROP_SCALE);
    for (const b of v.builds) {
      const g = this.bgfx.get(b.kind);
      if (!g) continue;
      const on = b.state === 2;
      if (on !== g.built) { g.built = on; g.img.setVisible(on); g.sh?.setVisible(on); }
    }
    this.drawYard(lvl, v.builds.filter((b) => b.state === 2 && b.kind !== 'bridge').map((b) => b.kind));
    this.drawArrows(v);
  }

  /** Organic yard (Stefan: dynamic size and shape, brown ground under new buildings, no hard outline): a blob
   *  around the cottage (bigger per cottage level) plus a small patch under each built building, each with a wobbly
   *  seeded edge that dithers softly into the grass. Pixels are Art's dirt tiles (meadow) or packed snow. */
  /** Meadow ground in Ninja Adventure tiles (ART_MAP 1-2), 16 px per tile, shown at NINJA_SCALE: lime grass with a
   *  sprinkle of tuft variants and small flowers, and the water corner as a grass-shore autotile. */
  private bakeNinjaMeadow(gc: HTMLCanvasElement, r: () => number) {
    const gx = gc.getContext('2d')!;
    const floor = this.textures.get('n-floor').getSourceImage() as HTMLImageElement;
    const detail = this.textures.get('n-floordetail').getSourceImage() as HTMLImageElement;
    const water = this.textures.get('n-water').getSourceImage() as HTMLImageElement;
    const tile = (img: HTMLImageElement, sx: number, sy: number, tx: number, ty: number) => gx.drawImage(img, sx, sy, 16, 16, tx * 16, ty * 16, 16, 16);
    const snow = this.s.biome === 'snow';
    // meadow: lime grass + tuft variants; snow: shaded snow + its variants (ART_MAP 1 and 3)
    const FILL: [number, number] = snow ? [0, 304] : [0, 192];
    const VARIANTS: [number, number][] = snow ? [[16, 304], [32, 304], [48, 304], [64, 304]] : [[16, 192], [32, 192], [48, 192], [64, 192], [32, 176], [48, 176]];
    const DETAIL_Y = snow ? 48 : 32; // snowy or green tufts
    const wet = BUILDING_ENABLED ? waterTiles(makeWater(this.s.seed).water) : [];
    const isWet = new Set(wet.map((t) => t.tx + ',' + t.ty));
    // frozen ponds (the sim's ice ellipses) as tiles, autotiled with the ice-on-snow block
    const iceMask = new Set<string>();
    if (snow) for (const e of makeIce(this.s.seed)) {
      const rx = ICE_RX + 24, ry = ICE_RY + 24;
      for (let ty = Math.floor((e.y - ry) / WATER_TILE); ty <= Math.floor((e.y + ry) / WATER_TILE); ty++) for (let tx = Math.floor((e.x - rx) / WATER_TILE); tx <= Math.floor((e.x + rx) / WATER_TILE); tx++) {
        const dx = ((tx + 0.5) * WATER_TILE - e.x) / rx, dy = ((ty + 0.5) * WATER_TILE - e.y) / ry;
        if (dx * dx + dy * dy <= 1) iceMask.add(tx + ',' + ty);
      }
    }
    const ice = autotileMask(iceMask);
    const isIce = new Set(ice.map((t) => t.tx + ',' + t.ty));
    for (let ty = 0; ty < NINJA_ROWS; ty++) for (let tx = 0; tx < NINJA_COLS; tx++) {
      const v = r();
      const [sx, sy] = v < 1 / 6 ? VARIANTS[Math.floor(r() * VARIANTS.length)] : FILL;
      tile(floor, sx, sy, tx, ty);
      const k = tx + ',' + ty;
      if (!isWet.has(k) && !isIce.has(k) && r() < (snow ? 0.03 : 0.0075)) tile(detail, [0, 16, 32, 48, 80, 96, 112][Math.floor(r() * 7)], DETAIL_Y, tx, ty); // meadow declutter: ~75% fewer tufts
    }
    // water: grass-shore block (0,96) on the meadow, the white/ice-shore block (208,0) on the snow map
    const wb = snow ? [208, 0] : [0, 96];
    const winner = { inw: [wb[0] + 96, wb[1] + 32], ine: [wb[0] + 80, wb[1] + 32], isw: [wb[0] + 96, wb[1] + 16], ise: [wb[0] + 80, wb[1] + 16] } as Record<'inw' | 'ine' | 'isw' | 'ise', [number, number]>;
    for (const t of wet) { const [sx, sy] = autoFrame(t.shore, wb[0], wb[1], winner, [wb[0] + 16, wb[1] + 16]); tile(water, sx, sy, t.tx, t.ty); }
    // Ninja's ice block sits on white snow: lay a white snow patch one tile wider than each pond first (block 0,224)
    const white = new Set<string>();
    for (const t of ice) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) white.add((t.tx + dx) + ',' + (t.ty + dy));
    const sinner = { inw: [96, 256], ine: [80, 256], isw: [96, 240], ise: [80, 240] } as Record<'inw' | 'ine' | 'isw' | 'ise', [number, number]>;
    for (const t of autotileMask(white)) { const [sx, sy] = autoFrame(t.shore, 0, 224, sinner, [16, 240]); tile(floor, sx, sy, t.tx, t.ty); }
    const iinner = { inw: [96, 368], ine: [80, 368], isw: [96, 352], ise: [80, 352] } as Record<'inw' | 'ine' | 'isw' | 'ise', [number, number]>;
    for (const t of ice) { const [sx, sy] = autoFrame(t.shore, 0, 336, iinner, [16, 352]); tile(floor, sx, sy, t.tx, t.ty); }
  }

  /** Meadow yard + path in Ninja dirt tiles: the yard is a blob of tiles round the cottage (bigger per level) plus a
   *  patch under every built building, and a 2-tile path runs to the cave; autotiled with the dirt-on-grass block. */
  private drawNinjaDirt(level: number, built: BuildKind[]) {
    const key = `ndirt-${this.s.biome ?? 'meadow'}-${this.s.seed}-${level}-${YARD_ENABLED ? [...built].sort().join(',') : 'off'}`;
    if (key === this.yardKey) return;
    if (!this.textures.exists(key)) {
      const T = WATER_TILE, mask = new Set<string>();
      const wet = new Set(BUILDING_ENABLED ? waterTiles(makeWater(this.s.seed).water).map((t) => t.tx + ',' + t.ty) : []);
      const add = (tx: number, ty: number) => { if (tx >= 0 && ty >= 0 && tx < NINJA_COLS && ty < NINJA_ROWS && !wet.has(tx + ',' + ty)) mask.add(tx + ',' + ty); };
      const blob = (cx: number, cy: number, rx: number, ry: number) => {
        for (let ty = Math.floor((cy - ry) / T); ty <= Math.floor((cy + ry) / T); ty++) for (let tx = Math.floor((cx - rx) / T); tx <= Math.floor((cx + rx) / T); tx++) {
          const dx = ((tx + 0.5) * T - cx) / rx, dy = ((ty + 0.5) * T - cy) / ry;
          if (dx * dx + dy * dy <= 1) add(tx, ty);
        }
      };
      if (YARD_ENABLED) {
        blob(BASE.x, BASE.y + 6, 96 + 16 * level, 84 + 12 * level);
        for (const k of built) { const at = BUILD_SPOTS[k]; blob(at.x, at.y - 30, 66, 52); }
      }
      const routed = DUNGEON_ENABLED ? cavePath(this.s.seed) : new Set<string>();
      for (const k of routed) { const [tx, ty] = k.split(',').map(Number); add(tx, ty); }
      if (DUNGEON_ENABLED && !routed.size) { // no free route (very crowded seed): the old straight L path
        const e = entranceOf(this.s.seed), bx = Math.floor(BASE.x / T), by = Math.floor(BASE.y / T);
        const ex = Math.floor(e.x / T), ey = Math.floor(e.y / T);
        for (let x = Math.min(bx, ex); x <= Math.max(bx, ex); x++) { add(x, by); add(x, by + 1); }
        for (let y = Math.min(by, ey); y <= Math.max(by, ey); y++) { add(ex, y); add(ex + 1, y); }
      }
      const floor = this.textures.get('n-floor').getSourceImage() as HTMLImageElement;
      const c = document.createElement('canvas'); c.width = NINJA_COLS * 16; c.height = NINJA_ROWS * 16;
      const cx = c.getContext('2d')!;
      // meadow: dirt-on-grass block (0,112); snow: white snow patch on shaded snow (0,224)
      const by = this.s.biome === 'snow' ? 224 : 112;
      const inner = { inw: [96, by + 32], ine: [80, by + 32], isw: [96, by + 16], ise: [80, by + 16] } as Record<'inw' | 'ine' | 'isw' | 'ise', [number, number]>;
      const pebble: [number, number] = this.s.biome === 'snow' ? [16, by + 16] : [16, 176];
      for (const t of autotileMask(mask)) {
        const [sx, sy] = autoFrame(t.shore, 0, by, inner, t.shore === 'open2' ? pebble : [16, by + 16]);
        cx.drawImage(floor, sx, sy, 16, 16, t.tx * 16, t.ty * 16, 16, 16);
      }
      this.textures.addCanvas(key, c)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    const old = this.yardKey;
    if (!this.yardImg) this.yardImg = this.add.image(0, 0, key).setOrigin(0).setScale(NINJA_SCALE).setDepth(-950);
    else this.yardImg.setTexture(key);
    this.yardKey = key;
    if (old && old !== key && this.textures.exists(old)) this.textures.remove(old);
  }

  /** The yard / path overlay (see drawNinjaDirt), for both maps. */
  private drawYard(level: number, built: BuildKind[]) {
    this.drawNinjaDirt(level, built);
  }


  /** Edge arrows: with the watchtower, one per resource to the nearest node off-screen; and (no reading needed)
   *  a house arrow back to the cottage while the bank can pay for a building and the house is off-screen. */
  private drawArrows(v: View) {
    const box = document.getElementById('edge-arrows');
    if (!box) return;
    const tower = v.builds.some((b) => b.kind === 'watchtower' && b.state === 2);
    const cam = this.cameras.main, wv = cam.worldView;
    const onScreen = (p: { x: number; y: number }) => p.x > wv.x && p.x < wv.right && p.y > wv.y && p.y < wv.bottom;
    const goHome = BUILDING_ENABLED && v.phase === 'play' && v.mode === 'meadow' && !onScreen(BASE)
      && !!affordable(v.bank, v.builds, v.cottage?.level ?? 1);
    box.classList.toggle('hidden', !tower && !goHome);
    const me = this.blobs.get(this.s.myId);
    const point = (el: HTMLElement, t: { x: number; y: number } | null) => {
      if (!t) { el.style.display = 'none'; return; }
      const cx = wv.centerX, cy = wv.centerY;
      const ang = Math.atan2(t.y - cy, t.x - cx);
      // where the ray from the view centre leaves the view (inset), in screen pixels
      const hw = wv.width / 2 - 40 / cam.zoom, hh = wv.height / 2 - 60 / cam.zoom;
      const sc = Math.min(Math.abs(hw / Math.cos(ang) || Infinity), Math.abs(hh / Math.sin(ang) || Infinity));
      const sx = (cx + Math.cos(ang) * sc - wv.x) * cam.zoom, sy = (cy + Math.sin(ang) * sc - wv.y) * cam.zoom;
      el.style.display = 'flex';
      el.style.left = sx + 'px'; el.style.top = sy + 'px';
      (el.querySelector('.arr') as HTMLElement).style.transform = `rotate(${ang}rad)`;
    };
    const home = box.querySelector<HTMLElement>('[data-k="home"]');
    if (home) point(home, goHome ? BASE : null);
    for (const k of RES) {
      const el = box.querySelector<HTMLElement>(`[data-k="${k}"]`);
      if (!el) continue;
      let best: { x: number; y: number } | null = null, bd = Infinity;
      if (tower) this.nodes.forEach((n, i) => {
        if ((v.nodes[i] ?? 0) <= 0 || nodeRes(n.kind) !== k) return;
        if (onScreen(n)) { bd = -1; return; } // one is on screen already
        const d = me ? Math.hypot(n.x - me.x, n.y - me.y) : 0;
        if (bd >= 0 && d < bd) { bd = d; best = n; }
      });
      point(el, bd < 0 ? null : best);
    }
  }

  /** The bank beside the cottage: up to 6 icons per resource in little heaps. */
  private drawPile(bank: Res | undefined) {
    if (!bank) return;
    const shown = RES.map((k) => Math.min(6, bank[k]));
    const key = shown.join(',');
    if (key === this.pileKey) return;
    this.pileKey = key;
    this.pile.removeAll(true);
    RES.forEach((k, col) => {
      for (let i = 0; i < shown[col]; i++) {
        const row = i < 3 ? 0 : i < 5 ? 1 : 2, inRow = i < 3 ? i : i < 5 ? i - 3 : 0;
        const x = col * 34 + (inRow - (row === 0 ? 1 : row === 1 ? 0.5 : 0)) * 10, y = -row * 8;
        this.pile.add(this.add.image(x, y, ITEM_ICON[k]).setScale(1));
      }
    });
  }

  /** Tool swing in front of the blob (4-frame strip, pivot at the hand), flipped when facing left. */
  private drawTool(b: BlobGfx, dt: number) {
    if (!b.tool) return;
    b.swingT = Math.max(0, b.swingT - dt);
    if (b.swingT <= 0) { b.tool.setVisible(false); return; }
    const sc = b.baseScale;
    const k = 1 - b.swingT / 0.32; // 0 -> 1 over the swing
    // blob grid top-left, then the hand at the body's side edge, ~2/3 down the grid (mirrored when facing left)
    const left = b.body.x - (GRID_W / 2) * sc, top = b.body.y - BODY_CY * GRID_H * sc;
    const hx = left + (b.faceLeft ? 3 : GRID_W - 3) * sc, hy = top + Math.round(GRID_H * 0.69) * sc;
    // Ninja tool icon (head top-right, handle bottom-left), held at the handle and swung down in front of the blob
    const ang = -60 + 110 * Math.sin(Math.min(1, k * 1.25) * Math.PI / 2);
    b.tool.setVisible(true).setScale(TOOL_SCALE).setFlipX(b.faceLeft).setOrigin(b.faceLeft ? 0.85 : 0.15, 0.85)
      .setAngle(b.faceLeft ? -ang : ang).setPosition(hx, hy).setDepth(b.body.depth + 1);
  }

  private swing(id: string, tool: Tool, nx: number) {
    const b = this.blobs.get(id);
    if (!b) return;
    if (!b.tool) b.tool = this.add.sprite(0, 0, 'nt-' + tool).setVisible(false);
    if (b.tool.texture.key !== 'nt-' + tool) b.tool.setTexture('nt-' + tool);
    b.faceLeft = nx < b.x;
    b.swingT = 0.32;
  }

  /** Bärregn: a fenced field over the base, falling berries/bombs with their landing marks; the camera frames it. */
  private drawMini(v: View) {
    const on = v.phase === 'mini' && !!v.mini;
    this.dB = on ? 10000 : 0;
    if (on && !this.miniG) {
      const a = ARENA, g = this.add.graphics().setDepth(9000);
      // dim everything around the field so eyes go to the rain
      g.fillStyle(0x1b1018, 0.72).fillRect(a.x0 - 3000, a.y0 - 3000, a.x1 - a.x0 + 6000, a.y1 - a.y0 + 6000);
      if (this.s.biome === 'snow' || !this.textures.exists('mini-bg')) { // archived snow map: the old drawn field
        g.fillStyle(0x3f2631, 1).fillRect(a.x0 - 10, a.y0 - 10, a.x1 - a.x0 + 20, a.y1 - a.y0 + 20);
        g.fillStyle(0x8a5a3c, 1).fillRect(a.x0 - 6, a.y0 - 6, a.x1 - a.x0 + 12, a.y1 - a.y0 + 12);
        g.fillStyle(this.s.biome === 'snow' ? 0xe6f1f8 : 0x86cf5a, 1).fillRect(a.x0, a.y0, a.x1 - a.x0, a.y1 - a.y0);
        const r = rng(7);
        for (let i = 0; i < 90; i++) g.fillStyle(this.s.biome === 'snow' ? 0xcfe1ee : 0x6fbd47, 1).fillRect(a.x0 + r() * (a.x1 - a.x0 - 8), a.y0 + r() * (a.y1 - a.y0 - 4), 8, 3);
      } else { // the painted sunset field fills the whole screen (sized in fitCamera)
        this.miniBg = this.add.image(0, 0, 'mini-bg').setDepth(9001);
        this.miniDeco.push(this.miniBg);
      }
      this.miniG = g;
      // a wooden fence around the field (the puzzle-pen fence art): planks on top/bottom, posts on the sides
      const S = 3, n = Math.round((a.x1 - a.x0) / (16 * S)), tw = (a.x1 - a.x0 + 12) / n;
      for (const y of [a.y0 + 2, a.y1 + 10]) for (let k = 0; k < n; k++) {
        this.miniDeco.push(this.add.image(a.x0 - 6 + tw * (k + 0.5), y, 'pr-fence').setOrigin(0.5, 1).setDisplaySize(tw + 1, 16 * S).setDepth(y === a.y0 + 2 ? 9050 : 10000 + a.y1 + 20));
      }
      for (const x of [a.x0 - 4, a.x1 + 4]) for (let y = a.y0 + 48; y <= a.y1 + 8; y += 48) {
        this.miniDeco.push(this.add.image(x, y, 'pr-gate-post').setOrigin(0.5, 1).setScale(S).setDepth(10000 + y));
      }
      this.trailG.setDepth(9500);
      this.fitCamera();
    } else if (!on && this.miniG) {
      this.miniG.destroy(); this.miniG = undefined;
      for (const o of this.miniDeco) o.destroy();
      this.miniDeco = [];
      for (const b of this.blobs.values()) b.body.setAlpha(1);
      this.trailG.setDepth(-400);
      for (const d of this.drops.values()) { d.item.destroy(); d.mark.destroy(); }
      this.drops.clear();
      this.fitCamera();
    }
    if (!on) return;
    const seen = new Set<number>();
    for (const d of v.mini!.drops) {
      seen.add(d.id);
      let e = this.drops.get(d.id);
      if (!e) {
        const bomb = d.kind === 'bomb';
        e = {
          // bombs: Art's red slam ring marks the blast area; berries: a plain shadow
          mark: bomb ? this.add.image(d.x, d.y, 'mini-warn').setDisplaySize(BOMB_R * 2, BOMB_R).setDepth(9100) : this.add.ellipse(d.x, d.y + 4, 30, 10, 0x000000, 0.25).setDepth(9100),
          item: bomb ? this.add.image(d.x, d.y, 'pr-rock').setScale(1).setTint(0x2e2a3a).setDepth(10000 + d.y + 5) : this.add.image(d.x, d.y, 'g-item-berries').setScale(2).setDepth(10000 + d.y + 5),
        };
        this.drops.set(d.id, e);
      }
      const k = 1 - d.z / DROP_HEIGHT; // 0 when it appears, 1 when it lands
      e.item.setPosition(d.x, d.y - d.z - 6);
      if (d.kind === 'bomb') {
        // blinks red, faster the closer it gets to the ground
        const hz = 2 + 10 * k;
        e.item.setTint(Math.floor(this.time.now / 1000 * hz) % 2 ? 0xd2342c : 0x2e2a3a).setAngle(Math.sin(this.time.now / 90) * 8);
      } else e.item.setAngle(Math.sin(this.time.now / 160 + d.id) * 12);
      if (e.mark instanceof Phaser.GameObjects.Ellipse) e.mark.setScale(0.5 + 0.5 * k).setAlpha(0.2 + 0.5 * k);
      else e.mark.setAlpha(0.25 + 0.7 * k);
    }
    for (const [id, e] of this.drops) if (!seen.has(id)) { e.item.destroy(); e.mark.destroy(); this.drops.delete(id); }
  }

  /** Fenced pen (static) + gate, plates, count bubbles and the bonus chest. */
  private buildPuzzle(l: PuzzleLayout): PuzzleGfx {
    const S = 3;
    for (const w of l.walls) {
      const wide = w.x1 - w.x0 > w.y1 - w.y0;
      if (wide) {
        // fence planks along the run, evenly stretched so the ends line up with the corners
        const n = Math.max(1, Math.round((w.x1 - w.x0) / (16 * S)));
        const tw = (w.x1 - w.x0) / n;
        for (let k = 0; k < n; k++) this.add.image(w.x0 + tw * (k + 0.5), w.y1 + 4, 'pr-fence').setOrigin(0.5, 1).setDisplaySize(tw + 1, 16 * S).setDepth(w.y1);
      } else {
        // side fences seen from above: a column of posts
        // side fences seen from above: Ninja's vertical fence pole tiled down the run
        for (let y = w.y0 + 16 * S; y <= w.y1 + 16 * S - 1; y += 16 * S) this.add.image((w.x0 + w.x1) / 2, Math.min(y, w.y1 + 4), 'pr-gate-post').setOrigin(0.5, 1).setScale(S).setDepth(Math.min(y, w.y1));
      }
    }
    const gate = this.add.image(l.cx, l.gate.y1 + 4, 'pr-gate').setOrigin(0.5, 1).setDisplaySize(GATE_W + 2, 16 * S).setDepth(l.gate.y1);
    const glow = this.add.graphics().setDepth(-460);
    const chest = this.add.image(l.chest.x, l.chest.y, 'ic-chest').setScale(PROP_SCALE).setDepth(l.chest.y);
    const plates = l.plates.map((p) => this.add.image(p.x, p.y, 'pr-plate').setScale(S).setDepth(-700).setVisible(false));
    const glows = l.plates.map((p) => this.add.sprite(p.x, p.y + 2, 'fx-plate-glow', 0).setScale(2).setDepth(-690).setVisible(false).play('plate-glow'));
    const bubbles = l.plates.map((p) => this.add.text(p.x, p.y - 72, '', {
      fontFamily: "'Fredoka', sans-serif", fontSize: '20px', color: '#3f2631', fontStyle: 'bold',
      backgroundColor: '#fff7e6', padding: { x: 7, y: 2 }, stroke: '#fff7e6', strokeThickness: 1,
    }).setOrigin(0.5).setDepth(4000).setVisible(false));
    return { l, plates, glows, bubbles, gate, chest, glow, open: false, taken: false };
  }

  private drawPuzzle(g: PuzzleGfx | undefined, z: View['puzzles'][number], now: number) {
    if (!g) return;
    const held = [0, 1, 2].filter((k) => z.mask & (1 << k)).length;
    g.glow.clear();
    g.plates.forEach((pl, k) => {
      const used = k < z.need;
      const down = !!(z.mask & (1 << k)) || z.open;
      pl.setVisible(used).setTexture(down ? 'pr-plate-down' : 'pr-plate');
      // Art's glow ring pulses on held plates
      g.glows[k].setVisible(used && down && !z.open).setAlpha(0.55 + 0.4 * Math.sin(now / 160 + k));
      const b = g.bubbles[k];
      b.setVisible(used && !z.open);
      if (used && !z.open) {
        const t = `${held}/${z.need}`;
        if (b.text !== t) b.setText(t);
        b.setColor(down ? '#2f8a2f' : '#3f2631');
        b.setY(pl.y - 72 + Math.sin(now / 300 + k) * 3);
        // light ring on empty plates so they read as "stand here"
        if (!down) g.glow.lineStyle(3, 0xffffff, 0.45 + 0.3 * Math.sin(now / 220 + k)).strokeCircle(pl.x, pl.y, PLATE_R + 6);
      }
    });
    if (z.open !== g.open) {
      g.open = z.open;
      // once opened the gate simply disappears (no gate swung to vertical; Stefan 2026-11-15)
      g.gate.setVisible(!z.open);
    }
    if (z.taken !== g.taken) {
      g.taken = z.taken;
      g.chest.setVisible(!z.taken);
    }
    if (!z.taken) {
      g.chest.setY(g.l.chest.y - (z.open ? Math.abs(Math.sin(now / 200)) * 6 : 0));
      if (z.open) g.glow.fillStyle(0xffe08a, 0.3 + 0.15 * Math.sin(now / 120)).fillCircle(g.l.chest.x, g.l.chest.y + 4, 30);
    }
  }

  private drawGem(g: Phaser.GameObjects.Graphics, x: number, y: number, holders: number, now: number) {
    // treasure chest (Tiny Dungeon) is a separate image; this draws its shadow + carry ring
    g.clear().setDepth(y - 1);
    g.fillStyle(0x000000, 0.22).fillEllipse(x, y + 20, 46, 12);
    if (holders >= 2) g.fillStyle(0xffe08a, 0.25 + 0.15 * Math.sin(now / 100)).fillCircle(x, y, 40);
    else g.lineStyle(2, 0xffffff, 0.4 + 0.2 * Math.sin(now / 300)).strokeCircle(x, y, 62);
  }

  private playFx(f: FxEvent) {
    if (f.t === 'gain') {
      sfx.score();
      // "+2 [wood]" rows floating up from the base, one per resource
      const parts = RES.filter((k) => f.r[k] > 0);
      parts.forEach((k, j) => {
        const y = f.y - j * 30;
        const t = this.add.text(f.x - 6, y, '+' + f.r[k], { fontFamily: "'Fredoka', sans-serif", fontSize: '26px', color: '#ffe08a', fontStyle: 'bold', stroke: '#6b4a2a', strokeThickness: 5 }).setOrigin(1, 0.5);
        const ic = this.add.image(f.x + 14, y, ITEM_ICON[k]).setScale(2);
        const c = this.add.container(0, 0, [t, ic]).setDepth(5000);
        this.tweens.add({ targets: c, y: -50, alpha: 0, duration: 1100, delay: j * 80, ease: 'Cubic.Out', onComplete: () => c.destroy() });
      });
      // juice (PLAN step 5): the delivered items hop over to the storage pile beside the cottage, which bounces
      let n = 0;
      for (const k of parts) for (let i = 0; i < Math.min(4, f.r[k]); i++, n++) {
        const it = this.add.image(f.x + (Math.random() - 0.5) * 20, f.y - 26, ITEM_ICON[k]).setScale(ITEM_SCALE[k] ?? 2).setDepth(5200);
        const tx = this.pile.x + (Math.random() - 0.5) * 24, ty = this.pile.y - 6;
        this.tweens.add({ targets: it, x: tx, duration: 420, delay: n * 70, ease: 'Sine.InOut' });
        this.tweens.add({
          targets: it, y: { from: it.y, to: ty }, duration: 420, delay: n * 70, ease: (t: number) => t * t, // falls into the pile
          onStart: () => this.tweens.add({ targets: it, scale: (ITEM_SCALE[k] ?? 2) * 1.2, duration: 210, yoyo: true }),
          onComplete: () => { it.destroy(); this.tweens.add({ targets: this.pile, scaleX: 1.12, scaleY: 0.9, duration: 90, yoyo: true }); },
        });
      }
    } else if (f.t === 'hit') {
      this.swing(f.id, f.tool, f.x);
      const n = this.nodes[f.node];
      if (n) {
        // shake the node, chips fly off
        this.tweens.add({ targets: n.img, x: { from: n.x - 4, to: n.x }, duration: 140, ease: 'Bounce.Out' });
        const chips = f.tool === 'pickaxe' ? 'chips-stone' : 'chips-wood';
        if (f.tool !== 'rake') {
          const c = this.add.sprite(n.x, n.y - 6, chips, 0).setScale(2).setOrigin(0.5, 1).setDepth(n.y + 50);
          this.time.delayedCall(70, () => c.active && c.setFrame(1));
          this.time.delayedCall(140, () => c.active && c.setFrame(2));
          this.tweens.add({ targets: c, alpha: 0, y: n.y - 16, duration: 260, delay: 120, onComplete: () => c.destroy() });
        } else this.burst(n.x, n.y - 10, 0x6cc644, 6);
      }
      sfx.tool(f.tool, f.drop);
    } else if (f.t === 'pick') {
      sfx.pick();
      const sp = this.add.sprite(f.x, f.y - 8, 'm-sparkle', 0).setScale(1.5).setDepth(5000);
      sp.play('m-sparkle');
      sp.once('animationcomplete', () => sp.destroy());
    } else if (f.t === 'bump') {
      sfx.bump();
      this.burst(f.x, f.y - 20, 0x5aa83a, 8);
      this.cameras.main.shake(80, 0.003);
    } else if (f.t === 'catch') {
      sfx.pick();
      const sp = this.add.sprite(f.x, f.y - 20, 'm-sparkle', 0).setScale(1.5).setDepth(20000);
      sp.play('m-sparkle'); sp.once('animationcomplete', () => sp.destroy());
      const t = this.add.text(f.x, f.y - 40, '+1', { fontFamily: "'Fredoka', sans-serif", fontSize: '24px', color: '#ffe08a', fontStyle: 'bold', stroke: '#6b4a2a', strokeThickness: 5 }).setOrigin(0.5).setDepth(20000);
      this.tweens.add({ targets: t, y: f.y - 80, alpha: 0, duration: 700, onComplete: () => t.destroy() });
    } else if (f.t === 'miss') {
      // the berry splats flat on the grass and fades
      const sq = this.add.image(f.x, f.y - 2, 'g-item-berries').setScale(2).setDepth(9200);
      this.tweens.add({ targets: sq, scaleY: 0.5, scaleX: 2.6, alpha: 0, duration: 520, ease: 'Quad.Out', onComplete: () => sq.destroy() });
      this.burst(f.x, f.y, 0xc0392b, 4);
    } else if (f.t === 'boom') {
      sfx.bump();
      const w = this.add.sprite(f.x, f.y, 'mini-wave', 0).setDisplaySize(BOMB_R * 2.2, BOMB_R * 1.1).setDepth(20000);
      w.play('mini-wave'); w.once('animationcomplete', () => w.destroy());
      this.burst(f.x, f.y - 10, 0xffa040, 10);
      this.cameras.main.shake(120, 0.004);
    } else if (f.t === 'stun') {
      const b = this.blobs.get(f.id);
      if (b) {
        const st = this.add.sprite(b.x, b.y - 46, 'mini-ko', 0).setScale(1).setDepth(20001);
        st.play('mini-ko');
        const follow = this.time.addEvent({ delay: 16, loop: true, callback: () => st.setPosition(b.x, b.y - 46) });
        const blink = this.tweens.add({ targets: b.body, alpha: 0.45, duration: 110, yoyo: true, repeat: -1 });
        this.time.delayedCall(1000, () => { follow.remove(); st.destroy(); blink.remove(); b.body.setAlpha(1); });
      }
    } else if (f.t === 'build') {
      // the new building pops up at its spot with a dust cloud (the cottage: on the base)
      sfx.power(); sfx.star();
      const g = f.kind === 'cottage' ? null : this.bgfx.get(f.kind);
      const img = f.kind === 'cottage' ? this.cottageImg : g?.img;
      if (g) { g.built = true; g.img.setVisible(true); g.sh?.setVisible(true); }
      // juice (PLAN step 5): the building drops in from above, lands with a bounce, then the dust flies
      if (img) {
        const y0 = img.y;
        img.setY(y0 - 90).setAlpha(0);
        this.tweens.add({ targets: img, alpha: 1, duration: 120 });
        this.tweens.add({
          targets: img, y: y0, duration: 560, ease: 'Bounce.Out',
          onComplete: () => { for (let i = 0; i < 3; i++) this.time.delayedCall(i * 60, () => this.puff(f.x + (i - 1) * 26, f.y + 6, (i - 1) * 70, -30, 7)); this.cameras.main.shake(90, 0.003); },
        });
      } else for (let i = 0; i < 3; i++) this.time.delayedCall(i * 90, () => this.puff(f.x + (i - 1) * 22, f.y + 6, (i - 1) * 60, -40, 6));
      const fx = this.add.sprite(f.x, f.y - 6, 'fx-levelup').setScale(2).setDepth(4500);
      fx.play('levelup');
      fx.once('animationcomplete', () => fx.destroy());
      this.cameras.main.shake(120, 0.003);
    } else if (f.t === 'gate') {
      sfx.star();
      this.burst(f.x, f.y, 0xffe08a, 12);
      this.cameras.main.shake(120, 0.004);
    } else if (f.t === 'power') {
      sfx.power();
      const c = this.add.circle(f.x, f.y, 10, f.kind === 'speed' ? 0xffc93c : 0xff6b8b, 0.6).setDepth(5000);
      this.tweens.add({ targets: c, scale: 5, alpha: 0, duration: 400, onComplete: () => c.destroy() });
    }
  }

  /** Little white dust puffs behind the blob, drifting against its motion. */
  private puff(x: number, y: number, vx: number, vy: number, n: number) {
    // spawn just behind the blob and drift straight back (against the travel direction), faster = further
    const sp = Math.hypot(vx, vy) || 1;
    const bx = -vx / sp, by = -vy / sp;
    const reach = 18 + Math.min(40, sp * 0.12);
    for (let i = 0; i < n; i++) {
      const a = Math.atan2(by, bx) + (Math.random() - 0.5) * 0.7;
      const side = (Math.random() - 0.5) * 14;
      const sx = x + bx * 12 - by * side, sy = y + by * 8 + bx * side * 0.5;
      // Art's 4-frame dust puff (fx/dust.png), drifting back against the travel direction
      const c = this.add.sprite(sx, sy, 'fx-dust', 0).setOrigin(0.5, 1).setScale(1).setDepth(sy - 15);
      this.time.delayedCall(i * 18, () => c.active && c.play('dust'));
      this.tweens.add({ targets: c, x: sx + Math.cos(a) * reach, y: sy + Math.sin(a) * reach * 0.7, alpha: 0, duration: 420 + Math.random() * 140, delay: i * 18, ease: 'Cubic.Out', onComplete: () => c.destroy() });
    }
  }

  private burst(x: number, y: number, color: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const d = this.add.circle(x, y, 3, color).setDepth(this.dB ? 20000 : 5000);
      this.tweens.add({ targets: d, x: x + Math.cos(a) * 26, y: y + Math.sin(a) * 26, alpha: 0, duration: 350, onComplete: () => d.destroy() });
    }
  }

  get view() { return this.lastView; }
}
