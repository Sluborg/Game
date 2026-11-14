// Phaser scene: renders a View (from the host sim or from network snapshots).
import Phaser from 'phaser';
import { blobCanvas } from './art';
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
const ITEM_FRAME: Record<ItemKind, number> = { wood: 106, shroom: 29, coin: 93 };
const TREE_FRAMES = [16, 28, 27];

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
}

export class GameScene extends Phaser.Scene {
  private s!: Session;
  private blobs = new Map<string, BlobGfx>();
  private items = new Map<number, Phaser.GameObjects.Image>();
  private gems = new Map<number, { g: Phaser.GameObjects.Graphics; t: Phaser.GameObjects.Text; x: number; y: number }>();
  private powers = new Map<number, Phaser.GameObjects.Container>();
  private trailG!: Phaser.GameObjects.Graphics;
  private baseG!: Phaser.GameObjects.Graphics;
  private camTarget = { x: BASE.x, y: BASE.y };
  private lastView: View | null = null;
  onView: (v: View) => void = () => {};

  constructor() { super('game'); }

  init(data: { session: Session }) {
    this.s = data.session;
    this.blobs.clear(); this.items.clear(); this.gems.clear(); this.powers.clear();
    this.lastView = null;
    this.lastClock = 0;
  }

  preload() {
    this.load.spritesheet('town', 'assets/kenney-tiny-town/tilemap_packed.png', { frameWidth: 16, frameHeight: 16 });
  }

  create() {
    this.textures.get('town').setFilter(Phaser.Textures.FilterMode.NEAREST);
    const r = rng(this.s.seed * 7 + 3);

    // ground: grass with variety + dirt yard around base
    const cols = WORLD_W / T, rows = WORLD_H / T;
    const data: number[][] = [];
    const bc = Math.floor(BASE.x / T), br = Math.floor(BASE.y / T);
    for (let y = 0; y < rows; y++) {
      const row: number[] = [];
      for (let x = 0; x < cols; x++) {
        const dx = x - bc, dy = y - br;
        if (dx >= -3 && dx <= 2 && dy >= -3 && dy <= 2) {
          const cx = dx === -3 ? 0 : dx === 2 ? 2 : 1;
          const cy = dy === -3 ? 0 : dy === 2 ? 2 : 1;
          row.push([12, 24, 36][cy] + cx);
        } else {
          const v = r();
          row.push(v < 0.72 ? 0 : v < 0.92 ? 1 : 2);
        }
      }
      data.push(row);
    }
    const map = this.make.tilemap({ data, tileWidth: 16, tileHeight: 16 });
    const ts = map.addTilesetImage('town', 'town', 16, 16, 0, 0)!;
    map.createLayer(0, ts, 0, 0)!.setScale(2).setDepth(-1000);

    // base: glowing drop-off ring + cottage
    this.baseG = this.add.graphics().setDepth(-900);
    const house = [[52, 53, 54], [64, 65, 66], [72, 74, 75]];
    house.forEach((row, ry) => row.forEach((f, rx) => {
      this.add.image(BASE.x - T + rx * T, BASE.y - 2.2 * T + ry * T, 'town', f).setScale(2).setDepth(BASE.y - 40);
    }));
    this.add.text(BASE.x, BASE.y + 52, 'BAS', { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '18px', color: '#fffaf0', fontStyle: 'bold', stroke: '#6b4a2a', strokeThickness: 4 }).setOrigin(0.5).setDepth(-800);

    // trees (same layout as the host sim, from the shared seed)
    for (const t of makeTrees(this.s.seed)) {
      this.add.ellipse(t.x, t.y + 6, 34, 12, 0x000000, 0.18).setDepth(-500);
      this.add.image(t.x, t.y + 8, 'town', TREE_FRAMES[t.kind]).setScale(3).setOrigin(0.5, 0.85).setDepth(t.y);
    }

    this.trailG = this.add.graphics().setDepth(-400);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
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
    const pulse = 0.5 + 0.5 * Math.sin(now / 300);
    this.baseG.clear();
    this.baseG.fillStyle(0xffe08a, 0.18 + 0.1 * pulse).fillCircle(BASE.x, BASE.y, BASE.r);
    this.baseG.lineStyle(4, 0xffe08a, 0.7).strokeCircle(BASE.x, BASE.y, BASE.r - 2 + pulse * 3);

    // ---- items ----
    const seenI = new Set<number>();
    for (const it of v.items) {
      seenI.add(it.id);
      let img = this.items.get(it.id);
      if (!img) {
        img = this.add.image(it.x, it.y, 'town', ITEM_FRAME[it.kind]).setScale(0.2);
        this.tweens.add({ targets: img, scale: 2, duration: 250, ease: 'Back.Out' });
        this.items.set(it.id, img);
      }
      img.x += (it.x - img.x) * (smooth ? k : 1);
      img.y += (it.y - img.y) * (smooth ? k : 1);
      img.setDepth(img.y - 10);
      img.setAngle(Math.sin(now / 400 + it.id) * 6);
    }
    for (const [id, img] of this.items) if (!seenI.has(id)) { img.destroy(); this.items.delete(id); }

    // ---- gems (co-op carry) ----
    const seenG = new Set<number>();
    for (const g of v.gems) {
      seenG.add(g.id);
      let e = this.gems.get(g.id);
      if (!e) {
        e = { g: this.add.graphics(), t: this.add.text(0, 0, '', { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '16px', color: '#fff', fontStyle: 'bold', stroke: '#1d4f7a', strokeThickness: 4 }).setOrigin(0.5), x: g.x, y: g.y };
        this.gems.set(g.id, e);
      }
      e.x += (g.x - e.x) * (smooth ? k : 1);
      e.y += (g.y - e.y) * (smooth ? k : 1);
      this.drawGem(e.g, e.x, e.y, g.holders, now);
      e.t.setPosition(e.x, e.y - 44).setText(g.holders >= 2 ? '💪 ' + g.holders : '👥 ' + g.holders + '/2').setDepth(e.y + 1000);
    }
    for (const [id, e] of this.gems) if (!seenG.has(id)) { e.g.destroy(); e.t.destroy(); this.gems.delete(id); }

    // ---- power-ups ----
    const seenW = new Set<number>();
    for (const w of v.powers) {
      seenW.add(w.id);
      let c = this.powers.get(w.id);
      if (!c) {
        const bg = this.add.circle(0, 0, 17, w.kind === 'speed' ? 0xffc93c : 0xff6b8b).setStrokeStyle(3, 0xffffff);
        const ic = this.add.text(0, 0, w.kind === 'speed' ? '⚡' : '🧲', { fontSize: '20px' }).setOrigin(0.5);
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
      const info = infos.get(p.id) ?? { id: p.id, name: '?', color: 0xcccccc, hat: 0 };
      let b = this.blobs.get(p.id);
      const texKey = `blob-${info.color}-${info.hat}`;
      if (!this.textures.exists(texKey)) this.textures.addCanvas(texKey, blobCanvas(info.color, info.hat, 96));
      if (!b) {
        b = {
          shadow: this.add.ellipse(p.x, p.y, 34, 12, 0x000000, 0.22),
          aura: this.add.graphics(),
          body: this.add.image(p.x, p.y, texKey).setOrigin(0.5, 0.62).setScale(0.6),
          eyes: this.add.graphics(),
          label: this.add.text(p.x, p.y, info.name, { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '13px', color: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5),
          carry: [], x: p.x, y: p.y, vx: 0, vy: 0, look: { x: 0, y: 1 }, trail: [], texKey, blinkT: 2 + Math.random() * 3,
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
    const hover = Math.sin(now / 180 + b.x * 0.01) * 2; // they hover-glide, never roll
    // trail of little glide puffs
    if (sp > 90) b.trail.push({ x: b.x, y: b.y + 8, a: Math.min(0.5, sp / 600) });
    for (const t of b.trail) t.a -= dt * 1.2;
    b.trail = b.trail.filter((t) => t.a > 0).slice(-14);
    const color = this.s.infos().get(p.id)?.color ?? 0xffffff;
    for (const t of b.trail) this.trailG.fillStyle(color, t.a).fillCircle(t.x, t.y, 4 + t.a * 10);

    const stretch = Math.min(0.18, sp / 1600);
    b.shadow.setPosition(b.x, b.y + 12).setDepth(b.y - 20).setScale(1 - hover * 0.03, 1);
    b.body.setPosition(b.x, b.y - 4 + hover).setDepth(b.y);
    b.body.setScale(0.6 * (1 + stretch), 0.6 * (1 - stretch * 0.6));
    b.body.setRotation(Phaser.Math.Clamp(b.vx / 1400, -0.18, 0.18));

    // eyes follow movement direction
    if (sp > 20) { b.look.x += (b.vx / sp - b.look.x) * 0.2; b.look.y += (b.vy / sp - b.look.y) * 0.2; }
    b.blinkT -= dt;
    const blink = b.blinkT < 0.12;
    if (b.blinkT < 0) b.blinkT = 2 + Math.random() * 4;
    const ex = b.x + b.look.x * 4, ey = b.y - 10 + hover + b.look.y * 3;
    b.eyes.clear().setDepth(b.y + 0.5);
    for (const s of [-1, 1]) {
      if (blink) { b.eyes.fillStyle(0x222222, 1).fillRect(ex + s * 6 - 4, ey - 1, 8, 2); continue; }
      b.eyes.fillStyle(0xffffff, 1).fillEllipse(ex + s * 6, ey, 9, 11);
      b.eyes.fillStyle(0x222222, 1).fillCircle(ex + s * 6 + b.look.x * 2, ey + b.look.y * 2, 2.6);
    }

    // power-up aura
    b.aura.clear().setDepth(b.y - 1);
    if (p.boostT > 0) b.aura.lineStyle(3, 0xffc93c, 0.8).strokeCircle(b.x, b.y - 4 + hover, 26 + Math.sin(now / 60) * 2);
    if (p.magnetT > 0) b.aura.lineStyle(2, 0xff6b8b, 0.5).strokeCircle(b.x, b.y, 60 + Math.sin(now / 200) * 6);
    if (isMe) b.aura.fillStyle(0xffffff, 0.9).fillTriangle(b.x - 6, b.y - 52 + hover, b.x + 6, b.y - 52 + hover, b.x, b.y - 44 + hover);

    b.label.setPosition(b.x, b.y + 24).setDepth(b.y + 2);

    // carried items stack
    while (b.carry.length < p.carry.length) b.carry.push(this.add.image(0, 0, 'town', 0).setScale(1.4));
    while (b.carry.length > p.carry.length) b.carry.pop()!.destroy();
    p.carry.forEach((k, i) => {
      const img = b.carry[i];
      img.setFrame(ITEM_FRAME[k]);
      img.setPosition(b.x + (i - (p.carry.length - 1) / 2) * 14, b.y - 38 + hover - Math.abs(i - 1) * 2).setDepth(b.y + 3);
    });
  }

  private drawGem(g: Phaser.GameObjects.Graphics, x: number, y: number, holders: number, now: number) {
    const bob = Math.sin(now / 300) * 3;
    g.clear().setDepth(y);
    g.fillStyle(0x000000, 0.2).fillEllipse(x, y + 18, 40, 12);
    if (holders >= 2) g.fillStyle(0x9be7ff, 0.25 + 0.15 * Math.sin(now / 100)).fillCircle(x, y + bob, 40);
    else g.lineStyle(2, 0xffffff, 0.35).strokeCircle(x, y, 62);
    const yy = y + bob - 6;
    g.fillStyle(0x5ec8ff, 1).fillPoints([{ x: x, y: yy - 26 }, { x: x + 20, y: yy - 6 }, { x: x, y: yy + 22 }, { x: x - 20, y: yy - 6 }], true);
    g.fillStyle(0xbdf0ff, 1).fillPoints([{ x: x, y: yy - 26 }, { x: x + 20, y: yy - 6 }, { x: x, y: yy - 2 }, { x: x - 20, y: yy - 6 }], true);
    g.lineStyle(2, 0x1d6fa8, 1).strokePoints([{ x: x, y: yy - 26 }, { x: x + 20, y: yy - 6 }, { x: x, y: yy + 22 }, { x: x - 20, y: yy - 6 }], true);
    g.fillStyle(0xffffff, 0.9).fillCircle(x - 6, yy - 12, 3);
  }

  private playFx(f: FxEvent) {
    if (f.t === 'score') {
      sfx.score();
      const t = this.add.text(f.x, f.y, '+' + f.pts, { fontFamily: 'Trebuchet MS, sans-serif', fontSize: f.pts >= 10 ? '34px' : '26px', color: '#ffe08a', fontStyle: 'bold', stroke: '#6b4a2a', strokeThickness: 5 }).setOrigin(0.5).setDepth(5000);
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

  private burst(x: number, y: number, color: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const d = this.add.circle(x, y, 3, color).setDepth(5000);
      this.tweens.add({ targets: d, x: x + Math.cos(a) * 26, y: y + Math.sin(a) * 26, alpha: 0, duration: 350, onComplete: () => d.destroy() });
    }
  }

  get view() { return this.lastView; }
}
