// Ninja Adventure monster demo (Code 2), opened with ?demo=monsters. Standalone: not wired into the dungeon.
// Each Ninja monster loops idle -> telegraph (wind-up flash + ground line, or charge glow + aim line) ->
// dash or shot -> the target blob sidesteps -> hit flash -> every other loop a death puff and a respawn.
// Art is drawn at 3x (16 px frames -> 48 px), pixelArt / NEAREST, files and frames from docs/ART_MAP.md.
import Phaser from 'phaser';

const NA = 'assets/ninja-adventure/';
const SCALE = 3;
const TILE = 16 * SCALE;

type Kind = 'dash' | 'shot' | 'boss';
interface Mon { key: string; file: string; name: string; kind: Kind; tint?: number }
// facing columns in a 4x4 monster sheet: 0 down, 1 up, 2 left, 3 right; rows = anim frames
const MONS: Mon[] = [
  { key: 'slime3', file: 'Actor/Monster/Slime3/Slime3.png', name: 'Slime', kind: 'dash' },
  { key: 'slime2', file: 'Actor/Monster/Slime2/Slime2.png', name: 'Spitter', kind: 'shot', tint: 0x9dff7a },
  { key: 'octopus', file: 'Actor/Monster/Octopus/SpriteSheet.png', name: 'Octopus', kind: 'shot', tint: 0x9dff7a },
  { key: 'bat', file: 'Actor/Monster/BlueBat/SpriteSheet.png', name: 'Bat', kind: 'dash' },
  { key: 'skull', file: 'Actor/Monster/Skull/SpriteSheet.png', name: 'Skull', kind: 'dash' },
  { key: 'eye', file: 'Actor/Monster/Eye/Eye.png', name: 'Eye', kind: 'shot', tint: 0xffb24a },
];

const T = { idle: 1100, warn: 650, attack: 380, back: 600, hit: 450, die: 700, gone: 500 };

class DemoScene extends Phaser.Scene {
  private cells: { x: number; y: number; w: number; h: number }[] = [];
  private objs: Phaser.GameObjects.GameObject[] = [];
  private timers: Phaser.Time.TimerEvent[] = [];

  constructor() { super('ninja-demo'); }

  preload() {
    for (const m of MONS) this.load.spritesheet(m.key, NA + m.file, { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('boss-idle', NA + 'Actor/Boss/GiantSlime/Idle.png', { frameWidth: 62, frameHeight: 52 });
    this.load.spritesheet('boss-jump', NA + 'Actor/Boss/GiantSlime/Jump.png', { frameWidth: 62, frameHeight: 52 });
    this.load.spritesheet('boss-hit', NA + 'Actor/Boss/GiantSlime/Hit.png', { frameWidth: 62, frameHeight: 52 });
    this.load.spritesheet('fx-smoke', NA + 'FX/Smoke/Smoke/SpriteSheet.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('fx-cut', NA + 'FX/Attack/Cut/SpriteSheet.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('fx-dust', NA + 'FX/Smoke/SmokeCircular/SpriteSheet.png', { frameWidth: 30, frameHeight: 14 });
    this.load.spritesheet('fx-ball', NA + 'FX/Projectile/EnergyBall.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('fx-boom', NA + 'FX/Elemental/Explosion/SpriteSheet.png', { frameWidth: 40, frameHeight: 40 });
    this.load.image('floor', NA + 'Backgrounds/Tilesets/Interior/TilesetInteriorFloor.png');
  }

  create() {
    const a = this.anims;
    for (const m of MONS) for (const [d, c] of [['down', 0], ['left', 2], ['right', 3]] as const) {
      a.create({ key: `${m.key}-${d}`, frames: a.generateFrameNumbers(m.key, { frames: [c, c + 4, c + 8, c + 12] }), frameRate: 7, repeat: -1 });
    }
    a.create({ key: 'boss-idle', frames: a.generateFrameNumbers('boss-idle', {}), frameRate: 8, repeat: -1 });
    a.create({ key: 'boss-jump', frames: a.generateFrameNumbers('boss-jump', {}), frameRate: 16 });
    a.create({ key: 'boss-hit', frames: a.generateFrameNumbers('boss-hit', {}), frameRate: 14 });
    a.create({ key: 'fx-smoke', frames: a.generateFrameNumbers('fx-smoke', {}), frameRate: 12 });
    a.create({ key: 'fx-cut', frames: a.generateFrameNumbers('fx-cut', {}), frameRate: 16 });
    a.create({ key: 'fx-dust', frames: a.generateFrameNumbers('fx-dust', {}), frameRate: 16 });
    a.create({ key: 'fx-ball', frames: a.generateFrameNumbers('fx-ball', {}), frameRate: 12, repeat: -1 });
    a.create({ key: 'fx-boom', frames: a.generateFrameNumbers('fx-boom', {}), frameRate: 18 });
    this.bakeFloor();
    this.layout();
    this.scale.on('resize', () => this.layout());
  }

  /** stone-brick fill tile (TilesetInteriorFloor 192,208) tiled into one texture, 3x */
  private bakeFloor() {
    const src = this.textures.get('floor').getSourceImage() as HTMLImageElement;
    const n = 8, c = document.createElement('canvas');
    c.width = c.height = n * TILE;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) g.drawImage(src, 192, 208, 16, 16, x * TILE, y * TILE, TILE, TILE);
    this.textures.addCanvas('floor-3x', c);
  }

  private layout() {
    for (const t of this.timers) t.remove();
    for (const o of this.objs) o.destroy();
    this.timers = []; this.objs = [];
    this.tweens.killAll();
    const W = this.scale.width, H = this.scale.height, land = W > H;
    this.objs.push(this.add.tileSprite(0, 0, W, H, 'floor-3x').setOrigin(0));
    // portrait: 3 rows of 2 monsters + the boss row; landscape: 2 rows of 3 + the boss column on the right
    const head = 34;
    this.cells = [];
    if (land) {
      const bw = Math.round(W * 0.3), cw = (W - bw) / 3, ch = (H - head) / 2;
      MONS.forEach((_, i) => this.cells.push({ x: (i % 3) * cw, y: head + Math.floor(i / 3) * ch, w: cw, h: ch }));
      this.cells.push({ x: W - bw, y: head, w: bw, h: H - head });
    } else {
      const bh = Math.round((H - head) * 0.3), cw = W / 2, ch = (H - head - bh) / 3;
      MONS.forEach((_, i) => this.cells.push({ x: (i % 2) * cw, y: head + Math.floor(i / 2) * ch, w: cw, h: ch }));
      this.cells.push({ x: 0, y: H - bh, w: W, h: bh });
    }
    const g = this.add.graphics();
    this.objs.push(g);
    g.lineStyle(4, 0x1b1622, 0.9);
    for (const c of this.cells) g.strokeRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
    this.objs.push(this.add.text(W / 2, 6, 'Ninja monsters: warning first, then attack', { fontFamily: 'Fredoka, sans-serif', fontSize: '17px', color: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 0));
    MONS.forEach((m, i) => this.runMon(m, this.cells[i], i));
    this.runBoss(this.cells[MONS.length]);
  }

  private later(ms: number, fn: () => void) { this.timers.push(this.time.delayedCall(ms, fn)); }

  private label(c: { x: number; y: number; w: number; h: number }, text: string) {
    this.objs.push(this.add.text(c.x + 10, c.y + 8, text, { fontFamily: 'Fredoka, sans-serif', fontSize: '14px', color: '#ffe9a8', stroke: '#000', strokeThickness: 3 }));
  }

  /** a plain stand-in blob that sidesteps out of the attack line at the last moment */
  private dummy(x: number, y: number) {
    const b = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.25).fillEllipse(0, 14, 34, 10);
    g.fillStyle(0xff9ad5).fillCircle(0, 0, 17);
    g.fillStyle(0xffffff).fillCircle(-6, -4, 5).fillCircle(6, -4, 5);
    g.fillStyle(0x222222).fillCircle(-6, -4, 2.5).fillCircle(6, -4, 2.5);
    b.add(g);
    this.objs.push(b);
    return b;
  }

  private flash(s: Phaser.GameObjects.Sprite, times: number, ms: number, color = 0xffffff) {
    for (let k = 0; k < times; k++) {
      this.later(k * ms * 2, () => s.active && s.setTintFill(color));
      this.later(k * ms * 2 + ms, () => s.active && s.clearTint());
    }
  }

  private fx(key: string, x: number, y: number, scale = SCALE, depth = 5) {
    const f = this.add.sprite(x, y, key).setScale(scale).setDepth(depth);
    f.play(key).once('animationcomplete', () => f.destroy());
    this.objs.push(f);
  }

  private runMon(m: Mon, c: { x: number; y: number; w: number; h: number }, i: number) {
    this.label(c, `${m.name}: ${m.kind === 'dash' ? 'dash' : 'shot'}`);
    // monster on the left, blob on the right (alternate rows go the other way)
    const flip = i % 2 === 1, cy = c.y + c.h / 2 + 10;
    const mx = c.x + (flip ? c.w - 40 : 40), tx = c.x + (flip ? 42 : c.w - 42);
    const dir = flip ? 'left' : 'right';
    const s = this.add.sprite(mx, cy, m.key).setScale(SCALE).play(`${m.key}-${dir}`).setDepth(3);
    this.objs.push(s);
    const blob = this.dummy(tx, cy);
    const ground = this.add.graphics().setDepth(1);
    this.objs.push(ground);
    let loop = 0;
    const cycle = () => {
      if (!s.active) return;
      loop++;
      s.setPosition(mx, cy).setAlpha(1).setScale(SCALE).clearTint().play(`${m.key}-${dir}`);
      blob.setPosition(tx, cy);
      this.later(T.idle, () => {
        // TELEGRAPH
        s.anims.pause();
        if (m.kind === 'dash') {
          // wind-up: squash back, flash white, red danger lane on the ground
          this.tweens.add({ targets: s, scaleX: SCALE * 1.2, scaleY: SCALE * 0.8, x: mx + (flip ? 8 : -8), duration: T.warn * 0.8, ease: 'Quad.easeOut' });
          this.flash(s, 3, T.warn / 6);
          ground.clear().fillStyle(0xff3030, 0.28).fillRect(Math.min(mx, tx + (flip ? -20 : 20)), cy - 16, Math.abs(tx - mx) + 20, 32);
          ground.lineStyle(2, 0xff5050, 0.9).strokeRect(Math.min(mx, tx + (flip ? -20 : 20)), cy - 16, Math.abs(tx - mx) + 20, 32);
        } else {
          // charge: glow in the monster's colour, thin aim line to the blob
          const glow = this.add.circle(mx, cy, 10, m.tint ?? 0x9dff7a, 0.5).setDepth(2);
          this.objs.push(glow);
          this.tweens.add({ targets: glow, radius: 30, alpha: 0.15, duration: T.warn, onComplete: () => glow.destroy() });
          this.flash(s, 3, T.warn / 6, m.tint ?? 0x9dff7a);
          ground.clear().lineStyle(2, m.tint ?? 0x9dff7a, 0.9);
          for (let k = 0; k < 1; k += 0.08) ground.lineBetween(mx + (tx - mx) * k, cy, mx + (tx - mx) * Math.min(1, k + 0.05), cy);
          ground.strokeCircle(tx, cy, 20);
        }
        // the blob reads the warning and sidesteps out of the line just before the attack
        this.later(T.warn - 120, () => this.tweens.add({ targets: blob, y: cy + (loop % 2 ? -52 : 52), duration: 160, ease: 'Quad.easeOut' }));
        this.later(T.warn, () => {
          ground.clear();
          s.setScale(SCALE).anims.resume();
          if (m.kind === 'dash') {
            this.fx('fx-dust', s.x, cy + 18);
            this.tweens.add({ targets: s, x: tx, duration: T.attack, ease: 'Quad.easeIn' });
            this.later(T.attack + 40, () => this.tweens.add({ targets: s, x: mx, duration: T.back, ease: 'Sine.easeInOut' }));
          } else {
            const ball = this.add.sprite(mx, cy, 'fx-ball').setScale(SCALE * 0.7).play('fx-ball').setDepth(4);
            if (m.tint) ball.setTint(m.tint);
            this.objs.push(ball);
            this.tweens.add({ targets: ball, x: tx + (flip ? -30 : 30), duration: T.attack * 1.4, onComplete: () => { this.fx('fx-dust', ball.x, cy + 6, 2); ball.destroy(); } });
          }
          // the blob hits back: slash FX + hit flash; every other loop the monster dies in a smoke puff
          const hitAt = T.attack + T.back + 100;
          this.later(hitAt, () => {
            this.tweens.add({ targets: blob, x: mx + (flip ? -46 : 46), y: cy, duration: 220 });
            this.later(200, () => {
              this.fx('fx-cut', s.x, s.y);
              this.flash(s, 2, 70);
              this.tweens.add({ targets: s, x: mx + (flip ? 10 : -10), duration: 120, yoyo: true });
            });
            if (loop % 2 === 0) {
              this.later(200 + T.hit, () => { this.fx('fx-smoke', s.x, s.y); s.setAlpha(0); });
              this.later(200 + T.hit + T.die + T.gone, () => this.tweens.add({ targets: blob, x: tx, duration: 300, onComplete: cycle }));
            } else {
              this.later(200 + T.hit, () => this.tweens.add({ targets: blob, x: tx, duration: 300, onComplete: cycle }));
            }
          });
        });
      });
    };
    this.later(i * 180, cycle);
  }

  private runBoss(c: { x: number; y: number; w: number; h: number }) {
    this.label(c, 'Giant Slime: jump slam');
    const land = this.scale.width > this.scale.height;
    const bs = land ? 2 : Math.min(SCALE, Math.floor(c.h / 60));
    const bx = c.x + c.w / 2 + (land ? 0 : -c.w * 0.22), by = c.y + c.h * (land ? 0.32 : 0.55);
    const tx = c.x + c.w / 2 + (land ? 0 : c.w * 0.26), ty = c.y + c.h * (land ? 0.74 : 0.55);
    const s = this.add.sprite(bx, by, 'boss-idle').setScale(bs).play('boss-idle').setDepth(3);
    this.objs.push(s);
    const blob = this.dummy(tx, ty);
    const ring = this.add.graphics().setDepth(1);
    this.objs.push(ring);
    let loop = 0;
    const R = 26 * bs;
    const cycle = () => {
      if (!s.active) return;
      loop++;
      s.setPosition(bx, by).setAlpha(1).clearTint().play('boss-idle');
      blob.setPosition(tx, ty);
      this.later(T.idle, () => {
        // telegraph: a red ring grows on the ground where the boss will land (0.9 s)
        const warn = 900;
        const ringAt = { k: 0 };
        this.tweens.add({ targets: ringAt, k: 1, duration: warn, onUpdate: () => {
          ring.clear().fillStyle(0xff3030, 0.15 + 0.2 * ringAt.k).fillCircle(tx, ty, R * ringAt.k);
          ring.lineStyle(3, 0xff4040, 0.9).strokeCircle(tx, ty, R);
        } });
        this.flash(s, 4, warn / 8);
        this.later(warn - 260, () => this.tweens.add({ targets: blob, x: tx + (land ? R + 30 : -(R + 26)), y: ty + (land ? 0 : 0), duration: 180 }));
        this.later(warn - 300, () => {
          s.play('boss-jump');
          this.tweens.add({ targets: s, x: tx, duration: 600, ease: 'Sine.easeInOut' });
          this.tweens.add({ targets: s, y: ty - 40 * bs / SCALE * 2, duration: 300, yoyo: true, ease: 'Quad.easeOut', onComplete: () => s.setY(ty) });
        });
        this.later(warn + 330, () => {
          ring.clear();
          this.fx('fx-dust', tx, ty + 18 * bs / 2, bs * 1.5);
          this.cameras.main.shake(140, 0.006);
        });
        this.later(warn + 900, () => {
          s.play('boss-idle');
          this.fx('fx-cut', s.x + (land ? 20 : -20), s.y, bs * 1.2);
          this.later(60, () => s.play('boss-hit').once('animationcomplete', () => s.play('boss-idle')));
          this.flash(s, 2, 80);
        });
        if (loop % 2 === 0) {
          this.later(warn + 1500, () => { this.fx('fx-boom', s.x, s.y, bs * 1.4); this.later(150, () => this.fx('fx-smoke', s.x, s.y, bs * 2)); s.setAlpha(0); });
          this.later(warn + 1500 + T.die + T.gone + 400, () => this.tweens.add({ targets: s, x: bx, y: by, duration: 1, onComplete: () => { s.setAlpha(0); this.tweens.add({ targets: s, alpha: 1, duration: 300, onComplete: cycle }); } }));
        } else {
          this.later(warn + 1500, () => this.tweens.add({ targets: s, x: bx, y: by, duration: 700, ease: 'Sine.easeInOut', onComplete: cycle }));
        }
      });
    };
    this.later(300, cycle);
  }
}

/** ?demo=monsters: hide the game UI and show the Ninja monster demo full screen */
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
