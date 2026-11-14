// Ninja Adventure monster demo (Code 2), opened with ?demo=monsters or ?dgdemo. Standalone: not wired into the dungeon.
// Top-down like the real dungeon: one room, the blob in the middle, six Ninja monsters around it at different angles.
// They attack in turns (then the Giant Slime drops in from above): telegraph -> dash or shot -> the blob sidesteps
// across the line -> glides in and hits back -> every second hit the monster dies in a smoke puff and returns.
// Every effect is a Ninja FX sprite (code draws only a tint flash and the blob): dash wind-up = aura + sparks and red
// chevrons along the path; shot = rune at the mouth, spark dots along the aim, ring on the target, Ninja projectile +
// elemental impact; boss = growing red rune on the landing spot, thunder, then rock spikes + rocks + dust. 3x, pixelArt.
import Phaser from 'phaser';
import { blobCanvas, BODY_CY, clampLook, COLORS, FACE_DIRS, faceIndex } from './blob';

const NA = 'assets/ninja-adventure/';
const SCALE = 3;
const TILE = 16 * SCALE;

// [key, file, frameWidth, frameHeight, fps, loop]
const FX: [string, string, number, number, number, boolean][] = [
  ['fx-smoke', 'FX/Smoke/Smoke/SpriteSheet.png', 32, 32, 12, false],
  ['fx-dust', 'FX/Smoke/SmokeCircular/SpriteSheet.png', 30, 14, 16, false],
  ['fx-arc', 'FX/Slash/SpriteSheetArc.png', 38, 34, 18, false],
  ['fx-cut', 'FX/Attack/Cut/SpriteSheet.png', 32, 32, 16, false],
  ['fx-aura', 'FX/Magic/Aura/SpriteSheet.png', 25, 24, 12, true],
  ['fx-spark', 'FX/Magic/Spark/SpriteSheet.png', 45, 35, 12, true],
  ['fx-rune', 'FX/Magic/Circle/SpriteSheetSpark2.png', 32, 32, 10, true],
  ['fx-ring', 'FX/Magic/Circle/SpriteSheetOrange.png', 32, 32, 10, false],
  ['fx-dot', 'FX/Particle/Spark.png', 10, 8, 12, true],
  ['fx-thunder', 'FX/Elemental/Thunder/SpriteSheet.png', 20, 28, 16, false],
  ['p-plant', 'FX/Projectile/PlantSpike.png', 24, 20, 12, true],
  ['p-ball', 'FX/Projectile/BigEnergyBall.png', 24, 24, 12, true],
  ['p-fire', 'FX/Projectile/Fireball.png', 16, 16, 12, true],
  ['i-plant', 'FX/Elemental/Plant/SpriteSheet.png', 30, 28, 16, false],
  ['i-water', 'FX/Elemental/Water/SpriteSheet.png', 44, 33, 18, false],
  ['i-flam', 'FX/Elemental/Flam/SpriteSheet.png', 25, 30, 16, false],
  ['i-spike', 'FX/Elemental/RockSpike/SpriteSheet.png', 54, 48, 16, false],
  ['i-rock', 'FX/Elemental/Rock/SpriteSheet.png', 30, 30, 20, false],
  ['i-boom', 'FX/Elemental/Explosion/SpriteSheet.png', 40, 40, 18, false],
];

type Kind = 'dash' | 'shot';
interface Mon { key: string; file: string; name: string; kind: Kind; ang: number; shot?: string; hit?: string }
// spread around the blob (deg, screen y down): diagonals above, sides, diagonals below; the boss drops in from above
const MONS: Mon[] = [
  { key: 'bat', file: 'Actor/Monster/BlueBat/SpriteSheet.png', name: 'Bat', kind: 'dash', ang: -140 },
  { key: 'octopus', file: 'Actor/Monster/Octopus/SpriteSheet.png', name: 'Octopus', kind: 'shot', ang: 65, shot: 'p-ball', hit: 'i-water' },
  { key: 'slime3', file: 'Actor/Monster/Slime3/Slime3.png', name: 'Slime', kind: 'dash', ang: 10 },
  { key: 'eye', file: 'Actor/Monster/Eye/Eye.png', name: 'Eye', kind: 'shot', ang: -40, shot: 'p-fire', hit: 'i-flam' },
  { key: 'skull', file: 'Actor/Monster/Skull/SpriteSheet.png', name: 'Skull', kind: 'dash', ang: 115 },
  { key: 'slime2', file: 'Actor/Monster/Slime2/Slime2.png', name: 'Spitter', kind: 'shot', ang: 170, shot: 'p-plant', hit: 'i-plant' },
];
const DIRS = ['down', 'up', 'left', 'right'] as const;
/** sheet column for a facing: 0 down, 1 up, 2 left, 3 right */
const facing = (dx: number, dy: number) => (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : dy < 0 ? 1 : 0);

const T = { warn: 650, attack: 380, back: 500, gap: 350 };
const BLOB_SCALE = 1.45; // same as the dungeon

class DemoScene extends Phaser.Scene {
  private objs: Phaser.GameObjects.GameObject[] = [];
  private timers: Phaser.Time.TimerEvent[] = [];
  private blob!: Phaser.GameObjects.Image;
  private cap!: Phaser.GameObjects.Text;
  private cx = 0; private cy = 0;

  constructor() { super('ninja-demo'); }

  preload() {
    for (const m of MONS) this.load.spritesheet(m.key, NA + m.file, { frameWidth: 16, frameHeight: 16 });
    for (const a of ['Idle', 'Jump', 'Hit']) this.load.spritesheet(`boss-${a.toLowerCase()}`, NA + `Actor/Boss/GiantSlime/${a}.png`, { frameWidth: 62, frameHeight: 52 });
    for (const [k, f, w, h] of FX) this.load.spritesheet(k, NA + f, { frameWidth: w, frameHeight: h });
    this.load.image('floor', NA + 'Backgrounds/Tilesets/Interior/TilesetInteriorFloor.png');
    this.load.image('walls', NA + 'Backgrounds/Tilesets/Interior/TilesetWallSimple.png');
  }

  create() {
    const a = this.anims;
    for (const m of MONS) DIRS.forEach((d, c) => a.create({ key: `${m.key}-${d}`, frames: a.generateFrameNumbers(m.key, { frames: [c, c + 4, c + 8, c + 12] }), frameRate: 7, repeat: -1 }));
    a.create({ key: 'boss-idle', frames: a.generateFrameNumbers('boss-idle', {}), frameRate: 8, repeat: -1 });
    a.create({ key: 'boss-jump', frames: a.generateFrameNumbers('boss-jump', {}), frameRate: 16 });
    a.create({ key: 'boss-hit', frames: a.generateFrameNumbers('boss-hit', {}), frameRate: 14 });
    for (const [k, , , , fps, loop] of FX) a.create({ key: k, frames: a.generateFrameNumbers(k, {}), frameRate: fps, repeat: loop ? -1 : 0 });
    // the current blob (Code wires blobz v2 separately), one texture per face direction
    const look = clampLook({ color: COLORS[1], shape: 0, eyes: 0, mouth: 1, hat: 1 });
    FACE_DIRS.forEach((fd, i) => this.textures.addCanvas(`demo-blob-f${i}`, blobCanvas(look, 1, undefined, fd))!.setFilter(Phaser.Textures.FilterMode.NEAREST));
    this.layout();
    this.scale.on('resize', () => this.layout());
  }

  /** one room filling the screen: stone-brick floor + the brown simple wall frame, all at 3x */
  private bakeRoom(W: number, H: number) {
    const fl = this.textures.get('floor').getSourceImage() as HTMLImageElement;
    const wl = this.textures.get('walls').getSourceImage() as HTMLImageElement;
    const cols = Math.ceil(W / TILE), rows = Math.ceil(H / TILE);
    const c = document.createElement('canvas');
    c.width = cols * TILE; c.height = rows * TILE;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    const put = (img: HTMLImageElement, sx: number, sy: number, x: number, y: number) => g.drawImage(img, sx, sy, 16, 16, x * TILE, y * TILE, TILE, TILE);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) put(fl, 192, 208, x, y);
    for (let x = 1; x < cols - 1; x++) { put(wl, 48, 96, x, 0); put(wl, 48, 160, x, rows - 1); }
    for (let y = 1; y < rows - 1; y++) { put(wl, 0, 112, 0, y); put(wl, 64, 112, cols - 1, y); }
    put(wl, 0, 96, 0, 0); put(wl, 64, 96, cols - 1, 0); put(wl, 0, 160, 0, rows - 1); put(wl, 64, 160, cols - 1, rows - 1);
    if (this.textures.exists('room')) this.textures.remove('room');
    this.textures.addCanvas('room', c);
    return { ox: (W - c.width) / 2, oy: (H - c.height) / 2 };
  }

  private layout() {
    for (const t of this.timers) t.remove();
    for (const o of this.objs) o.destroy();
    this.timers = []; this.objs = [];
    this.tweens.killAll();
    const W = this.scale.width, H = this.scale.height;
    const { ox, oy } = this.bakeRoom(W, H);
    this.objs.push(this.add.image(ox, oy, 'room').setOrigin(0));
    this.cx = W / 2; this.cy = H / 2 + (W > H ? 30 : 40);
    this.blob = this.add.image(this.cx, this.cy, 'demo-blob-f0').setOrigin(0.5, BODY_CY).setScale(BLOB_SCALE).setDepth(3);
    this.objs.push(this.blob);
    this.cap = this.add.text(W / 2, H - TILE - 30, '', { fontFamily: 'Fredoka, sans-serif', fontSize: '18px', color: '#ffe9a8', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 0).setDepth(9);
    this.objs.push(this.cap);
    // monsters on an ellipse around the blob
    const rx = Math.min(W / 2 - 64, 230), ry = Math.min(H / 2 - 120, 230);
    const mons = MONS.map((m) => {
      const t = (m.ang * Math.PI) / 180, x = this.cx + Math.cos(t) * rx, y = this.cy + Math.sin(t) * ry;
      const s = this.add.sprite(x, y, m.key).setScale(SCALE).setDepth(3);
      s.play(`${m.key}-${DIRS[facing(this.cx - x, this.cy - y)]}`);
      this.objs.push(s);
      return { m, s, x, y, hits: 0 };
    });
    // the boss waits at the top wall
    const boss = this.add.sprite(this.cx, oy + TILE + 52, 'boss-idle').setScale(W > H ? 1.6 : 2).play('boss-idle').setDepth(3);
    this.objs.push(boss);
    // turns: each monster attacks in order, then the boss, forever
    let turn = 0, side = 1;
    const next = () => {
      const k = turn++ % (mons.length + 1);
      side = -side;
      if (k < mons.length) this.monTurn(mons[k], side, next);
      else this.bossTurn(boss, side, next);
    };
    this.later(500, next);
  }

  private later(ms: number, fn: () => void) { this.timers.push(this.time.delayedCall(ms, fn)); }

  /** blob eyes look at a point */
  private look(x: number, y: number) {
    const i = faceIndex((x - this.blob.x) / 100, (y - this.blob.y) / 100, 0.1);
    this.blob.setTexture(`demo-blob-f${i}`);
  }

  /** subtle tint flash (the only code-made effect) */
  private flash(s: Phaser.GameObjects.Sprite, times: number, ms: number, color = 0xffd0d0) {
    for (let k = 0; k < times; k++) {
      this.later(k * ms * 2, () => s.active && s.setTint(color));
      this.later(k * ms * 2 + ms, () => s.active && s.clearTint());
    }
  }

  /** one-shot Ninja FX at a point */
  private fx(key: string, x: number, y: number, scale = SCALE, depth = 5, angle = 0) {
    const f = this.add.sprite(x, y, key).setScale(scale).setDepth(depth).setAngle(angle);
    f.play(key).once('animationcomplete', () => f.destroy());
    this.objs.push(f);
    return f;
  }

  /** looping Ninja FX kept for `ms`, then faded out */
  private hold(key: string, x: number, y: number, ms: number, scale = SCALE, depth = 2, alpha = 1, angle = 0) {
    const f = this.add.sprite(x, y, key).setScale(scale).setDepth(depth).setAlpha(alpha).setAngle(angle).play(key);
    this.objs.push(f);
    this.later(ms, () => this.tweens.add({ targets: f, alpha: 0, duration: 120, onComplete: () => f.destroy() }));
    return f;
  }

  /** the blob sidesteps across the attack line, then glides back and hits the attacker with a Ninja slash */
  private dodgeAndHit(ux: number, uy: number, side: number, tx: number, ty: number, target: Phaser.GameObjects.Sprite, after: () => void, extra = 0) {
    const sx = this.cx - uy * side * 62, sy = this.cy + ux * side * 62;
    this.later(T.warn - 120, () => this.tweens.add({ targets: this.blob, x: sx, y: sy, duration: 160, ease: 'Quad.easeOut' }));
    this.later(T.warn + T.attack + T.back + extra, () => {
      const hx = tx - ux * 46, hy = ty - uy * 46;
      this.tweens.add({ targets: this.blob, x: hx, y: hy, duration: 240, ease: 'Sine.easeInOut' });
      this.later(220, () => {
        this.fx('fx-arc', (hx + tx) / 2, (hy + ty) / 2, 2.4, 6, (Math.atan2(ty - hy, tx - hx) * 180) / Math.PI);
        this.flash(target, 2, 70, 0xffffff);
        this.tweens.add({ targets: target, x: target.x + ux * 10, y: target.y + uy * 10, duration: 110, yoyo: true });
      });
      this.later(520, () => this.tweens.add({ targets: this.blob, x: this.cx, y: this.cy, duration: 300, ease: 'Sine.easeInOut', onComplete: () => this.later(T.gap, after) }));
    });
  }

  private monTurn(o: { m: Mon; s: Phaser.GameObjects.Sprite; x: number; y: number; hits: number }, side: number, after: () => void) {
    const { m, s, x, y } = o;
    this.cap.setText(`${m.name}: ${m.kind === 'dash' ? 'dash' : 'shot'}`);
    const dx = this.cx - x, dy = this.cy - y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const anim = `${m.key}-${DIRS[facing(dx, dy)]}`;
    s.setAlpha(1).setScale(SCALE).setPosition(x, y).play(anim);
    this.look(x, y);
    s.anims.pause();
    if (m.kind === 'dash') {
      // wind-up: pull back + aura and sparks on the monster, red chevrons light up along the dash path
      this.tweens.add({ targets: s, x: x - ux * 8, y: y - uy * 8, scale: SCALE * 1.1, duration: T.warn * 0.8, ease: 'Quad.easeOut' });
      this.hold('fx-aura', x, y - 6, T.warn, 2.4, 2);
      this.hold('fx-spark', x, y - 14, T.warn, 1.6, 4);
      const n = Math.floor((L + 30) / 30);
      for (let k = 1; k <= n; k++) {
        this.later((k - 1) * ((T.warn * 0.5) / n), () => {
          const a = this.add.sprite(x + ux * (8 + k * 30), y + uy * (8 + k * 30), 'fx-thunder', 2).setScale(1.3).setAngle(deg).setTint(0xff5a40).setDepth(1).setAlpha(0.95);
          this.objs.push(a);
          this.later(T.warn - (k - 1) * ((T.warn * 0.5) / n), () => a.destroy());
        });
      }
      this.flash(s, 3, T.warn / 6);
    } else {
      // charge: a rune at the mouth, spark dots run along the aim line, a ring on the target
      this.hold('fx-rune', x + ux * 22, y + uy * 22, T.warn, 1.6, 4);
      const n = Math.floor((L - 50) / 26);
      for (let k = 1; k <= n; k++) this.later((k - 1) * 40, () => this.hold('fx-dot', x + ux * (30 + k * 26), y + uy * (30 + k * 26), T.warn - (k - 1) * 40, 2.4, 1, 0.9, deg));
      this.hold('fx-ring', this.cx, this.cy, T.warn, 1.8, 1, 0.9);
      this.flash(s, 3, T.warn / 6, 0xfff0a0);
    }
    this.later(T.warn, () => {
      s.setScale(SCALE).anims.resume();
      if (m.kind === 'dash') {
        const ex = this.cx + ux * 30, ey = this.cy + uy * 30;
        this.fx('fx-dust', s.x, s.y + 18);
        this.tweens.add({ targets: s, x: ex, y: ey, duration: T.attack, ease: 'Quad.easeIn' });
        this.later(T.attack - 60, () => this.fx('fx-dust', ex, ey + 18, 2.4));
        this.later(T.attack + 40, () => this.tweens.add({ targets: s, x, y, duration: T.back, ease: 'Sine.easeInOut' }));
      } else {
        const p = this.add.sprite(x + ux * 20, y + uy * 20, m.shot!).setScale(2.4).setAngle(deg).play(m.shot!).setDepth(4);
        this.objs.push(p);
        this.tweens.add({ targets: p, x: this.cx + ux * 10, y: this.cy + uy * 10, duration: T.attack * 1.3, onComplete: () => { this.fx(m.hit!, p.x, p.y - 6, 2.2); p.destroy(); } });
      }
    });
    this.later(T.warn + T.attack + T.back, () => this.look(x, y));
    this.dodgeAndHit(ux, uy, side, x, y, s, () => {
      // every second hit the monster dies in a Ninja smoke puff and comes back
      if (++o.hits % 2 === 0) {
        this.fx('fx-smoke', s.x, s.y);
        s.setAlpha(0);
        this.later(1600, () => this.tweens.add({ targets: s, alpha: 1, duration: 300 }));
      }
      after();
    });
  }

  private bossTurn(s: Phaser.GameObjects.Sprite, side: number, after: () => void) {
    this.cap.setText('Giant Slime: jump slam');
    const bs = s.scaleX, hx = s.x, hy = s.y;
    // it lands just beside the blob (the blob is in the ring and has to step out)
    const tx = this.cx + side * 20, ty = this.cy - 6, R = 26 * bs;
    this.look(hx, hy);
    // telegraph (0.9 s): a red rune circle grows on the landing spot, thunder over the boss
    const warn = 900;
    const rune = this.add.sprite(tx, ty + 8, 'fx-rune').play('fx-rune').setTint(0xff6050).setDepth(1).setScale(0.6).setAlpha(0.95);
    this.objs.push(rune);
    this.tweens.add({ targets: rune, scale: (R * 2.2) / 32, duration: warn, ease: 'Sine.easeOut' });
    this.later(80, () => this.fx('fx-thunder', hx - 30, hy - 40, bs * 0.8, 4));
    this.later(380, () => this.fx('fx-thunder', hx + 30, hy - 40, bs * 0.8, 4));
    this.flash(s, 4, warn / 8);
    this.later(warn - 260, () => this.tweens.add({ targets: this.blob, x: tx - side * (R + 44), y: this.cy + 30, duration: 180 }));
    this.later(warn - 300, () => {
      s.play('boss-jump');
      this.tweens.add({ targets: s, x: tx, duration: 600, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: s, y: Math.min(hy, ty) - 60, duration: 280, ease: 'Quad.easeOut', onComplete: () => this.tweens.add({ targets: s, y: ty, duration: 320, ease: 'Quad.easeIn' }) });
    });
    this.later(warn + 330, () => {
      rune.destroy();
      for (const [ox, oy] of [[-R * 0.8, 6], [R * 0.8, 6], [0, R * 0.55]]) this.fx('i-spike', tx + ox, ty + oy - 20, bs * 0.9, 2);
      this.fx('i-rock', tx, ty + 10, bs * 1.4, 4);
      this.fx('fx-dust', tx, ty + 30, bs * 1.6, 2);
      this.cameras.main.shake(140, 0.006);
    });
    this.later(warn + 800, () => {
      s.play('boss-idle');
      this.look(tx, ty);
      const bx = this.blob.x, by = this.blob.y;
      this.fx('fx-arc', (bx + tx) / 2, (by + ty) / 2, bs * 1.2, 6, (Math.atan2(ty - by, tx - bx) * 180) / Math.PI);
      this.later(60, () => s.play('boss-hit').once('animationcomplete', () => s.play('boss-idle')));
      this.flash(s, 2, 80, 0xffffff);
    });
    this.later(warn + 1400, () => {
      this.tweens.add({ targets: this.blob, x: this.cx, y: this.cy, duration: 400, ease: 'Sine.easeInOut' });
      s.play('boss-jump');
      this.tweens.add({ targets: s, x: hx, y: hy, duration: 600, ease: 'Sine.easeInOut', onComplete: () => { s.play('boss-idle'); this.later(T.gap, after); } });
    });
  }
}

/** ?demo=monsters / ?dgdemo: hide the game UI and show the Ninja monster demo full screen */
export function runDemo() {
  document.body.classList.add('ninja-demo');
  const host = document.createElement('div');
  host.id = 'ninja-demo';
  host.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#1b1622';
  document.body.append(host);
  for (const el of Array.from(document.body.children)) if (el !== host && el.tagName !== 'SCRIPT') (el as HTMLElement).style.display = 'none';
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: host,
    backgroundColor: '#1b1622',
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    render: { pixelArt: true, antialias: false, roundPixels: true },
    scene: [DemoScene],
  });
  (window as unknown as { __ninjaDemo?: Phaser.Game }).__ninjaDemo = game;
}
