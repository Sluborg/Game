// Dungeon rendering (Code 2). A separate Phaser scene drawn on top of the meadow scene while the team
// is underground; the meadow scene keeps ticking the session (sim / network) and hides its camera.
// Also draws the dungeon entrance on the meadow (dungeonFrame is the one hook GameScene calls).
import Phaser from 'phaser';
import { blobCanvas, BLOB_FRAMES, BODY_CY, clampLook, facingFromVelocity, type Facing } from './blob';
import { drawGatherRing } from './gatherRing';
import { onViewport } from './viewport';
import { dpr, snapZoom } from './pixelScale';
import { fw, fh, ft, inDoorway, makeRoom, roomCracks, roomGap, ROOM_TUNE, ROOM_STUB, ROOM_TRANS, ROOMS, MINIBOSS_ROOM, SPAWN_WARN, AIM_WARN, BITE_WARN, DASH_SPEED, DASH_TIME, DASH_WARN, DT, ENEMY_R, GOO_ART, GOO_SCALE, isWall, SLAM_WARN, WEAPON_STATS, FLOORS, heroMods, makeFloor, skillOf, itemOf, SLAM_R, specialOf, STAIRS_R, type DFx, type Floor, type HeroClass, type Weapon } from './dungeon';
/** Weapons without Art's strip yet: a Kenney Tiny Dungeon tile in hand (bow: drawn in code). */
import type { Session } from './game';
import { sfx } from './sfx';
import { t, tItem, tSkill } from './dungeonText';
import { entranceOf, DUNGEON_ENABLED, type View } from './sim';

const BLOB_SCALE = 3; // blobz v2: 16x18 grid at the Ninja world scale, same as the meadow (game.ts)
const FACE_DEAD = 40; // px/s, same as the meadow: slower = idle frame, facing kept
/** nameplate: 16 px class icon + 3 px gap + the name, at most PLATE_MAX px wide (13 px text, then 12 px, then "…") */
const PLATE_ICON = 16, PLATE_GAP = 3, PLATE_MAX = 75, PLATE_DEPTH = 6000; // plates draw above every world object (columns, bubbles, FX), below banners // 75 + rounding <= 76
function fitPlate(t: Phaser.GameObjects.Text, name: string) {
  const room = PLATE_MAX - PLATE_ICON - PLATE_GAP;
  t.setFontSize(13).setText(name);
  if (t.width > room) t.setFontSize(12);
  let n = name;
  while (t.width > room && n.length > 1) { n = n.slice(0, -1); t.setText(n.trimEnd() + '…'); }
}
/** the wand's glow / bolt colours: damage red, heal green */
const MODE_COL = [0xff4a3a, 0x5fe36a];
const NA = 'assets/ninja-adventure/';
/** Weapon sprites (kept loaded for the hidden sprite object; never shown since 2026-11-15). Ninja Adventure's own weapons (Items/Weapons/<Name>/Sprite.png) point UP
 *  with the grip at the bottom (`up`); Art's Ninja-style shield (pivot = centre) and crossbow (points right, pivot = butt)
 *  are in art/dungeon/weapons/ (README). The ChatGPT sprites there stay in the repo, unused. */
const WIMG: Record<string, { src: string; w: number; h: number; px: number; py: number; up?: boolean }> = {
  sword: { src: NA + 'Items/Weapons/Sword/Sprite.png', w: 6, h: 17, px: 3, py: 14, up: true },
  bigsword: { src: NA + 'Items/Weapons/BigSword/Sprite.png', w: 7, h: 16, px: 3, py: 13, up: true }, // the knight's sword (Stefan's pick #3), pivot at the grip
  sai: { src: NA + 'Items/Weapons/Sai/Sprite.png', w: 7, h: 13, px: 3.5, py: 11, up: true },
  dagger: { src: NA + 'Items/Weapons/Ninjaku/SpriteInHand.png', w: 3, h: 12, px: 1.5, py: 9.5, up: true }, // Stefan: a plain straight dagger
  hammer: { src: NA + 'Items/Weapons/Hammer/Sprite.png', w: 9, h: 16, px: 4.5, py: 14, up: true },
  wand: { src: NA + 'Items/Weapons/MagicWand/Sprite.png', w: 5, h: 18, px: 2.5, py: 16, up: true },
  lance: { src: NA + 'Items/Weapons/Lance/Sprite.png', w: 6, h: 23, px: 3, py: 20, up: true },
  shield: { src: 'art/dungeon/weapons/shield-16.png', w: 16, h: 16, px: 8, py: 7 }, // ChatGPT N-11 (weapons/README.md)
  crossbow: { src: 'art/dungeon/weapons/crossbow-16.png', w: 16, h: 16, px: 1, py: 7 }, // ChatGPT N-11
};
/** which sprite each weapon id draws (the Riddare, id 'shield', slashes with the sword) */
const WART: Record<Weapon, string> = { sword: 'sword', shield: 'bigsword', dagger: 'dagger', hammer: 'hammer', staff: 'wand', spear: 'lance', bow: 'crossbow' };
const FONT = "'Fredoka', sans-serif"; // same as the meadow
const DEBUG = new URLSearchParams(location.search).has('debug');
const HITBOX = new URLSearchParams(location.search).has('hitbox'); // ?hitbox draws the sim's circles
/** Class hats in blob.ts CLASS_HATS (Krigare keeps the skin hat). */
const CLASS_HAT: Partial<Record<HeroClass, number>> = { healer: 0, marksman: 1, tank: 2 }; // the rogue keeps the skin hat
// Kenney Tiny Dungeon frames (12 per row)
// Art's fine ground tiles (art/fine/tiles, 32 px, drawn at scale 1): floor plain/specks/stones, wall bricks/banner
const TP = 32; // baked px per tile

interface HeroGfx {
  id: string;
  facing: Facing; // blobz v2: mirrored (flipX) when facing left
  shadow: Phaser.GameObjects.Ellipse;
  body: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  icon: Phaser.GameObjects.Image; barrier?: Phaser.GameObjects.Sprite; plateName?: string; plateY?: number;
  weapon: Phaser.GameObjects.Sprite;
  stars: Phaser.GameObjects.Sprite;
  me: Phaser.GameObjects.Triangle;
  texKey: string;
  x: number; y: number; vx: number; vy: number;
  swingT: number; swingDur: number; swingA: number; swings: number; // swing angle from the attack event (exact, not the 15 Hz facing)
  spin: number; // seconds left of a spin special (weapon whirls around)
  fx?: { spr: Phaser.GameObjects.Sprite; kind: 'spin' | 'charge'; a: number }; // special fx that rides along with the blob
  dome?: Phaser.GameObjects.Sprite;
  hb?: LifeBar; // friends' Ninja life bar
  wshadow?: Phaser.GameObjects.Ellipse; // the hovering weapon's small shadow on the ground
  weapon2?: Phaser.GameObjects.Sprite; // the rogue's second dagger / the Riddare's guarding shield
  arcFor?: number; // which swing already has its slash fx
  glow?: Phaser.GameObjects.Arc; mode?: number; hopT?: number; hopH?: number; sqT?: number; // hop (height), squash on a hit // the wand's glow, its mode (from the snapshot)
  wa?: number; woff?: number; wsa?: number; lastSwing?: number; // smoothed weapon angle, slash offset, shield angle, time of the last swing
  tip?: { x: number; y: number }; // crossbow tip (bolts start there) // knight's shield wall (Art's fx-wall)
}
interface GooGfx {
  img: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Ellipse; bar?: Phaser.GameObjects.Graphics; x: number; y: number; flash: number; kind: number;
  dir: number; tele: Phaser.GameObjects.Sprite[]; teleKey: string; // telegraph sprites for the current action
  hb?: LifeBar;
}
interface LifeBar { u: Phaser.GameObjects.Image; p: Phaser.GameObjects.Image }
// ---- Ninja Adventure monsters (CC0, docs/ART_MAP.md): sheet, frame size, origin = centre of the visible body ----
const MON = [
  { key: 'na-bat', file: 'Actor/Monster/BlueBat/SpriteSheet.png', ox: 0.5, oy: 7.5 / 16 },
  { key: 'na-slime', file: 'Actor/Monster/Slime3/Slime3.png', ox: 0.5, oy: 9 / 16 },
  { key: 'na-boss', file: 'Actor/Boss/GiantSlime/Idle.png', ox: 31 / 62, oy: 35 / 52 },
  { key: 'na-eye', file: 'Actor/Monster/Eye/Eye.png', ox: 0.5, oy: 0.5 },
];
const MON_DIRS = ['down', 'up', 'left', 'right'] as const; // sheet columns
/** Colour language: enemy warnings and attacks hostile (red / orange / purple, dark outline), player attacks friendly. */
const HOSTILE = { red: 0xff3b2f, orange: 0xff8a1f, purple: 0xc04dff, outline: 0x1a0612 };
// Ninja FX used for the monsters: [key, file, frame w, frame h, fps, loop]
const NFX: [string, string, number, number, number, boolean][] = [
  ['nf-chev', 'FX/Elemental/Thunder/SpriteSheet.png', 20, 28, 1, false],
  ['nf-dot', 'FX/Particle/Spark.png', 10, 8, 12, true],
  ['nf-aura', 'FX/Magic/Aura/SpriteSheet.png', 25, 24, 12, true],
  ['nf-rune', 'FX/Magic/Circle/SpriteSheetSpark2.png', 32, 32, 10, true],
  ['nf-fire', 'FX/Projectile/Fireball.png', 16, 16, 12, true],
  ['nf-claw', 'FX/Attack/Claw/SpriteSheet.png', 32, 32, 18, false],
  ['nf-smoke', 'FX/Smoke/Smoke/SpriteSheet.png', 32, 32, 14, false],
  ['nf-star', 'FX/Magic/Circle/SpriteSheetSpark.png', 32, 32, 20, false],
  ['nf-dust', 'FX/Smoke/SmokeCircular/SpriteSheet.png', 30, 14, 16, false],
  ['nf-rock', 'FX/Elemental/Rock/SpriteSheet.png', 30, 30, 20, false],
  ['nf-spike', 'FX/Elemental/RockSpike/SpriteSheet.png', 54, 48, 16, false],
  ['nf-boom', 'FX/Elemental/Explosion/SpriteSheet.png', 40, 40, 18, false],
];

export class DungeonScene extends Phaser.Scene {
  private s!: Session;
  private floorKey = '';
  private map: Floor | null = null;
  private rooms = false; // Archero rooms mode (the camera keeps x on the room's middle)
  private mapObjs: Phaser.GameObjects.GameObject[] = [];
  private chests: Phaser.GameObjects.Image[] = [];
  private stairs!: Phaser.GameObjects.Image;
  private heroes = new Map<string, HeroGfx>();
  private goo = new Map<number, GooGfx>();
  private coins = new Map<number, Phaser.GameObjects.Sprite>();
  private spits = new Map<number, { s: Phaser.GameObjects.Sprite; o: Phaser.GameObjects.Sprite; px: number; py: number }>();
  private ringG!: Phaser.GameObjects.Graphics;
  private doorG!: Phaser.GameObjects.Graphics;
  private auraG!: Phaser.GameObjects.Graphics;
  private hitG!: Phaser.GameObjects.Graphics;
  private bubble!: Phaser.GameObjects.Text;
  private lastClock = 0;
  private camTarget = { x: 0, y: 0 };

  constructor() { super('dungeon'); }

  init(data: { session: Session }) {
    this.s = data.session;
    this.floorKey = ''; this.map = null; this.mapObjs = []; this.chests = [];
    this.heroes.clear(); this.goo.clear(); this.coins.clear(); this.spits.clear();
    this.lastClock = 0;
  }

  preload() {
    const img = (key: string, url: string) => { if (!this.textures.exists(key)) this.load.image(key, url); };
    const sheet = (key: string, url: string, w: number, h: number) => { if (!this.textures.exists(key)) this.load.spritesheet(key, url, { frameWidth: w, frameHeight: h }); };
    // Ninja Adventure FX for the specials, revive, sidestep, pickups (docs/OLD_ART_CHECKLIST.md); keys kept from the old art
    sheet('na-arc', NA + 'FX/Slash/SpriteSheetArc.png', 38, 34); // slash arc for slashing weapons
    // ChatGPT N-13 FX strips (4 x 32 px) and N-21 hazard ring (4 x 48x32): art/dungeon/fx, art/dungeon/ui
    for (const k of ['hit-spark', 'ko-stars', 'levelup', 'shockwave', 'slam-warning']) sheet('n13-' + k, `art/dungeon/fx/${k}.png`, 32, 32);
    sheet('n21-hazard', 'art/dungeon/ui/hazard-ring.png', 48, 32);
    sheet('dg-revive', NA + 'FX/Magic/Spirit/SpriteSheetBlue.png', 32, 32);
    sheet('dg-fx-spin', NA + 'FX/Attack/CircularSlash/SpriteSheet.png', 32, 32);
    sheet('dg-fx-slam', NA + 'FX/Elemental/Rock/SpriteSheet.png', 30, 30);
    sheet('dg-fx-charge', NA + 'FX/Smoke/SmokeCircular/SpriteSheet.png', 30, 14);
    sheet('dg-fx-sidestep', NA + 'FX/Smoke/Smoke/SpriteSheet.png', 32, 32);
    sheet('dg-fx-heal', NA + 'FX/Magic/Spirit/SpriteSheet.png', 32, 32);
    sheet('dg-fx-wall', NA + 'FX/Magic/Shield/SpriteSheetYellow.png', 24, 26);
    sheet('dg-fx-block', NA + 'FX/Magic/Shield/SpriteSheetBlue.png', 24, 26);
    img('dg-arrow', NA + 'FX/Projectile/Arrow.png');
    // attacks without weapon sprites (Stefan 2026-11-15): Ninja slash (knight), cut (rogue), energy ball (healer)
    sheet('fx-slash', NA + 'FX/Attack/SlashCurved/SpriteSheet.png', 32, 32);
    sheet('fx-cut', NA + 'FX/Attack/Cut/SpriteSheet.png', 32, 32);
    sheet('fx-magic', NA + 'FX/Projectile/EnergyBall.png', 16, 16);
    // class markers in the nameplate (16 px): bow (crossbow until a bow icon exists), heal plus, dagger, shield
    for (const [c, u] of [['marksman', 'art/dungeon/weapons/crossbow-16.png'], ['healer', 'art/dungeon/icons/heal-mode-16.png'], ['rogue', 'art/dungeon/weapons/dagger-16.png'], ['tank', 'art/dungeon/weapons/shield-16.png']]) img('cls-' + c, u);
    sheet('dg-sparkle', NA + 'FX/Magic/Circle/SpriteSheetSpark.png', 32, 32);
    for (const [k, m] of Object.entries(WIMG)) img('w-' + k, m.src);
    // Ninja Adventure dungeon art (docs/ART_MAP.md section 12 + loot): floor, walls, stairs, chest, coins, potion, bars
    img('na-floor', NA + 'Backgrounds/Tilesets/Interior/TilesetInteriorFloor.png');
    img('na-walls', NA + 'Backgrounds/Tilesets/Interior/TilesetWallSimple.png');
    img('na-elem', NA + 'Backgrounds/Tilesets/TilesetElement.png');
    img('x72', 'assets/0x72-dungeon-ii/0x72_DungeonTilesetII_v1.7.png'); // rooms: 0x72 DungeonTileset II (CC0), Stefan's pick
    sheet('na-chest', NA + 'Items/Treasure/BigTreasureChest.png', 16, 14);
    sheet('na-coin', NA + 'Items/Treasure/Coin2.png', 10, 10);
    img('na-potion', NA + 'Items/Potion/LifePot.png');
    img('na-lbu', NA + 'Ui/Receptacle/LifeBarMiniUnder.png');
    img('na-lbp', NA + 'Ui/Receptacle/LifeBarMiniProgress.png');
    for (const m of MON) sheet(m.key, NA + m.file, m.key === 'na-boss' ? 62 : 16, m.key === 'na-boss' ? 52 : 16);
    sheet('na-boss-jump', NA + 'Actor/Boss/GiantSlime/Jump.png', 62, 52);
    sheet('na-boss-hit', NA + 'Actor/Boss/GiantSlime/Hit.png', 62, 52);
    for (const [k, f, w, h] of NFX) sheet(k, NA + f, w, h);
  }

  /** No bloody weapons (Stefan): the red pixels on the Ninja blades become steel grey (palette swap, same art). */
  private steel(key: string) {
    if (!this.textures.exists(key) || this.textures.get(key).getSourceImage() instanceof HTMLCanvasElement) return;
    const im = this.textures.get(key).getSourceImage() as HTMLImageElement;
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const g = c.getContext('2d')!; g.drawImage(im, 0, 0);
    const px = g.getImageData(0, 0, c.width, c.height), a = px.data;
    for (let i = 0; i < a.length; i += 4) {
      const r = a[i], gr = a[i + 1], bl = a[i + 2];
      if (a[i + 3] && r - gr > 60 && r - bl > 40 && gr < 100) { const v = Math.round(0.6 * r + 0.3 * gr + 0.1 * bl); a[i] = v; a[i + 1] = v + 6; a[i + 2] = v + 12; }
    }
    g.putImageData(px, 0, 0);
    this.textures.remove(key);
    this.textures.addCanvas(key, c)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  create() {
    this.steel('w-sword'); this.steel('w-sai');
    const anim = (key: string, tex: string, frames: number[], rate: number, repeat = 0) => {
      if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(tex, { frames }), frameRate: rate, repeat });
    };
    for (const m of MON) {
      if (m.key === 'na-boss') { anim('na-boss', 'na-boss', [0, 1, 2, 3, 4], 8, -1); continue; }
      MON_DIRS.forEach((dn, c) => anim(`${m.key}-${dn}`, m.key, [c, c + 4, c + 8, c + 12], 7, -1));
    }
    anim('na-boss-jump', 'na-boss-jump', [...Array(13).keys()], 16);
    anim('na-coin', 'na-coin', [0, 1, 2, 3], 8, -1);
    anim('na-boss-hit', 'na-boss-hit', [0, 1, 2, 3, 4], 14);
    for (const [k, , , , fps, loop] of NFX) if (k !== 'nf-chev') anim(k, k, [...Array(this.textures.get(k).frameTotal - 1).keys()], fps, loop ? -1 : 0);
    const seq = (n: number) => [...Array(n).keys()];
    anim('dg-revive', 'dg-revive', seq(5), 10);
    anim('dg-spin', 'dg-fx-spin', seq(4), 14);
    anim('dg-slam', 'dg-fx-slam', seq(14), 24);
    anim('dg-charge', 'dg-fx-charge', seq(8), 20);
    anim('dg-sidestep', 'dg-fx-sidestep', seq(6), 16);
    anim('dg-heal', 'dg-fx-heal', seq(5), 10);
    for (const k of ['hit-spark', 'levelup', 'shockwave', 'slam-warning']) anim('n13-' + k, 'n13-' + k, seq(4), 14);
    anim('n13-ko-stars', 'n13-ko-stars', seq(4), 8, -1);
    anim('n21-hazard', 'n21-hazard', seq(4), 8, -1);
    anim('dg-wall', 'dg-fx-wall', seq(6), 12);
    anim('dg-block', 'dg-fx-block', seq(6), 16);
    anim('fx-slash', 'fx-slash', seq(4), 22); anim('fx-cut', 'fx-cut', seq(4), 26); anim('fx-magic', 'fx-magic', seq(4), 12);
    anim('dg-sparkle', 'dg-sparkle', seq(6), 18);
    this.auraG = this.add.graphics().setDepth(-300);
    this.hitG = this.add.graphics().setDepth(9000);
    this.ringG = this.add.graphics().setDepth(4000);
    this.doorG = this.add.graphics().setDepth(-895); // rooms: the gather ring at the open door: on the floor, UNDER the door (-890) so the door hides its top, under the blobz
    this.bubble = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '22px', color: '#3f2631', fontStyle: 'bold', backgroundColor: '#fff7e6', padding: { x: 8, y: 2 } })
      .setOrigin(0.5, 1).setDepth(6000).setVisible(false);
    if (DEBUG) (window as unknown as { __dgScene?: Phaser.Scene }).__dgScene = this; // e2e: map + camera checks
    const cam = this.cameras.main;
    // no camera bounds: it always keeps my blob centred, even in rooms at the map's edge (Stefan: "it stops at the
    // bottom of the screen"); outside the map shows the same dark rock colour as the void between rooms
    cam.removeBounds();
    cam.setRoundPixels(true);
    cam.setBackgroundColor('#141b1b');
    this.fitCamera();
    this.scale.on('resize', this.fitCamera, this); // Phaser resized the canvas
    // Code's shared viewport watcher (rotation, app switch, visual viewport; debounced): re-measure the camera and view
    const off = onViewport(() => this.fitCamera());
    this.events.once('shutdown', () => { this.scale.off('resize', this.fitCamera, this); off(); document.getElementById('dg-wipe')?.remove(); });
  }

  private fitCamera() {
    const w = this.scale.width, h = this.scale.height;
    const cam = this.cameras.main;
    if (cam.width !== w || cam.height !== h) cam.setSize(w, h);
    // rooms in portrait: exactly 3x (zoom 1: 1 art px = 3 CSS px); the room is as wide as the narrowest phone allows,
    // so on wider phones a dark margin shows left / right. Only a phone narrower than the room shrinks (never happens
    // when every phone reports its width). Landscape and the classic dungeon keep the fitted zoom.
    // Device pixels (pixelScale.ts; the canvas is CSS size x dpr() once Code flips DPR_CANVAS): one art px (3 world px)
    // = k WHOLE device px, k = floor(3 x dpr) unless the room would not fit, then the largest k that fits.
    const d = dpr(), roomPx = this.rooms && this.map ? fw(this.map) * ft(this.map) : 0;
    if (roomPx && h >= w) { const k = Math.max(1, Math.min(Math.floor(3 * d + 1e-6), Math.floor(w / (roomPx / 3)))); cam.setZoom(k / 3); } // k: 3 at dpr 1, 6 at 2, 7 at 2.625, 9 at 3
    else cam.setZoom(snapZoom(Math.max(0.55, Math.min(2.2, Math.min(Math.max(w, h) / d / 820, Math.min(w, h) / d / 430)))));
    if (this.rooms) cam.setBackgroundColor('#181425'); // the margin = the room's own dark
    // jump straight to where the camera should be for the new size (the easing would start from the stale view)
    const me = this.s ? this.heroes.get(this.s.myId) : undefined;
    if (me && this.map && !this.snapNext) { // (a new floor sets its own camera start; the blob graphics are still at the old place)
      const landscape = w > h;
      const x = this.rooms ? (fw(this.map) * ft(this.map)) / 2 : me.x - (landscape ? 70 / cam.zoom : 0);
      this.camTarget = { x, y: this.roomCamY(me.y) };
      cam.centerOn(x, this.camTarget.y);
    }
  }

  /** Rooms (Archero): bake one room from 0x72 DungeonTileset II only, at its native 16 px (drawn at 3x): floor_1 with a
   *  crack variant ~1 in 4, the wall cap + face rows on top (2 banners), the thin edge walls on the sides (floor under
   *  them), the bottom wall (wall_top_mid) with the entrance gap; the door (frame + leaf) is its own sprite. */
  private bakeRoom(f: Floor, key: string, seed: number) {
    const W = fw(f), H = fh(f), c = document.createElement('canvas');
    c.width = W * 16; c.height = H * 16;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    const sh = this.textures.get('x72').getSourceImage() as HTMLImageElement;
    const put = (sx: number, sy: number, tx: number, ty: number) => g.drawImage(sh, sx, sy, 16, 16, tx * 16, ty * 16, 16, 16);
    let n = seed;
    const rnd = () => { n = (n * 1103515245 + 12345) & 0x7fffffff; return n / 0x7fffffff; };
    const CRACKS: [number, number][] = [[32, 64], [48, 64], [16, 80], [32, 80], [48, 80], [16, 96], [32, 96]];
    g.fillStyle = '#181425';
    g.fillRect(0, 0, c.width, c.height);
    const gap = roomGap(W);
    const cracks = roomCracks(f, seed); // 1-2 per 3x3 block, never touching (Stefan: far fewer)
    const WR = H - 1 - ROOM_STUB; // the bottom wall row; below it the entrance hallway
    for (let ty = 3; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
      if (ty >= WR && !gap.includes(tx)) continue;
      const [sx, sy] = cracks.has(ty * W + tx) ? CRACKS[Math.floor(rnd() * CRACKS.length)] : [16, 64];
      put(sx, sy, tx, ty); // floor_1 / floor_2..8, also under the thin side walls and in the entrance gap
    }
    for (let tx = 0; tx < W; tx++) {
      const edge = tx === 0 || tx === W - 1;
      put(tx === 0 ? 31 : tx === W - 1 ? 48 : 32, edge ? 120 : 0, tx, 1); // cap: wall_edge_top_* / wall_top_mid
      put(tx === 0 ? 32 : tx === W - 1 ? 48 : 32, edge ? 136 : 16, tx, 2); // face: wall_edge_* / wall_mid
      if (edge) {
        for (let ty = 3; ty < WR; ty++) put(tx === 0 ? 32 : 48, 152, tx, ty); // wall_edge_mid_left / right
        put(32, 16, tx, WR); put(tx === 0 ? 32 : 48, 168, tx, WR); // bricks under wall_edge_bottom_left / right (no black corner)
      } else if (!gap.includes(tx)) { put(32, 16, tx, WR); put(32, 0, tx, WR); } // bottom wall: bricks under its wall_top_mid cap
    }
    // the entrance hallway: thin side walls down both sides of the gap; the wall mass beside them is brick (never bare
    // black squares next to the opening)
    const g0 = gap[0], g1 = gap[gap.length - 1];
    for (let ty = WR + 1; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
      if (tx < g0 || tx > g1) put(32, 16, tx, ty); // wall_mid bricks (also under the thin side walls)
      if (tx === g0 - 1) put(48, 152, tx, ty); // wall_edge_mid_right: the hallway's left wall
      else if (tx === g1 + 1) put(32, 152, tx, ty); // wall_edge_mid_left: the hallway's right wall
    }
    put(16, 32, 1, 2); put(32, 32, W - 2, 2); // wall_banner_red, wall_banner_blue
    this.textures.addCanvas(key, c)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
    // the door: frame left / right (16x32) around the leaf (32x32), frame top (32x16) above it = 64x48
    for (const [k, lx] of [['x72-door-closed', 32], ['x72-door-open', 80]] as const) {
      if (this.textures.exists(k)) continue;
      const d = document.createElement('canvas'); d.width = 64; d.height = 48;
      const dg = d.getContext('2d')!;
      dg.drawImage(sh, 16, 240, 16, 32, 0, 16, 16, 32); dg.drawImage(sh, 64, 240, 16, 32, 48, 16, 16, 32);
      if (k === 'x72-door-open') {
        // the open doorway reads as a way on: a dark passage (no wall behind the open leaf), the room's floor
        // fading into it from below
        const gr = dg.createLinearGradient(0, 16, 0, 48); gr.addColorStop(0, '#040208'); gr.addColorStop(0.55, '#140d18'); gr.addColorStop(1, '#4a3b40');
        dg.fillStyle = gr; dg.fillRect(16, 16, 32, 32);
      }
      dg.drawImage(sh, 32, 224, 32, 16, 16, 0, 32, 16); dg.drawImage(sh, lx, 240, 32, 32, 16, 16, 32, 32);
      this.textures.addCanvas(k, d)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }

  /** Bake the floor into one canvas (no tile seams at fractional zoom), slightly darker than the meadow. */
  private buildFloor(seed: number, floor: number, players: number, dungeon = 1, rooms = false, tiles = 9) {
    for (const o of this.mapObjs) o.destroy();
    this.mapObjs = []; this.chests = [];
    // rooms mode (Archero): one tall screen-wide room instead of the floor maze; the same baking below
    const f = rooms ? makeRoom(seed, floor, players, dungeon, tiles) : makeFloor(seed, floor, players);
    this.map = f;
    this.rooms = rooms;
    const key = rooms ? `dgmap-room-${seed}-${players}-${floor}` : `dgmap-${seed}-${floor}`;
    if (rooms && !this.textures.exists(key)) this.bakeRoom(f, key, seed + floor * 7);
    if (!rooms && !this.textures.exists(key)) {
      const c = document.createElement('canvas');
      c.width = fw(f) * TP; c.height = fh(f) * TP;
      const g = c.getContext('2d')!;
      g.imageSmoothingEnabled = false;
      // Ninja Adventure tiles at 2x (16 px -> one 32 px dungeon tile): stone-brick floor, the brown wall frame
      // (TilesetWallSimple) around every floor area, dark void inside the rock
      const fl = this.textures.get('na-floor').getSourceImage() as HTMLImageElement, wl = this.textures.get('na-walls').getSourceImage() as HTMLImageElement;
      const put = (im: HTMLImageElement, sx: number, sy: number, tx: number, ty: number, flip = false) => {
        if (!flip) { g.drawImage(im, sx, sy, 16, 16, tx * TP, ty * TP, TP, TP); return; }
        g.save(); g.translate(tx * TP + TP, ty * TP); g.scale(-1, 1); g.drawImage(im, sx, sy, 16, 16, 0, 0, TP, TP); g.restore();
      };
      const solid = (tx: number, ty: number) => tx < 0 || ty < 0 || tx >= fw(f) || ty >= fh(f) || f.solid[ty * fw(f) + tx] === 1;
      let n = seed + floor * 7;
      const rnd = () => { n = (n * 1103515245 + 12345) & 0x7fffffff; return n / 0x7fffffff; };
      g.fillStyle = '#141b1b';
      g.fillRect(0, 0, c.width, c.height);
      for (let ty = 0; ty < fh(f); ty++) for (let tx = 0; tx < fw(f); tx++) {
        if (!solid(tx, ty)) { put(fl, 192, 208, tx, ty, rnd() < 0.5); continue; }
        // a wall next to floor gets the frame piece facing that floor (edges first, then outer corners)
        const S = !solid(tx, ty + 1), N = !solid(tx, ty - 1), E = !solid(tx + 1, ty), W = !solid(tx - 1, ty);
        if (S) put(wl, 48, 96, tx, ty); // top edge of the room below
        else if (N) put(wl, 48, 160, tx, ty); // bottom edge
        else if (E) put(wl, 0, 112, tx, ty); // left edge
        else if (W) put(wl, 64, 112, tx, ty); // right edge
        else if (!solid(tx + 1, ty + 1)) put(wl, 0, 96, tx, ty); // corners: floor only diagonal
        else if (!solid(tx - 1, ty + 1)) put(wl, 64, 96, tx, ty);
        else if (!solid(tx + 1, ty - 1)) put(wl, 0, 160, tx, ty);
        else if (!solid(tx - 1, ty - 1)) put(wl, 64, 160, tx, ty);
      }
      this.textures.addCanvas(key, c)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.mapObjs.push(this.add.image(0, 0, key).setOrigin(0).setScale(rooms ? ft(f) / 16 : DT / TP).setDepth(-1000)); // rooms: 16 px art at 3x
    // stairs: down (floors 1-2) or the way out after the boss (floor 3); floor 1 also has the exit up
    // Ninja stairs (TilesetElement, green stone): down at 144,176, up at 144,192; drawn 3x
    if (!this.textures.exists('na-stairs-down')) {
      const el = this.textures.get('na-elem').getSourceImage() as HTMLImageElement;
      for (const [k, sy] of [['na-stairs-down', 176], ['na-stairs-up', 192]] as const) {
        const cv = document.createElement('canvas'); cv.width = cv.height = 16;
        cv.getContext('2d')!.drawImage(el, 144, sy, 16, 16, 0, 0, 16, 16);
        this.textures.addCanvas(k, cv)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }
    // rooms: the N-34 door in the top wall at 2x (the tiles' scale), its floor line on the room's top edge
    this.stairs = rooms
      ? this.add.image(f.stairs.x, 3 * ft(f), 'x72-door-closed').setOrigin(0.5, 1).setScale(3).setDepth(-890)
      : this.add.image(f.stairs.x, f.stairs.y, floor < FLOORS ? 'na-stairs-down' : 'na-stairs-up').setScale(3).setDepth(-900);
    this.mapObjs.push(this.stairs);
    if (floor === 1 && rooms) {
      // rooms: the way out of the dungeon = 0x72 floor_stairs (80,192) in the bottom-left corner
      if (!this.textures.exists('x72-stairs')) { const cv = document.createElement('canvas'); cv.width = cv.height = 16; cv.getContext('2d')!.drawImage(this.textures.get('x72').getSourceImage() as HTMLImageElement, 80, 192, 16, 16, 0, 0, 16, 16); this.textures.addCanvas('x72-stairs', cv)!.setFilter(Phaser.Textures.FilterMode.NEAREST); }
      this.mapObjs.push(this.add.image(f.exit.x, f.exit.y, 'x72-stairs').setScale(3).setDepth(-900));
    } else if (floor === 1) this.mapObjs.push(this.add.image(f.exit.x, f.exit.y, 'na-stairs-up').setScale(3).setDepth(-900));
    if (rooms && f.columns?.length) {
      if (!this.textures.get('x72').has('column')) this.textures.get('x72').add('column', 0, 80, 80, 16, 48);
      for (const c of f.columns) this.mapObjs.push(this.add.image((c.x + 0.5) * ft(f), (c.y + 1) * ft(f), 'x72', 'column').setOrigin(0.5, 1).setScale(3).setDepth((c.y + 1) * ft(f) - 10));
    }
    if (rooms && f.walls?.length) {
      // brick cover: 0x72 wall face per tile (left / mid / right end by its neighbours) with the wall_top cap on the tile
      // above when nothing is stacked on it; sprites sorted with the blobz (a blob behind the wall is hidden by it)
      const tx = this.textures.get('x72');
      for (const [k, x, y] of [['wt-l', 16, 0], ['wt-m', 32, 0], ['wt-r', 48, 0], ['wf-l', 16, 16], ['wf-m', 32, 16], ['wf-r', 48, 16]] as const) if (!tx.has(k)) tx.add(k, 0, x, y, 16, 16);
      const has = new Set(f.walls.map((w) => `${w.x},${w.y}`)), T = ft(f);
      for (const w of f.walls) {
        const l = has.has(`${w.x - 1},${w.y}`), r = has.has(`${w.x + 1},${w.y}`), end = !l && !r ? 'm' : !l ? 'l' : !r ? 'r' : 'm';
        const depth = (w.y + 1) * T - 12;
        this.mapObjs.push(this.add.image((w.x + 0.5) * T, (w.y + 1) * T, 'x72', 'wf-' + end).setOrigin(0.5, 1).setScale(3).setDepth(depth));
        if (!has.has(`${w.x},${w.y - 1}`)) this.mapObjs.push(this.add.image((w.x + 0.5) * T, w.y * T, 'x72', 'wt-' + end).setOrigin(0.5, 1).setScale(3).setDepth(depth));
      }
    }
    this.chests = f.chests.map((c) => this.add.image(c.x, c.y + 8, 'na-chest', 0).setScale(3).setOrigin(0.5, 1).setDepth(c.y));
    this.mapObjs.push(...this.chests);
    // a big floor banner
    const banner = this.add.text(f.start.x, f.start.y - 90, rooms ? t(floor === ROOMS ? 'dg.roomBoss' : floor === MINIBOSS_ROOM ? 'dg.roomMini' : 'dg.roomBanner', { d: dungeon, n: floor }) : t(floor === FLOORS ? 'dg.floorBoss' : 'dg.floorBanner', { d: dungeon, n: floor }), { fontFamily: FONT, fontSize: '34px', color: '#ffe08a', fontStyle: 'bold', stroke: '#3f2631', strokeThickness: 7 })
      .setOrigin(0.5).setDepth(7000);
    this.tweens.add({ targets: banner, y: banner.y - 30, alpha: 0, delay: 1400, duration: 900, onComplete: () => banner.destroy() });
    // the camera jumps to the arrival point
    this.camTarget = { x: f.start.x, y: this.roomCamY(f.start.y) };
    this.cameras.main.centerOn(this.camTarget.x, this.camTarget.y);
  }

  update() {
    const clock = performance.now();
    const dt = this.lastClock ? Math.min(0.1, (clock - this.lastClock) / 1000) : 1 / 60;
    this.lastClock = clock;
    const v = this.s.view();
    const d = v?.dungeon;
    if (!v || !d) return;
    const fk = `${d.seed}-${d.floor}-${d.rooms ? 'r' + d.roomTiles : 'f'}`;
    if (fk !== this.floorKey) { this.floorKey = fk; this.snapNext = true; if (d.rooms && this.wipeA > 0.5) { this.wipeA = 1; this.wipeHold = 0.2; } this.buildFloor(d.seed, d.floor, v.players.length, d.dungeon, d.rooms, d.roomTiles); this.fitCamera(); } // rooms: the cut happens under a fully dark screen
    const f = this.map!;
    const now = this.time.now;
    const smooth = this.s.role === 'client' && !this.snapNext; // a new floor / room: everything jumps to its new place
    this.snapNext = false;
    const k = Math.min(1, dt * 14);

    // ---- chests ----
    d.opened.forEach((o, i) => { const c = this.chests[i]; if (c && o && c.frame.name !== '1') c.setFrame(1); });
    // the boss exit glows only once the boss is gone
    const bossAlive = d.enemies.some((e) => e.kind === 2);
    // rooms: the door opens (and the chest shows) once every wave is gone
    const roomOpen = d.rooms && d.wave >= d.waves && d.landing === 0 && d.enemies.length === 0;
    if (d.rooms) {
      const want = roomOpen ? 'x72-door-open' : 'x72-door-closed';
      if (this.stairs.texture.key !== want) { this.stairs.setTexture(want); if (roomOpen) this.nfx('nf-smoke', f.stairs.x, 2 * ft(f), 2); }
      this.chests.forEach((c) => c.setVisible(roomOpen));
    } else this.stairs.setAlpha(d.floor === FLOORS && bossAlive ? 0.35 : 1);

    // ---- coins ----
    const seenC = new Set<number>();
    for (const c of d.coins) {
      seenC.add(c.id);
      let img = this.coins.get(c.id);
      if (!img) { img = c.k === 1 ? this.add.sprite(c.x, c.y, 'na-potion').setScale(2) : this.add.sprite(c.x, c.y, 'na-coin', 0).setScale(2).play('na-coin'); img.setData('sh', this.add.ellipse(c.x, c.y + 6, 18, 6, 0x000000, 0.28)); this.coins.set(c.id, img); }
      // lying on the floor: no bob, a fixed foot shadow (Stefan: things on the ground lie still)
      img.x += (c.x - img.x) * (smooth ? k : 1); img.y += (c.y - 4 - img.y) * (smooth ? k : 1);
      img.setDepth(c.y - 5);
      (img.getData('sh') as Phaser.GameObjects.Ellipse).setPosition(img.x, img.y + 10).setDepth(c.y - 6);
    }
    for (const [id, img] of this.coins) if (!seenC.has(id)) { (img.getData('sh') as Phaser.GameObjects.Ellipse | undefined)?.destroy(); img.destroy(); this.coins.delete(id); }

    // ---- monster shots (dodge them with a sidestep): Ninja fireballs, hostile orange (boss: purple), dark outline ----
    const seenS = new Set<number>();
    for (const sp of d.spit) {
      seenS.add(sp.id);
      let c = this.spits.get(sp.id);
      if (!c) {
        const boss = d.enemies.some((e) => e.kind === 2 && Math.hypot(e.x - sp.x, e.y - sp.y) < 80);
        const col = boss ? HOSTILE.purple : HOSTILE.orange;
        const o = this.add.sprite(sp.x, sp.y, 'nf-fire').play('nf-fire').setScale(2).setTintFill(HOSTILE.outline);
        c = { s: this.add.sprite(sp.x, sp.y, 'nf-fire').play('nf-fire').setScale(2).setTint(col), o, px: sp.x, py: sp.y };
        this.spits.set(sp.id, c);
      }
      const nx = c.s.x + (sp.x - c.s.x) * (smooth ? k : 1), ny = c.s.y + (sp.y - c.s.y) * (smooth ? k : 1);
      const a = Math.atan2(ny - c.py, nx - c.px);
      if (Math.hypot(nx - c.px, ny - c.py) > 0.5) { c.s.setRotation(a); c.o.setRotation(a); c.px = nx; c.py = ny; }
      c.s.setPosition(nx, ny).setDepth(ny + 11); c.o.setPosition(nx, ny).setDepth(ny + 10);
    }
    for (const [id, c] of this.spits) if (!seenS.has(id)) { c.s.destroy(); c.o.destroy(); this.spits.delete(id); }

    // ---- monsters (Ninja Adventure): sprite turned toward its target, telegraphs drawn from the snapshot ----
    const seenE = new Set<number>();
    for (const e of d.enemies) {
      seenE.add(e.id);
      let g = this.goo.get(e.id);
      const m = MON[e.kind];
      if (!g) {
        const img = this.add.sprite(e.x, e.y, m.key, 0).setScale(GOO_SCALE[e.kind]).setOrigin(m.ox, m.oy);
        g = { img, shadow: this.add.ellipse(e.x, e.y, ENEMY_R[e.kind] * 2, ENEMY_R[e.kind] * 0.6, 0x000000, 0.3), x: e.x, y: e.y, flash: 0, kind: e.kind, dir: 0, tele: [], teleKey: '' };
        g.bar = this.add.graphics();
        this.goo.set(e.id, g);
      }
      const ox = g.x, oy = g.y;
      g.x += (e.x - g.x) * (smooth ? k : 1); g.y += (e.y - g.y) * (smooth ? k : 1);
      g.flash = Math.max(0, g.flash - dt);
      // facing: the attack direction while acting, else the way it moves, else toward the nearest blob
      let fa: number | null = e.act ? e.ang : Math.hypot(g.x - ox, g.y - oy) > 0.3 ? Math.atan2(g.y - oy, g.x - ox) : null;
      if (fa === null) { let bd = 1e9; for (const p of v.players) { const dd = Math.hypot(p.x - g.x, p.y - g.y); if (dd < bd) { bd = dd; fa = Math.atan2(p.y - g.y, p.x - g.x); } } }
      if (fa !== null) { const cx = Math.cos(fa), cy = Math.sin(fa); g.dir = Math.abs(cx) > Math.abs(cy) ? (cx < 0 ? 2 : 3) : cy < 0 ? 1 : 0; }
      let dx = g.x, dy = g.y, sc = GOO_SCALE[e.kind], sy = 1;
      if (e.kind === 2) {
        // boss: idle; during the slam warning it crouches, leaps out of view and crashes down on the marked spot
        const p = e.slam ? 1 - Math.max(0, e.slam.t) / SLAM_WARN : -1;
        const want = p >= 0.3 ? 'na-boss-jump' : 'na-boss';
        if (g.img.anims.currentAnim?.key !== want && !(g.img.anims.currentAnim?.key === 'na-boss-hit' && g.img.anims.isPlaying)) g.img.play(want);
        if (p >= 0 && p < 0.3) sy = 1 - p; // crouch
        else if (p >= 0.3 && p < 0.75) dy = g.y - ((p - 0.3) / 0.45) * 520;
        else if (p >= 0.75 && e.slam) { dx = e.slam.x; dy = e.slam.y - ((1 - p) / 0.25) * 520; }
      } else {
        const want = `${m.key}-${MON_DIRS[g.dir]}`;
        if (g.img.anims.currentAnim?.key !== want) g.img.play(want);
        if (e.act === 1 || e.act === 3 || e.act === 5) g.img.anims.pause(); else if (g.img.anims.isPaused) g.img.anims.resume();
        if (e.act === 1) sc *= 1 + 0.12 * (1 - e.at / DASH_WARN); // swells while winding up
      }
      g.img.setPosition(dx, dy).setScale(sc * (2 - sy), sc * sy).setDepth(dy);
      g.shadow.setPosition(g.x, g.y + (GOO_ART[e.kind][1] * GOO_SCALE[e.kind]) / 2 - 2).setDepth(g.y - 30).setVisible(dy >= g.y - 40);
      // tint: white flash when hit (friendly), hostile red/orange flicker while winding up, phase-2 boss red
      const winding = e.act === 1 || e.act === 3 || e.act === 5 || (e.kind === 2 && !!e.slam);
      if (g.flash > 0) g.img.setTintFill(0xffffff);
      else if (winding && Math.floor(now / 90) % 2) g.img.setTint(e.act === 5 ? HOSTILE.orange : HOSTILE.red);
      else if (e.kind === 2 && e.hp < e.mx / 2) g.img.setTint(0xff8a8a);
      else g.img.clearTint();
      this.telegraph(g, e, now);
      // health bar: the boss always (big), other monsters once hurt (small)
      // Ninja mini life bar (LifeBarMiniUnder + Progress): the boss big (5x), others small (2x) once hurt
      const showBar = (e.kind === 2 || e.hp < e.mx) && dy >= g.y - 40;
      if (!g.hb) g.hb = this.lifeBar();
      this.setBar(g.hb, showBar, g.x, g.y - ENEMY_R[e.kind] - (e.kind === 2 ? 24 : 12), e.kind === 2 ? 5 : 2, e.hp / Math.max(1, e.mx), e.kind === 2 && e.hp < e.mx / 2 ? 0xff9a9a : undefined);
    }
    for (const [id, g] of this.goo) if (!seenE.has(id)) { g.img.destroy(); g.shadow.destroy(); g.bar?.destroy(); g.hb?.u.destroy(); g.hb?.p.destroy(); g.tele.forEach((t) => t.destroy()); this.goo.delete(id); }

    // ---- blobz ----
    this.ringG.clear(); this.auraG.clear();
    const infos = this.s.infos();
    const seenP = new Set<string>();
    for (const p of v.players) {
      seenP.add(p.id);
      const h = d.heroes[p.id];
      const info = infos.get(p.id) ?? { id: p.id, name: '?', color: 0xcccccc, shape: 0, eyes: 0, mouth: 0, hat: 0 };
      const look = clampLook(info);
      const ch = h ? CLASS_HAT[h.cls] : undefined; // Prästluva / Fjädermössa / Riddarhjälm replace the skin hat underground
      const base = `blob-${look.color}-${look.shape}-${look.eyes}-${look.mouth}-${look.hat}` + (ch !== undefined ? `-c${ch}` : '');
      // blobz v2: one 3/4 view, frame 0 idle / 1 glide, mirrored when facing left; the class hat is baked in
      if (!this.textures.exists(base + '-0')) for (let fr = 0; fr < BLOB_FRAMES; fr++) this.textures.addCanvas(`${base}-${fr}`, blobCanvas(look, 1, ch, undefined, fr))!.setFilter(Phaser.Textures.FilterMode.NEAREST);
      const prev = this.heroes.get(p.id);
      const ko0 = (h?.ko ?? 0) > 0;
      const frame = !ko0 && Math.hypot(p.vx, p.vy) >= FACE_DEAD ? 1 : 0;
      // facing: the glide direction; while attacking it turns to the target
      const facing: Facing = prev && prev.swingT > 0 ? (Math.cos(prev.swingA) < 0 ? 'left' : 'right') : facingFromVelocity(p.vx, p.vy, FACE_DEAD, prev?.facing ?? 'right');
      const texKey = `${base}-${frame}`;
      if (DEBUG) ((window as unknown as { __dgFace?: Record<string, { facing: Facing; frame: number }> }).__dgFace ??= {})[p.id] = { facing, frame };
      let b = this.heroes.get(p.id);
      const w = h?.weapon ?? 'sword';
      if (!b) {
        b = {
          shadow: this.add.ellipse(p.x, p.y, 34, 12, 0x000000, 0.3),
          body: this.add.image(p.x, p.y, texKey).setOrigin(0.5, BODY_CY).setScale(BLOB_SCALE),
          label: this.add.text(p.x, p.y, info.name, { fontFamily: FONT, fontSize: '13px', color: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5),
          weapon: this.add.sprite(p.x, p.y, 'w-' + WART[w]).setVisible(false), // never shown (attacks are FX)
          icon: this.add.image(p.x, p.y, 'cls-' + (h?.cls ?? 'rogue')).setScale(1), // the class marker before the name (16 px art, 1x)
          stars: this.add.sprite(p.x, p.y, 'n13-ko-stars', 0).setScale(2).setVisible(false).play('n13-ko-stars'), // N-13 dizzy stars
          me: this.add.triangle(p.x, p.y, 0, 0, 12, 0, 6, 8, 0xffffff, 0.9).setVisible(p.id === this.s.myId),
          texKey, x: p.x, y: p.y, vx: 0, vy: 0, id: p.id, facing, swingT: 0, swingDur: 0.3, swingA: 0, swings: 0, spin: 0,
        };
        this.heroes.set(p.id, b);
      }
      if (b.texKey !== texKey) { b.body.setTexture(texKey); b.texKey = texKey; }
      b.facing = facing;
      b.body.setFlipX(facing === 'left');
      if (smooth) { b.x += (p.x + p.vx * 0.06 - b.x) * k; b.y += (p.y + p.vy * 0.06 - b.y) * k; } else { b.x = p.x; b.y = p.y; }
      b.vx = p.vx; b.vy = p.vy;
      const ko = (h?.ko ?? 0) > 0;
      const sp = Math.hypot(b.vx, b.vy);
      const stretch = ko ? 0 : Math.min(0.18, sp / 1600);
      // blob reactions (polish): a squash when hit (wobbles back), a happy hop on level-up / loot / revive
      b.sqT = Math.max(0, (b.sqT ?? 0) - dt);
      const sq = b.sqT > 0 ? Math.sin((b.sqT / 0.3) * Math.PI * 2) * 0.22 * (b.sqT / 0.3) : 0;
      b.shadow.setPosition(b.x, b.y + 12).setDepth(b.y - 20);
      // the marksman's jump back: a little hop arc
      b.hopT = Math.max(0, (b.hopT ?? 0) - dt);
      const hop = b.hopT > 0 ? Math.sin((1 - b.hopT / 0.32) * Math.PI) * (b.hopH ?? 18) : 0;
      b.body.setPosition(b.x, b.y - 4 + (ko ? 8 : 0) - hop).setDepth(b.y)
        .setScale(BLOB_SCALE * (1 + stretch + sq) * (ko ? 1.2 : 1), BLOB_SCALE * (1 - stretch * 0.6 - sq) * (ko ? 0.6 : 1))
        .setRotation(ko ? 0 : Phaser.Math.Clamp(b.vx / 1400, -0.18, 0.18))
        .setTint(ko ? 0x888888 : h?.phase ? 0xbfe6ff : 0xffffff)
        // the healer phased out: ghostly and shimmering; a dodge: see-through
        .setAlpha(h?.phase ? 0.3 + Math.sin(now / 70) * 0.08 : h?.dodge ? 0.45 : h?.inv && !ko ? (Math.floor(now / 90) % 2 ? 0.4 : 1) : 1);
      b.weapon.setAlpha(h?.phase ? 0.3 : 1); b.glow?.setAlpha(h?.phase ? 0.2 : 1);
      // nameplate: [class icon] name, centred together under the blob
      if (h && b.icon.texture.key !== 'cls-' + h.cls) b.icon.setTexture('cls-' + h.cls);
      if (b.plateName !== info.name) { b.plateName = info.name; fitPlate(b.label, info.name); }
      b.plateY = b.y + (h && !ko && h.offer.length ? 34 : 24); // below the card-picking bubble too; placed after the loop (plates never overlap each other)
      b.icon.setVisible(!!h);
      b.me.setPosition(b.x, b.y - 50).setDepth(b.y + 3);
      // friends' health: the Ninja mini life bar (green, red when low)
      if (!b.hb) b.hb = this.lifeBar();
      const hfr = h ? h.hp / Math.max(1, h.maxHp) : 1;
      this.setBar(b.hb, !!h && !ko && p.id !== this.s.myId, b.x, b.y - 46, 2, hfr, hfr <= 0.3 ? undefined : 0x7dff8a);
      if (h && !ko && h.wallT > 0) {
        // the wall's reach on the ground + Art's dome over it (rises, then holds on the last frame)
        const r = specialOf(h.cls, h.weapon).r * heroMods(h).spR;
        this.auraG.lineStyle(3, 0x8fd3ff, 0.6).strokeEllipse(b.x, b.y + 10, r * 2, r * 1.2);
        if (!b.dome) { b.dome = this.add.sprite(b.x, b.y, 'dg-fx-wall', 0).setOrigin(0.5, 1); b.dome.play('dg-wall'); }
        b.dome.setPosition(b.x, b.y + 16).setScale(Math.max(2, Math.round((r * 1.6) / 24))).setDepth(b.y + 6).setAlpha(h.wallT < 0.6 ? h.wallT / 0.6 : 1);
      } else if (b.dome) { b.dome.destroy(); b.dome = undefined; }
      if (h && !ko && h.shield > 0) this.ringG.lineStyle(3, 0x8fd3ff, 0.9).strokeCircle(b.x, b.y - 6, 28);
      b.stars.setVisible(ko).setPosition(b.x, b.y - 34).setDepth(b.y + 4);
      b.mode = h?.mode ?? 0;
      this.drawWeapon(b, w, h?.face ?? 0, ko, dt, !!h && (h.guard || !!h.dodge || h.wallT > 0));
      // picking level-up cards: frozen and safe (a soft bubble so friends see why it stands still)
      if (h && !ko && h.offer.length) this.ringG.fillStyle(0xfff7e6, 0.25).fillCircle(b.x, b.y - 6, 30).lineStyle(3, 0xffe08a, 0.9).strokeCircle(b.x, b.y - 6, 30);
      if (b.fx) {
        const cy = b.body.y; // the body's origin is its centre
        if (b.fx.kind === 'spin') b.fx.spr.setPosition(b.x, cy).setDepth(b.y + 5);
        else b.fx.spr.setPosition(b.x - Math.cos(b.fx.a) * 12, cy - Math.sin(b.fx.a) * 12).setDepth(b.y - 1);
      }
    }
    this.placePlates(seenP);
    for (const [id, b] of this.heroes) if (!seenP.has(id)) { for (const o of [b.shadow, b.body, b.label, b.icon, b.weapon, b.stars, b.me]) o.destroy(); b.barrier?.destroy(); b.fx?.spr.destroy(); b.dome?.destroy(); b.weapon2?.destroy(); b.glow?.destroy(); b.wshadow?.destroy(); b.hb?.u.destroy(); b.hb?.p.destroy(); this.heroes.delete(id); }

    // ---- stairs: progress ring + "2/3" bubble when someone stands on them ----
    this.bubble.setVisible(false);
    const alive = v.players.filter((p) => (d.heroes[p.id]?.ko ?? 0) <= 0);
    // rooms: the open door gets Code's kit gather ring (one segment per standing blob, gold while inside the doorway,
    // the 1.5 s count sweeps it); the old ring stays for the classic stairs and the way out
    if (d.rooms && roomOpen) drawGatherRing(this.doorG, { x: f.stairs.x, y: 3.4 * ft(f), rx: 1.5 * ft(f), ry: 0.8 * ft(f), inside: alive.map((p) => inDoorway(f, p.x, p.y)), fill: Math.min(1, d.ready), now });
    else this.doorG.clear();
    const spots = [...(d.rooms ? [] : [{ at: f.stairs, open: d.floor < FLOORS || !bossAlive }]), ...(d.floor === 1 ? [{ at: f.exit, open: true }] : [])];
    for (const s of spots) {
      if (!s.open) continue;
      const on = alive.filter((p) => Math.hypot(p.x - s.at.x, p.y - s.at.y) < STAIRS_R).length;
      if (!on) continue;
      this.ringG.lineStyle(4, 0xfff7e6, 0.8).strokeCircle(s.at.x, s.at.y, STAIRS_R);
      if (on === alive.length && d.ready > 0) {
        this.ringG.lineStyle(8, 0x6cc644, 1).beginPath();
        this.ringG.arc(s.at.x, s.at.y, STAIRS_R, -Math.PI / 2, -Math.PI / 2 + Math.min(1, d.ready) * Math.PI * 2);
        this.ringG.strokePath();
      }
      this.bubble.setText(`${on}/${alive.length}`).setPosition(s.at.x, s.at.y - STAIRS_R - 6).setVisible(true);
    }

    // ---- ?hitbox: what the sim really uses (goo circles, blob circles, my weapon reach) ----
    if (HITBOX) {
      this.hitG.clear();
      for (const e of d.enemies) this.hitG.lineStyle(2, 0xff3b3b, 1).strokeCircle(e.x, e.y, ENEMY_R[e.kind]);
      for (const p of v.players) {
        this.hitG.lineStyle(2, 0x39ff6a, 1).strokeCircle(p.x, p.y, 17);
        const h = d.heroes[p.id];
        if (h && p.id === this.s.myId) this.hitG.lineStyle(1, 0xffe08a, 0.8).strokeCircle(p.x, p.y, WEAPON_STATS[h.weapon].reach + heroMods(h).reach);
      }
    }
    // ---- fx ----
    for (const fx of this.s.drainFx()) this.playFx(fx as DFx);

    // ---- camera follows my blob ----
    const me = this.heroes.get(this.s.myId);
    const cam = this.cameras.main;
    // landscape: the HUD sits top-left, so the camera keeps my blob a little right of centre (the room to its left stays
    // visible instead of hiding monsters under the HUD)
    const landscape = this.scale.width > this.scale.height;
    const goingUp = d.rooms && (d.trans > 0 || d.walkIn > 0); // the room change: the camera only ever moves UP
    if (me) { const sh = this.cardShift(landscape); this.camTarget.x = this.rooms && this.map ? (fw(this.map) * ft(this.map)) / 2 : me.x - (landscape ? 70 / cam.zoom : 0); const ty = sh ? me.y + sh / cam.zoom : this.roomCamY(me.y); this.camTarget.y = goingUp ? Math.min(this.camTarget.y, ty) : ty; } // rooms: x locked on the room, y follows my blob inside the room; only while a card covers my blob may the view leave the room (the blob must stay visible)
    this.wipe(d.rooms ? d.trans : 0, dt);
    cam.centerOn(cam.midPoint.x + (this.camTarget.x - cam.midPoint.x) * Math.min(1, dt * 6), cam.midPoint.y + (this.camTarget.y - cam.midPoint.y) * Math.min(1, dt * 6));
  }

  /** rooms: the room change fades to dark while everyone slides up through the door, then fades back in on the new
   *  room's entrance (a DOM layer over the canvas, under the HUD) */
  private wipeA = 0;
  private snapNext = false;
  private wipeHold = 0;
  private wipe(trans: number, dt: number) {
    let el = document.getElementById('dg-wipe');
    if (!el) {
      el = document.createElement('div'); el.id = 'dg-wipe';
      el.style.cssText = 'position:absolute;inset:0;background:#0b0812;pointer-events:none;opacity:0;z-index:1';
      (document.getElementById('game') ?? document.body).append(el);
    }
    if (trans > 0) this.wipeA = Math.max(this.wipeA, Math.min(1, (ROOM_TRANS - trans) / (ROOM_TRANS * 0.7)));
    else if (this.wipeHold > 0) this.wipeHold -= dt; // stay fully dark a moment after the cut
    else this.wipeA = Math.max(0, this.wipeA - dt / 0.35);
    el.style.opacity = this.wipeA.toFixed(3);
    if (DEBUG) (window as unknown as { __dgWipe?: number }).__dgWipe = this.wipeA;
  }

  /** rooms: the camera's y stays inside the room (at the entrance the blob sits low on the screen, the bottom wall shows) */
  private roomCamY(y: number): number {
    if (!this.rooms || !this.map) return y;
    const cam = this.cameras.main, half = cam.height / cam.zoom / 2, H = fh(this.map) * ft(this.map);
    // the top may scroll above the room by the HUD's height so the door is never hidden under the HUD
    const hud = document.getElementById('hud-dg')?.getBoundingClientRect();
    const top = hud && hud.height ? (hud.bottom * (this.scale.height / window.innerHeight)) / cam.zoom : 0;
    return half * 2 >= H + top ? (H - top) / 2 : Math.max(half - top, Math.min(H - half, y));
  }

  /** While the loot card or the level-up cards are open, keep my blob in the biggest free screen band (between the HUD
   *  and the cards that cover my blob's column) instead of under a card. Returns how far the view centre moves down
   *  (game px); the camera's own easing smooths it. */
  private cardShift(landscape: boolean): number {
    const H = window.innerHeight, cx = window.innerWidth / 2 + (landscape ? 70 * (window.innerHeight / this.scale.height) : 0);
    const cards = ['dg-loot', 'dg-cards'].map((id) => document.getElementById(id))
      .filter((e): e is HTMLElement => !!e && !e.classList.contains('hidden') && e.offsetParent !== null).map((e) => e.getBoundingClientRect())
      .filter((r) => r.left < cx + 24 && r.right > cx - 24); // only cards over my blob's column
    if (!cards.length) return 0;
    const hud = document.getElementById('hud-dg')?.getBoundingClientRect();
    const top = hud ? hud.bottom + 8 : 0;
    // free bands between the HUD and the bottom of the screen, cut by the cards
    let bands: [number, number][] = [[top, H]];
    for (const r of cards) bands = bands.flatMap(([a, b]): [number, number][] => (r.bottom <= a || r.top >= b ? [[a, b]] : [[a, r.top], [r.bottom, b]])).filter(([a, b]) => b - a > 40);
    if (!bands.length) return 0;
    const [a, b] = bands.reduce((x, y) => (y[1] - y[0] > x[1] - x[0] ? y : x));
    const want = (a + b) / 2; // where my blob should sit on screen
    return (H / 2 - want) * (this.scale.height / H); // camera centre moves this far down from the blob (game px)
  }

  /** Weapon in hand: idle = first frame; a swing plays the 4-frame strip; the spin special whirls it. */
  /** No weapon sprites at all (Stefan 2026-11-15): attacks are FX from the blob itself (playFx 'swing' / 'shot').
   *  Only the knight's guard shows something: a Ninja shield barrier in front, toward its last target (or its facing). */
  private drawWeapon(b: HeroGfx, w: Weapon, _face: number, ko: boolean, dt: number, guard = false) {
    b.swingT = Math.max(0, b.swingT - dt);
    b.spin = Math.max(0, b.spin - dt);
    b.weapon.setVisible(false); b.weapon2?.setVisible(false); b.glow?.setVisible(false); b.wshadow?.setVisible(false);
    const show = !ko && guard && w === 'shield';
    if (show) {
      if (!b.barrier) b.barrier = this.add.sprite(0, 0, 'dg-fx-block', 0).setScale(2).play({ key: 'dg-block', repeat: -1 });
      const a = b.lastSwing !== undefined && this.time.now - b.lastSwing < 1500 ? b.swingA : b.facing === 'left' ? Math.PI : 0;
      b.barrier.setVisible(true).setPosition(b.body.x + Math.cos(a) * 30, b.body.y + Math.sin(a) * 22).setDepth(b.y + (Math.sin(a) < -0.3 ? -1 : 3));
    } else b.barrier?.setVisible(false);
    if (DEBUG) ((window as unknown as { __dgWeapon?: Record<string, unknown> }).__dgWeapon ??= {})[b.id] = { sprite: b.weapon.visible || !!b.weapon2?.visible, barrier: show };
  }

  /** Nameplates ([class icon] name) under each blob: lowest blob first, a plate that would overlap one already placed
   *  moves down a row (they never overlap each other, and always stay below their own blob). */
  private placePlates(ids: Set<string>) {
    const ROW = 18, placed: { x0: number; x1: number; y: number }[] = [];
    const list = [...this.heroes.values()].filter((b) => ids.has(b.id)).sort((a, c) => a.y - c.y || a.x - c.x);
    for (const b of list) {
      const w = PLATE_ICON + PLATE_GAP + b.label.width, x0 = b.x - w / 2;
      let y = b.plateY ?? b.y + 24;
      while (placed.some((q) => x0 < q.x1 + 2 && x0 + w > q.x0 - 2 && Math.abs(q.y - y) < ROW)) y += ROW;
      placed.push({ x0, x1: x0 + w, y });
      b.icon.setPosition(Math.round(x0 + PLATE_ICON / 2), Math.round(y)).setDepth(PLATE_DEPTH);
      b.label.setPosition(Math.round(x0 + PLATE_ICON + PLATE_GAP + b.label.width / 2), Math.round(y)).setDepth(PLATE_DEPTH);
    }
  }

  /** A special fx sprite that follows its blob until the animation ends. */
  private ride(b: HeroGfx, tex: string, anim: string, kind: 'spin' | 'charge', a: number, ox: number, oy: number, sc: number) {
    b.fx?.spr.destroy();
    const left = Math.cos(a) < 0;
    const spr = this.add.sprite(b.x, b.y, tex, 0).setScale(Math.max(1, Math.round(sc))); // whole numbers only (integer pixels)
    if (kind === 'charge') spr.setFlipX(left).setOrigin(left ? 0 : 1, oy).setRotation(left ? a - Math.PI : a);
    else spr.setOrigin(ox, oy);
    b.fx = { spr, kind, a };
    spr.play(anim);
    spr.once('animationcomplete', () => { spr.destroy(); if (b.fx?.spr === spr) b.fx = undefined; });
  }

  private floatText(x: number, y: number, text: string, color = '#ffe08a', size = 24) {
    const t = this.add.text(x, y, text, { fontFamily: FONT, fontSize: size + 'px', color, fontStyle: 'bold', stroke: '#3f2631', strokeThickness: 5 }).setOrigin(0.5).setDepth(7000);
    this.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 1000, ease: 'Cubic.Out', onComplete: () => t.destroy() });
  }

  private burst(x: number, y: number, color: number, n: number, dist = 26) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const dd = this.add.circle(x, y, 3, color).setDepth(5000);
      this.tweens.add({ targets: dd, x: x + Math.cos(a) * dist, y: y + Math.sin(a) * dist, alpha: 0, duration: 350, onComplete: () => dd.destroy() });
    }
  }

  /** A Ninja mini life bar (18x4 art): frame + red progress cropped to the fraction; optional tint (friends green). */
  private lifeBar(): LifeBar {
    return { u: this.add.image(0, 0, 'na-lbu').setOrigin(0, 0.5).setDepth(5000), p: this.add.image(0, 0, 'na-lbp').setOrigin(0, 0.5).setDepth(5001) };
  }
  private setBar(bar: LifeBar, show: boolean, x: number, y: number, scale: number, frac: number, tint?: number) {
    bar.u.setVisible(show); bar.p.setVisible(show);
    if (!show) return;
    const f = Math.max(0, Math.min(1, frac)), left = x - 9 * scale;
    bar.u.setPosition(left, y).setScale(scale);
    // the progress art has a 1 px frame: crop its inside to the fraction, keep the left cap
    bar.p.setPosition(left, y).setScale(scale).setCrop(0, 0, 1 + Math.round(16 * f), 4);
    if (tint !== undefined) bar.p.setTint(tint); else bar.p.clearTint();
  }

  /** A one-shot Ninja FX at a point (tinted when a colour is given). */
  private nfx(key: string, x: number, y: number, scale: number, tint?: number) {
    const s = this.add.sprite(x, y, key, 0).setScale(scale).setDepth(y + 40);
    if (tint !== undefined) s.setTint(tint);
    s.play(key).once('animationcomplete', () => s.destroy());
  }

  /** A hostile Ninja FX sprite with a dark outline (a dark copy behind it), for monster warnings and attacks. */
  private hostile(list: Phaser.GameObjects.Sprite[], key: string, x: number, y: number, scale: number, color: number, angle = 0, frame?: number, depth = -300) {
    const anim = this.anims.exists(key);
    const o = this.add.sprite(x, y, key, frame ?? 0).setScale(scale * 1.25).setTintFill(HOSTILE.outline).setAlpha(0.85).setRotation(angle).setDepth(depth);
    const s = this.add.sprite(x, y, key, frame ?? 0).setScale(scale).setTint(color).setRotation(angle).setDepth(depth + 1);
    if (anim && frame === undefined) { o.play(key); s.play(key); }
    list.push(o, s);
    return s;
  }

  /** Telegraphs from the snapshot: dash = red chevrons along the path + purple aura; bite = 3 short chevrons;
   *  aim = a thin dotted orange line + a small rune on the target spot; boss slam = a growing red rune on the landing
   *  spot with chevrons closing in. Rebuilt when the action changes, pulsing while it lasts. */
  private telegraph(g: GooGfx, e: View['dungeon'] extends infer D ? D extends { enemies: (infer E)[] } ? E : never : never, now: number) {
    const key = e.kind === 2 ? (e.slam ? `slam:${e.slam.x},${e.slam.y}` : '') : e.act === 1 || e.act === 3 || e.act === 5 ? `${e.act}:${e.ang}` : '';
    if (key !== g.teleKey) {
      g.tele.forEach((t) => t.destroy()); g.tele = []; g.teleKey = key;
      if (key) {
        const a = e.ang, ux = Math.cos(a), uy = Math.sin(a), x0 = e.x, y0 = e.y, fl = this.map;
        if (e.kind === 2 && e.slam) {
          // N-21 hazard ring: exactly the slam's reach on the ground, plus chevrons closing in
          const ring = this.add.sprite(e.slam.x, e.slam.y + 8, 'n21-hazard', 0).setScale(Math.max(1, Math.round((SLAM_R * 2) / 46)), Math.max(1, Math.round((SLAM_R * 1.4) / 26))).setDepth(-300).play('n21-hazard');
          g.tele.push(ring);
          for (let i = 0; i < 6; i++) {
            const b = (i / 6) * Math.PI * 2;
            const c = this.hostile(g.tele, 'nf-chev', e.slam.x + Math.cos(b) * SLAM_R * 1.6, e.slam.y + 8 + Math.sin(b) * SLAM_R * 1.1, 1.3, HOSTILE.red, b + Math.PI, 2);
            c.setData('in', { cx: e.slam.x, cy: e.slam.y + 8, b });
          }
        } else if (e.act === 1) {
          this.hostile(g.tele, 'nf-aura', x0, y0 - 6, 1.8, HOSTILE.purple); // under the blobz too (it could cover a blob standing above)
          const len = DASH_SPEED * DASH_TIME + ENEMY_R[e.kind];
          let ex = x0, ey = y0;
          for (let d = ENEMY_R[e.kind] + 10; d <= len; d += 26) {
            const x = x0 + ux * d, y = y0 + uy * d;
            if (fl && isWall(fl, x, y)) break;
            ex = x; ey = y;
            this.hostile(g.tele, 'nf-chev', x, y, 0.9, HOSTILE.red, a, 2).setData('d', d); // thin, under the blobz (depth -300)
          }
          // N-13 slam-warning ring where the dash lands
          g.tele.push(this.add.sprite(ex, ey + 10, 'n13-slam-warning', 0).setScale(2).setDepth(-300).play({ key: 'n13-slam-warning', repeat: -1 }));
        } else if (e.act === 3) {
          for (let k2 = 1; k2 <= 3; k2++) this.hostile(g.tele, 'nf-chev', x0 + ux * (ENEMY_R[e.kind] + k2 * 20), y0 + uy * (ENEMY_R[e.kind] + k2 * 20), 0.8, HOSTILE.red, a, 2);
          g.tele.push(this.add.sprite(x0 + ux * (ENEMY_R[e.kind] + 50), y0 + uy * (ENEMY_R[e.kind] + 50) + 10, 'n13-slam-warning', 0).setScale(2).setDepth(-300).play({ key: 'n13-slam-warning', repeat: -1 }));
        } else if (e.act === 5) {
          let d = ENEMY_R[e.kind] + 12, x = x0, y = y0;
          for (; d <= 300; d += 13) { x = x0 + ux * d; y = y0 + uy * d; if (fl && isWall(fl, x, y)) break; this.hostile(g.tele, 'nf-dot', x, y, 1.7, HOSTILE.orange, a).setData('d', d); }
          this.hostile(g.tele, 'nf-rune', x, y, 1.1, HOSTILE.orange);
        }
      }
    }
    if (!g.tele.length) return;
    // progress 0..1 through the warning
    const p = e.kind === 2 && e.slam ? 1 - Math.max(0, e.slam.t) / SLAM_WARN : 1 - e.at / (e.act === 1 ? DASH_WARN : e.act === 3 ? BITE_WARN : this.rooms ? ROOM_TUNE.aimWarn : AIM_WARN);
    for (const t of g.tele) {
      const grow = t.getData('grow') as number | undefined, inn = t.getData('in') as { cx: number; cy: number; b: number } | undefined, d = t.getData('d') as number | undefined;
      const pulse = 0.65 + 0.35 * Math.sin(now / 70);
      if (grow) { const s2 = 0.6 + (grow - 0.6) * Math.min(1, p * 1.3); t.setScale(s2); t.setRotation(p * 2); }
      if (inn) { const rr = SLAM_R * (1.6 - 0.6 * p); t.setPosition(inn.cx + Math.cos(inn.b) * rr, inn.cy + Math.sin(inn.b) * rr * 0.7); }
      // the line fills out from the monster as the warning runs, then pulses
      if (d !== undefined) t.setVisible(d <= 30 + p * 2.2 * 300);
      if (!t.isTinted || t.tintFill) { t.setAlpha(0.6 + 0.25 * pulse); continue; }
      t.setAlpha(pulse);
    }
    // keep the outline copies in step with their sprites (pairs: outline, sprite)
    for (let i = 0; i + 1 < g.tele.length; i += 2) { const o = g.tele[i], s2 = g.tele[i + 1]; o.setPosition(s2.x, s2.y).setRotation(s2.rotation).setScale(s2.scaleX * 1.25).setVisible(s2.visible); }
  }

  private playFx(f: DFx) {
    switch (f.t) {
      case 'swing': {
        const b = this.heroes.get(f.id);
        if (b) {
          b.swingDur = f.w === 'hammer' ? 0.4 : f.w === 'bow' ? 0.45 : f.w === 'dagger' ? 0.18 : 0.26; b.swingT = b.swingDur; b.swingA = f.a; b.swings++; b.lastSwing = this.time.now;
        }
        // melee attacks are FX in front of the blob (no weapon sprite): knight = curved slash, rogue = quick cut;
        // ranged attacks are their projectile ('shot')
        const k = f.w === 'shield' || f.w === 'sword' || f.w === 'hammer' ? 'fx-slash' : f.w === 'dagger' || f.w === 'spear' ? 'fx-cut' : null;
        if (b && k) {
          const r = k === 'fx-slash' ? 30 : 26;
          const fxs = this.add.sprite(Math.round(b.x + Math.cos(f.a) * r), Math.round(b.y - 6 + Math.sin(f.a) * r), k, 0).setScale(2).setRotation(f.a).setDepth(b.y + 5);
          fxs.play(k).once('animationcomplete', () => fxs.destroy());
          if (DEBUG) { const c = ((window as unknown as { __dgAtkFx?: Record<string, number> }).__dgAtkFx ??= {}); c[k] = (c[k] ?? 0) + 1; }
        }
        sfx.tool(f.w === 'hammer' || f.w === 'shield' ? 'axe' : f.w === 'spear' ? 'rake' : 'pickaxe', false);
        break;
      }
      case 'special': {
        const b = this.heroes.get(f.id);
        if (f.k === 'spin') {
          // Art's slash arc sweeping around the blob (centre 24,22 on the body)
          if (b) { b.spin = 0.35; this.ride(b, 'dg-fx-spin', 'dg-spin', 'spin', f.a, 0.5, 0.5, (f.r * 2) / 32); }
          sfx.dash();
        } else if (f.k === 'slam') {
          const sw = this.add.sprite(f.x, f.y + 10, 'dg-fx-slam', 0).setOrigin(0.5, 0.6).setScale(Math.max(1, Math.round((f.r * 1.6) / 30))).setDepth(f.y + 20);
          sw.play('dg-slam'); sw.once('animationcomplete', () => sw.destroy());
          if (b) { b.swingDur = 0.4; b.swingT = 0.4; }
          this.cameras.main.shake(160, 0.006); sfx.bump();
        } else if (f.k === 'heal' || f.k === 'wall') {
          const col = f.k === 'heal' ? 0x6cc644 : 0x5ec8ff;
          const c = this.add.circle(f.x, f.y, f.r * 0.3, col, 0.25).setStrokeStyle(5, col, 0.9).setDepth(4500);
          this.tweens.add({ targets: c, scale: 3.3, alpha: 0, duration: 450, ease: 'Cubic.Out', onComplete: () => c.destroy() });
          if (f.k === 'wall') this.cameras.main.shake(120, 0.004);
          sfx.power();
        } else if (f.k === 'volley') {
          sfx.dash();
        } else if (f.k === 'lunge') {
          // speed streaks behind the blob: right edge at its back, flipped when it charges left
          if (b) { b.swingDur = 0.35; b.swingT = 0.35; this.ride(b, 'dg-fx-charge', 'dg-charge', 'charge', f.a, 1, 0.5, 3); }
          sfx.dash();
        }
        break;
      }
      case 'move': {
        // the class moves (small button), each with a Ninja FX
        const b = this.heroes.get(f.id);
        if (f.k === 'rogue') { const c = this.add.sprite(f.x, f.y + 14, 'dg-fx-sidestep', 0).setOrigin(0.5, 1).setScale(2).setDepth(f.y - 2); c.play('dg-sidestep'); c.once('animationcomplete', () => c.destroy()); }
        else if (f.k === 'marksman') { this.nfx('nf-dust', f.x, f.y + 14, 2); if (b) { b.hopT = 0.32; b.hopH = 18; } }
        else if (f.k === 'tank') { if (b) this.ride(b, 'dg-fx-charge', 'dg-charge', 'charge', f.a, 1, 0.5, 3); this.nfx('nf-dust', f.x, f.y + 14, 2); }
        else { this.nfx('nf-smoke', f.x, f.y - 4, 2.6, 0xbfe6ff); this.time.delayedCall(2000, () => { const bb = this.heroes.get(f.id); if (bb) this.nfx('nf-smoke', bb.x, bb.y - 4, 2.2, 0xbfe6ff); }); }
        sfx.dash();
        break;
      }
      case 'dodge': { const c = this.add.sprite(f.x, f.y + 14, 'dg-fx-sidestep', 0).setOrigin(0.5, 1).setScale(2).setDepth(f.y - 2); c.play('dg-sidestep'); c.once('animationcomplete', () => c.destroy()); sfx.dash(); break; }
      case 'hurt': { const g = this.goo.get(f.e); if (g) g.flash = 0.12; this.nfx('n13-hit-spark', f.x, f.y - 6, 2); break; } // a small N-13 hit spark (routine FX kept small)
      case 'mdash': this.nfx('nf-dust', f.x, f.y + 14, 2); break;
      case 'bite': break; // no enemy slash fx (Stefan): the telegraph before it is the warning
      case 'kill': {
        // Ninja smoke puff + star (the boss explodes)
        if (f.kind === 2) this.nfx('nf-boom', f.x, f.y, 3);
        this.nfx('nf-smoke', f.x, f.y, f.kind === 2 ? 4 : 2); // routine kills stay small
        this.nfx('n13-hit-spark', f.x, f.y - 4, f.kind === 2 ? 3 : 1.8);
        if (f.kind === 2) { this.cameras.main.shake(300, 0.01); sfx.star(); } else sfx.bump();
        break;
      }
      case 'ouch': {
        this.cameras.main.shake(90, 0.004); sfx.bump();
        const b = this.heroes.get(f.id); if (b) { this.tweens.add({ targets: b.body, alpha: 0.3, yoyo: true, duration: 80 }); b.sqT = 0.3; }
        break;
      }
      case 'ko': this.floatText(f.x, f.y - 50, t('dg.ko'), '#ffffff', 22); break;
      case 'revive': {
        // a friendly wake-up: spirit puff, a happy hop and a heart
        const r = this.add.sprite(f.x, f.y - 16, 'dg-revive', 0).setScale(2).setDepth(5000); r.play('dg-revive'); r.once('animationcomplete', () => r.destroy());
        const b = this.heroes.get(f.id); if (b) { b.hopT = 0.32; b.hopH = 14; }
        this.floatText(f.x, f.y - 46, '♥', '#ff8aa0', 26); sfx.power(); break;
      }
      case 'coin': {
        const s = this.add.sprite(f.x, f.y - 8, 'dg-sparkle', 0).setScale(1).setDepth(5000);
        s.play('dg-sparkle'); s.once('animationcomplete', () => s.destroy());
        this.floatText(f.x, f.y - 20, '+' + f.n, '#ffe08a', 18); sfx.pick();
        break;
      }
      case 'chest': this.floatText(f.x, f.y - 40, '+' + f.n, '#ffe08a', 28); this.burst(f.x, f.y - 10, 0xffe08a, 12, 40); sfx.score(); break;
      case 'level': {
        const me = this.heroes.get(this.s.myId);
        this.floatText(me?.x ?? 0, (me?.y ?? 0) - 80, t('dg.level', { n: f.level }), '#8fd3ff', 30);
        for (const hb of this.heroes.values()) { this.nfx('n13-levelup', hb.x, hb.y - 20, 2); hb.hopT = 0.32; hb.hopH = 22; } // N-13 sparkle + a happy hop on every blob
        sfx.star();
        break;
      }
      case 'slam': {
        // the Giant Slime crashes down: the N-13 shockwave fills the danger ring, a little dust, a short shake
        this.nfx('n13-shockwave', f.x, f.y + 8, (SLAM_R * 2) / 21);
        this.nfx('nf-dust', f.x, f.y + 30, 3);
        this.cameras.main.shake(180, 0.008); sfx.bump();
        break;
      }
      case 'floor': sfx.power(); break;
      case 'spit': sfx.tool('rake', false); break;
      case 'phase2': this.cameras.main.shake(400, 0.012); this.burst(f.x, f.y, 0xff3b3b, 18, 70); sfx.bump(); break;
      case 'shot': {
        // projectiles leave from the blob's EDGE on the line to the target (body radius 24 + 2 art px), never on top of it
        const a0 = Math.atan2(f.ty - 6 - (f.y - 6), f.tx - f.x), EDGE = 24 + 6;
        const sx = f.x + Math.cos(a0) * EDGE, sy = f.y - 6 + Math.sin(a0) * EDGE;
        const a = Math.atan2(f.ty - 6 - sy, f.tx - sx);
        if (DEBUG) { const c = ((window as unknown as { __dgAtkFx?: Record<string, number> }).__dgAtkFx ??= {}); const k = f.k !== undefined ? 'fx-magic' : 'arrow'; c[k] = (c[k] ?? 0) + 1; c.edge = Math.round(Math.hypot(sx - f.x, sy - (f.y - 6))); }
        if (f.k !== undefined) {
          // the healer's magic missile (Ninja energy ball), red (damage) or green (heal)
          const orb = this.add.sprite(sx, sy, 'fx-magic', 0).setScale(2).setTint(MODE_COL[f.k ?? 0]).setDepth(4500).play({ key: 'fx-magic', repeat: -1 });
          this.tweens.add({ targets: orb, x: f.tx, y: f.ty - 6, duration: Math.max(80, Math.hypot(f.tx - sx, f.ty - sy) / 0.9), onComplete: () => orb.destroy() });
          break;
        }
        const ar = this.add.image(sx, sy, 'dg-arrow').setScale(3).setRotation(a).setDepth(4500); // Ninja arrow points right
        this.tweens.add({ targets: ar, x: f.tx, y: f.ty - 6, duration: Math.max(60, Math.hypot(f.tx - sx, f.ty - sy) / 1.2), onComplete: () => ar.destroy() });
        break;
      }
      case 'spawn': { const r = this.add.sprite(f.x, f.y + 10, 'n13-slam-warning', 0).setScale(2).setDepth(-300).play({ key: 'n13-slam-warning', repeat: -1 }); this.time.delayedCall(SPAWN_WARN * 1000, () => { r.destroy(); this.nfx('nf-smoke', f.x, f.y, 2); }); break; } // rooms: a monster lands here
      case 'mode': { const b = this.heroes.get(f.id); if (b?.glow) this.burst(b.glow.x, b.glow.y, MODE_COL[f.m], 8, 20); sfx.pick(); break; }
      case 'heal': {
        const c = this.add.sprite(f.x, f.y - 6, 'dg-fx-heal', 0).setOrigin(0.5, 0.6).setScale(3).setDepth(f.y + 7);
        c.play('dg-heal'); c.once('animationcomplete', () => c.destroy());
        this.floatText(f.x, f.y - 40, '+', '#6cc644', 30); sfx.power();
        break;
      }
      case 'block': {
        const c = this.add.sprite(f.x, f.y - 10, 'dg-fx-block', 0).setScale(2).setDepth(4500);
        c.play('dg-block'); c.once('animationcomplete', () => c.destroy());
        sfx.tool('pickaxe', false);
        break;
      }
      case 'potion': this.floatText(f.x, f.y - 30, t('dg.potion'), '#ff8a8a', 22); sfx.score(); break;
      case 'skill': { const b = this.heroes.get(f.id); const sk = skillOf(f.s); if (b && sk) this.floatText(b.x, b.y - 70, tSkill(sk.id), '#ffe08a', 20); break; }
      case 'loot': {
        // the winner hops; the item flies up out of the blob and pops (juice)
        const b = f.win ? this.heroes.get(f.win) : undefined; const it = itemOf(f.item);
        if (b && it) {
          this.floatText(b.x, b.y - 70, tItem(it.id), '#c58bff', 22); this.burst(b.x, b.y - 10, 0xc58bff, 10, 36);
          b.hopT = 0.32; b.hopH = 22; this.nfx('n13-levelup', b.x, b.y - 24, 2);
        }
        break;
      }
    }
  }
}

// ---------- the hook GameScene calls every frame ----------
interface EntranceGfx { seed: number; at: { x: number; y: number }; img: Phaser.GameObjects.Image }
const entrances = new WeakMap<Phaser.Scene, EntranceGfx>();

/** Called by GameScene.update after onView. Returns true while the dungeon scene draws (the meadow
 *  then skips its own drawing and leaves the fx queue to the dungeon). */
export function dungeonFrame(scene: Phaser.Scene, v: View, session: Session): boolean {
  const mgr = scene.scene;
  const under = v.mode === 'dungeon' && !!v.dungeon;
  if (under) {
    if (!scene.game.scene.getScene('dungeon')) scene.game.scene.add('dungeon', DungeonScene, false);
    if (!mgr.isActive('dungeon')) mgr.launch('dungeon', { session });
    scene.cameras.main.setVisible(false);
    return true;
  }
  if (mgr.isActive('dungeon') || mgr.isPaused('dungeon')) mgr.stop('dungeon');
  scene.cameras.main.setVisible(true);
  if (DUNGEON_ENABLED) drawEntrance(scene, v, session.seed);
  return false;
}

/** Texture for the cave mouth: the snowy one on the snow map once Art's file exists, else the normal one. */
function entranceKey(scene: Phaser.Scene): string | null {
  if (scene.registry.get('biome') === 'snow' && scene.textures.exists('dg-entrance-snow')) return 'dg-entrance-snow';
  return scene.textures.exists('dg-entrance') ? 'dg-entrance' : null;
}

/** The cave mouth on the meadow, a ring that fills while everyone stands on it, and an "n/N" bubble. */
function drawEntrance(scene: Phaser.Scene, v: View, seed: number) {
  let g = entrances.get(scene);
  if (!g || !g.img.active || g.seed !== seed) {
    if (g) g.img.destroy();
    const ENTRANCE = entranceOf(seed);
    // loaded on first use (keeps the meadow's preload untouched); shown as soon as it is there.
    // Snow map hook (Code): GameScene puts the biome in the registry; entrance-snow.png is used when it exists.
    const load = (key: string, src: string) => {
      if (scene.textures.exists(key)) return;
      const im = new Image();
      im.onload = () => { if (!scene.textures.exists(key)) scene.textures.addImage(key, im); scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST); };
      im.onerror = () => { /* no snowy cave yet: the normal one is used */ };
      im.src = src;
    };
    // the cave mouth = ChatGPT N-28 portal-idle.png, preloaded by the meadow (game.ts) under 'dg-entrance'
    void load;
    g = {
      seed, at: ENTRANCE,
      img: scene.add.image(ENTRANCE.x, ENTRANCE.y + 30, entranceKey(scene) ?? '__MISSING').setScale(3).setOrigin(0.5, 1).setDepth(ENTRANCE.y - 60).setVisible(!!entranceKey(scene)),
    };
    entrances.set(scene, g);
  }
  const ENTRANCE = g.at;
  const key = entranceKey(scene);
  if (key && (!g.img.visible || g.img.texture.key !== key)) g.img.setTexture(key).setVisible(true);
  // the gather ring (segments per player, start sweep) is drawn by the meadow with gatherRing.ts (game.ts portalFrame)
  void ENTRANCE; void v;
}
