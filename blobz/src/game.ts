// Phaser scene: renders a View (from the host sim or from network snapshots).
import Phaser from 'phaser';
import { blobCanvas, BLOB_FRAMES, BODY_CY, clampLook, facingFromVelocity, GRID_H, GRID_W, type Facing } from './blob';
import { sfx } from './sfx';
import { dungeonFrame } from './dungeonScene'; // [dungeon hook]
import { BASE, GATE_W, makePuzzles, makeTrees, PLATE_R, rng, WORLD_H, WORLD_W } from './sim';
import { isSolid, RES } from './sim';
import { affordable, BUILDING_ENABLED, BUILD_KINDS, BUILD_R, BUILD_SPOTS, COTTAGE_PAD, makeWater, nodeRes } from './sim';
import type { Biome, BuildKind } from './sim';
import { makeIce } from './sim';
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
const FINE = ['icons/log', 'icons/chest', 'icons/boot', 'icons/magnet', 'gather/item-stone', 'gather/item-berries'];
const ITEM_SCALE: Record<ItemKind, number> = { wood: 1, stone: 1.5, berry: 1.5 };
const CARRY_SCALE: Record<ItemKind, number> = { wood: 0.5, stone: 1, berry: 1 };
const GATHER = ['bush-berries', 'bush-empty', 'rubble', 'item-stone', 'item-berries', 'hud-wood', 'hud-stone', 'hud-berries'];
const TOOL_FRAME = { w: 44, h: 48, px: 16, py: 28 }; // tool strip frame + pivot (art/gather/README.md)
// Obstacles (sim kinds 0-4) and decor from ChatGPT order 30 (public/art/props)
const OBSTACLE_ART: [string, number][] = [['pr-tree-green', 3], ['pr-tree-orange', 3], ['pr-tree-pine', 3], ['pr-rock', 3], ['pr-boulder', 3], ['g-bush-berries', 3]];
/** Snow map: Art's winter props (art/props-winter), integer scales. Kinds without winter art yet use a
 *  cold-tinted meadow sprite; a dedicated file is picked up automatically once it exists (WINTER_WANTED). */
const WINTER_ART: [string, number][] = [['w-tree-snow-round', 3], ['w-tree-snow-pine', 3], ['w-tree-snow-small', 4], ['w-rock-snow', 3], ['w-ice-rock', 4], ['w-bush-berries-snow', 3]];
const WINTER_SPENT: [string, number][] = [['w-stump-snow', 3], ['w-stump-snow', 3], ['w-stump-snow', 3], ['w-rubble-snow', 3], ['w-rubble-snow', 3], ['w-bush-empty-snow', 3]];
/** Winter files Art has not drawn yet and their tinted stand-ins (key -> [placeholder, tint]). */
const WINTER_WANTED: Record<string, [string, number]> = {
  'w-stump-snow': ['pr-stump', 0xe8f2ff], 'w-rubble-snow': ['g-rubble', 0xe8f2ff],
};
const WINTER = ['tree-snow-round', 'tree-snow-pine', 'tree-snow-small', 'rock-snow', 'ice-rock', 'bush-berries-snow', 'bush-empty-snow', 'snowman', 'igloo', 'ice', 'tree-bare', ...Object.keys(WINTER_WANTED).map((k) => k.slice(2))];

/** Look of a used-up node: stump, rubble, picked bush. */
const SPENT_ART: [string, number][] = [['pr-stump', 3], ['pr-stump', 3], ['pr-stump', 3], ['g-rubble', 3], ['g-rubble', 3], ['g-bush-empty', 3]];
const PROPS = ['tree-green', 'tree-orange', 'tree-pine', 'rock', 'boulder', 'bush', 'flowers', 'stump', 'pond', 'fence', 'sign', 'plate', 'plate-down', 'gate', 'gate-open', 'gate-post'];
/** The organic dirt yard around the cottage and under buildings. false = plain grass everywhere ("no ground" test). */
export const YARD_ENABLED = true;
const DEBUG = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');
/** Below this speed (px/s) the face looks straight ahead. */
const FACE_DEAD = 40;
const BLOB_SCALE = 3; // blobz v2: 16x18 grid on the Ninja 16 px grid, drawn at the Ninja world scale
const TOOL_SCALE = 1.45; // the tool strips keep their old size
// decorations from Tiny Farm (sheet 'farm') and Tiny Town ('town')
const DECOR: [string, number][] = [['pr-flowers', 2]]; // no decor bushes: bushes are berry nodes now

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
  shadow: Phaser.GameObjects.Ellipse;
  body: Phaser.GameObjects.Image;
  eyes: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  carry: Phaser.GameObjects.Image[];
  aura: Phaser.GameObjects.Graphics;
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
  private drops = new Map<number, { item: Phaser.GameObjects.Image; mark: Phaser.GameObjects.Image | Phaser.GameObjects.Ellipse }>();
  private bgfx = new Map<BuildKind, { img: Phaser.GameObjects.Image; built: boolean }>();
  private cottageImg!: Phaser.GameObjects.Image;
  private water!: ReturnType<typeof makeWater>;
  private nodes: { img: Phaser.GameObjects.Image; kind: number; left: number; x: number; y: number; sc: number }[] = [];
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
    const art = (path: string) => `art/${FINE.includes(path) ? 'fine/' : ''}${path}.png`;
    for (const n of ['log', 'chest', 'boot', 'magnet', 'house']) this.load.image('ic-' + n, art(`icons/${n}`));
    this.load.image('m-base-marker', 'art/fine/icons/base-marker.png');
    this.load.spritesheet('f-grass', 'art/fine/tiles/grass.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('f-dirt', 'art/fine/tiles/dirt.png', { frameWidth: 32, frameHeight: 32 });
    for (const n of GATHER) this.load.image('g-' + n, art(`gather/${n}`));
    for (const t of ['axe', 'pickaxe', 'rake']) this.load.spritesheet('tool-' + t, `art/gather/tool-${t}.png`, { frameWidth: TOOL_FRAME.w, frameHeight: TOOL_FRAME.h });
    for (const c of ['wood', 'stone']) this.load.spritesheet('chips-' + c, `art/fine/gather/chips-${c}.png`, { frameWidth: 32, frameHeight: 24 });
    for (const n of PROPS) this.load.image('pr-' + n, `art/props/${n}.png`);
    this.load.spritesheet('fx-levelup', 'art/fine/fx/levelup.png', { frameWidth: 64, frameHeight: 44 });
    this.load.spritesheet('fx-dust', 'art/fine/fx/dust.png', { frameWidth: 28, frameHeight: 24 });
    // meadow keys ('m-sparkle'): the dungeon scene loads the old 11 px 'fx-sparkle' into the shared texture cache
    this.load.spritesheet('m-sparkle', 'art/fine/fx/coin-sparkle.png', { frameWidth: 22, frameHeight: 22 });
    this.load.image('fx-plate-glow', 'art/fine/fx/plate-glow.png');
    // Bärregn placeholders from existing sprites (real art via the board later)
    this.load.spritesheet('mini-ko', 'art/fine/dungeon/ko-stars.png', { frameWidth: 40, frameHeight: 18 });
    this.load.image('mini-warn', 'art/fine/dungeon/slam-warning.png');
    this.load.spritesheet('mini-wave', 'art/fine/dungeon/shockwave.png', { frameWidth: 96, frameHeight: 48 });
    for (const n of ['cottage-1', 'cottage-2', 'cottage-3', 'build-spot', ...BUILD_KINDS.flatMap((k) => [k, k + '-site'])]) this.load.image('b-' + n, `art/base/${n}.png`);
    const sheet = (key: string, dir: string) => this.load.spritesheet(key, `assets/${dir}/tilemap_packed.png`, { frameWidth: 16, frameHeight: 16 });
    sheet('town', 'kenney-tiny-town');
    sheet('dungeon', 'kenney-tiny-dungeon');
    sheet('farm', 'kenney-tiny-farm');
    sheet('battle', 'kenney-tiny-battle');
    if (this.s.biome === 'snow') {
      this.load.on('loaderror', () => { /* winter art not drawn yet: tinted stand-ins below */ });
      for (const n of WINTER) this.load.image('w-' + n, `art/props-winter/${n}.png`);
      this.load.spritesheet('w-pond', 'art/props-winter/pond-frozen-tiles.png', { frameWidth: 16, frameHeight: 16 });
    }
  }

  /** Texture, scale and tint for a node (biome aware, with stand-ins for missing winter art). */
  private nodeArt(kind: number, spent: boolean): [string, number, number] {
    if (this.s.biome !== 'snow') { const [k, sc] = (spent ? SPENT_ART : OBSTACLE_ART)[kind] ?? OBSTACLE_ART[0]; return [k, sc, 0xffffff]; }
    const [k, sc] = (spent ? WINTER_SPENT : WINTER_ART)[kind] ?? WINTER_ART[0];
    if (this.textures.exists(k)) return [k, sc, 0xffffff];
    const [stand, tint] = WINTER_WANTED[k] ?? ['pr-tree-green', 0xffffff];
    return [stand, (spent ? SPENT_ART : OBSTACLE_ART)[kind]?.[1] ?? sc, tint];
  }

  create() {
    for (const k of ['town', 'dungeon', 'farm', 'battle']) this.textures.get(k).setFilter(Phaser.Textures.FilterMode.NEAREST);
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
    const snow = this.s.biome === 'snow';
    const TP = snow ? 16 : 32; // art px per tile: Art's fine grass (32 px) is drawn at scale 1
    if (!this.textures.exists(groundKey)) {
      const grass = this.textures.get('f-grass').getSourceImage() as HTMLImageElement;
      const gc = document.createElement('canvas');
      gc.width = cols * TP; gc.height = rows * TP;
      const gx = gc.getContext('2d')!;
      if (this.s.biome === 'snow') {
        // snow: flat white with soft blue drifts and a few sparkles, in art pixels (no tile seams)
        gx.fillStyle = '#eef6fb'; gx.fillRect(0, 0, gc.width, gc.height);
        for (let i = 0; i < cols * rows * 0.6; i++) {
          const x = Math.floor(r() * gc.width), y = Math.floor(r() * gc.height);
          gx.fillStyle = '#d6e8f3'; gx.fillRect(x, y, 3 + Math.floor(r() * 4), 1); // a drift line
        }
        for (let i = 0; i < cols * rows * 0.25; i++) {
          gx.fillStyle = r() < 0.5 ? '#ffffff' : '#c3dcec';
          gx.fillRect(Math.floor(r() * gc.width), Math.floor(r() * gc.height), 1, 1);
        }
      } else {
        // grass frames 0 plain, 1 tufts, 2 flowers (same odds as the old Tiny Town tiles)
        data.forEach((row, ty) => row.forEach((f, tx) => gx.drawImage(grass, f * 32, 0, 32, 32, tx * 32, ty * 32, 32, 32)));
      }
      this.textures.addCanvas(groundKey, gc)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.add.image(0, 0, groundKey).setOrigin(0).setScale(32 / TP).setDepth(-1000);

    // base: round dirt yard with the cottage in the middle + glowing drop-off ring
    // the yard: an organic patch of dirt (packed snow on the snow map) that grows with the cottage and spreads
    // under every building as it is built; redrawn in drawYard() when that changes
    this.yardImg = undefined; this.yardKey = '';
    this.drawYard(1, []);
    this.baseG = this.add.graphics().setDepth(-900);
    this.add.ellipse(BASE.x, BASE.y + 26, 110, 26, 0x000000, 0.18).setDepth(-880);
    // cottage (Art's base set, level 1-3), integer scale 2, anchored bottom centre
    this.cottageImg = this.add.image(BASE.x, BASE.y + 30, this.s.biome === 'snow' ? 'w-igloo' : 'b-cottage-1').setScale(this.s.biome === 'snow' ? 4 : 3).setOrigin(0.5, 1).setDepth(BASE.y - 40);
    // the water corner (an L of water around a seeded corner; the bridge opens it)
    const water = makeWater(this.s.seed);
    this.water = water;
    if (BUILDING_ENABLED) {
      const wg = this.add.graphics().setDepth(-940);
      for (const w of water.water) {
        const x0 = Math.max(0, w.x0), x1 = Math.min(WORLD_W, w.x1), y0 = Math.max(0, w.y0), y1 = Math.min(WORLD_H, w.y1);
        wg.fillStyle(0x6b4a2a, 1).fillRect(x0 - 3, y0 - 3, x1 - x0 + 6, y1 - y0 + 6);
        wg.fillStyle(0x2f86c8, 1).fillRect(x0, y0, x1 - x0, y1 - y0);
        wg.fillStyle(0x3fa9f5, 1).fillRect(x0 + 5, y0 + 5, x1 - x0 - 10, y1 - y0 - 10);
      }
      for (const w of water.water) for (let i = 0; i < 8; i++) {
        const x = Math.max(0, w.x0) + 10 + ((i * 37) % Math.max(20, Math.min(WORLD_W, w.x1) - Math.max(0, w.x0) - 30));
        const y = Math.max(0, w.y0) + 10 + ((i * 53) % Math.max(20, Math.min(WORLD_H, w.y1) - Math.max(0, w.y0) - 20));
        wg.fillStyle(0x8fd3ff, 0.8).fillRect(x, y, 12, 3);
      }
      this.buildBase();
    }
    // "this is home": Art's base-marker sign (post foot = anchor), beside the drop-off (no reading needed; was BAS)
    this.add.image(BASE.x + 58, BASE.y + 62, 'm-base-marker').setOrigin(0.5, 1).setScale(1).setDepth(BASE.y + 62);

    // resource nodes (same layout as the host sim, from the shared seed); textures swap when used up
    this.nodes = makeTrees(this.s.seed).map((t) => {
      this.add.ellipse(t.x, t.y + 6, isSolid(t.kind) ? 34 : 40, 12, 0x000000, 0.18).setDepth(-500);
      const [key, sc, tint] = this.nodeArt(t.kind, false);
      const img = this.add.image(t.x, t.y + 10, key).setScale(sc).setTint(tint).setOrigin(0.5, t.kind < 3 ? 0.95 : 0.8).setDepth(isSolid(t.kind) ? t.y : t.y - 30);
      return { img, kind: t.kind, left: t.left, x: t.x, y: t.y, sc };
    });

    // flat decorations (no collision), from the same seed on every phone; never on the puzzle pens/plates
    const trees = makeTrees(this.s.seed);
    const zones = makePuzzles(this.s.seed).map((l) => l.zone);
    const ice = this.s.biome === 'snow' ? makeIce(this.s.seed) : [];
    for (const i of ice) zones.push({ x0: i.x - 70, x1: i.x + 70, y0: i.y - 40, y1: i.y + 40 });
    const inZone = (x: number, y: number, pad: number) => zones.some((z) => x > z.x0 - pad && x < z.x1 + pad && y > z.y0 - pad && y < z.y1 + pad)
      || (BUILDING_ENABLED && [...Object.values(BUILD_SPOTS), COTTAGE_PAD].some((p) => Math.hypot(p.x - x, p.y - y) < 60 + pad))
      || (BUILDING_ENABLED && [water.area, ...water.water].some((z) => x > z.x0 - pad && x < z.x1 + pad && y > z.y0 - pad && y < z.y1 + pad));
    for (let i = 0; i < 22; i++) {
      const x = 30 + r() * (WORLD_W - 60), y = 30 + r() * (WORLD_H - 60);
      const [key, sc] = this.s.biome === 'snow' ? (r() < 0.7 ? ['w-snowman', 3] as [string, number] : ['w-tree-bare', 3] as [string, number]) : DECOR[Math.floor(r() * DECOR.length)];
      if (Math.hypot(x - BASE.x, y - BASE.y) < BASE.r + 30 || trees.some((t) => Math.hypot(t.x - x, t.y - y) < 46) || inZone(x, y, 20)) continue;
      this.add.image(x, y, key).setScale(sc).setOrigin(0.5, 0.9).setDepth(key === 'pr-flowers' ? -600 : y);
    }
    if (this.s.biome === 'snow') {
      // frozen ponds (slippery in the sim) + an igloo or two
      // frozen ponds from Art's 3x3 autotile: 4x2 tiles at 2x = 128x64, the sim's ice ellipse
      for (const i of ice) {
        const frames = [[0, 1, 1, 2], [6, 7, 7, 8]];
        frames.forEach((row, ry) => row.forEach((f, cx) => this.add.image(i.x - 64 + cx * 32, i.y - 32 + ry * 32, 'w-pond', f).setOrigin(0).setScale(2).setDepth(-650)));
      }
      // a few small ice patches as decor
      for (let i = 0, placed = 0; i < 40 && placed < 3; i++) {
        const x = 120 + r() * (WORLD_W - 240), y = 120 + r() * (WORLD_H - 240);
        if (Math.hypot(x - BASE.x, y - BASE.y) < BASE.r + 220 || trees.some((t) => Math.hypot(t.x - x, t.y - y) < 60) || inZone(x, y, 30)) continue;
        this.add.image(x, y, 'w-ice').setScale(2).setDepth(-655); placed++;
      }
    }

    for (let i = 0, placed = 0; this.s.biome !== 'snow' && i < 40 && placed < 2; i++) {
      const x = 120 + r() * (WORLD_W - 240), y = 120 + r() * (WORLD_H - 240);
      if (Math.hypot(x - BASE.x, y - BASE.y) < BASE.r + 120 || trees.some((t) => Math.hypot(t.x - x, t.y - y) < 80) || inZone(x, y, 40)) continue;
      this.add.image(x, y, 'pr-pond').setScale(2).setDepth(-650); placed++;
    }

    this.pz = makePuzzles(this.s.seed).map((l) => this.buildPuzzle(l));
    // team bank: small stacks of wood / stone / berries beside the cottage
    this.pile = this.add.container(BASE.x + 52, BASE.y + 40).setDepth(BASE.y + 40);
    // dusk: warm tint over the world in the last 20 s of daylight
    this.dusk = this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W * 3, WORLD_H * 3, 0xff7a2f, 0).setDepth(8000);
    if (!this.anims.exists('mini-ko')) this.anims.create({ key: 'mini-ko', frames: this.anims.generateFrameNumbers('mini-ko', { start: 0, end: 1 }), frameRate: 6, repeat: -1 });
    if (!this.anims.exists('mini-wave')) this.anims.create({ key: 'mini-wave', frames: this.anims.generateFrameNumbers('mini-wave', { start: 0, end: 2 }), frameRate: 12 });
    if (!this.anims.exists('dust')) this.anims.create({ key: 'dust', frames: this.anims.generateFrameNumbers('fx-dust', { start: 0, end: 3 }), frameRate: 10 });
    if (!this.anims.exists('m-sparkle')) this.anims.create({ key: 'm-sparkle', frames: this.anims.generateFrameNumbers('m-sparkle', { frames: [0, 1, 2, 1, 0] }), frameRate: 16 });
    if (!this.anims.exists('levelup')) this.anims.create({ key: 'levelup', frames: this.anims.generateFrameNumbers('fx-levelup', { start: 0, end: 3 }), frameRate: 10 });

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
    if (this.miniG) {
      // Bärregn: the whole field on screen, below the mini HUD (~top 120 px) and above the buttons
      const top = 124, bottom = 24;
      const z = Math.min(w / (ARENA.x1 - ARENA.x0 + 40), (h - top - bottom) / (ARENA.y1 - ARENA.y0 + 30));
      this.cameras.main.setZoom(z);
      this.miniCenterY = (ARENA.y0 + ARENA.y1) / 2 - (top - bottom) / 2 / z;
      this.cameras.main.removeBounds();
      this.cameras.main.centerOn((ARENA.x0 + ARENA.x1) / 2, this.miniCenterY);
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
        e = { g: this.add.graphics(), img: this.add.image(g.x, g.y, 'ic-chest').setScale(1.5), t: [0, 1].map(() => this.add.image(0, 0, this.miniBlob()).setScale(1.8)), x: g.x, y: g.y };
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
      if (!n || (left > 0) === (n.left > 0)) { if (n) n.left = left; return; }
      n.left = left;
      const [key, sc, tint] = this.nodeArt(n.kind, left <= 0);
      n.img.setTexture(key).setScale(sc).setTint(tint).setOrigin(0.5, left > 0 && n.kind < 3 ? 0.95 : 0.8);
      n.sc = sc;
      if (left > 0) { n.img.setScale(sc * 0.3); this.tweens.add({ targets: n.img, scale: sc, duration: 300, ease: 'Back.Out' }); }
    });
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
        const bg = this.add.circle(0, 0, 18, w.kind === 'speed' ? 0x5ec8ff : 0xff6b8b, 0.35).setStrokeStyle(2, 0xffffff, 0.8);
        const ic = this.add.image(0, -1, w.kind === 'speed' ? 'ic-boot' : 'ic-magnet').setScale(1);
        c = this.add.container(w.x, w.y, [bg, ic]);
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
          shadow: this.add.ellipse(p.x, p.y, 34, 12, 0x000000, 0.22),
          aura: this.add.graphics(),
          body: this.add.image(p.x, p.y, texKey).setOrigin(0.5, BODY_CY).setScale(baseScale),
          eyes: this.add.graphics(),
          label: this.add.text(p.x, p.y, info.name, { fontFamily: "'Fredoka', sans-serif", fontSize: '13px', color: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5),
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
      b.shadow.destroy(); b.body.destroy(); b.eyes.destroy(); b.label.destroy(); b.aura.destroy(); b.carry.forEach((c) => c.destroy());
      this.blobs.delete(id);
    }

    // ---- fx ----
    for (const f of this.s.drainFx()) this.playFx(f);

    // camera follows my blob (Bärregn: fixed on the field)
    const me = this.blobs.get(this.s.myId);
    if (this.miniG) { this.camTarget.x = (ARENA.x0 + ARENA.x1) / 2; this.camTarget.y = this.miniCenterY; }
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
    b.shadow.setPosition(b.x, b.y + 12).setDepth(this.dB + b.y - 20).setScale(1 - hover * 0.03, 1);
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
    if (isMe) b.aura.fillStyle(0xffffff, 0.9).fillTriangle(b.x - 6, b.y - 60 + hover, b.x + 6, b.y - 60 + hover, b.x, b.y - 52 + hover);

    b.label.setPosition(b.x, b.y + 24).setDepth(this.dB + b.y + 2);

    // carried items stack
    while (b.carry.length < p.carry.length) b.carry.push(this.add.image(0, 0, 'ic-log').setScale(0.5));
    while (b.carry.length > p.carry.length) b.carry.pop()!.destroy();
    p.carry.forEach((k, i) => {
      const img = b.carry[i];
      img.setTexture(ITEM_ICON[k] ?? 'ic-log').setScale(CARRY_SCALE[k] ?? 0.5);
      img.setPosition(b.x + (i - (p.carry.length - 1) / 2) * 14, b.y - 44 + hover - Math.abs(i - 1) * 2).setDepth(this.dB + b.y + 3);
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
        ? this.add.image(w.bridge.x, w.bridge.y + 24, 'b-bridge').setScale(2).setOrigin(0.5, 1).setDepth(-930)
        : this.add.image(at.x, at.y - BUILD_R + 4, 'b-' + k).setScale(2).setOrigin(0.5, 1).setDepth(at.y - BUILD_R + 4);
      this.bgfx.set(k, { img: img.setVisible(false), built: false });
    }
  }

  private drawBuilds(v: View, _now: number) {
    if (!v.builds || !v.cottage) return;
    // snow map: the igloo is the level-1 base (Art: cottage footprint); upgrades use the cottage art
    const lvl = Math.max(1, Math.min(3, v.cottage.level));
    const ck = this.s.biome === 'snow' && lvl === 1 ? 'w-igloo' : 'b-cottage-' + lvl;
    if (this.cottageImg.texture.key !== ck) this.cottageImg.setTexture(ck).setScale(ck === 'w-igloo' ? 4 : ck === 'b-cottage-1' ? 3 : 2);
    for (const b of v.builds) {
      const g = this.bgfx.get(b.kind);
      if (!g) continue;
      const on = b.state === 2;
      if (on !== g.built) { g.built = on; g.img.setVisible(on); }
    }
    this.drawYard(lvl, v.builds.filter((b) => b.state === 2 && b.kind !== 'bridge').map((b) => b.kind));
    this.drawArrows(v);
  }

  /** Organic yard (Stefan: dynamic size and shape, brown ground under new buildings, no hard outline): a blob
   *  around the cottage (bigger per cottage level) plus a small patch under each built building, each with a wobbly
   *  seeded edge that dithers softly into the grass. Pixels are Art's dirt tiles (meadow) or packed snow. */
  private drawYard(level: number, built: BuildKind[]) {
    if (!YARD_ENABLED) return;
    const key = `yard-${this.s.biome ?? 'meadow'}-${this.s.seed}-${level}-${[...built].sort().join(',')}`;
    if (key === this.yardKey) return;
    const pad = 300, x0 = BASE.x - pad, y0 = BASE.y - pad, W = pad * 2, H = pad * 2;
    if (!this.textures.exists(key)) {
      const rand = rng(this.s.seed * 31 + 5);
      // blobs: centre, radii, and a few sine wobbles on the edge
      const blob = (x: number, y: number, rx: number, ry: number) => ({
        x, y, rx, ry, w: [0, 1, 2].map((i) => ({ k: 2 + i * 2 + Math.floor(rand() * 2), a: 0.05 + rand() * 0.05 / (i + 1), p: rand() * Math.PI * 2 })),
      });
      const blobs = [blob(BASE.x, BASE.y + 4, 80 + 12 * level, 70 + 10 * level)];
      for (const k of built) { const at = BUILD_SPOTS[k]; blobs.push(blob(at.x, at.y - 30, 46, 30)); }
      const snow = this.s.biome === 'snow';
      // dirt colours sampled from Art's tile (frame 0 plain 70%, frame 1 pebbles)
      let dirtPx: Uint8ClampedArray | null = null;
      if (!snow) {
        const dc = document.createElement('canvas'); dc.width = 64; dc.height = 32;
        const dx = dc.getContext('2d')!; dx.drawImage(this.textures.get('f-dirt').getSourceImage() as HTMLImageElement, 0, 0);
        dirtPx = dx.getImageData(0, 0, 64, 32).data;
      }
      const tileFrame = (tx: number, ty: number) => (((tx * 73856093) ^ (ty * 19349663)) >>> 0) % 10 < 7 ? 0 : 1;
      const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const cx = c.getContext('2d')!;
      const img = cx.createImageData(W, H), d = img.data;
      const FEATHER = 10; // px of dithered edge
      for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
        const wx = x0 + px, wy = y0 + py;
        let best = -Infinity; // signed distance-ish: >0 inside
        for (const b of blobs) {
          const ex = (wx - b.x) / b.rx, ey = (wy - b.y) / b.ry;
          if (ex > 1.4 || ex < -1.4 || ey > 1.4 || ey < -1.4) continue; // far outside this blob
          const a = Math.atan2(ey, ex);
          let rr = 1; for (const w of b.w) rr += w.a * Math.sin(w.k * a + w.p);
          const v = (rr - Math.hypot(ex, ey)) * Math.min(b.rx, b.ry);
          if (v > best) best = v;
        }
        if (best < -FEATHER / 2) continue;
        const t = Math.min(1, (best + FEATHER / 2) / FEATHER); // 0 at the outer edge, 1 inside
        if (t < 1 && t * 16 <= BAYER[(py % 4) * 4 + (px % 4)]) continue;
        const o = (py * W + px) * 4;
        if (dirtPx) {
          const f = tileFrame(Math.floor(wx / 32), Math.floor(wy / 32));
          const s2 = ((wy % 32) * 64 + f * 32 + (wx % 32)) * 4;
          d[o] = dirtPx[s2]; d[o + 1] = dirtPx[s2 + 1]; d[o + 2] = dirtPx[s2 + 2]; d[o + 3] = 255;
        } else {
          const speck = (((wx * 2654435761) ^ (wy * 40503)) >>> 0) % 23 === 0;
          d[o] = speck ? 0xb8 : 0xd3; d[o + 1] = speck ? 0xcf : 0xe2; d[o + 2] = speck ? 0xe3 : 0xee; d[o + 3] = 255;
        }
      }
      cx.putImageData(img, 0, 0);
      this.textures.addCanvas(key, c)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    const old = this.yardKey;
    if (!this.yardImg) this.yardImg = this.add.image(x0, y0, key).setOrigin(0).setDepth(-950);
    else this.yardImg.setTexture(key);
    this.yardKey = key;
    if (old && old !== key && this.textures.exists(old)) this.textures.remove(old);
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
        this.pile.add(this.add.image(x, y, ITEM_ICON[k]).setScale(k === 'wood' ? 0.5 : 1));
      }
    });
  }

  /** Tool swing in front of the blob (4-frame strip, pivot at the hand), flipped when facing left. */
  private drawTool(b: BlobGfx, dt: number) {
    if (!b.tool) return;
    b.swingT = Math.max(0, b.swingT - dt);
    if (b.swingT <= 0) { b.tool.setVisible(false); return; }
    const sc = b.baseScale;
    const frame = Math.min(3, Math.floor((1 - b.swingT / 0.32) * 4));
    // blob grid top-left, then the hand at the body's side edge, ~2/3 down the grid (mirrored when facing left)
    const left = b.body.x - (GRID_W / 2) * sc, top = b.body.y - BODY_CY * GRID_H * sc;
    const hx = left + (b.faceLeft ? 1 : GRID_W - 1) * sc, hy = top + Math.round(GRID_H * 0.69) * sc;
    b.tool.setVisible(true).setFrame(frame).setScale(TOOL_SCALE).setFlipX(b.faceLeft)
      .setOrigin((b.faceLeft ? TOOL_FRAME.w - TOOL_FRAME.px : TOOL_FRAME.px) / TOOL_FRAME.w, TOOL_FRAME.py / TOOL_FRAME.h)
      .setPosition(hx, hy).setDepth(b.body.depth + 1);
  }

  private swing(id: string, tool: Tool, nx: number) {
    const b = this.blobs.get(id);
    if (!b) return;
    if (!b.tool) b.tool = this.add.sprite(0, 0, 'tool-' + tool, 0).setVisible(false);
    if (b.tool.texture.key !== 'tool-' + tool) b.tool.setTexture('tool-' + tool, 0);
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
      g.fillStyle(0x3f2631, 1).fillRect(a.x0 - 10, a.y0 - 10, a.x1 - a.x0 + 20, a.y1 - a.y0 + 20);
      g.fillStyle(0x8a5a3c, 1).fillRect(a.x0 - 6, a.y0 - 6, a.x1 - a.x0 + 12, a.y1 - a.y0 + 12);
      g.fillStyle(this.s.biome === 'snow' ? 0xe6f1f8 : 0x86cf5a, 1).fillRect(a.x0, a.y0, a.x1 - a.x0, a.y1 - a.y0);
      const r = rng(7);
      for (let i = 0; i < 90; i++) g.fillStyle(this.s.biome === 'snow' ? 0xcfe1ee : 0x6fbd47, 1).fillRect(a.x0 + r() * (a.x1 - a.x0 - 8), a.y0 + r() * (a.y1 - a.y0 - 4), 8, 3);
      this.miniG = g;
      // a wooden fence around the field (the puzzle-pen fence art): planks on top/bottom, posts on the sides
      const S = 3, n = Math.round((a.x1 - a.x0) / (16 * S)), tw = (a.x1 - a.x0 + 12) / n;
      for (const y of [a.y0 + 2, a.y1 + 10]) for (let k = 0; k < n; k++) {
        this.miniDeco.push(this.add.image(a.x0 - 6 + tw * (k + 0.5), y, 'pr-fence').setOrigin(0.5, 1).setDisplaySize(tw + 1, 12 * S).setDepth(y === a.y0 + 2 ? 9050 : 10000 + a.y1 + 20));
      }
      for (const x of [a.x0 - 4, a.x1 + 4]) for (let y = a.y0 + 24; y <= a.y1; y += 48) {
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
          item: bomb ? this.add.image(d.x, d.y, 'pr-rock').setScale(3).setTint(0x2e2a3a).setDepth(10000 + d.y + 5) : this.add.image(d.x, d.y, 'g-item-berries').setScale(1.5).setDepth(10000 + d.y + 5),
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
        for (let k = 0; k < n; k++) this.add.image(w.x0 + tw * (k + 0.5), w.y1 + 4, 'pr-fence').setOrigin(0.5, 1).setDisplaySize(tw + 1, 12 * S).setDepth(w.y1);
      } else {
        // side fences seen from above: a column of posts
        for (let y = w.y0 + 8; y <= w.y1 + 1; y += 16) this.add.image((w.x0 + w.x1) / 2, y + 6, 'pr-gate-post').setOrigin(0.5, 1).setScale(S).setDepth(y);
      }
    }
    const gate = this.add.image(l.cx, l.gate.y1 + 4, 'pr-gate').setOrigin(0.5, 1).setDisplaySize(GATE_W + 2, 12 * S + 4).setDepth(l.gate.y1);
    const glow = this.add.graphics().setDepth(-460);
    const chest = this.add.image(l.chest.x, l.chest.y, 'ic-chest').setScale(1.5).setDepth(l.chest.y);
    const plates = l.plates.map((p) => this.add.image(p.x, p.y, 'pr-plate').setScale(4).setDepth(-700).setVisible(false));
    const glows = l.plates.map((p) => this.add.image(p.x, p.y + 2, 'fx-plate-glow').setScale(2).setDepth(-690).setVisible(false));
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
      // hinged open: the swung gate sits at the left post of the gap
      if (z.open) g.gate.setTexture('pr-gate-open').setOrigin(0, 1).setX(g.l.gate.x0 - 2).setDisplaySize(11 * 3, 14 * 3);
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
        const ic = this.add.image(f.x + 14, y, ITEM_ICON[k]).setScale(k === 'wood' ? 1 : 1.5);
        const c = this.add.container(0, 0, [t, ic]).setDepth(5000);
        this.tweens.add({ targets: c, y: -50, alpha: 0, duration: 1100, delay: j * 80, ease: 'Cubic.Out', onComplete: () => c.destroy() });
      });
    } else if (f.t === 'hit') {
      this.swing(f.id, f.tool, f.x);
      const n = this.nodes[f.node];
      if (n) {
        // shake the node, chips fly off
        this.tweens.add({ targets: n.img, x: { from: n.x - 4, to: n.x }, duration: 140, ease: 'Bounce.Out' });
        const chips = f.tool === 'pickaxe' ? 'chips-stone' : 'chips-wood';
        if (f.tool !== 'rake') {
          const c = this.add.sprite(n.x, n.y - 6, chips, 0).setScale(1.5).setOrigin(0.5, 1).setDepth(n.y + 50);
          this.time.delayedCall(90, () => c.setFrame(1));
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
      const sq = this.add.image(f.x, f.y - 2, 'g-item-berries').setScale(1.5).setDepth(9200);
      this.tweens.add({ targets: sq, scaleY: 0.4, scaleX: 1.9, alpha: 0, duration: 520, ease: 'Quad.Out', onComplete: () => sq.destroy() });
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
      if (g) { g.built = true; g.img.setVisible(true); }
      if (img) { const sc = img.scaleX; img.setScale(sc * 0.2); this.tweens.add({ targets: img, scale: sc, duration: 420, ease: 'Back.Out' }); }
      for (let i = 0; i < 3; i++) this.time.delayedCall(i * 90, () => this.puff(f.x + (i - 1) * 22, f.y + 6, (i - 1) * 60, -40, 6));
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
