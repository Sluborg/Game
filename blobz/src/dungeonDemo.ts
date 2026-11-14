// Ninja Adventure monster demo (Code 2), opened with ?demo=monsters or ?dgdemo. Standalone: not wired into the dungeon.
// Each Ninja monster loops idle -> telegraph -> dash or shot -> the target blob sidesteps -> hit -> every other loop a
// death puff and a respawn. Every effect is a Ninja FX sprite (no code-drawn shapes besides a tint flash and the
// stand-in blob): dash wind-up = aura + sparks on the monster and a row of red chevrons (Thunder frame) along the path; shot = a rune
// circle at the mouth, spark dots along the aim, a Ninja projectile and an elemental impact; boss = a rune circle
// on the landing spot that grows, then rock spikes + rock burst + dust. Art at 3x, pixelArt, files from docs/ART_MAP.md.
import Phaser from 'phaser';

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
interface Mon { key: string; file: string; name: string; kind: Kind; shot?: string; hit?: string; flip?: boolean }
const MONS: Mon[] = [
  { key: 'slime3', file: 'Actor/Monster/Slime3/Slime3.png', name: 'Slime', kind: 'dash' },
  { key: 'slime2', file: 'Actor/Monster/Slime2/Slime2.png', name: 'Spitter', kind: 'shot', shot: 'p-plant', hit: 'i-plant', flip: true },
  { key: 'octopus', file: 'Actor/Monster/Octopus/SpriteSheet.png', name: 'Octopus', kind: 'shot', shot: 'p-ball', hit: 'i-water' },
  { key: 'bat', file: 'Actor/Monster/BlueBat/SpriteSheet.png', name: 'Bat', kind: 'dash' },
  { key: 'skull', file: 'Actor/Monster/Skull/SpriteSheet.png', name: 'Skull', kind: 'dash' },
  { key: 'eye', file: 'Actor/Monster/Eye/Eye.png', name: 'Eye', kind: 'shot', shot: 'p-fire', hit: 'i-flam', flip: true },
];

const T = { idle: 1100, warn: 650, attack: 380, back: 600, hit: 450, die: 700, gone: 500 };
type Cell = { x: number; y: number; w: number; h: number };

class DemoScene extends Phaser.Scene {
  private cells: Cell[] = [];
  private objs: Phaser.GameObjects.GameObject[] = [];
  private timers: Phaser.Time.TimerEvent[] = [];

  constructor() { super('ninja-demo'); }

  preload() {
    for (const m of MONS) this.load.spritesheet(m.key, NA + m.file, { frameWidth: 16, frameHeight: 16 });
    for (const a of ['Idle', 'Jump', 'Hit']) this.load.spritesheet(`boss-${a.toLowerCase()}`, NA + `Actor/Boss/GiantSlime/${a}.png`, { frameWidth: 62, frameHeight: 52 });
    for (const [k, f, w, h] of FX) this.load.spritesheet(k, NA + f, { frameWidth: w, frameHeight: h });
    this.load.image('floor', NA + 'Backgrounds/Tilesets/Interior/TilesetInteriorFloor.png');
  }

  create() {
    const a = this.anims;
    for (const m of MONS) for (const [d, c] of [['left', 2], ['right', 3]] as const) {
      a.create({ key: `${m.key}-${d}`, frames: a.generateFrameNumbers(m.key, { frames: [c, c + 4, c + 8, c + 12] }), frameRate: 7, repeat: -1 });
    }
    a.create({ key: 'boss-idle', frames: a.generateFrameNumbers('boss-idle', {}), frameRate: 8, repeat: -1 });
    a.create({ key: 'boss-jump', frames: a.generateFrameNumbers('boss-jump', {}), frameRate: 16 });
    a.create({ key: 'boss-hit', frames: a.generateFrameNumbers('boss-hit', {}), frameRate: 14 });
    for (const [k, , , , fps, loop] of FX) a.create({ key: k, frames: a.generateFrameNumbers(k, {}), frameRate: fps, repeat: loop ? -1 : 0 });
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
    this.objs.push(this.add.text(W / 2, 6, 'Ninja monsters: warning first, then attack', { fontFamily: 'Fredoka, sans-serif', fontSize: '17px', color: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 0));
    MONS.forEach((m, i) => this.runMon(m, this.cells[i], i));
    this.runBoss(this.cells[MONS.length]);
  }

  private later(ms: number, fn: () => void) { this.timers.push(this.time.delayedCall(ms, fn)); }

  private label(c: Cell, text: string) {
    this.objs.push(this.add.text(c.x + 10, c.y + 8, text, { fontFamily: 'Fredoka, sans-serif', fontSize: '14px', color: '#ffe9a8', stroke: '#000', strokeThickness: 3 }));
  }

  /** the stand-in blob (blobz are drawn in code); it sidesteps out of the attack at the last moment */
  private dummy(x: number, y: number) {
    const b = this.add.container(x, y).setDepth(3);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.25).fillEllipse(0, 14, 34, 10);
    g.fillStyle(0xff9ad5).fillCircle(0, 0, 17);
    g.fillStyle(0xffffff).fillCircle(-6, -4, 5).fillCircle(6, -4, 5);
    g.fillStyle(0x222222).fillCircle(-6, -4, 2.5).fillCircle(6, -4, 2.5);
    b.add(g);
    this.objs.push(b);
    return b;
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
  private hold(key: string, x: number, y: number, ms: number, scale = SCALE, depth = 2, alpha = 1) {
    const f = this.add.sprite(x, y, key).setScale(scale).setDepth(depth).setAlpha(alpha).play(key);
    this.objs.push(f);
    this.later(ms, () => this.tweens.add({ targets: f, alpha: 0, duration: 120, onComplete: () => f.destroy() }));
    return f;
  }

  private runMon(m: Mon, c: Cell, i: number) {
    this.label(c, `${m.name}: ${m.kind === 'dash' ? 'dash' : 'shot'}`);
    // monster and blob face each other; every second cell is mirrored
    const flip = i % 2 === 1, cy = c.y + c.h / 2 + 10, dx = flip ? -1 : 1;
    const mx = c.x + (flip ? c.w - 40 : 40), tx = c.x + (flip ? 42 : c.w - 42);
    const dir = flip ? 'left' : 'right';
    const s = this.add.sprite(mx, cy, m.key).setScale(SCALE).play(`${m.key}-${dir}`).setDepth(3);
    this.objs.push(s);
    const blob = this.dummy(tx, cy);
    let loop = 0;
    const cycle = () => {
      if (!s.active) return;
      loop++;
      s.setPosition(mx, cy).setAlpha(1).setScale(SCALE).clearTint().play(`${m.key}-${dir}`);
      blob.setPosition(tx, cy);
      this.later(T.idle, () => {
        s.anims.pause();
        if (m.kind === 'dash') {
          // wind-up: squash back + pink aura and gold sparks on the monster, red chevrons light up along the path
          this.tweens.add({ targets: s, scaleX: SCALE * 1.15, scaleY: SCALE * 0.85, x: mx - dx * 8, duration: T.warn * 0.8, ease: 'Quad.easeOut' });
          this.hold('fx-aura', mx - dx * 6, cy - 6, T.warn, 2.4, 2);
          this.hold('fx-spark', mx, cy - 14, T.warn, 1.6, 4);
          const n = Math.max(3, Math.floor((Math.abs(tx - mx) - 30) / 30));
          for (let k = 1; k <= n; k++) {
            this.later((k - 1) * (T.warn * 0.5 / n), () => {
              const a = this.add.sprite(mx + dx * (20 + k * 30), cy + 8, 'fx-thunder', 2).setScale(1.3).setFlipX(flip).setTint(0xff5a40).setDepth(1).setAlpha(0.95);
              this.objs.push(a);
              this.tweens.add({ targets: a, alpha: 0.4, duration: 120, yoyo: true, repeat: 2 });
              this.later(T.warn - (k - 1) * (T.warn * 0.5 / n), () => a.destroy());
            });
          }
          this.flash(s, 3, T.warn / 6);
        } else {
          // charge: a rune circle at the mouth, spark dots run along the aim line to the blob
          this.hold('fx-rune', mx + dx * 22, cy - 4, T.warn, 1.6, 4);
          const n = Math.max(3, Math.floor((Math.abs(tx - mx) - 40) / 26));
          for (let k = 1; k <= n; k++) this.later((k - 1) * 40, () => this.hold('fx-dot', mx + dx * (28 + k * 26), cy, T.warn - (k - 1) * 40, 2.4, 1, 0.9));
          this.hold('fx-ring', tx, cy, T.warn, 1.8, 1, 0.9);
          this.flash(s, 3, T.warn / 6, 0xfff0a0);
        }
        // the blob reads the warning and sidesteps out of the line just before the attack
        this.later(T.warn - 120, () => this.tweens.add({ targets: blob, y: cy + (loop % 2 ? -52 : 52), duration: 160, ease: 'Quad.easeOut' }));
        this.later(T.warn, () => {
          s.setScale(SCALE).anims.resume();
          if (m.kind === 'dash') {
            this.fx('fx-dust', s.x, cy + 18);
            this.tweens.add({ targets: s, x: tx, duration: T.attack, ease: 'Quad.easeIn' });
            this.later(T.attack - 60, () => this.fx('fx-dust', tx, cy + 18, 2.4));
            this.later(T.attack + 40, () => this.tweens.add({ targets: s, x: mx, duration: T.back, ease: 'Sine.easeInOut' }));
          } else {
            const p = this.add.sprite(mx + dx * 20, cy, m.shot!).setScale(2.4).setFlipX(flip).play(m.shot!).setDepth(4);
            this.objs.push(p);
            this.tweens.add({ targets: p, x: tx + dx * 6, duration: T.attack * 1.4, onComplete: () => { this.fx(m.hit!, p.x, cy - 6, 2.2); p.destroy(); } });
          }
          // the blob hits back: Ninja slash + hit flash; every other loop the monster dies in a smoke puff
          const hitAt = T.attack + T.back + 100;
          this.later(hitAt, () => {
            this.tweens.add({ targets: blob, x: mx + dx * 46, y: cy, duration: 220 });
            this.later(200, () => {
              this.fx('fx-arc', s.x, s.y, 2.4, 5, flip ? 90 : -90);
              this.flash(s, 2, 70, 0xffffff);
              this.tweens.add({ targets: s, x: mx - dx * 10, duration: 120, yoyo: true });
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

  private runBoss(c: Cell) {
    this.label(c, 'Giant Slime: jump slam');
    const land = this.scale.width > this.scale.height;
    const bs = land ? 2 : Math.min(SCALE, Math.floor(c.h / 60));
    const bx = c.x + c.w / 2 + (land ? 0 : -c.w * 0.22), by = c.y + c.h * (land ? 0.32 : 0.55);
    const tx = c.x + c.w / 2 + (land ? 0 : c.w * 0.26), ty = c.y + c.h * (land ? 0.74 : 0.55);
    const s = this.add.sprite(bx, by, 'boss-idle').setScale(bs).play('boss-idle').setDepth(3);
    this.objs.push(s);
    const blob = this.dummy(tx, ty);
    let loop = 0;
    const R = 26 * bs;
    const cycle = () => {
      if (!s.active) return;
      loop++;
      s.setPosition(bx, by).setAlpha(1).clearTint().play('boss-idle');
      blob.setPosition(tx, ty);
      this.later(T.idle, () => {
        // telegraph (0.9 s): a red rune circle grows on the landing spot, thunder sparks over the boss
        const warn = 900;
        const rune = this.add.sprite(tx, ty + 6, 'fx-rune').play('fx-rune').setTint(0xff6050).setDepth(1).setScale(0.6).setAlpha(0.95);
        this.objs.push(rune);
        this.tweens.add({ targets: rune, scale: (R * 2) / 32, duration: warn, ease: 'Sine.easeOut' });
        this.later(80, () => this.fx('fx-thunder', s.x - 24, s.y - 30 * bs / 2, bs * 0.8, 4));
        this.later(380, () => this.fx('fx-thunder', s.x + 24, s.y - 30 * bs / 2, bs * 0.8, 4));
        this.flash(s, 4, warn / 8);
        this.later(warn - 260, () => this.tweens.add({ targets: blob, x: tx + (land ? R + 30 : -(R + 26)), duration: 180 }));
        this.later(warn - 300, () => {
          s.play('boss-jump');
          this.tweens.add({ targets: s, x: tx, duration: 600, ease: 'Sine.easeInOut' });
          this.tweens.add({ targets: s, y: ty - 40 * bs / SCALE * 2, duration: 300, yoyo: true, ease: 'Quad.easeOut', onComplete: () => s.setY(ty) });
        });
        this.later(warn + 330, () => {
          rune.destroy();
          // impact: rock spikes burst out around the landing, rock chunks + a dust ring
          for (const [ox, oy] of [[-R * 0.8, 6], [R * 0.8, 6], [0, R * 0.5]]) this.fx('i-spike', tx + ox, ty + oy - 20, bs * 0.9, 2);
          this.fx('i-rock', tx, ty + 10, bs * 1.4, 4);
          this.fx('fx-dust', tx, ty + 18 * bs / 2, bs * 1.6, 2);
          this.cameras.main.shake(140, 0.006);
        });
        this.later(warn + 900, () => {
          s.play('boss-idle');
          this.fx('fx-arc', s.x + (land ? 20 : -20), s.y, bs * 1.2, 5, land ? 90 : -90);
          this.later(60, () => s.play('boss-hit').once('animationcomplete', () => s.play('boss-idle')));
          this.flash(s, 2, 80, 0xffffff);
        });
        if (loop % 2 === 0) {
          this.later(warn + 1500, () => { this.fx('i-boom', s.x, s.y, bs * 1.4); this.later(150, () => this.fx('fx-smoke', s.x, s.y, bs * 2)); s.setAlpha(0); });
          this.later(warn + 1500 + T.die + T.gone + 400, () => { s.setPosition(bx, by); this.tweens.add({ targets: s, alpha: 1, duration: 300, onComplete: cycle }); });
        } else {
          this.later(warn + 1500, () => this.tweens.add({ targets: s, x: bx, y: by, duration: 700, ease: 'Sine.easeInOut', onComplete: cycle }));
        }
      });
    };
    this.later(300, cycle);
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
