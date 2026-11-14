// Ninja Adventure monster demo (Code 2), opened with ?demo=monsters or ?dgdemo. Standalone: not wired into the dungeon.
// Top-down like the real dungeon: one room, the blobz v2 test blob in the middle, six Ninja monsters around it.
// They attack in turns (then the Giant Slime): telegraph -> dash or shot -> the blob sidesteps across the line ->
// glides in and hits back (star spark + slash + knockback + shake + hit-stop) -> every second hit the monster dies.
// Telegraphs: dash = big red chevrons along the path (Slime and Skull then keep the pressure on with a short second
// wind-up and a lunge + bite where they land; the Bat hits and runs); shot = a thin dotted line of many small sparks
// in the shot's colour + a small rune on the target, then a burst of 3 small shots; boss = crouch, leap out of view,
// red chevrons close in on a growing red rune where it crashes. Only Ninja FX sprites; code draws only the tint
// flash. Art at 3x, pixelArt, files from docs/ART_MAP.md.
import Phaser from 'phaser';
import { blobCanvas, BLOB_FRAMES, BODY_CY, clampLook, COLORS } from './blob';

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
  ['fx-claw', 'FX/Attack/Claw/SpriteSheet.png', 32, 32, 18, false],
  ['fx-star', 'FX/Magic/Circle/SpriteSheetSpark.png', 32, 32, 20, false],
  ['fx-boost', 'FX/Magic/Boost/SpriteSheet.png', 53, 35, 14, true],
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
interface Mon { key: string; file: string; name: string; kind: Kind; ang: number; shot?: string; hit?: string; col?: number; stay?: boolean }
// spread around the blob (deg, screen y down): diagonals above, sides, diagonals below; the boss drops in from above
const MONS: Mon[] = [
  { key: 'bat', file: 'Actor/Monster/BlueBat/SpriteSheet.png', name: 'Bat', kind: 'dash', ang: -140 },
  { key: 'octopus', file: 'Actor/Monster/Octopus/SpriteSheet.png', name: 'Octopus', kind: 'shot', ang: 65, shot: 'p-ball', hit: 'i-water', col: 0x6fe3ff },
  { key: 'slime3', file: 'Actor/Monster/Slime3/Slime3.png', name: 'Slime', kind: 'dash', ang: 10, stay: true },
  { key: 'eye', file: 'Actor/Monster/Eye/Eye.png', name: 'Eye', kind: 'shot', ang: -40, shot: 'p-fire', hit: 'i-flam', col: 0xffa040 },
  { key: 'skull', file: 'Actor/Monster/Skull/SpriteSheet.png', name: 'Skull', kind: 'dash', ang: 115, stay: true },
  { key: 'slime2', file: 'Actor/Monster/Slime2/Slime2.png', name: 'Spitter', kind: 'shot', ang: 170, shot: 'p-plant', hit: 'i-plant', col: 0x9dff5a },
];
const DIRS = ['down', 'up', 'left', 'right'] as const;
/** sheet column for a facing: 0 down, 1 up, 2 left, 3 right */
const facing = (dx: number, dy: number) => (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : dy < 0 ? 1 : 0);

const T = { warn: 650, attack: 380, back: 500, gap: 350 };
const BLOB_SCALE = 3; // blobz v2, same as the meadow and the dungeon

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
    // blobz v2 test blob: frame 0 idle, 1 glide; mirrored (flipX) when facing left
    const look = clampLook({ color: COLORS[1], shape: 0, eyes: 0, mouth: 0, hat: 2 });
    for (let f = 0; f < BLOB_FRAMES; f++) this.textures.addCanvas(`demo-blob-${f}`, blobCanvas(look, 1, undefined, undefined, f))!.setFilter(Phaser.Textures.FilterMode.NEAREST);
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
    this.blob = this.add.image(this.cx, this.cy, 'demo-blob-0').setOrigin(0.5, BODY_CY).setScale(BLOB_SCALE).setDepth(3);
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

  /** the blob turns toward a point (blobz v2 only mirrors left/right) */
  private look(x: number, y: number) {
    if (Math.abs(x - this.blob.x) > 4) this.blob.setFlipX(x < this.blob.x);
  }

  /** the blob glides: glide frame + facing the way it moves, idle frame when it stops */
  private glide(x: number, y: number, duration: number, ease = 'Sine.easeInOut', done?: () => void) {
    this.look(x, y);
    this.blob.setTexture('demo-blob-1');
    this.tweens.add({ targets: this.blob, x, y, duration, ease, onComplete: () => { this.blob.setTexture('demo-blob-0'); done?.(); } });
  }

  /** hit-stop: freeze tweens, animations and timers for a few frames so a hit lands with weight */
  private hitStop(ms: number) {
    this.tweens.pauseAll(); this.anims.pauseAll(); this.time.paused = true;
    window.setTimeout(() => { if (!this.sys.isActive()) return; this.tweens.resumeAll(); this.anims.resumeAll(); this.time.paused = false; }, ms);
  }

  /** a punchy hit on a monster: big star spark + slash + knockback + white flash + small shake + hit-stop */
  private punch(target: Phaser.GameObjects.Sprite, fromX: number, fromY: number, big = 1) {
    const ang = Math.atan2(target.y - fromY, target.x - fromX), deg = (ang * 180) / Math.PI;
    this.fx('fx-star', target.x, target.y - 4, 3 * big, 7);
    this.fx('fx-arc', (fromX + target.x) / 2, (fromY + target.y) / 2, 2.8 * big, 6, deg);
    this.flash(target, 2, 70, 0xffffff);
    this.tweens.add({ targets: target, x: target.x + Math.cos(ang) * 18 * big, y: target.y + Math.sin(ang) * 18 * big, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
    this.cameras.main.shake(110, 0.004 * big);
    this.hitStop(70 * big);
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
    this.later(T.warn - 120, () => this.glide(sx, sy, 160, 'Quad.easeOut'));
    this.later(T.warn + T.attack + T.back + extra, () => {
      // glide in toward wherever the attacker is now (it may have stayed where its dash ended)
      tx = target.x; ty = target.y;
      const vx = tx - this.blob.x, vy = ty - this.blob.y, vl = Math.hypot(vx, vy) || 1;
      const hx = tx - (vx / vl) * 46, hy = ty - (vy / vl) * 46;
      this.glide(hx, hy, 240);
      this.later(230, () => { this.look(tx, ty); this.punch(target, hx, hy); });
      this.later(560, () => this.glide(this.cx, this.cy, 300, 'Sine.easeInOut', () => this.later(T.gap, after)));
    });
  }

  private monTurn(o: { m: Mon; s: Phaser.GameObjects.Sprite; x: number; y: number; hits: number }, side: number, after: () => void) {
    const { m, s, x, y } = o;
    this.cap.setText(`${m.name}: ${m.kind === 'shot' ? 'burst of 3 shots' : m.stay ? 'dash + bite' : 'dash, hit and run'}`);
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
      // charge: a small shot swells at the mouth, then a THIN dotted line of many small sparks in the shot's colour
      // runs out to the blob (clearly unlike the big dash chevrons), and a small rune in that colour marks the target
      const col = m.col ?? 0xffffff;
      this.tweens.add({ targets: s, x: x - ux * 6, y: y - uy * 6, duration: T.warn * 0.8, ease: 'Quad.easeOut' });
      const orb = this.add.sprite(x + ux * 24, y + uy * 24, m.shot!).play(m.shot!).setAngle(deg).setScale(0.3).setDepth(4);
      this.objs.push(orb);
      this.tweens.add({ targets: orb, scale: 1.6, duration: T.warn * 0.85, ease: 'Back.easeOut' });
      this.later(T.warn, () => orb.destroy());
      this.hold('fx-boost', x, y - 8, T.warn, 1.1, 4);
      const n = Math.floor((L - 30) / 13);
      for (let k = 1; k <= n; k++) {
        const t0 = (k - 1) * ((T.warn * 0.4) / n);
        this.later(t0, () => {
          const d = this.hold('fx-dot', x + ux * (24 + k * 13), y + uy * (24 + k * 13), T.warn - t0, 1.9, 1, 1, deg).setTint(col);
          this.tweens.add({ targets: d, alpha: 0.6, duration: 120, yoyo: true, repeat: -1, delay: (k % 4) * 60 });
        });
      }
      const mark = this.hold('fx-rune', this.cx, this.cy + 6, T.warn, 1.4, 1, 0.95).setTint(col);
      this.tweens.add({ targets: mark, angle: 180, duration: T.warn });
      this.flash(s, 3, T.warn / 6, col);
    }
    this.later(T.warn, () => {
      s.setScale(SCALE).anims.resume();
      if (m.kind === 'dash') {
        const ex = this.cx + ux * 30, ey = this.cy + uy * 30;
        this.fx('fx-dust', s.x, s.y + 18);
        this.tweens.add({ targets: s, x: ex, y: ey, duration: T.attack, ease: 'Quad.easeIn' });
        this.later(T.attack - 60, () => this.fx('fx-dust', ex, ey + 18, 2.4));
        if (!m.stay) this.later(T.attack + 40, () => this.tweens.add({ targets: s, x, y, duration: T.back, ease: 'Sine.easeInOut' })); // hit and run
      } else {
        // a burst of 3 small shots, aimed where the blob stood
        for (let k = 0; k < 3; k++) this.later(k * 110, () => {
          const spread = (k - 1) * 0.09, a = Math.atan2(uy, ux) + spread, vx = Math.cos(a), vy = Math.sin(a);
          const p = this.add.sprite(x + vx * 24, y + vy * 24, m.shot!).setScale(1.6).setAngle((a * 180) / Math.PI).play(m.shot!).setDepth(4);
          this.objs.push(p);
          this.cameras.main.shake(40, 0.0015);
          let tr = 0;
          this.tweens.add({
            targets: p, x: x + vx * (L + 20), y: y + vy * (L + 20), duration: T.attack * 1.1, ease: 'Linear',
            onUpdate: () => {
              if (++tr % 4) return; // a short trail of small sparks in the shot's colour
              const d = this.add.sprite(p.x, p.y, 'fx-dot').play('fx-dot').setScale(1.4).setDepth(3).setTint(m.col ?? 0xffffff);
              this.objs.push(d);
              this.tweens.add({ targets: d, alpha: 0, scale: 0.6, duration: 220, onComplete: () => d.destroy() });
            },
            onComplete: () => { this.fx(m.hit!, p.x, p.y - 6, 1.8); p.destroy(); },
          });
        });
      }
    });
    // most dashers keep the pressure on where they land: a short second wind-up, then a lunge + bite at the blob's
    // new spot (the blob steps away again); then it is hit there and walks back. The bat hits and runs.
    let extra = m.kind === 'shot' ? 200 : 0;
    if (m.kind === 'dash' && m.stay) {
      extra = 420;
      const t1 = T.warn + T.attack + 120, w2 = 380;
      this.later(t1, () => {
        const ex = s.x, ey = s.y, bx = this.blob.x, by = this.blob.y;
        const vx = bx - ex, vy = by - ey, vl = Math.hypot(vx, vy) || 1, wx = vx / vl, wy = vy / vl, d2 = (Math.atan2(vy, vx) * 180) / Math.PI;
        s.play(`${m.key}-${DIRS[facing(vx, vy)]}`).anims.pause();
        this.look(ex, ey);
        this.hold('fx-spark', ex, ey - 14, w2, 1.3, 4);
        for (let k = 1; k <= 3; k++) this.later((k - 1) * 50, () => {
          const c = this.add.sprite(ex + wx * (10 + k * 22), ey + wy * (10 + k * 22), 'fx-thunder', 2).setScale(1.1).setAngle(d2).setTint(0xff5a40).setDepth(1);
          this.objs.push(c);
          this.later(w2 - (k - 1) * 50, () => c.destroy());
        });
        this.flash(s, 2, w2 / 4);
        // the blob steps away across the lunge just in time
        this.later(w2 - 110, () => this.glide(bx - wy * 58 * side, by + wx * 58 * side, 150, 'Quad.easeOut'));
        this.later(w2, () => {
          s.anims.resume();
          this.tweens.add({ targets: s, x: bx - wx * 6, y: by - wy * 6, duration: 170, ease: 'Quad.easeIn' });
          this.later(150, () => { this.fx('fx-claw', bx, by - 4, 2.6, 6, d2); this.cameras.main.shake(70, 0.003); });
        });
      });
    }
    this.later(T.warn + T.attack + T.back + extra - 40, () => this.look(s.x, s.y));
    this.dodgeAndHit(ux, uy, side, x, y, s, () => {
      if (m.stay) this.tweens.add({ targets: s, x, y, duration: 450, ease: 'Sine.easeInOut' });
      // every second hit the monster dies in a Ninja smoke puff and comes back
      if (++o.hits % 2 === 0) {
        this.fx('i-boom', s.x, s.y, 2, 6);
        this.fx('fx-smoke', s.x, s.y, 4, 7);
        this.fx('fx-star', s.x, s.y, 4, 7);
        this.cameras.main.shake(140, 0.006);
        this.hitStop(110);
        this.tweens.add({ targets: s, scale: SCALE * 1.4, alpha: 0, duration: 140 });
        this.later(1600, () => { s.setScale(SCALE); this.tweens.add({ targets: s, alpha: 1, duration: 300 }); });
      }
      after();
    }, extra);
  }

  private bossTurn(s: Phaser.GameObjects.Sprite, side: number, after: () => void) {
    this.cap.setText('Giant Slime: jump slam');
    const bs = s.scaleX, hx = s.x, hy = s.y;
    // it lands just beside the blob (the blob stands in the marked zone and has to get out)
    const tx = this.cx + side * 20, ty = this.cy - 6, R = 26 * bs;
    this.look(hx, hy);
    const warn = 1000;
    // crouch + thunder: it is about to jump
    this.tweens.add({ targets: s, scaleX: bs * 1.15, scaleY: bs * 0.8, duration: 260, yoyo: true, ease: 'Quad.easeOut' });
    this.fx('fx-thunder', hx - 30, hy - 40, bs * 0.8, 4);
    this.later(160, () => this.fx('fx-thunder', hx + 30, hy - 40, bs * 0.8, 4));
    this.flash(s, 2, 90);
    // it leaps out of view ...
    this.later(330, () => {
      s.play('boss-jump');
      this.fx('fx-dust', hx, hy + 24, bs * 1.4, 2);
      this.tweens.add({ targets: s, y: -160, scale: bs * 1.3, duration: 320, ease: 'Quad.easeIn' });
    });
    // ... and the landing zone lights up: a red rune grows, red chevrons close in from all sides
    const rune = this.add.sprite(tx, ty + 8, 'fx-rune').play('fx-rune').setTint(0xff4030).setDepth(1).setScale(0.6).setAlpha(0.95);
    this.objs.push(rune);
    this.tweens.add({ targets: rune, scale: (R * 2.6) / 32, angle: 120, duration: warn, ease: 'Sine.easeOut' });
    const chev: Phaser.GameObjects.Sprite[] = [];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2, c = this.add.sprite(tx + Math.cos(a) * R * 2, ty + 8 + Math.sin(a) * R * 1.4, 'fx-thunder', 2)
        .setScale(1.5).setAngle((a * 180) / Math.PI + 180).setTint(0xff4030).setDepth(1).setAlpha(0);
      this.objs.push(c); chev.push(c);
      this.tweens.add({ targets: c, alpha: 1, x: tx + Math.cos(a) * R * 1.25, y: ty + 8 + Math.sin(a) * R * 0.9, duration: warn * 0.8, delay: 120, ease: 'Sine.easeIn' });
    }
    this.later(warn - 240, () => this.glide(tx - side * (R + 52), this.cy + 30, 190, 'Quad.easeOut'));
    // the crash: it falls onto the zone, rock spikes burst out, big shake + hit-stop
    this.later(warn - 200, () => { s.setPosition(tx, -160).setScale(bs * 1.3); this.tweens.add({ targets: s, y: ty, scale: bs, duration: 200, ease: 'Quad.easeIn' }); });
    this.later(warn, () => {
      rune.destroy(); chev.forEach((c) => c.destroy());
      s.play('boss-idle');
      for (const [ox, oy] of [[-R, 4], [R, 4], [-R * 0.5, R * 0.6], [R * 0.5, R * 0.6], [0, -R * 0.4]]) this.fx('i-spike', tx + ox, ty + oy - 20, bs * 0.9, 2);
      this.fx('i-rock', tx, ty + 10, bs * 1.6, 4);
      this.fx('fx-dust', tx, ty + 30, bs * 2, 2);
      this.cameras.main.shake(280, 0.014);
      this.hitStop(110);
    });
    // the blob hits back
    this.later(warn + 650, () => {
      this.look(tx, ty);
      this.later(60, () => s.play('boss-hit').once('animationcomplete', () => s.play('boss-idle')));
      this.punch(s, this.blob.x, this.blob.y, 1.4);
    });
    this.later(warn + 1250, () => {
      this.glide(this.cx, this.cy, 400);
      s.play('boss-jump');
      this.tweens.add({ targets: s, x: hx, y: hy, duration: 600, ease: 'Sine.easeInOut', onComplete: () => { s.setScale(bs).play('boss-idle'); this.later(T.gap, after); } });
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
