// Phaser scene: renders a View (from the host sim or from network snapshots).
import Phaser from 'phaser';
import { blobCanvas, BODY_CY, clampLook } from './blob';
import { sfx } from './sfx';
import { dungeonFrame } from './dungeonScene'; // [dungeon hook]
import { BASE, GATE_W, makePuzzles, makeTrees, PLATE_R, rng, WORLD_H, WORLD_W } from './sim';
import { canAfford, isSolid, PAD_R, RES, TOTEM_KINDS, TOTEM_MAX, TOTEM_PADS, totemPrice } from './sim';
import { BUILDING_ENABLED, BUILD_COST, BUILD_EFFECT, BUILD_KINDS, BUILD_NAMES, BUILD_R, BUILD_SPOTS, COTTAGE_BONUS, COTTAGE_COST, COTTAGE_MAX, COTTAGE_PAD, makeWater, nodeRes } from './sim';
import type { Biome, BuildKind } from './sim';
import { makeIce } from './sim';
import type { PuzzleLayout, Res, Tool, TotemKind } from './sim';
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
const ITEM_SCALE: Record<ItemKind, number> = { wood: 2, stone: 3, berry: 3 };
const CARRY_SCALE: Record<ItemKind, number> = { wood: 1, stone: 2, berry: 2 };
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
const BLOB_SCALE = 1.45; // 36x48 blob grid // 18x24 pixel blob grid
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

interface TotemGfx {
  kind: TotemKind;
  pad: { x: number; y: number };
  img: Phaser.GameObjects.Image;
  pips: Phaser.GameObjects.Graphics;
  tag: Phaser.GameObjects.Container;
  price: { k: ItemKind; n: number; txt: Phaser.GameObjects.Text }[];
  level: number;
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
  faceLeft: boolean;
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
  private bgfx = new Map<BuildKind | 'cottage', { img: Phaser.GameObjects.Image; spot: Phaser.GameObjects.Image; tag: Phaser.GameObjects.Container; key: string }>();
  private cottageImg!: Phaser.GameObjects.Image;
  private water!: ReturnType<typeof makeWater>;
  private bridgeImg?: Phaser.GameObjects.Image;
  private nodes: { img: Phaser.GameObjects.Image; kind: number; left: number; x: number; y: number; sc: number }[] = [];
  private dusk!: Phaser.GameObjects.Rectangle;
  private totems: TotemGfx[] = [];
  private totemG!: Phaser.GameObjects.Graphics;
  private buyG!: Phaser.GameObjects.Graphics;
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
    this.blobs.clear(); this.items.clear(); this.gems.clear(); this.powers.clear();
    this.lastView = null;
    this.lastClock = 0;
  }

  preload() {
    for (const n of ['log', 'chest', 'boot', 'magnet', 'house']) this.load.image('ic-' + n, `art/icons/${n}.png`);
    for (const n of GATHER) this.load.image('g-' + n, `art/gather/${n}.png`);
    for (const t of ['axe', 'pickaxe', 'rake']) this.load.spritesheet('tool-' + t, `art/gather/tool-${t}.png`, { frameWidth: TOOL_FRAME.w, frameHeight: TOOL_FRAME.h });
    for (const c of ['wood', 'stone']) this.load.spritesheet('chips-' + c, `art/gather/chips-${c}.png`, { frameWidth: 16, frameHeight: 12 });
    for (const n of PROPS) this.load.image('pr-' + n, `art/props/${n}.png`);
    for (const k of TOTEM_KINDS) for (let l = 1; l <= 3; l++) this.load.image(`tt-${k}-${l}`, `art/totems/totem-${k}-${l}.png`);
    this.load.spritesheet('fx-levelup', 'art/fx/levelup.png', { frameWidth: 32, frameHeight: 22 });
    this.load.spritesheet('fx-dust', 'art/fx/dust.png', { frameWidth: 14, frameHeight: 12 });
    this.load.spritesheet('fx-sparkle', 'art/fx/coin-sparkle.png', { frameWidth: 11, frameHeight: 11 });
    this.load.image('fx-plate-glow', 'art/fx/plate-glow.png');
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
    if (!this.textures.exists(groundKey)) {
      const src = this.textures.get('town').getSourceImage() as HTMLImageElement;
      const gc = document.createElement('canvas');
      gc.width = cols * 16; gc.height = rows * 16;
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
      } else data.forEach((row, ty) => row.forEach((f, tx) => gx.drawImage(src, (f % 12) * 16, Math.floor(f / 12) * 16, 16, 16, tx * 16, ty * 16, 16, 16)));
      this.textures.addCanvas(groundKey, gc)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.add.image(0, 0, groundKey).setOrigin(0).setScale(2).setDepth(-1000);

    // base: round dirt yard with the cottage in the middle + glowing drop-off ring
    const yard = this.add.graphics().setDepth(-950);
    yard.fillStyle(0x8a5a3c, 1).fillCircle(BASE.x, BASE.y, BASE.r + 4);
    yard.fillStyle(0xe2b27a, 1).fillCircle(BASE.x, BASE.y, BASE.r);
    yard.fillStyle(0xd09a62, 1).fillCircle(BASE.x, BASE.y + 6, BASE.r - 14);
    yard.fillStyle(0xe2b27a, 1).fillCircle(BASE.x, BASE.y, BASE.r - 18);
    this.baseG = this.add.graphics().setDepth(-900);
    this.add.ellipse(BASE.x, BASE.y + 26, 110, 26, 0x000000, 0.18).setDepth(-880);
    // cottage (Art's base set, level 1-3), integer scale 2, anchored bottom centre
    this.cottageImg = this.add.image(BASE.x, BASE.y + 30, this.s.biome === 'snow' ? 'w-igloo' : 'b-cottage-1').setScale(this.s.biome === 'snow' ? 4 : 2).setOrigin(0.5, 1).setDepth(BASE.y - 40);
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
    this.add.text(BASE.x, BASE.y + 52, 'BAS', { fontFamily: "'Nunito', sans-serif", fontSize: '20px', color: '#fff7e6', fontStyle: 'bold', stroke: '#3f2631', strokeThickness: 5 }).setOrigin(0.5).setDepth(-800);

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
      || TOTEM_PADS.some((p) => Math.hypot(p.x - x, p.y - y) < 60 + pad)
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
    this.totemG = this.add.graphics().setDepth(-700);
    this.buyG = this.add.graphics().setDepth(3800); // purchase progress, above the blob standing on the pad
    this.totems = TOTEM_KINDS.map((kind, i) => this.buildTotem(kind, TOTEM_PADS[i]));
    // team bank: small stacks of wood / stone / berries beside the cottage
    this.pile = this.add.container(BASE.x + 52, BASE.y + 40).setDepth(BASE.y + 40);
    // dusk: warm tint over the world in the last 20 s of daylight
    this.dusk = this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W * 3, WORLD_H * 3, 0xff7a2f, 0).setDepth(8000);
    if (!this.anims.exists('dust')) this.anims.create({ key: 'dust', frames: this.anims.generateFrameNumbers('fx-dust', { start: 0, end: 3 }), frameRate: 10 });
    if (!this.anims.exists('sparkle')) this.anims.create({ key: 'sparkle', frames: this.anims.generateFrameNumbers('fx-sparkle', { frames: [0, 1, 2, 1, 0] }), frameRate: 16 });
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
        img = this.add.image(it.x, it.y, ITEM_ICON[it.kind] ?? 'ic-log').setScale(0.2);
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
        e = { g: this.add.graphics(), img: this.add.image(g.x, g.y, 'ic-chest').setScale(3), t: [0, 1].map(() => this.add.image(0, 0, this.miniBlob()).setScale(0.8)), x: g.x, y: g.y };
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

    // ---- co-op puzzles ----
    v.puzzles?.forEach((z, i) => this.drawPuzzle(this.pz[i], z, now));

    // ---- base building ----
    if (BUILDING_ENABLED) this.drawBuilds(v, now);

    // ---- totems + bank ----
    this.drawTotems(v, now);

    // ---- power-ups ----
    const seenW = new Set<number>();
    for (const w of v.powers) {
      seenW.add(w.id);
      let c = this.powers.get(w.id);
      if (!c) {
        const bg = this.add.circle(0, 0, 18, w.kind === 'speed' ? 0x5ec8ff : 0xff6b8b, 0.35).setStrokeStyle(2, 0xffffff, 0.8);
        const ic = this.add.image(0, -1, w.kind === 'speed' ? 'ic-boot' : 'ic-magnet').setScale(2);
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
      const texKey = `blob-${look.color}-${look.shape}-${look.eyes}-${look.mouth}-${look.hat}`;
      if (!this.textures.exists(texKey)) {
        this.textures.addCanvas(texKey, blobCanvas(look, 1));
        this.textures.get(texKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      const pixel = true;
      const baseScale = BLOB_SCALE;
      if (!b) {
        b = {
          shadow: this.add.ellipse(p.x, p.y, 34, 12, 0x000000, 0.22),
          aura: this.add.graphics(),
          body: this.add.image(p.x, p.y, texKey).setOrigin(0.5, BODY_CY).setScale(baseScale),
          eyes: this.add.graphics(),
          label: this.add.text(p.x, p.y, info.name, { fontFamily: "'Nunito', sans-serif", fontSize: '13px', color: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5),
          carry: [], swingT: 0, faceLeft: false, x: p.x, y: p.y, vx: 0, vy: 0, look: { x: 0, y: 1 }, trail: [], texKey, blinkT: 2 + Math.random() * 3, baseScale, pixel,
        };
        this.blobs.set(p.id, b);
      }
      if (b.texKey !== texKey) { b.body.setTexture(texKey); b.texKey = texKey; }
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

    // camera follows my blob
    const me = this.blobs.get(this.s.myId);
    if (me) { this.camTarget.x = me.x; this.camTarget.y = me.y; }
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
    b.shadow.setPosition(b.x, b.y + 12).setDepth(b.y - 20).setScale(1 - hover * 0.03, 1);
    b.body.setPosition(b.x, b.y - 4 + hover).setDepth(b.y);
    b.body.setScale(b.baseScale * (1 + stretch) / breath, b.baseScale * (1 - stretch * 0.6) * breath);
    this.drawTool(b, dt);
    b.body.setRotation(Phaser.Math.Clamp(b.vx / 1400, -0.18, 0.18));

    // eyes follow movement direction
    if (sp > 20) { b.look.x += (b.vx / sp - b.look.x) * 0.2; b.look.y += (b.vy / sp - b.look.y) * 0.2; }
    b.blinkT -= dt;
    const blink = b.blinkT < 0.12;
    if (b.blinkT < 0) b.blinkT = 2 + Math.random() * 4;
    const ex = b.x + b.look.x * 4, ey = b.y - 10 + hover + b.look.y * 3;
    b.eyes.clear().setDepth(b.y + 0.5);
    if (!b.pixel) for (const s of [-1, 1]) {
      if (blink) { b.eyes.fillStyle(0x222222, 1).fillRect(ex + s * 6 - 4, ey - 1, 8, 2); continue; }
      b.eyes.fillStyle(0xffffff, 1).fillEllipse(ex + s * 6, ey, 9, 11);
      b.eyes.fillStyle(0x222222, 1).fillCircle(ex + s * 6 + b.look.x * 2, ey + b.look.y * 2, 2.6);
    }

    // power-up aura
    b.aura.clear().setDepth(b.y - 1);
    if (p.boostT > 0) b.aura.lineStyle(3, 0xffc93c, 0.8).strokeCircle(b.x, b.y - 4 + hover, 26 + Math.sin(now / 60) * 2);
    if (p.magnetT > 0) b.aura.lineStyle(2, 0xff6b8b, 0.5).strokeCircle(b.x, b.y, 60 + Math.sin(now / 200) * 6);
    if (p.shield > 0) b.aura.fillStyle(0x5ec8ff, 0.16).fillCircle(b.x, b.y - 6 + hover, 30).lineStyle(2, 0x8fd3ff, 0.7).strokeCircle(b.x, b.y - 6 + hover, 30);
    if (isMe) b.aura.fillStyle(0xffffff, 0.9).fillTriangle(b.x - 6, b.y - 60 + hover, b.x + 6, b.y - 60 + hover, b.x, b.y - 52 + hover);

    b.label.setPosition(b.x, b.y + 24).setDepth(b.y + 2);

    // carried items stack
    while (b.carry.length < p.carry.length) b.carry.push(this.add.image(0, 0, 'ic-log').setScale(1));
    while (b.carry.length > p.carry.length) b.carry.pop()!.destroy();
    p.carry.forEach((k, i) => {
      const img = b.carry[i];
      img.setTexture(ITEM_ICON[k] ?? 'ic-log').setScale(CARRY_SCALE[k] ?? 1);
      img.setPosition(b.x + (i - (p.carry.length - 1) / 2) * 14, b.y - 44 + hover - Math.abs(i - 1) * 2).setDepth(b.y + 3);
    });
  }

  /** Spot markers, ghosts of what can be built, construction sites, finished buildings, cottage pad. */
  private buildBase() {
    this.bgfx.clear();
    const mk = (kind: BuildKind | 'cottage', at: { x: number; y: number }) => {
      // the building stands just behind its spot (the bridge's spot shows a preview; the real one spans the water)
      const by = at.y - BUILD_R + 4;
      const img = this.add.image(at.x, by, kind === 'cottage' ? 'b-build-spot' : 'b-' + kind).setScale(2).setOrigin(0.5, 1).setDepth(by);
      const spot = this.add.image(at.x, at.y + 15, 'b-build-spot').setScale(2).setOrigin(0.5, 1).setDepth(-690);
      const tag = this.add.container(at.x, at.y - 96).setDepth(3900);
      this.bgfx.set(kind, { img, spot, tag, key: '' });
    };
    for (const k of BUILD_KINDS) mk(k, BUILD_SPOTS[k]);
    const w = this.water;
    this.bridgeImg = this.add.image(w.bridge.x, w.bridge.y + 24, 'b-bridge').setScale(2).setOrigin(0.5, 1).setDepth(-930).setVisible(false);
    mk('cottage', COTTAGE_PAD);
    this.bgfx.get('cottage')!.img.setVisible(false);
  }

  /** Name + one icon/amount per resource still needed (amounts turn green when the bank covers them). */
  private signTag(tag: Phaser.GameObjects.Container, title: string, need: Partial<Res>, bank: Res | undefined, effect = '') {
    tag.removeAll(true);
    const parts = RES.filter((k) => (need[k] ?? 0) > 0);
    const w = Math.max(!title ? 0 : effect ? 126 : 96, 42 * parts.length + 8);
    const h = !title ? 30 : effect ? 66 : 50, cy = !title ? 0 : effect ? 20 : 12;
    tag.add(this.add.rectangle(0, 0, w, h, 0xfff7e6).setStrokeStyle(3, 0x3f2631));
    if (title) tag.add(this.add.text(0, effect ? -20 : -12, title, { fontFamily: "'Nunito', sans-serif", fontSize: '15px', color: '#3f2631', fontStyle: 'bold' }).setOrigin(0.5));
    if (effect) tag.add(this.add.text(0, -3, effect, { fontFamily: "'Nunito', sans-serif", fontSize: '12px', color: '#8a7466' }).setOrigin(0.5));
    parts.forEach((k, j) => {
      const x = -(42 * parts.length) / 2 + j * 42 + 4;
      tag.add(this.add.image(x + 9, cy, ITEM_ICON[k]).setScale(k === 'wood' ? 1 : 2));
      tag.add(this.add.text(x + 20, cy, String(need[k]), { fontFamily: "'Nunito', sans-serif", fontSize: '17px', color: (bank?.[k] ?? 0) >= need[k]! ? '#2f8a2f' : '#b3261e', fontStyle: 'bold' }).setOrigin(0, 0.5));
    });
  }

  private drawBuilds(v: View, now: number) {
    if (!v.builds || !v.cottage) return;
    // snow map: the igloo is the level-1 base (Art: cottage footprint); upgrades use the cottage art
    const lvl = Math.max(1, Math.min(3, v.cottage.level));
    const ck = this.s.biome === 'snow' && lvl === 1 ? 'w-igloo' : 'b-cottage-' + lvl;
    if (this.cottageImg.texture.key !== ck) this.cottageImg.setTexture(ck).setScale(ck === 'w-igloo' ? 4 : 2);
    const pads = [
      ...v.builds.map((b) => ({ kind: b.kind as BuildKind | 'cottage', at: BUILD_SPOTS[b.kind], state: b.state, paid: b.paid, buy: b.buy, cost: BUILD_COST[b.kind] as Res | null, title: BUILD_NAMES[b.kind], effect: BUILD_EFFECT[b.kind] })),
      { kind: 'cottage' as const, at: COTTAGE_PAD, state: v.cottage.state as 0 | 1 | 2, paid: v.cottage.paid, buy: v.cottage.buy,
        cost: v.cottage.level >= COTTAGE_MAX ? null : COTTAGE_COST[v.cottage.level - 1], title: `Stuga nivå ${v.cottage.level + 1}`, effect: COTTAGE_BONUS[v.cottage.level] ?? '' },
    ];
    for (const p of pads) {
      const g = this.bgfx.get(p.kind);
      if (!g) continue;
      const done = p.state === 2 || !p.cost;
      const can = !done && !!v.bank && canAfford(v.bank, p.cost!);
      if (p.kind !== 'cottage') {
        // not affordable: a faded ghost; affordable: the construction site ("build me!"); built: the building
        const tex = 'b-' + p.kind + (!done && can ? '-site' : '');
        if (g.img.texture.key !== tex) g.img.setTexture(tex);
        g.img.setAlpha(done || can ? 1 : 0.35);
        if (p.kind === 'bridge') { g.img.setVisible(!done); this.bridgeImg?.setVisible(done); }
      }
      g.spot.setVisible(!done);
      g.tag.setVisible(!done);
      if (!done) {
        const need = RES.reduce((o, k) => ({ ...o, [k]: Math.max(0, p.cost![k] - p.paid[k]) }), {} as Res);
        // compact (icons + cost) until a blob comes close, then name + effect too; lower spots show it below
        const near = v.players.some((q) => Math.hypot(q.x - p.at.x, q.y - p.at.y) < 110);
        const key = `${near ? 1 : 0}|${p.title}|${RES.map((k) => need[k] + ':' + ((v.bank?.[k] ?? 0) >= need[k] ? 1 : 0)).join(',')}`;
        if (key !== g.key) { g.key = key; this.signTag(g.tag, near ? p.title : '', need, v.bank, near ? p.effect : ''); }
        const below = p.at.y > BASE.y + 40;
        g.tag.setY(p.at.y + (below ? 58 : -104) + (can ? Math.sin(now / 250) * 3 : 0)).setDepth(near ? 3950 : 3900);
        if (p.buy > 0) {
          this.buyG.lineStyle(10, 0x3f2631, 0.85).strokeCircle(p.at.x, p.at.y, BUILD_R + 4);
          this.buyG.lineStyle(6, 0x6cc644, 1).beginPath();
          this.buyG.arc(p.at.x, p.at.y, BUILD_R + 4, -Math.PI / 2, -Math.PI / 2 + p.buy * Math.PI * 2);
          this.buyG.strokePath();
        }
      }
    }
    this.drawArrows(v);
  }

  /** Watchtower: edge arrows on screen pointing at the nearest node of each resource that is off-screen. */
  private drawArrows(v: View) {
    const box = document.getElementById('edge-arrows');
    if (!box) return;
    const tower = v.builds.some((b) => b.kind === 'watchtower' && b.state === 2);
    box.classList.toggle('hidden', !tower);
    if (!tower) return;
    const me = this.blobs.get(this.s.myId);
    const cam = this.cameras.main, wv = cam.worldView;
    for (const k of RES) {
      const el = box.querySelector<HTMLElement>(`[data-k="${k}"]`);
      if (!el) continue;
      let best: { x: number; y: number } | null = null, bd = Infinity;
      this.nodes.forEach((n, i) => {
        if ((v.nodes[i] ?? 0) <= 0 || nodeRes(n.kind) !== k) return;
        if (n.x > wv.x && n.x < wv.right && n.y > wv.y && n.y < wv.bottom) { bd = -1; return; } // one is on screen already
        const d = me ? Math.hypot(n.x - me.x, n.y - me.y) : 0;
        if (bd >= 0 && d < bd) { bd = d; best = n; }
      });
      if (!best || bd < 0) { el.style.display = 'none'; continue; }
      const t = best as { x: number; y: number };
      const cx = wv.centerX, cy = wv.centerY;
      const ang = Math.atan2(t.y - cy, t.x - cx);
      // where the ray from the view centre leaves the view (inset), in screen pixels
      const hw = wv.width / 2 - 40 / cam.zoom, hh = wv.height / 2 - 60 / cam.zoom;
      const sc = Math.min(Math.abs(hw / Math.cos(ang) || Infinity), Math.abs(hh / Math.sin(ang) || Infinity));
      const sx = (cx + Math.cos(ang) * sc - wv.x) * cam.zoom, sy = (cy + Math.sin(ang) * sc - wv.y) * cam.zoom;
      el.style.display = 'flex';
      el.style.left = sx + 'px'; el.style.top = sy + 'px';
      (el.querySelector('.arr') as HTMLElement).style.transform = `rotate(${ang}rad)`;
    }
  }

  /** Totem on its pedestal, level pips below, price tag above (coin icon + number). */
  private buildTotem(kind: TotemKind, pad: { x: number; y: number }): TotemGfx {
    const img = this.add.image(pad.x, pad.y - PAD_R + 6, `tt-${kind}-1`).setOrigin(0.5, 1).setScale(3).setDepth(pad.y - PAD_R);
    const pips = this.add.graphics().setDepth(pad.y);
    const tag = this.add.container(pad.x, pad.y - PAD_R - 80).setDepth(3900);
    return { kind, pad, img, pips, tag, price: [], level: -1 };
  }

  private drawTotems(v: View, now: number) {
    this.totemG.clear();
    this.buyG.clear();
    v.totems?.forEach((t, i) => {
      const g = this.totems[i];
      if (!g) return;
      if (t.level !== g.level) {
        g.level = t.level;
        this.buildTag(g, totemPrice(t));
        g.img.setTexture(`tt-${g.kind}-${Math.max(1, t.level)}`);
        // not bought yet: a faded "ghost" of the totem shows what you can build
        g.img.setAlpha(t.level ? 1 : 0.5).setTint(t.level ? 0xffffff : 0xb8b0a8);
      }
      const price = totemPrice(t);
      const can = t.level < TOTEM_MAX && !!v.bank && canAfford(v.bank, price);
      g.tag.setVisible(t.level < TOTEM_MAX);
      if (t.level < TOTEM_MAX) {
        // each resource number turns green once the bank has enough of it
        for (const pr of g.price) pr.txt.setColor((v.bank?.[pr.k] ?? 0) >= pr.n ? '#2f8a2f' : '#b3261e');
        g.tag.setY(g.pad.y - PAD_R - 80 + (can ? Math.sin(now / 250 + i) * 3 : 0));
      }
      // pad: stone ring; bright + pulsing when you can afford it; fills as you stand on it
      const p = g.pad;
      this.totemG.fillStyle(0x000000, 0.15).fillEllipse(p.x, p.y + 4, PAD_R * 2, PAD_R * 1.1);
      this.totemG.fillStyle(can ? 0xffe08a : 0xd9cbb0, can ? 0.55 + 0.2 * Math.sin(now / 200 + i) : 0.6).fillEllipse(p.x, p.y, PAD_R * 1.8, PAD_R);
      this.totemG.lineStyle(3, 0x3f2631, 0.8).strokeEllipse(p.x, p.y, PAD_R * 1.8, PAD_R);
      if (t.buy > 0) {
        // a ring around the totem fills up while a blob stands on the pad
        const cy = p.y - PAD_R - 26;
        this.buyG.lineStyle(10, 0x3f2631, 0.85).strokeCircle(p.x, cy, 40);
        this.buyG.lineStyle(6, 0x6cc644, 1).beginPath();
        this.buyG.arc(p.x, cy, 40, -Math.PI / 2, -Math.PI / 2 + t.buy * Math.PI * 2);
        this.buyG.strokePath();
      }
      // level pips: 3 dots under the totem, filled per level
      g.pips.clear();
      for (let k = 0; k < TOTEM_MAX; k++) {
        const x = p.x + (k - 1) * 14, y = p.y + PAD_R - 6;
        g.pips.fillStyle(0x3f2631, 1).fillCircle(x, y, 6);
        g.pips.fillStyle(k < t.level ? 0xffc93c : 0xe3d5b6, 1).fillCircle(x, y, 4);
      }
    });
    this.drawPile(v.bank);
  }

  /** Price tag: one icon + amount per resource the next level costs. */
  private buildTag(g: TotemGfx, price: Partial<Res>) {
    g.tag.removeAll(true);
    g.price = [];
    const parts = RES.filter((k) => (price[k] ?? 0) > 0);
    const w = 42 * parts.length + 8;
    g.tag.add(this.add.rectangle(0, 0, w, 30, 0xfff7e6).setStrokeStyle(3, 0x3f2631));
    parts.forEach((k, j) => {
      const x = -w / 2 + 8 + j * 42;
      g.tag.add(this.add.image(x + 9, 0, ITEM_ICON[k]).setScale(k === 'wood' ? 1 : 2));
      const txt = this.add.text(x + 20, 0, String(price[k]), { fontFamily: "'Nunito', sans-serif", fontSize: '19px', color: '#3f2631', fontStyle: 'bold' }).setOrigin(0, 0.5);
      g.tag.add(txt);
      g.price.push({ k, n: price[k]!, txt });
    });
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
        this.pile.add(this.add.image(x, y, ITEM_ICON[k]).setScale(k === 'wood' ? 1 : 2));
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
    // blob grid top-left, then the hand pixel (33,33) or (2,33) when facing left
    const left = b.body.x - 18 * sc, top = b.body.y - BODY_CY * 48 * sc;
    const hx = left + (b.faceLeft ? 2 : 33) * sc, hy = top + 33 * sc;
    b.tool.setVisible(true).setFrame(frame).setScale(sc).setFlipX(b.faceLeft)
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
    const chest = this.add.image(l.chest.x, l.chest.y, 'ic-chest').setScale(3).setDepth(l.chest.y);
    const plates = l.plates.map((p) => this.add.image(p.x, p.y, 'pr-plate').setScale(4).setDepth(-700).setVisible(false));
    const glows = l.plates.map((p) => this.add.image(p.x, p.y + 2, 'fx-plate-glow').setScale(4).setDepth(-690).setVisible(false));
    const bubbles = l.plates.map((p) => this.add.text(p.x, p.y - 72, '', {
      fontFamily: "'Nunito', sans-serif", fontSize: '20px', color: '#3f2631', fontStyle: 'bold',
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
        const t = this.add.text(f.x - 6, y, '+' + f.r[k], { fontFamily: "'Nunito', sans-serif", fontSize: '26px', color: '#ffe08a', fontStyle: 'bold', stroke: '#6b4a2a', strokeThickness: 5 }).setOrigin(1, 0.5);
        const ic = this.add.image(f.x + 14, y, ITEM_ICON[k]).setScale(k === 'wood' ? 2 : 3);
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
          const c = this.add.sprite(n.x, n.y - 6, chips, 0).setScale(3).setOrigin(0.5, 1).setDepth(n.y + 50);
          this.time.delayedCall(90, () => c.setFrame(1));
          this.tweens.add({ targets: c, alpha: 0, y: n.y - 16, duration: 260, delay: 120, onComplete: () => c.destroy() });
        } else this.burst(n.x, n.y - 10, 0x6cc644, 6);
      }
      sfx.tool(f.tool, f.drop);
    } else if (f.t === 'pick') {
      sfx.pick();
      const sp = this.add.sprite(f.x, f.y - 8, 'fx-sparkle', 0).setScale(3).setDepth(5000);
      sp.play('sparkle');
      sp.once('animationcomplete', () => sp.destroy());
    } else if (f.t === 'bump') {
      sfx.bump();
      this.burst(f.x, f.y - 20, 0x5aa83a, 8);
      this.cameras.main.shake(80, 0.003);
    } else if (f.t === 'build') {
      sfx.power();
      const fx = this.add.sprite(f.x, f.y - 10, 'fx-levelup').setScale(f.done ? 4 : 3).setDepth(4500);
      fx.play('levelup');
      fx.once('animationcomplete', () => fx.destroy());
      if (f.done) { this.burst(f.x, f.y - 60, 0xffe08a, 16); this.cameras.main.shake(140, 0.004); sfx.star(); }
    } else if (f.t === 'totem') {
      sfx.power();
      const fx = this.add.sprite(f.x, f.y - 10, 'fx-levelup').setScale(3).setDepth(4500);
      fx.play('levelup');
      fx.once('animationcomplete', () => fx.destroy());
      this.burst(f.x, f.y - 60, 0xffe08a, 10);
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
      const c = this.add.sprite(sx, sy, 'fx-dust', 0).setOrigin(0.5, 1).setScale(2).setDepth(sy - 15);
      this.time.delayedCall(i * 18, () => c.active && c.play('dust'));
      this.tweens.add({ targets: c, x: sx + Math.cos(a) * reach, y: sy + Math.sin(a) * reach * 0.7, alpha: 0, duration: 420 + Math.random() * 140, delay: i * 18, ease: 'Cubic.Out', onComplete: () => c.destroy() });
    }
  }

  private burst(x: number, y: number, color: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const d = this.add.circle(x, y, 3, color).setDepth(5000);
      this.tweens.add({ targets: d, x: x + Math.cos(a) * 26, y: y + Math.sin(a) * 26, alpha: 0, duration: 350, onComplete: () => d.destroy() });
    }
  }

  get view() { return this.lastView; }
}
