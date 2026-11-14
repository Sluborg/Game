// Dungeon rendering (Code 2). A separate Phaser scene drawn on top of the meadow scene while the team
// is underground; the meadow scene keeps ticking the session (sim / network) and hides its camera.
// Also draws the dungeon entrance on the meadow (dungeonFrame is the one hook GameScene calls).
import Phaser from 'phaser';
import { blobCanvas, BLOB_FRAMES, BODY_CY, clampLook, facingFromVelocity, type Facing } from './blob';
import { AIM_WARN, BITE_WARN, DASH_SPEED, DASH_TIME, DASH_WARN, DT, ENEMY_R, GOO_ART, GOO_SCALE, isWall, SLAM_WARN, WEAPON_STATS, FLOORS, GH, GW, heroMods, makeFloor, skillOf, itemOf, SLAM_R, specialOf, STAIRS_R, type DFx, type Floor, type HeroClass, type Weapon } from './dungeon';
/** Weapons without Art's strip yet: a Kenney Tiny Dungeon tile in hand (bow: drawn in code). */
import type { Session } from './game';
import { sfx } from './sfx';
import { t, tItem, tSkill } from './dungeonText';
import { entranceOf, ENTRANCE_R, DUNGEON_ENABLED, type View } from './sim';

const BLOB_SCALE = 3; // blobz v2: 16x18 grid at the Ninja world scale, same as the meadow (game.ts)
const FACE_DEAD = 40; // px/s, same as the meadow: slower = idle frame, facing kept
// held-weapon anchors in screen px from the body centre (body edge 22 px out, a little low)
const EDGE_X = 22, EDGE_Y = 13, DROP = 3;
// hovering weapons (no hands): they float this far beyond the body edge, bob gently and lunge out on each attack
const HOVER = 7, BOB_PX = 1.5, BOB_S = 1.5;
const LUNGE: Record<Weapon, number> = { sword: 4, hammer: 4, spear: 20, staff: 4, bow: -6, shield: 10, dagger: 4 }; // spear thrusts, bow recoils, shield bashes
// slashing weapons sweep in an arc around the blob across the aim line (deg); the hammer's arc speeds up into a slam
// (the Riddare's id stays 'shield', but it slashes with a sword: the shield hovers on the other side as its guard)
const SLASH: Partial<Record<Weapon, { sweep: number; slam?: boolean }>> = { sword: { sweep: 120 }, hammer: { sweep: 130, slam: true }, staff: { sweep: 100 }, shield: { sweep: 110 } };
const DAGGER_SPREAD = 0.6, DAGGER_STAB = 13;
const NA = 'assets/ninja-adventure/';
const WSCALE = 3; // 1 art px = 1 blob px (BLOB_SCALE): the weapons' pixels match the blobz exactly
/** Hovering weapon sprites, drawn at WSCALE. Ninja Adventure's own weapons (Items/Weapons/<Name>/Sprite.png) point UP
 *  with the grip at the bottom (`up`); Art's Ninja-style shield (pivot = centre) and crossbow (points right, pivot = butt)
 *  are in art/dungeon/weapons/ (README). The ChatGPT sprites there stay in the repo, unused. */
const WIMG: Record<string, { src: string; w: number; h: number; px: number; py: number; up?: boolean }> = {
  sword: { src: NA + 'Items/Weapons/Sword/Sprite.png', w: 6, h: 17, px: 3, py: 14, up: true },
  sai: { src: NA + 'Items/Weapons/Sai/Sprite.png', w: 7, h: 13, px: 3.5, py: 11, up: true },
  hammer: { src: NA + 'Items/Weapons/Hammer/Sprite.png', w: 9, h: 16, px: 4.5, py: 14, up: true },
  wand: { src: NA + 'Items/Weapons/MagicWand/Sprite.png', w: 5, h: 18, px: 2.5, py: 16, up: true },
  lance: { src: NA + 'Items/Weapons/Lance/Sprite.png', w: 6, h: 23, px: 3, py: 20, up: true },
  shield: { src: 'art/dungeon/weapons/ninja-shield.png', w: 12, h: 12, px: 6, py: 6 },
  crossbow: { src: 'art/dungeon/weapons/ninja-crossbow.png', w: 16, h: 10, px: 2, py: 5 },
};
/** which sprite each weapon id draws (the Riddare, id 'shield', slashes with the sword) */
const WART: Record<Weapon, string> = { sword: 'sword', shield: 'sword', dagger: 'sai', hammer: 'hammer', staff: 'wand', spear: 'lance', bow: 'crossbow' };
const FONT = "'Fredoka', sans-serif"; // same as the meadow
const DEBUG = new URLSearchParams(location.search).has('debug');
const HITBOX = new URLSearchParams(location.search).has('hitbox'); // ?hitbox draws the sim's circles
/** Class hats in blob.ts CLASS_HATS (Krigare keeps the skin hat). */
const CLASS_HAT: Partial<Record<HeroClass, number>> = { healer: 0, marksman: 1, tank: 2 }; // the rogue keeps the skin hat
const WORLD = { w: GW * DT, h: GH * DT };
// Kenney Tiny Dungeon frames (12 per row)
// Art's fine ground tiles (art/fine/tiles, 32 px, drawn at scale 1): floor plain/specks/stones, wall bricks/banner
const TP = 32; // baked px per tile

interface HeroGfx {
  id: string;
  facing: Facing; // blobz v2: mirrored (flipX) when facing left
  shadow: Phaser.GameObjects.Ellipse;
  body: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
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
  private mapObjs: Phaser.GameObjects.GameObject[] = [];
  private chests: Phaser.GameObjects.Image[] = [];
  private stairs!: Phaser.GameObjects.Image;
  private heroes = new Map<string, HeroGfx>();
  private goo = new Map<number, GooGfx>();
  private coins = new Map<number, Phaser.GameObjects.Sprite>();
  private spits = new Map<number, { s: Phaser.GameObjects.Sprite; o: Phaser.GameObjects.Sprite; px: number; py: number }>();
  private ringG!: Phaser.GameObjects.Graphics;
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
    // Art's fine batch 2 (art/fine/..., twice the pixels: half the old scale, doubled frame sizes)
    for (const n of ['stairs-down', 'stairs-up', 'chest-closed', 'chest-open']) img('dg-' + n, `art/fine/dungeon/${n}.png`);
    for (const n of ['coin-pile-s', 'coin-pile-m', 'coin-pile-l']) img('dg-' + n, `art/fine/fx/${n}.png`);
    sheet('dg-floor', 'art/fine/tiles/dungeon-floor.png', 32, 32);
    sheet('na-arc', 'assets/ninja-adventure/FX/Slash/SpriteSheetArc.png', 38, 34); // Ninja slash arc (CC0) for slashing weapons
    sheet('dg-wall', 'art/fine/tiles/dungeon-wall.png', 32, 32);
    sheet('dg-ko-stars', 'art/fine/dungeon/ko-stars.png', 40, 18);
    sheet('dg-revive', 'art/fine/dungeon/revive.png', 32, 40);
    sheet('dg-shockwave', 'art/fine/dungeon/shockwave.png', 96, 48);
    sheet('dg-fx-spin', 'art/fine/dungeon/fx-spin.png', 96, 80);
    sheet('dg-fx-slam', 'art/fine/dungeon/fx-slam.png', 112, 56);
    sheet('dg-fx-charge', 'art/fine/dungeon/fx-charge.png', 96, 32);
    sheet('dg-fx-sidestep', 'art/fine/dungeon/fx-sidestep.png', 48, 48);
    sheet('dg-fx-heal', 'art/fine/dungeon/fx-heal.png', 80, 48);
    sheet('dg-fx-wall', 'art/fine/dungeon/fx-wall.png', 96, 80);
    sheet('dg-fx-block', 'art/fine/dungeon/fx-block.png', 32, 32);
    img('dg-arrow', 'art/dungeon/arrow.png');
    img('dg-potion', 'art/fine/dungeon/potion.png');
    sheet('dg-sparkle', 'art/fine/fx/coin-sparkle.png', 22, 22); // own key: the meadow still uses the 11 px one
    sheet('dungeon', 'assets/kenney-tiny-dungeon/tilemap_packed.png', 16, 16);
    for (const [k, m] of Object.entries(WIMG)) img('w-' + k, m.src);
    // Ninja Adventure dungeon art (docs/ART_MAP.md section 12 + loot): floor, walls, stairs, chest, coins, potion, bars
    img('na-floor', NA + 'Backgrounds/Tilesets/Interior/TilesetInteriorFloor.png');
    img('na-walls', NA + 'Backgrounds/Tilesets/Interior/TilesetWallSimple.png');
    img('na-elem', NA + 'Backgrounds/Tilesets/TilesetElement.png');
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

  create() {
    this.textures.get('dungeon').setFilter(Phaser.Textures.FilterMode.NEAREST);
    const anim = (key: string, tex: string, frames: number[], rate: number, repeat = 0) => {
      if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(tex, { frames }), frameRate: rate, repeat });
    };
    anim('dg-ko', 'dg-ko-stars', [0, 1], 4, -1);
    for (const m of MON) {
      if (m.key === 'na-boss') { anim('na-boss', 'na-boss', [0, 1, 2, 3, 4], 8, -1); continue; }
      MON_DIRS.forEach((dn, c) => anim(`${m.key}-${dn}`, m.key, [c, c + 4, c + 8, c + 12], 7, -1));
    }
    anim('na-boss-jump', 'na-boss-jump', [...Array(13).keys()], 16);
    anim('na-coin', 'na-coin', [0, 1, 2, 3], 8, -1);
    anim('na-boss-hit', 'na-boss-hit', [0, 1, 2, 3, 4], 14);
    for (const [k, , , , fps, loop] of NFX) if (k !== 'nf-chev') anim(k, k, [...Array(this.textures.get(k).frameTotal - 1).keys()], fps, loop ? -1 : 0);
    anim('dg-revive', 'dg-revive', [0, 1, 2], 8);
    anim('dg-shock', 'dg-shockwave', [0, 1, 2], 12);
    anim('dg-spin', 'dg-fx-spin', [0, 1, 2, 3], 12);
    anim('dg-slam', 'dg-fx-slam', [0, 1, 2, 3], 12);
    anim('dg-charge', 'dg-fx-charge', [0, 1, 2], 10);
    anim('dg-sidestep', 'dg-fx-sidestep', [0, 1, 2], 10);
    anim('dg-heal', 'dg-fx-heal', [0, 1, 2, 3], 10);
    anim('dg-wall', 'dg-fx-wall', [0, 1, 2], 10);
    anim('dg-block', 'dg-fx-block', [0, 1, 2], 14);
    anim('dg-sparkle', 'dg-sparkle', [0, 1, 2, 1, 0], 16);
    this.auraG = this.add.graphics().setDepth(-300);
    this.hitG = this.add.graphics().setDepth(9000);
    this.ringG = this.add.graphics().setDepth(4000);
    this.bubble = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '22px', color: '#3f2631', fontStyle: 'bold', backgroundColor: '#fff7e6', padding: { x: 8, y: 2 } })
      .setOrigin(0.5, 1).setDepth(6000).setVisible(false);
    const cam = this.cameras.main;
    cam.setBounds(-200, -200, WORLD.w + 400, WORLD.h + 400);
    cam.setRoundPixels(true);
    cam.setBackgroundColor('#1b1018');
    this.fitCamera();
    this.scale.on('resize', this.fitCamera, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.fitCamera, this));
  }

  private fitCamera() {
    const w = this.scale.width, h = this.scale.height;
    this.cameras.main.setZoom(Math.max(0.55, Math.min(2.2, Math.min(Math.max(w, h) / 820, Math.min(w, h) / 430))));
  }

  /** Bake the floor into one canvas (no tile seams at fractional zoom), slightly darker than the meadow. */
  private buildFloor(seed: number, floor: number, players: number) {
    for (const o of this.mapObjs) o.destroy();
    this.mapObjs = []; this.chests = [];
    const f = makeFloor(seed, floor, players);
    this.map = f;
    const key = `dgmap-${seed}-${floor}`;
    if (!this.textures.exists(key)) {
      const c = document.createElement('canvas');
      c.width = GW * TP; c.height = GH * TP;
      const g = c.getContext('2d')!;
      g.imageSmoothingEnabled = false;
      // Ninja Adventure tiles at 2x (16 px -> one 32 px dungeon tile): stone-brick floor, the brown wall frame
      // (TilesetWallSimple) around every floor area, dark void inside the rock
      const fl = this.textures.get('na-floor').getSourceImage() as HTMLImageElement, wl = this.textures.get('na-walls').getSourceImage() as HTMLImageElement;
      const put = (im: HTMLImageElement, sx: number, sy: number, tx: number, ty: number, flip = false) => {
        if (!flip) { g.drawImage(im, sx, sy, 16, 16, tx * TP, ty * TP, TP, TP); return; }
        g.save(); g.translate(tx * TP + TP, ty * TP); g.scale(-1, 1); g.drawImage(im, sx, sy, 16, 16, 0, 0, TP, TP); g.restore();
      };
      const solid = (tx: number, ty: number) => tx < 0 || ty < 0 || tx >= GW || ty >= GH || f.solid[ty * GW + tx] === 1;
      let n = seed + floor * 7;
      const rnd = () => { n = (n * 1103515245 + 12345) & 0x7fffffff; return n / 0x7fffffff; };
      g.fillStyle = '#141b1b';
      g.fillRect(0, 0, c.width, c.height);
      for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) {
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
      // underground: a touch darker overall
      g.fillStyle = 'rgba(20, 8, 30, 0.12)';
      g.fillRect(0, 0, c.width, c.height);
      this.textures.addCanvas(key, c)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.mapObjs.push(this.add.image(0, 0, key).setOrigin(0).setScale(DT / TP).setDepth(-1000));
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
    this.stairs = this.add.image(f.stairs.x, f.stairs.y, floor < FLOORS ? 'na-stairs-down' : 'na-stairs-up').setScale(3).setDepth(-900);
    this.mapObjs.push(this.stairs);
    if (floor === 1) this.mapObjs.push(this.add.image(f.exit.x, f.exit.y, 'na-stairs-up').setScale(3).setDepth(-900));
    this.chests = f.chests.map((c) => this.add.image(c.x, c.y + 8, 'na-chest', 0).setScale(3).setOrigin(0.5, 1).setDepth(c.y));
    this.mapObjs.push(...this.chests);
    // a big floor banner
    const banner = this.add.text(f.start.x, f.start.y - 90, t(floor === FLOORS ? 'dg.floorBoss' : 'dg.floorBanner', { n: floor }), { fontFamily: FONT, fontSize: '34px', color: '#ffe08a', fontStyle: 'bold', stroke: '#3f2631', strokeThickness: 7 })
      .setOrigin(0.5).setDepth(7000);
    this.tweens.add({ targets: banner, y: banner.y - 30, alpha: 0, delay: 1400, duration: 900, onComplete: () => banner.destroy() });
    // the camera jumps to the arrival point
    this.camTarget = { ...f.start };
    this.cameras.main.centerOn(f.start.x, f.start.y);
  }

  update() {
    const clock = performance.now();
    const dt = this.lastClock ? Math.min(0.1, (clock - this.lastClock) / 1000) : 1 / 60;
    this.lastClock = clock;
    const v = this.s.view();
    const d = v?.dungeon;
    if (!v || !d) return;
    const fk = `${d.seed}-${d.floor}`;
    if (fk !== this.floorKey) { this.floorKey = fk; this.buildFloor(d.seed, d.floor, v.players.length); }
    const f = this.map!;
    const now = this.time.now;
    const smooth = this.s.role === 'client';
    const k = Math.min(1, dt * 14);

    // ---- chests ----
    d.opened.forEach((o, i) => { const c = this.chests[i]; if (c && o && c.frame.name !== '1') c.setFrame(1); });
    // the boss exit glows only once the boss is gone
    const bossAlive = d.enemies.some((e) => e.kind === 2);
    this.stairs.setAlpha(d.floor === FLOORS && bossAlive ? 0.35 : 1);

    // ---- coins ----
    const seenC = new Set<number>();
    for (const c of d.coins) {
      seenC.add(c.id);
      let img = this.coins.get(c.id);
      if (!img) { img = c.k === 1 ? this.add.sprite(c.x, c.y, 'na-potion').setScale(2.5) : this.add.sprite(c.x, c.y, 'na-coin', 0).setScale(2.4).play('na-coin'); this.coins.set(c.id, img); }
      img.x += (c.x - img.x) * (smooth ? k : 1); img.y += (c.y - 4 - Math.abs(Math.sin(now / 200 + c.id)) * 4 - img.y) * (smooth ? k : 1);
      img.setDepth(c.y - 5);
    }
    for (const [id, img] of this.coins) if (!seenC.has(id)) { img.destroy(); this.coins.delete(id); }

    // ---- monster shots (dodge them with a sidestep): Ninja fireballs, hostile orange (boss: purple), dark outline ----
    const seenS = new Set<number>();
    for (const sp of d.spit) {
      seenS.add(sp.id);
      let c = this.spits.get(sp.id);
      if (!c) {
        const boss = d.enemies.some((e) => e.kind === 2 && Math.hypot(e.x - sp.x, e.y - sp.y) < 80);
        const col = boss ? HOSTILE.purple : HOSTILE.orange;
        const o = this.add.sprite(sp.x, sp.y, 'nf-fire').play('nf-fire').setScale(2.4).setTintFill(HOSTILE.outline);
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
          weapon: this.add.sprite(p.x, p.y, 'w-' + WART[w]),
          stars: this.add.sprite(p.x, p.y, 'dg-ko-stars', 0).setScale(1).setVisible(false),
          me: this.add.triangle(p.x, p.y, 0, 0, 12, 0, 6, 8, 0xffffff, 0.9).setVisible(p.id === this.s.myId),
          texKey, x: p.x, y: p.y, vx: 0, vy: 0, id: p.id, facing, swingT: 0, swingDur: 0.3, swingA: 0, swings: 0, spin: 0,
        };
        b.stars.play('dg-ko');
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
      b.shadow.setPosition(b.x, b.y + 12).setDepth(b.y - 20);
      b.body.setPosition(b.x, b.y - 4 + (ko ? 8 : 0)).setDepth(b.y)
        .setScale(BLOB_SCALE * (1 + stretch) * (ko ? 1.2 : 1), BLOB_SCALE * (1 - stretch * 0.6) * (ko ? 0.6 : 1))
        .setRotation(ko ? 0 : Phaser.Math.Clamp(b.vx / 1400, -0.18, 0.18))
        .setTint(ko ? 0x888888 : 0xffffff)
        .setAlpha(h?.dodge ? 0.45 : h?.inv && !ko ? (Math.floor(now / 90) % 2 ? 0.4 : 1) : 1);
      b.label.setPosition(b.x, b.y + 24).setDepth(b.y + 2);
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
        b.dome.setPosition(b.x, b.y + 16).setScale(Math.max(1, Math.round((r * 2) / 96))).setDepth(b.y + 6).setAlpha(h.wallT < 0.6 ? h.wallT / 0.6 : 1);
      } else if (b.dome) { b.dome.destroy(); b.dome = undefined; }
      if (h && !ko && h.shield > 0) this.ringG.lineStyle(3, 0x8fd3ff, 0.9).strokeCircle(b.x, b.y - 6, 28);
      b.stars.setVisible(ko).setPosition(b.x, b.y - 28).setDepth(b.y + 4);
      this.drawWeapon(b, w, h?.face ?? 0, ko, dt, !!h && (!!h.dodge || h.wallT > 0));
      // picking level-up cards: frozen and safe (a soft bubble so friends see why it stands still)
      if (h && !ko && h.offer.length) this.ringG.fillStyle(0xfff7e6, 0.25).fillCircle(b.x, b.y - 6, 30).lineStyle(3, 0xffe08a, 0.9).strokeCircle(b.x, b.y - 6, 30);
      if (b.fx) {
        const cy = b.body.y; // the body's origin is its centre
        if (b.fx.kind === 'spin') b.fx.spr.setPosition(b.x, cy).setDepth(b.y + 5);
        else b.fx.spr.setPosition(b.x - Math.cos(b.fx.a) * 12, cy - Math.sin(b.fx.a) * 12).setDepth(b.y - 1);
      }
    }
    for (const [id, b] of this.heroes) if (!seenP.has(id)) { for (const o of [b.shadow, b.body, b.label, b.weapon, b.stars, b.me]) o.destroy(); b.fx?.spr.destroy(); b.dome?.destroy(); b.weapon2?.destroy(); b.wshadow?.destroy(); b.hb?.u.destroy(); b.hb?.p.destroy(); this.heroes.delete(id); }

    // ---- stairs: progress ring + "2/3" bubble when someone stands on them ----
    this.bubble.setVisible(false);
    const alive = v.players.filter((p) => (d.heroes[p.id]?.ko ?? 0) <= 0);
    const spots = [{ at: f.stairs, open: d.floor < FLOORS || !bossAlive }, ...(d.floor === 1 ? [{ at: f.exit, open: true }] : [])];
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
    if (me) { this.camTarget.x = me.x; this.camTarget.y = me.y; }
    const cam = this.cameras.main;
    cam.centerOn(cam.midPoint.x + (this.camTarget.x - cam.midPoint.x) * Math.min(1, dt * 6), cam.midPoint.y + (this.camTarget.y - cam.midPoint.y) * Math.min(1, dt * 6));
  }

  /** Weapon in hand: idle = first frame; a swing plays the 4-frame strip; the spin special whirls it. */
  private drawWeapon(b: HeroGfx, w: Weapon, face: number, ko: boolean, dt: number, guard = false) {
    b.swingT = Math.max(0, b.swingT - dt);
    b.spin = Math.max(0, b.spin - dt);
    const cx = b.body.x, cy = b.body.y; // the body's origin (BODY_CY) is its centre
    // the Riddare slashes with a sword; its shield is a separate guard on the other side
    const art = WART[w];
    const tex = 'w-' + art;
    if (b.weapon.texture.key !== tex) b.weapon.setTexture(tex, 0);
    if (!b.wshadow) b.wshadow = this.add.ellipse(0, 0, 18, 6, 0x000000, 0.22);
    const two = w === 'dagger' || w === 'shield';
    if (two && !b.weapon2) b.weapon2 = this.add.sprite(0, 0, 'w-sai');
    b.weapon2?.setVisible(two && !ko);
    if (ko) { b.weapon.setVisible(false); b.wshadow.setVisible(false); return; }
    // Hovers beside the blob (blobz have no hands): a few px beyond the body edge toward the target (or the way it
    // glides), turned to that angle, bobbing gently over its own small shadow.
    const swinging = b.swingT > 0;
    const aim = swinging ? b.swingA : face;
    const prog = swinging ? 1 - b.swingT / b.swingDur : 0;
    const bob = Math.sin((this.time.now / 1000 / BOB_S) * Math.PI * 2 + (b.id.charCodeAt(0) % 7)) * BOB_PX;
    const spot = (ang: number, out: number) => ({ x: cx + Math.cos(ang) * (EDGE_X + HOVER + out), y: cy + Math.sin(ang) * (EDGE_Y + HOVER + 4 + out * 0.7) + DROP }); // vertical: clears the body top (hat) too
    const dbg = (extra: Record<string, unknown>) => { if (DEBUG) ((window as unknown as { __dgWeapon?: Record<string, unknown> }).__dgWeapon ??= {})[b.id] = { aim: Math.atan2(Math.sin(aim), Math.cos(aim)), prog, swing: swinging, n: b.swings, bx: cx, by: cy, w, bob, ...extra }; };
    if (w === 'dagger') {
      // two sai, one each side of the aim, pointing along it; each attack stabs ONE of them out and back (alternating)
      const stabber = b.swings % 2;
      const pts = [0, 1].map((i) => {
        const side = i === 0 ? 1 : -1, out = swinging && stabber === i ? Math.sin(prog * Math.PI) * DAGGER_STAB : 0;
        const g = spot(aim + side * DAGGER_SPREAD * (1 - (out / DAGGER_STAB) * 0.6), 0);
        return { x: g.x + Math.cos(aim) * out, y: g.y + Math.sin(aim) * out * 0.7 + bob * (i ? -1 : 1), gy: g.y };
      });
      if (b.weapon2!.texture.key !== 'w-sai') b.weapon2!.setTexture('w-sai');
      const im = WIMG.sai;
      [b.weapon, b.weapon2!].forEach((spr, i) => {
        spr.setVisible(true).setFlipX(i === 1).setScale(WSCALE).setOrigin(im.px / im.w, im.py / im.h)
          .setPosition(pts[i].x, pts[i].y).setRotation(aim + Math.PI / 2).setDepth(b.body.depth + (Math.sin(aim) < -0.35 ? -1 : 1));
      });
      b.wshadow.setVisible(true).setPosition(cx + Math.cos(aim) * (EDGE_X + HOVER + 6), Math.max(pts[0].gy, cy) + 22).setDepth(b.body.depth - 2).setScale(1.3, 1);
      const a = Math.atan2(Math.sin(aim), Math.cos(aim));
      dbg({ a, a2: a, slash: false, x: pts[0].x, y: pts[0].y, x2: pts[1].x, y2: pts[1].y, stab: stabber });
      return;
    }
    // A = where the weapon points now: slashing weapons sweep across the aim line (60% of the swing) and ease back;
    // the spear thrusts, the crossbow recoils
    let A = aim, out = swinging ? Math.sin(prog * Math.PI) * LUNGE[w] : 0;
    const sl = SLASH[w];
    let dir = 1;
    if (sl) out = swinging ? Math.sin(prog * Math.PI) * 4 : 0;
    if (swinging && sl) {
      const half = (sl.sweep * Math.PI) / 360;
      dir = Math.cos(aim) < 0 ? -1 : 1;
      if (prog < 0.6) {
        const u = prog / 0.6, k = sl.slam ? u * u * u : 1 - (1 - u) * (1 - u); // the hammer speeds up into the slam
        A = aim + dir * (-half + 2 * half * k);
        if (sl.slam && u > 0.8) out += (u - 0.8) * 40; // ... and lands a little further out
      } else {
        const u = (prog - 0.6) / 0.4, e = u * u * (3 - 2 * u);
        A = aim + dir * half * (1 - e);
      }
      // the Ninja slash arc in step with the blade: it starts as the blade enters the sweep and plays over the sweep,
      // centred on the aim and curving the way the blade goes
      if (prog >= 0.08 && b.arcFor !== b.swings) {
        b.arcFor = b.swings;
        if (!this.anims.exists('na-arc')) this.anims.create({ key: 'na-arc', frames: this.anims.generateFrameNumbers('na-arc', {}), frameRate: 22 });
        const blade = (WIMG[art].up ? WIMG[art].h : WIMG[art].w) * WSCALE, r = EDGE_X + HOVER + blade * 0.35, sweepT = b.swingDur * 0.6 * (1 - 0.08 / 0.6);
        const arc = this.add.sprite(cx + Math.cos(aim) * r, cy + Math.sin(aim) * r * 0.75, 'na-arc', 0).setScale(Math.max(0.9, (blade * 1.15) / 38))
          .setRotation(aim).setFlipY(dir < 0).setDepth(b.body.depth + 3);
        arc.play({ key: 'na-arc', frameRate: 6 / Math.max(0.1, sweepT) }).once('animationcomplete', () => arc.destroy());
      }
    }
    const L = Math.cos(A) < 0;
    const g = spot(A, out);
    const px = g.x, py = g.y + bob;
    const im = WIMG[art];
    const spin = b.spin > 0 ? (1 - b.spin / 0.35) * Math.PI * 2 * (L ? -1 : 1) : 0;
    // upright Ninja weapons turn by +90 deg (up -> the aim); the right-pointing crossbow mirrors when facing left
    const rot = im.up ? A + Math.PI / 2 + spin : (L ? A - Math.PI : A) + spin;
    const fl = !im.up && L;
    b.weapon.setVisible(true).setScale(WSCALE).setFlipX(fl)
      .setOrigin((fl ? im.w - im.px : im.px) / im.w, im.py / im.h)
      .setPosition(px, py).setDepth(b.body.depth + (Math.sin(A) < -0.35 ? -1 : 1))
      .setRotation(rot);
    // the crossbow's tip: bolts start there
    if (w === 'bow') b.tip = { x: px + Math.cos(A) * (im.w - im.px) * WSCALE, y: py + Math.sin(A) * (im.w - im.px) * WSCALE };
    // the Riddare's shield: hovers on the far side from the sword; raised in front on a sidestep or the shield wall
    if (w === 'shield' && b.weapon2) {
      if (b.weapon2.texture.key !== 'w-shield') b.weapon2.setTexture('w-shield');
      const sa = guard ? aim : aim + (Math.cos(aim) < 0 ? 1 : -1) * 1.9;
      const sg = spot(sa, guard ? 6 : -4);
      b.weapon2.setVisible(true).setFlipX(Math.cos(sa) < 0).setScale(WSCALE * (guard ? 1.2 : 1)).setRotation(0).setOrigin(0.5, 0.5)
        .setPosition(sg.x, sg.y - bob).setDepth(b.body.depth + (guard || Math.sin(sa) > -0.35 ? 2 : -1));
    }
    // the shadow sits on the ground under the weapon's middle and stays still while the weapon bobs
    b.wshadow.setVisible(true).setPosition(g.x + Math.cos(A) * 10, Math.max(g.y, cy) + 22).setDepth(b.body.depth - 2)
      .setScale(1 - bob / 12, 1);
    // e2e: which way the weapon really points (flipped sprites point left)
    const point = im.up ? rot - Math.PI / 2 - spin : b.weapon.flipX ? rot + Math.PI : rot;
    dbg({ a: Math.atan2(Math.sin(point), Math.cos(point)), slash: !!sl, x: px, y: py });
  }

  /** A special fx sprite that follows its blob until the animation ends. */
  private ride(b: HeroGfx, tex: string, anim: string, kind: 'spin' | 'charge', a: number, ox: number, oy: number, sc: number) {
    b.fx?.spr.destroy();
    const left = Math.cos(a) < 0;
    const spr = this.add.sprite(b.x, b.y, tex, 0).setScale(sc);
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
          const r = this.hostile(g.tele, 'nf-rune', e.slam.x, e.slam.y + 8, 0.6, HOSTILE.red);
          r.setData('grow', (SLAM_R * 2.4) / 32);
          for (let i = 0; i < 8; i++) {
            const b = (i / 8) * Math.PI * 2;
            const c = this.hostile(g.tele, 'nf-chev', e.slam.x + Math.cos(b) * SLAM_R * 1.6, e.slam.y + 8 + Math.sin(b) * SLAM_R * 1.1, 1.5, HOSTILE.red, b + Math.PI, 2);
            c.setData('in', { cx: e.slam.x, cy: e.slam.y + 8, b });
          }
        } else if (e.act === 1) {
          this.hostile(g.tele, 'nf-aura', x0, y0 - 6, 2.4, HOSTILE.purple, 0, undefined, y0 - 1);
          const len = DASH_SPEED * DASH_TIME + ENEMY_R[e.kind];
          for (let d = ENEMY_R[e.kind] + 10; d <= len; d += 26) {
            const x = x0 + ux * d, y = y0 + uy * d;
            if (fl && isWall(fl, x, y)) break;
            this.hostile(g.tele, 'nf-chev', x, y, 1.3, HOSTILE.red, a, 2).setData('d', d);
          }
        } else if (e.act === 3) {
          for (let k2 = 1; k2 <= 3; k2++) this.hostile(g.tele, 'nf-chev', x0 + ux * (ENEMY_R[e.kind] + k2 * 20), y0 + uy * (ENEMY_R[e.kind] + k2 * 20), 1.1, HOSTILE.red, a, 2);
        } else if (e.act === 5) {
          let d = ENEMY_R[e.kind] + 12, x = x0, y = y0;
          for (; d <= 300; d += 13) { x = x0 + ux * d; y = y0 + uy * d; if (fl && isWall(fl, x, y)) break; this.hostile(g.tele, 'nf-dot', x, y, 1.7, HOSTILE.orange, a).setData('d', d); }
          this.hostile(g.tele, 'nf-rune', x, y, 1.1, HOSTILE.orange);
        }
      }
    }
    if (!g.tele.length) return;
    // progress 0..1 through the warning
    const p = e.kind === 2 && e.slam ? 1 - Math.max(0, e.slam.t) / SLAM_WARN : 1 - e.at / (e.act === 1 ? DASH_WARN : e.act === 3 ? BITE_WARN : AIM_WARN);
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
          b.swingDur = f.w === 'hammer' ? 0.4 : 0.26; b.swingT = b.swingDur; b.swingA = f.a; b.swings++;
        }
        // a dagger stab: a small friendly spark at the stabbing sai's tip when it lands
        if (b && f.w === 'dagger') this.time.delayedCall(b.swingDur * 450, () => { const s2 = b.swings % 2 === 0 ? b.weapon : b.weapon2; if (s2?.visible) this.nfx('nf-star', s2.x + Math.cos(f.a) * 18, s2.y + Math.sin(f.a) * 14, 1.1, 0xfff2b0); });
        sfx.tool(f.w === 'hammer' || f.w === 'shield' ? 'axe' : f.w === 'spear' ? 'rake' : 'pickaxe', false);
        break;
      }
      case 'special': {
        const b = this.heroes.get(f.id);
        if (f.k === 'spin') {
          // Art's slash arc sweeping around the blob (centre 24,22 on the body)
          if (b) { b.spin = 0.35; this.ride(b, 'dg-fx-spin', 'dg-spin', 'spin', f.a, 48 / 96, 44 / 80, 1.5); }
          sfx.dash();
        } else if (f.k === 'slam') {
          const sw = this.add.sprite(f.x, f.y + 10, 'dg-fx-slam', 0).setOrigin(56 / 112, 30 / 56).setScale(2).setDepth(-400);
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
          if (b) { b.swingDur = 0.35; b.swingT = 0.35; this.ride(b, 'dg-fx-charge', 'dg-charge', 'charge', f.a, 1, 0.5, 1); }
          sfx.dash();
        }
        break;
      }
      case 'dodge': { const c = this.add.sprite(f.x, f.y + 14, 'dg-fx-sidestep', 0).setOrigin(0.5, 1).setScale(1).setDepth(f.y - 2); c.play('dg-sidestep'); c.once('animationcomplete', () => c.destroy()); sfx.dash(); break; }
      case 'hurt': { const g = this.goo.get(f.e); if (g) g.flash = 0.12; this.nfx('nf-star', f.x, f.y - 4, 1.6, 0xffffff); break; } // a friendly white spark on the monster
      case 'mdash': this.nfx('nf-dust', f.x, f.y + 14, 2.2); break;
      case 'bite': { const l: Phaser.GameObjects.Sprite[] = []; const c = this.hostile(l, 'nf-claw', f.x + Math.cos(f.a) * 34, f.y + Math.sin(f.a) * 34, 2.2, HOSTILE.red, f.a, undefined, f.y + 20); c.once('animationcomplete', () => l.forEach((o) => o.destroy())); break; }
      case 'kill': {
        // Ninja smoke puff + star (the boss explodes)
        if (f.kind === 2) this.nfx('nf-boom', f.x, f.y, 3);
        this.nfx('nf-smoke', f.x, f.y, f.kind === 2 ? 5 : 3);
        this.nfx('nf-star', f.x, f.y, f.kind === 2 ? 4 : 2.4, 0xffffff);
        if (f.kind === 2) { this.cameras.main.shake(300, 0.01); sfx.star(); } else sfx.bump();
        break;
      }
      case 'ouch': {
        this.cameras.main.shake(90, 0.004); sfx.bump();
        const b = this.heroes.get(f.id); if (b) this.tweens.add({ targets: b.body, alpha: 0.3, yoyo: true, duration: 80 });
        const l: Phaser.GameObjects.Sprite[] = []; const c = this.hostile(l, 'nf-claw', f.x, f.y - 8, 1.6, HOSTILE.red, 0, undefined, f.y + 30); c.once('animationcomplete', () => l.forEach((o) => o.destroy())); // an enemy hit: hostile red
        break;
      }
      case 'ko': this.floatText(f.x, f.y - 50, t('dg.ko'), '#ffffff', 22); break;
      case 'revive': { const r = this.add.sprite(f.x, f.y - 16, 'dg-revive', 0).setScale(1.5).setDepth(5000); r.play('dg-revive'); r.once('animationcomplete', () => r.destroy()); sfx.power(); break; }
      case 'coin': {
        const s = this.add.sprite(f.x, f.y - 8, 'dg-sparkle', 0).setScale(1.5).setDepth(5000);
        s.play('dg-sparkle'); s.once('animationcomplete', () => s.destroy());
        this.floatText(f.x, f.y - 20, '+' + f.n, '#ffe08a', 18); sfx.pick();
        break;
      }
      case 'chest': this.floatText(f.x, f.y - 40, '+' + f.n, '#ffe08a', 28); this.burst(f.x, f.y - 10, 0xffe08a, 12, 40); sfx.score(); break;
      case 'level': {
        const me = this.heroes.get(this.s.myId);
        this.floatText(me?.x ?? 0, (me?.y ?? 0) - 80, t('dg.level', { n: f.level }), '#8fd3ff', 30);
        sfx.star();
        break;
      }
      case 'slam': {
        // the Giant Slime crashes down: rock spikes burst out around it, rocks + dust, a big shake
        for (let i = 0; i < 5; i++) { const b = (i / 5) * Math.PI * 2 + 0.3; this.nfx('nf-spike', f.x + Math.cos(b) * SLAM_R * 0.8, f.y + Math.sin(b) * SLAM_R * 0.55 - 20, 1.8); }
        this.nfx('nf-rock', f.x, f.y + 10, 3.5); this.nfx('nf-dust', f.x, f.y + 30, 4.5);
        this.cameras.main.shake(260, 0.014); sfx.bump();
        break;
      }
      case 'floor': sfx.power(); break;
      case 'spit': sfx.tool('rake', false); break;
      case 'phase2': this.cameras.main.shake(400, 0.012); this.burst(f.x, f.y, 0xff3b3b, 18, 70); sfx.bump(); break;
      case 'shot': {
        // the bolt flies from the crossbow's tip to the monster
        let sx = f.x, sy = f.y - 10;
        for (const hb of this.heroes.values()) if (hb.tip && Math.hypot(hb.x - f.x, hb.y - f.y) < 40) { sx = hb.tip.x; sy = hb.tip.y; }
        const a = Math.atan2(f.ty - 6 - sy, f.tx - sx);
        const ar = this.add.image(sx, sy, 'dg-arrow').setScale(2).setRotation(a).setDepth(4500); // Art's arrow points right
        this.tweens.add({ targets: ar, x: f.tx, y: f.ty - 6, duration: Math.max(60, Math.hypot(f.tx - sx, f.ty - sy) / 1.2), onComplete: () => ar.destroy() });
        break;
      }
      case 'heal': {
        const c = this.add.sprite(f.x, f.y + 14, 'dg-fx-heal', 0).setOrigin(40 / 80, 30 / 48).setScale(1.5).setDepth(f.y + 7);
        c.play('dg-heal'); c.once('animationcomplete', () => c.destroy());
        this.floatText(f.x, f.y - 40, '+', '#6cc644', 30); sfx.power();
        break;
      }
      case 'block': {
        const c = this.add.sprite(f.x, f.y - 10, 'dg-fx-block', 0).setScale(1.5).setDepth(4500);
        c.play('dg-block'); c.once('animationcomplete', () => c.destroy());
        sfx.tool('pickaxe', false);
        break;
      }
      case 'potion': this.floatText(f.x, f.y - 30, t('dg.potion'), '#ff8a8a', 22); sfx.score(); break;
      case 'skill': { const b = this.heroes.get(f.id); const sk = skillOf(f.s); if (b && sk) this.floatText(b.x, b.y - 70, tSkill(sk.id), '#ffe08a', 20); break; }
      case 'loot': { const b = f.win ? this.heroes.get(f.win) : undefined; const it = itemOf(f.item); if (b && it) { this.floatText(b.x, b.y - 70, tItem(it.id), '#c58bff', 22); this.burst(b.x, b.y - 10, 0xc58bff, 10, 36); } break; }
    }
  }
}

// ---------- the hook GameScene calls every frame ----------
interface EntranceGfx { seed: number; at: { x: number; y: number }; img: Phaser.GameObjects.Image; ring: Phaser.GameObjects.Graphics; bubble: Phaser.GameObjects.Text }
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
    if (g) for (const o of [g.img, g.ring, g.bubble]) o.destroy();
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
    load('dg-entrance', 'art/dungeon/entrance.png');
    if (scene.registry.get('biome') === 'snow') load('dg-entrance-snow', 'art/dungeon/entrance-snow.png');
    g = {
      seed, at: ENTRANCE,
      img: scene.add.image(ENTRANCE.x, ENTRANCE.y + 30, entranceKey(scene) ?? '__MISSING').setScale(2).setOrigin(0.5, 1).setDepth(ENTRANCE.y - 60).setVisible(!!entranceKey(scene)),
      ring: scene.add.graphics().setDepth(ENTRANCE.y - 50),
      bubble: scene.add.text(ENTRANCE.x, ENTRANCE.y - 66, '', { fontFamily: FONT, fontSize: '22px', color: '#3f2631', fontStyle: 'bold', backgroundColor: '#fff7e6', padding: { x: 8, y: 2 } }).setOrigin(0.5, 1).setDepth(4000),
    };
    entrances.set(scene, g);
  }
  const ENTRANCE = g.at;
  const key = entranceKey(scene);
  if (key && (!g.img.visible || g.img.texture.key !== key)) g.img.setTexture(key).setVisible(true);
  const on = v.players.filter((p) => Math.hypot(p.x - ENTRANCE.x, p.y - ENTRANCE.y) < ENTRANCE_R).length;
  g.ring.clear();
  g.ring.lineStyle(3, 0xfff7e6, on ? 0.9 : 0.5).strokeEllipse(ENTRANCE.x, ENTRANCE.y + 10, ENTRANCE_R * 2, ENTRANCE_R);
  if (on && on === v.players.length && v.entry > 0) {
    g.ring.lineStyle(7, 0x6cc644, 1).beginPath();
    g.ring.arc(ENTRANCE.x, ENTRANCE.y - 66 - 40, 14, -Math.PI / 2, -Math.PI / 2 + Math.min(1, v.entry) * Math.PI * 2);
    g.ring.strokePath();
  }
  g.bubble.setText(`${on}/${v.players.length}`).setVisible(on > 0 && v.mode === 'meadow');
}
