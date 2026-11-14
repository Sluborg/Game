// Dungeon rendering (Code 2). A separate Phaser scene drawn on top of the meadow scene while the team
// is underground; the meadow scene keeps ticking the session (sim / network) and hides its camera.
// Also draws the dungeon entrance on the meadow (dungeonFrame is the one hook GameScene calls).
import Phaser from 'phaser';
import { blobCanvas, BODY_CY, clampLook } from './blob';
import { DT, ENEMY_R, GOO_ART, GOO_SCALE, WEAPON_STATS, FLOORS, GH, GW, heroMods, makeFloor, skillOf, itemOf, SLAM_R, specialOf, STAIRS_R, type DFx, type Floor, type HeroClass, type Weapon } from './dungeon';
/** Weapons without Art's strip yet: a Kenney Tiny Dungeon tile in hand (bow: drawn in code). */
const WEAPON_TILE: Partial<Record<Weapon, number>> = { staff: 130, shield: 102, dagger: 103 }; // dagger tile: blade up
import type { Session } from './game';
import { sfx } from './sfx';
import { entranceOf, ENTRANCE_R, DUNGEON_ENABLED, type View } from './sim';

const BLOB_SCALE = 1.45; // same as the meadow (game.ts)
const FONT = "'Fredoka', sans-serif"; // same as the meadow
const DEBUG = new URLSearchParams(location.search).has('debug');
const HITBOX = new URLSearchParams(location.search).has('hitbox'); // ?hitbox draws the sim's circles
/** Weapon strips (art/dungeon/README.md): frame size + pivot. */
const WEAPON_FRAME: Partial<Record<Weapon, { w: number; h: number; px: number; py: number }>> = {
  sword: { w: 44, h: 48, px: 16, py: 28 }, hammer: { w: 44, h: 48, px: 16, py: 28 }, spear: { w: 68, h: 48, px: 16, py: 28 },
  staff: { w: 44, h: 48, px: 16, py: 28 }, bow: { w: 44, h: 48, px: 16, py: 28 }, shield: { w: 44, h: 48, px: 16, py: 28 }, // Art's gear-*.png
};
/** Class hats in blob.ts CLASS_HATS (Krigare keeps the skin hat). */
const CLASS_HAT: Partial<Record<HeroClass, number>> = { healer: 0, marksman: 1, tank: 2 }; // the rogue keeps the skin hat
const GOO = ['goo-small', 'goo-medium', 'goo-boss'];
const WORLD = { w: GW * DT, h: GH * DT };
// Kenney Tiny Dungeon frames (12 per row)
const FLOOR_TILES = [48, 48, 48, 48, 49, 49, 42];
const WALL_FACE = 40;
const WALL_DECOR = 29;

interface HeroGfx {
  id: string;
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
  weapon2?: Phaser.GameObjects.Sprite; // the rogue's off-hand dagger // knight's shield wall (Art's fx-wall)
}
interface GooGfx { img: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Ellipse; warn?: Phaser.GameObjects.Image; bar?: Phaser.GameObjects.Graphics; x: number; y: number; flash: number; kind: number }

export class DungeonScene extends Phaser.Scene {
  private s!: Session;
  private floorKey = '';
  private map: Floor | null = null;
  private mapObjs: Phaser.GameObjects.GameObject[] = [];
  private chests: Phaser.GameObjects.Image[] = [];
  private stairs!: Phaser.GameObjects.Image;
  private heroes = new Map<string, HeroGfx>();
  private goo = new Map<number, GooGfx>();
  private coins = new Map<number, Phaser.GameObjects.Image>();
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
    this.heroes.clear(); this.goo.clear(); this.coins.clear();
    this.lastClock = 0;
  }

  preload() {
    const img = (key: string, url: string) => { if (!this.textures.exists(key)) this.load.image(key, url); };
    const sheet = (key: string, url: string, w: number, h: number) => { if (!this.textures.exists(key)) this.load.spritesheet(key, url, { frameWidth: w, frameHeight: h }); };
    for (const n of ['stairs-down', 'stairs-up', 'chest-closed', 'chest-open', 'slam-warning', 'flash-goo-small', 'flash-goo-medium', 'flash-goo-boss']) img('dg-' + n, `art/dungeon/${n}.png`);
    for (const n of [...GOO, 'goo-splat']) img('dg-' + n, `art/enemies/${n}.png`);
    for (const n of ['coin-pile-s', 'coin-pile-m']) img('dg-' + n, `art/fx/${n}.png`);
    for (const w of ['sword', 'hammer', 'spear'] as Weapon[]) sheet('dg-weapon-' + w, `art/dungeon/weapon-${w}.png`, WEAPON_FRAME[w]!.w, WEAPON_FRAME[w]!.h);
    // Art's class gear strips; the Bågskytt carries a crossbow (weapon id stays 'bow': loaded, aim, shot, reload)
    for (const w of ['staff', 'bow', 'shield'] as Weapon[]) sheet('dg-weapon-' + w, `art/dungeon/gear-${w === 'bow' ? 'crossbow' : w}.png`, 44, 48);
    sheet('dg-ko-stars', 'art/dungeon/ko-stars.png', 20, 9);
    sheet('dg-revive', 'art/dungeon/revive.png', 16, 20);
    sheet('dg-shockwave', 'art/dungeon/shockwave.png', 48, 24);
    sheet('dg-fx-spin', 'art/dungeon/fx-spin.png', 48, 40);
    sheet('dg-fx-slam', 'art/dungeon/fx-slam.png', 56, 28);
    sheet('dg-fx-charge', 'art/dungeon/fx-charge.png', 48, 16);
    sheet('dg-fx-sidestep', 'art/dungeon/fx-sidestep.png', 24, 24);
    sheet('dg-fx-heal', 'art/dungeon/fx-heal.png', 40, 24);
    sheet('dg-fx-wall', 'art/dungeon/fx-wall.png', 48, 40);
    sheet('dg-fx-block', 'art/dungeon/fx-block.png', 16, 16);
    img('dg-arrow', 'art/dungeon/arrow.png');
    img('dg-potion', 'art/dungeon/potion.png');
    sheet('fx-sparkle', 'art/fx/coin-sparkle.png', 11, 11);
    sheet('dungeon', 'assets/kenney-tiny-dungeon/tilemap_packed.png', 16, 16);
  }

  create() {
    this.textures.get('dungeon').setFilter(Phaser.Textures.FilterMode.NEAREST);
    const anim = (key: string, tex: string, frames: number[], rate: number, repeat = 0) => {
      if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(tex, { frames }), frameRate: rate, repeat });
    };
    anim('dg-ko', 'dg-ko-stars', [0, 1], 4, -1);
    anim('dg-revive', 'dg-revive', [0, 1, 2], 8);
    anim('dg-shock', 'dg-shockwave', [0, 1, 2], 12);
    anim('dg-spin', 'dg-fx-spin', [0, 1, 2, 3], 12);
    anim('dg-slam', 'dg-fx-slam', [0, 1, 2, 3], 12);
    anim('dg-charge', 'dg-fx-charge', [0, 1, 2], 10);
    anim('dg-sidestep', 'dg-fx-sidestep', [0, 1, 2], 10);
    anim('dg-heal', 'dg-fx-heal', [0, 1, 2, 3], 10);
    anim('dg-wall', 'dg-fx-wall', [0, 1, 2], 10);
    anim('dg-block', 'dg-fx-block', [0, 1, 2], 14);
    anim('sparkle', 'fx-sparkle', [0, 1, 2, 1, 0], 16);
    if (!this.textures.exists('dg-bow-ph')) {
      // placeholder bow until Art's weapon-bow.png: brown arc + string, 16x16 pixels
      const c = document.createElement('canvas'); c.width = 16; c.height = 16;
      const g = c.getContext('2d')!;
      g.fillStyle = '#3f2631'; for (let y = 1; y < 15; y++) { const x = 4 + Math.round(4 * Math.sin((y / 15) * Math.PI)); g.fillRect(x - 1, y, 3, 1); }
      g.fillStyle = '#a0643c'; for (let y = 2; y < 14; y++) { const x = 4 + Math.round(4 * Math.sin((y / 15) * Math.PI)); g.fillRect(x, y, 1, 1); }
      g.fillStyle = '#fff7e6'; g.fillRect(4, 2, 1, 12);
      this.textures.addCanvas('dg-bow-ph', c)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
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
      const src = this.textures.get('dungeon').getSourceImage() as HTMLImageElement;
      const c = document.createElement('canvas');
      c.width = GW * 16; c.height = GH * 16;
      const g = c.getContext('2d')!;
      g.imageSmoothingEnabled = false;
      const tile = (fr: number, tx: number, ty: number) => g.drawImage(src, (fr % 12) * 16, Math.floor(fr / 12) * 16, 16, 16, tx * 16, ty * 16, 16, 16);
      const solid = (tx: number, ty: number) => tx < 0 || ty < 0 || tx >= GW || ty >= GH || f.solid[ty * GW + tx] === 1;
      let n = seed + floor * 7;
      const rnd = () => { n = (n * 1103515245 + 12345) & 0x7fffffff; return n / 0x7fffffff; };
      g.fillStyle = '#1b1018';
      g.fillRect(0, 0, c.width, c.height);
      for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) {
        if (!solid(tx, ty)) { tile(FLOOR_TILES[Math.floor(rnd() * FLOOR_TILES.length)], tx, ty); continue; }
        if (!solid(tx, ty + 1)) { tile(rnd() < 0.08 ? WALL_DECOR : WALL_FACE, tx, ty); continue; } // wall face above a floor
        // wall top: dark stone, with a lighter rim next to floors
        const nearFloor = !solid(tx - 1, ty) || !solid(tx + 1, ty) || !solid(tx, ty - 1) || !solid(tx - 1, ty + 1) || !solid(tx + 1, ty + 1);
        g.fillStyle = nearFloor ? '#4a3a52' : '#2a1d2e';
        g.fillRect(tx * 16, ty * 16, 16, 16);
        if (nearFloor) { g.fillStyle = '#3f2631'; g.fillRect(tx * 16, ty * 16 + 14, 16, 2); }
      }
      // underground: a touch darker overall
      g.fillStyle = 'rgba(20, 8, 30, 0.22)';
      g.fillRect(0, 0, c.width, c.height);
      this.textures.addCanvas(key, c)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.mapObjs.push(this.add.image(0, 0, key).setOrigin(0).setScale(2).setDepth(-1000));
    // stairs: down (floors 1-2) or the way out after the boss (floor 3); floor 1 also has the exit up
    this.stairs = this.add.image(f.stairs.x, f.stairs.y, floor < FLOORS ? 'dg-stairs-down' : 'dg-stairs-up').setScale(2).setDepth(-900);
    this.mapObjs.push(this.stairs);
    if (floor === 1) this.mapObjs.push(this.add.image(f.exit.x, f.exit.y, 'dg-stairs-up').setScale(2).setDepth(-900));
    this.chests = f.chests.map((c) => this.add.image(c.x, c.y + 8, 'dg-chest-closed').setScale(3).setOrigin(0.5, 1).setDepth(c.y));
    this.mapObjs.push(...this.chests);
    // a big floor banner
    const t = this.add.text(f.start.x, f.start.y - 90, floor === FLOORS ? `Våning ${floor} - Bossen!` : `Våning ${floor}`, { fontFamily: FONT, fontSize: '34px', color: '#ffe08a', fontStyle: 'bold', stroke: '#3f2631', strokeThickness: 7 })
      .setOrigin(0.5).setDepth(7000);
    this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, delay: 1400, duration: 900, onComplete: () => t.destroy() });
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
    d.opened.forEach((o, i) => { const c = this.chests[i]; if (c && o && c.texture.key !== 'dg-chest-open') c.setTexture('dg-chest-open'); });
    // the boss exit glows only once the boss is gone
    const bossAlive = d.enemies.some((e) => e.kind === 2);
    this.stairs.setAlpha(d.floor === FLOORS && bossAlive ? 0.35 : 1);

    // ---- coins ----
    const seenC = new Set<number>();
    for (const c of d.coins) {
      seenC.add(c.id);
      let img = this.coins.get(c.id);
      if (!img) { img = c.k === 1 ? this.add.image(c.x, c.y, 'dg-potion').setScale(2) : this.add.image(c.x, c.y, 'dg-coin-pile-s').setScale(2); this.coins.set(c.id, img); }
      img.x += (c.x - img.x) * (smooth ? k : 1); img.y += (c.y - 4 - Math.abs(Math.sin(now / 200 + c.id)) * 4 - img.y) * (smooth ? k : 1);
      img.setDepth(c.y - 5);
    }
    for (const [id, img] of this.coins) if (!seenC.has(id)) { img.destroy(); this.coins.delete(id); }

    // ---- goo ----
    const seenE = new Set<number>();
    for (const e of d.enemies) {
      seenE.add(e.id);
      let g = this.goo.get(e.id);
      if (!g) {
        g = { img: this.add.image(e.x, e.y, 'dg-' + GOO[e.kind]).setScale(GOO_SCALE[e.kind]).setOrigin(0.5, 0.5), shadow: this.add.ellipse(e.x, e.y, ENEMY_R[e.kind] * 2, ENEMY_R[e.kind] * 0.6, 0x000000, 0.3), x: e.x, y: e.y, flash: 0, kind: e.kind };
        if (e.kind === 2) { g.warn = this.add.image(0, 0, 'dg-slam-warning').setVisible(false); g.bar = this.add.graphics(); }
        this.goo.set(e.id, g);
      }
      g.x += (e.x - g.x) * (smooth ? k : 1); g.y += (e.y - g.y) * (smooth ? k : 1);
      g.flash = Math.max(0, g.flash - dt);
      const tex = 'dg-' + (g.flash > 0 ? 'flash-' : '') + GOO[e.kind];
      if (g.img.texture.key !== tex) g.img.setTexture(tex);
      const sq = 1 + Math.sin(now / 160 + e.id) * 0.06;
      // the sprite is centred on the hitbox (dungeon.ts ENEMY_R is the drawn size), squash from the centre
      g.img.setPosition(g.x, g.y).setScale(GOO_SCALE[e.kind] * sq, GOO_SCALE[e.kind] / sq).setDepth(g.y);
      g.shadow.setPosition(g.x, g.y + (GOO_ART[e.kind][1] * GOO_SCALE[e.kind]) / 2 - 2).setDepth(g.y - 30);
      if (g.warn) {
        g.warn.setVisible(!!e.slam);
        if (e.slam) g.warn.setPosition(e.slam.x, e.slam.y).setScale((SLAM_R * 2) / 48 * (1 + Math.max(0, e.slam.t) * 0.15)).setDepth(-500).setAlpha(0.55 + Math.sin(now / 60) * 0.35);
      }
      if (g.bar) {
        g.bar.clear().setDepth(5000);
        const w = 80, x = g.x - w / 2, y = g.y - ENEMY_R[e.kind] - 22;
        g.bar.fillStyle(0x3f2631, 1).fillRect(x - 3, y - 3, w + 6, 12).fillStyle(0xb3261e, 1).fillRect(x, y, w * Math.min(1, Math.max(0, e.hp) / Math.max(1, d.bossMax)), 6);
      }
    }
    for (const [id, g] of this.goo) if (!seenE.has(id)) { g.img.destroy(); g.shadow.destroy(); g.warn?.destroy(); g.bar?.destroy(); this.goo.delete(id); }

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
      const texKey = `blob-${look.color}-${look.shape}-${look.eyes}-${look.mouth}-${look.hat}` + (ch !== undefined ? `-c${ch}` : '');
      if (!this.textures.exists(texKey)) this.textures.addCanvas(texKey, blobCanvas(look, 1, ch))!.setFilter(Phaser.Textures.FilterMode.NEAREST);
      let b = this.heroes.get(p.id);
      const w = h?.weapon ?? 'sword';
      if (!b) {
        b = {
          shadow: this.add.ellipse(p.x, p.y, 34, 12, 0x000000, 0.3),
          body: this.add.image(p.x, p.y, texKey).setOrigin(0.5, BODY_CY).setScale(BLOB_SCALE),
          label: this.add.text(p.x, p.y, info.name, { fontFamily: FONT, fontSize: '13px', color: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5),
          weapon: this.add.sprite(p.x, p.y, WEAPON_FRAME[w] ? 'dg-weapon-' + w : 'dg-bow-ph', 0),
          stars: this.add.sprite(p.x, p.y, 'dg-ko-stars', 0).setScale(2).setVisible(false),
          me: this.add.triangle(p.x, p.y, 0, 0, 12, 0, 6, 8, 0xffffff, 0.9).setVisible(p.id === this.s.myId),
          texKey, x: p.x, y: p.y, vx: 0, vy: 0, id: p.id, swingT: 0, swingDur: 0.3, swingA: 0, swings: 0, spin: 0,
        };
        b.stars.play('dg-ko');
        this.heroes.set(p.id, b);
      }
      if (b.texKey !== texKey) { b.body.setTexture(texKey); b.texKey = texKey; }
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
      b.me.setPosition(b.x, b.y - 58).setDepth(b.y + 3);
      if (h && !ko && h.wallT > 0) {
        // the wall's reach on the ground + Art's dome over it (rises, then holds on the last frame)
        const r = specialOf(h.cls, h.weapon).r * heroMods(h).spR;
        this.auraG.lineStyle(3, 0x8fd3ff, 0.6).strokeEllipse(b.x, b.y + 10, r * 2, r * 1.2);
        if (!b.dome) { b.dome = this.add.sprite(b.x, b.y, 'dg-fx-wall', 0).setOrigin(0.5, 1); b.dome.play('dg-wall'); }
        b.dome.setPosition(b.x, b.y + 16).setScale(Math.max(2, Math.round((r * 2) / 48))).setDepth(b.y + 6).setAlpha(h.wallT < 0.6 ? h.wallT / 0.6 : 1);
      } else if (b.dome) { b.dome.destroy(); b.dome = undefined; }
      if (h && !ko && h.shield > 0) this.ringG.lineStyle(3, 0x8fd3ff, 0.9).strokeCircle(b.x, b.y - 6, 28);
      b.stars.setVisible(ko).setPosition(b.x, b.y - 30).setDepth(b.y + 4);
      this.drawWeapon(b, w, h?.face ?? 0, ko, dt);
      // picking level-up cards: frozen and safe (a soft bubble so friends see why it stands still)
      if (h && !ko && h.offer.length) this.ringG.fillStyle(0xfff7e6, 0.25).fillCircle(b.x, b.y - 6, 30).lineStyle(3, 0xffe08a, 0.9).strokeCircle(b.x, b.y - 6, 30);
      if (b.fx) {
        const sc = BLOB_SCALE, cy = b.body.y - BODY_CY * 48 * sc + 31 * sc; // body centre on the blob grid
        if (b.fx.kind === 'spin') b.fx.spr.setPosition(b.x, cy).setDepth(b.y + 5);
        else b.fx.spr.setPosition(b.x - Math.cos(b.fx.a) * 12, cy - Math.sin(b.fx.a) * 12).setDepth(b.y - 1);
      }
    }
    for (const [id, b] of this.heroes) if (!seenP.has(id)) { for (const o of [b.shadow, b.body, b.label, b.weapon, b.stars, b.me]) o.destroy(); b.fx?.spr.destroy(); b.dome?.destroy(); b.weapon2?.destroy(); this.heroes.delete(id); }

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
  private drawWeapon(b: HeroGfx, w: Weapon, face: number, ko: boolean, dt: number) {
    const fr = WEAPON_FRAME[w];
    b.swingT = Math.max(0, b.swingT - dt);
    b.spin = Math.max(0, b.spin - dt);
    const left = Math.cos(face) < -0.2;
    const sc = BLOB_SCALE;
    const gx = b.body.x - 18 * sc, gy = b.body.y - BODY_CY * 48 * sc;
    const hx = gx + (left ? 2 : 33) * sc, hy = gy + 33 * sc;
    if (!fr) {
      // placeholder until Art's strip: a Kenney tile (blade up) held at the body edge, pointed at the target and
      // jabbing forward on each attack; the dagger gets its twin in the other hand
      const tile = WEAPON_TILE[w];
      if (tile !== undefined) { if (b.weapon.texture.key !== 'dungeon' || Number(b.weapon.frame.name) !== tile) b.weapon.setTexture('dungeon', tile); }
      else if (b.weapon.texture.key !== 'dg-bow-ph') b.weapon.setTexture('dg-bow-ph');
      const twin = w === 'dagger';
      if (twin && !b.weapon2) b.weapon2 = this.add.sprite(0, 0, 'dungeon', tile ?? 103).setScale(2).setOrigin(0.5, 0.8);
      b.weapon2?.setVisible(twin && !ko);
      if (ko) { b.weapon.setVisible(false); return; }
      const swinging = b.swingT > 0;
      const A = swinging ? b.swingA : face;
      const cx = b.body.x, cy = gy + 31 * sc;
      const jab = swinging ? Math.sin((1 - b.swingT / b.swingDur) * Math.PI) * 8 : 0;
      const px = cx + Math.cos(A) * (15 * sc + jab), py = cy + Math.sin(A) * (9 * sc + jab) + 2 * sc;
      b.weapon.setVisible(true).setScale(2).setFlipX(false).setOrigin(0.5, 0.8).setPosition(px, py)
        .setDepth(b.body.depth + (Math.sin(A) < -0.35 ? -1 : 1)).setRotation(A + Math.PI / 2);
      if (twin && b.weapon2) {
        const B = A + (Math.cos(A) < 0 ? -0.9 : 0.9); // the off-hand dagger, a little to the side
        b.weapon2.setPosition(cx + Math.cos(B) * 13 * sc, cy + Math.sin(B) * 8 * sc + 2 * sc).setRotation(B + Math.PI / 2).setDepth(b.body.depth + (Math.sin(B) < -0.35 ? -1 : 1));
      }
      if (DEBUG) ((window as unknown as { __dgWeapon?: Record<string, unknown> }).__dgWeapon ??= {})[b.id] = { a: Math.atan2(Math.sin(A), Math.cos(A)), swing: swinging, n: b.swings, x: px, y: py, bx: cx, by: cy, w };
      return;
    }
    b.weapon2?.setVisible(false);
    const key = 'dg-weapon-' + w;
    if (b.weapon.texture.key !== key) b.weapon.setTexture(key, 0);
    if (ko) { b.weapon.setVisible(false); return; }
    // Held at the body's edge toward the target (or the way the blob moves) and turned to that angle.
    // Art's strips point right on the strike frame, so rotating by the angle swings/thrusts along the line.
    const swinging = b.swingT > 0;
    const A = swinging ? b.swingA : face;
    const aims = w === 'spear' || w === 'bow'; // always pointed: spear tip and crossbow follow the aim
    const side = swinging || aims || w === 'shield';
    const L = Math.cos(A) < 0;
    const cx = b.body.x, cy = gy + 31 * sc; // body centre on the blob grid
    const px = side ? cx + Math.cos(A) * 15 * sc : hx; // body edge toward the target, else the hand
    const py = side ? cy + Math.sin(A) * 9 * sc + 2 * sc : hy;
    const frame = swinging ? Math.min(3, Math.floor((1 - b.swingT / b.swingDur) * 4)) : 0;
    const rot = (side && w !== 'shield' ? (L ? A - Math.PI : A) : 0) + (b.spin > 0 ? (1 - b.spin / 0.35) * Math.PI * 2 * (L ? -1 : 1) : 0);
    b.weapon.setVisible(true).setFrame(frame).setScale(sc).setFlipX(side ? L : left)
      .setOrigin(((side ? L : left) ? fr.w - fr.px : fr.px) / fr.w, fr.py / fr.h)
      .setPosition(px, py).setDepth(b.body.depth + (Math.sin(A) < -0.35 && side ? -1 : 1))
      .setRotation(rot);
    if (DEBUG) {
      // e2e: which way the weapon really points (flipped sprites point left)
      const point = b.weapon.flipX ? rot + Math.PI : rot;
      ((window as unknown as { __dgWeapon?: Record<string, unknown> }).__dgWeapon ??= {})[b.id] = { a: Math.atan2(Math.sin(point), Math.cos(point)), swing: swinging, n: b.swings, x: px, y: py, bx: cx, by: cy, w };
    }
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

  private playFx(f: DFx) {
    switch (f.t) {
      case 'swing': {
        const b = this.heroes.get(f.id);
        if (b) { b.swingDur = f.w === 'hammer' ? 0.4 : 0.26; b.swingT = b.swingDur; b.swingA = f.a; b.swings++; }
        sfx.tool(f.w === 'hammer' ? 'axe' : f.w === 'spear' ? 'rake' : 'pickaxe', false);
        break;
      }
      case 'special': {
        const b = this.heroes.get(f.id);
        if (f.k === 'spin') {
          // Art's slash arc sweeping around the blob (centre 24,22 on the body)
          if (b) { b.spin = 0.35; this.ride(b, 'dg-fx-spin', 'dg-spin', 'spin', f.a, 24 / 48, 22 / 40, 3); }
          sfx.dash();
        } else if (f.k === 'slam') {
          const sw = this.add.sprite(f.x, f.y + 10, 'dg-fx-slam', 0).setOrigin(28 / 56, 15 / 28).setScale(4).setDepth(-400);
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
          if (b) { b.swingDur = 0.35; b.swingT = 0.35; this.ride(b, 'dg-fx-charge', 'dg-charge', 'charge', f.a, 1, 0.5, 2); }
          sfx.dash();
        }
        break;
      }
      case 'dodge': { const c = this.add.sprite(f.x, f.y + 14, 'dg-fx-sidestep', 0).setOrigin(0.5, 1).setScale(2).setDepth(f.y - 2); c.play('dg-sidestep'); c.once('animationcomplete', () => c.destroy()); sfx.dash(); break; }
      case 'hurt': { const g = this.goo.get(f.e); if (g) g.flash = 0.12; this.burst(f.x, f.y, 0x8be36b, 4, 16); break; }
      case 'kill': {
        const sp = this.add.image(f.x, f.y + 6, 'dg-goo-splat').setScale(GOO_SCALE[f.kind]).setDepth(-600);
        this.tweens.add({ targets: sp, alpha: 0, delay: 2500, duration: 800, onComplete: () => sp.destroy() });
        this.burst(f.x, f.y, 0x8be36b, f.kind === 2 ? 16 : 8, f.kind === 2 ? 60 : 30);
        if (f.kind === 2) { this.cameras.main.shake(300, 0.01); sfx.star(); } else sfx.bump();
        break;
      }
      case 'ouch': { this.cameras.main.shake(90, 0.004); sfx.bump(); const b = this.heroes.get(f.id); if (b) this.tweens.add({ targets: b.body, alpha: 0.3, yoyo: true, duration: 80 }); break; }
      case 'ko': this.floatText(f.x, f.y - 50, 'Knockad!', '#ffffff', 22); break;
      case 'revive': { const r = this.add.sprite(f.x, f.y - 16, 'dg-revive', 0).setScale(3).setDepth(5000); r.play('dg-revive'); r.once('animationcomplete', () => r.destroy()); sfx.power(); break; }
      case 'coin': {
        const s = this.add.sprite(f.x, f.y - 8, 'fx-sparkle', 0).setScale(3).setDepth(5000);
        s.play('sparkle'); s.once('animationcomplete', () => s.destroy());
        this.floatText(f.x, f.y - 20, '+' + f.n, '#ffe08a', 18); sfx.pick();
        break;
      }
      case 'chest': this.floatText(f.x, f.y - 40, '+' + f.n, '#ffe08a', 28); this.burst(f.x, f.y - 10, 0xffe08a, 12, 40); sfx.score(); break;
      case 'level': {
        const me = this.heroes.get(this.s.myId);
        this.floatText(me?.x ?? 0, (me?.y ?? 0) - 80, `Nivå ${f.level}!`, '#8fd3ff', 30);
        sfx.star();
        break;
      }
      case 'slam': {
        const sw = this.add.sprite(f.x, f.y, 'dg-shockwave', 0).setScale((SLAM_R * 2) / 48).setDepth(-400);
        sw.play('dg-shock'); sw.once('animationcomplete', () => sw.destroy());
        this.cameras.main.shake(220, 0.01); sfx.bump();
        break;
      }
      case 'floor': sfx.power(); break;
      case 'shot': {
        // arrow flies from the archer to the goo
        const a = Math.atan2(f.ty - f.y, f.tx - f.x);
        const ar = this.add.image(f.x, f.y - 10, 'dg-arrow').setScale(2).setRotation(a).setDepth(4500); // Art's arrow points right
        this.tweens.add({ targets: ar, x: f.tx, y: f.ty - 6, duration: Math.max(60, Math.hypot(f.tx - f.x, f.ty - f.y) / 1.2), onComplete: () => ar.destroy() });
        break;
      }
      case 'heal': {
        const c = this.add.sprite(f.x, f.y + 14, 'dg-fx-heal', 0).setOrigin(20 / 40, 15 / 24).setScale(3).setDepth(f.y + 7);
        c.play('dg-heal'); c.once('animationcomplete', () => c.destroy());
        this.floatText(f.x, f.y - 40, '+', '#6cc644', 30); sfx.power();
        break;
      }
      case 'block': {
        const c = this.add.sprite(f.x, f.y - 10, 'dg-fx-block', 0).setScale(3).setDepth(4500);
        c.play('dg-block'); c.once('animationcomplete', () => c.destroy());
        sfx.tool('pickaxe', false);
        break;
      }
      case 'potion': this.floatText(f.x, f.y - 30, '+1 hjärta åt alla', '#ff8a8a', 22); sfx.score(); break;
      case 'skill': { const b = this.heroes.get(f.id); const sk = skillOf(f.s); if (b && sk) this.floatText(b.x, b.y - 70, sk.name, '#ffe08a', 20); break; }
      case 'loot': { const b = f.win ? this.heroes.get(f.win) : undefined; const it = itemOf(f.item); if (b && it) { this.floatText(b.x, b.y - 70, it.name, '#c58bff', 22); this.burst(b.x, b.y - 10, 0xc58bff, 10, 36); } break; }
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
