// Phaser scene: renders a View (from the host sim or from network snapshots).
import Phaser from 'phaser';
import { blobCanvas, BODY_CY, clampLook } from './blob';
import { sfx } from './sfx';
import { BASE, makeTrees, rng, WORLD_H, WORLD_W } from './sim';
import type { FxEvent, Input, ItemKind, PlayerInfo, View } from './sim';

export interface Session {
  role: 'host' | 'client';
  myId: string;
  seed: number;
  infos(): Map<string, PlayerInfo>;
  tick(dt: number, input: Input): void;
  view(): View | null;
  drainFx(): FxEvent[];
  readInput(): Input;
}

const T = 32; // rendered tile size (16px tiles at 2x)
const ITEM_ICON: Record<ItemKind, string> = { wood: 'ic-log', shroom: 'ic-mushroom', coin: 'ic-coin' };
// Obstacles (sim kinds 0-4) and decor from ChatGPT order 30 (public/art/props)
const OBSTACLE_ART: [string, number][] = [['pr-tree-green', 2.8], ['pr-tree-orange', 2.8], ['pr-tree-pine', 2.8], ['pr-rock', 2.6], ['pr-boulder', 2.4]];
const PROPS = ['tree-green', 'tree-orange', 'tree-pine', 'rock', 'boulder', 'bush', 'flowers', 'stump', 'pond', 'fence', 'sign', 'plate', 'plate-down', 'gate', 'gate-open', 'gate-post'];
const BLOB_SCALE = 1.45; // 36x48 blob grid // 18x24 pixel blob grid
// decorations from Tiny Farm (sheet 'farm') and Tiny Town ('town')
const DECOR: [string, number][] = [['pr-bush', 2], ['pr-bush', 2], ['pr-flowers', 2]];

interface BlobGfx {
  shadow: Phaser.GameObjects.Ellipse;
  body: Phaser.GameObjects.Image;
  eyes: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  carry: Phaser.GameObjects.Image[];
  aura: Phaser.GameObjects.Graphics;
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
    for (const n of ['log', 'mushroom', 'coin', 'chest', 'boot', 'magnet', 'house']) this.load.image('ic-' + n, `art/icons/${n}.png`);
    for (const n of PROPS) this.load.image('pr-' + n, `art/props/${n}.png`);
    const sheet = (key: string, dir: string) => this.load.spritesheet(key, `assets/${dir}/tilemap_packed.png`, { frameWidth: 16, frameHeight: 16 });
    sheet('town', 'kenney-tiny-town');
    sheet('dungeon', 'kenney-tiny-dungeon');
    sheet('farm', 'kenney-tiny-farm');
    sheet('battle', 'kenney-tiny-battle');
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
          row.push(v < 0.8 ? 0 : v < 0.99 ? 1 : 2); // few flower tiles
        }
      }
      data.push(row);
    }
    // Ground baked into ONE canvas (a tilemap layer shows seams between tiles at fractional zoom)
    const groundKey = `ground-${this.s.seed}`;
    if (!this.textures.exists(groundKey)) {
      const src = this.textures.get('town').getSourceImage() as HTMLImageElement;
      const gc = document.createElement('canvas');
      gc.width = cols * 16; gc.height = rows * 16;
      const gx = gc.getContext('2d')!;
      data.forEach((row, ty) => row.forEach((f, tx) => gx.drawImage(src, (f % 12) * 16, Math.floor(f / 12) * 16, 16, 16, tx * 16, ty * 16, 16, 16)));
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
    this.add.image(BASE.x, BASE.y + 30, 'ic-house').setScale(5.2).setOrigin(0.5, 1).setDepth(BASE.y - 40);
    this.add.text(BASE.x, BASE.y + 52, 'BAS', { fontFamily: "'Pixelify Sans', sans-serif", fontSize: '20px', color: '#fff7e6', fontStyle: 'bold', stroke: '#3f2631', strokeThickness: 5 }).setOrigin(0.5).setDepth(-800);

    // trees (same layout as the host sim, from the shared seed)
    for (const t of makeTrees(this.s.seed)) {
      this.add.ellipse(t.x, t.y + 6, 34, 12, 0x000000, 0.18).setDepth(-500);
      const [key, sc] = OBSTACLE_ART[t.kind] ?? OBSTACLE_ART[0];
      this.add.image(t.x, t.y + 10, key).setScale(sc).setOrigin(0.5, t.kind < 3 ? 0.95 : 0.8).setDepth(t.y);
    }

    // flat decorations (no collision), from the same seed on every phone
    const trees = makeTrees(this.s.seed);
    for (let i = 0; i < 22; i++) {
      const x = 30 + r() * (WORLD_W - 60), y = 30 + r() * (WORLD_H - 60);
      const [key, sc] = DECOR[Math.floor(r() * DECOR.length)];
      if (Math.hypot(x - BASE.x, y - BASE.y) < BASE.r + 30 || trees.some((t) => Math.hypot(t.x - x, t.y - y) < 46)) continue;
      this.add.image(x, y, key).setScale(sc).setDepth(-600);
    }

    for (let i = 0, placed = 0; i < 40 && placed < 2; i++) {
      const x = 120 + r() * (WORLD_W - 240), y = 120 + r() * (WORLD_H - 240);
      if (Math.hypot(x - BASE.x, y - BASE.y) < BASE.r + 120 || trees.some((t) => Math.hypot(t.x - x, t.y - y) < 80)) continue;
      this.add.image(x, y, 'pr-pond').setScale(2.4).setDepth(-650); placed++;
    }

    this.trailG = this.add.graphics().setDepth(-400);
    this.pickG = this.add.graphics().setDepth(-450);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setBackgroundColor('#2b6b3a');
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
        img = this.add.image(it.x, it.y, ITEM_ICON[it.kind]).setScale(0.2);
        this.tweens.add({ targets: img, scale: 1.8, duration: 250, ease: 'Back.Out' });
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

    // ---- power-ups ----
    const seenW = new Set<number>();
    for (const w of v.powers) {
      seenW.add(w.id);
      let c = this.powers.get(w.id);
      if (!c) {
        const bg = this.add.circle(0, 0, 18, w.kind === 'speed' ? 0x5ec8ff : 0xff6b8b, 0.35).setStrokeStyle(2, 0xffffff, 0.8);
        const ic = this.add.image(0, -1, w.kind === 'speed' ? 'ic-boot' : 'ic-magnet').setScale(1.9);
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
          label: this.add.text(p.x, p.y, info.name, { fontFamily: "'Pixelify Sans', sans-serif", fontSize: '13px', color: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5),
          carry: [], x: p.x, y: p.y, vx: 0, vy: 0, look: { x: 0, y: 1 }, trail: [], texKey, blinkT: 2 + Math.random() * 3, baseScale, pixel,
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
    const hover = Math.sin(now / 180 + b.x * 0.01) * 2; // they hover-glide, never roll
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
    b.body.setScale(b.baseScale * (1 + stretch), b.baseScale * (1 - stretch * 0.6));
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
    if (isMe) b.aura.fillStyle(0xffffff, 0.9).fillTriangle(b.x - 6, b.y - 60 + hover, b.x + 6, b.y - 60 + hover, b.x, b.y - 52 + hover);

    b.label.setPosition(b.x, b.y + 24).setDepth(b.y + 2);

    // carried items stack
    while (b.carry.length < p.carry.length) b.carry.push(this.add.image(0, 0, 'ic-coin').setScale(1.2));
    while (b.carry.length > p.carry.length) b.carry.pop()!.destroy();
    p.carry.forEach((k, i) => {
      const img = b.carry[i];
      img.setTexture(ITEM_ICON[k]);
      img.setPosition(b.x + (i - (p.carry.length - 1) / 2) * 14, b.y - 44 + hover - Math.abs(i - 1) * 2).setDepth(b.y + 3);
    });
  }

  private drawGem(g: Phaser.GameObjects.Graphics, x: number, y: number, holders: number, now: number) {
    // treasure chest (Tiny Dungeon) is a separate image; this draws its shadow + carry ring
    g.clear().setDepth(y - 1);
    g.fillStyle(0x000000, 0.22).fillEllipse(x, y + 20, 46, 12);
    if (holders >= 2) g.fillStyle(0xffe08a, 0.25 + 0.15 * Math.sin(now / 100)).fillCircle(x, y, 40);
    else g.lineStyle(2, 0xffffff, 0.4 + 0.2 * Math.sin(now / 300)).strokeCircle(x, y, 62);
  }

  private playFx(f: FxEvent) {
    if (f.t === 'score') {
      sfx.score();
      const t = this.add.text(f.x, f.y, '+' + f.pts, { fontFamily: "'Pixelify Sans', sans-serif", fontSize: f.pts >= 10 ? '34px' : '26px', color: '#ffe08a', fontStyle: 'bold', stroke: '#6b4a2a', strokeThickness: 5 }).setOrigin(0.5).setDepth(5000);
      this.tweens.add({ targets: t, y: f.y - 50, alpha: 0, duration: 1000, ease: 'Cubic.Out', onComplete: () => t.destroy() });
    } else if (f.t === 'pick') {
      sfx.pick();
      this.burst(f.x, f.y, 0xffffff, 6);
    } else if (f.t === 'bump') {
      sfx.bump();
      this.burst(f.x, f.y - 20, 0x5aa83a, 8);
      this.cameras.main.shake(80, 0.003);
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
      const c = this.add.circle(sx, sy, 5 + Math.random() * 3, 0xffffff, 0.95).setStrokeStyle(2, 0xd8d0c0, 0.9).setDepth(sy - 15);
      this.tweens.add({ targets: c, x: sx + Math.cos(a) * reach, y: sy + Math.sin(a) * reach * 0.7, scale: 2, alpha: 0, duration: 380 + Math.random() * 160, delay: i * 18, ease: 'Cubic.Out', onComplete: () => c.destroy() });
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
