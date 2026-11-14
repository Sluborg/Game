// Animated title backdrop: a little Kenney meadow with blobz gliding around.
import { COLORS, drawTile, pixelBlob, PIXEL_H, PIXEL_W, type SheetKey } from './art';

const S = 3; // pixel scale
const T = 16 * S;

interface Glider { x: number; y: number; vx: number; vy: number; img: HTMLCanvasElement | null; t: number }

export class IntroBackdrop {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ground: HTMLCanvasElement | null = null;
  private blobs: Glider[] = [];
  private running = false;
  private last = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    window.addEventListener('resize', () => this.resize());
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.resize();
    if (!this.blobs.length) {
      this.blobs = COLORS.slice(0, 5).map((c, i) => ({
        x: Math.random() * this.canvas.width, y: Math.random() * this.canvas.height,
        vx: (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 60), vy: (Math.random() - 0.5) * 90,
        img: pixelBlob(c, i), t: Math.random() * 10,
      }));
    }
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  stop() { this.running = false; }

  /** Re-render skins once the sprite sheet is loaded. */
  refresh() {
    this.blobs.forEach((b, i) => { b.img = pixelBlob(COLORS[i], i); });
    this.ground = null;
    this.resize();
  }

  private resize() {
    const dpr = 1; // pixel art: keep 1:1, CSS scales crisply
    this.canvas.width = Math.ceil(window.innerWidth * dpr);
    this.canvas.height = Math.ceil(window.innerHeight * dpr);
    this.ground = this.buildGround();
  }

  private buildGround(): HTMLCanvasElement | null {
    const w = this.canvas.width, h = this.canvas.height;
    const g = document.createElement('canvas');
    g.width = w; g.height = h;
    const ctx = g.getContext('2d')!;
    let seed = 7;
    const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    let ok = true;
    for (let y = 0; y < h; y += T) for (let x = 0; x < w; x += T) {
      const v = r();
      ok = drawTile(ctx, 'town', v < 0.7 ? 0 : v < 0.9 ? 1 : 2, x, y, S) && ok;
    }
    if (!ok) return null;
    const deco: [SheetKey, number][] = [['town', 16], ['town', 28], ['town', 27], ['town', 5], ['farm', 83], ['farm', 39], ['town', 29]];
    const n = Math.round((w * h) / 26000);
    for (let i = 0; i < n; i++) {
      const [k, f] = deco[Math.floor(r() * deco.length)];
      drawTile(ctx, k, f, Math.floor(r() * (w - T)), Math.floor(r() * (h - T)), S);
    }
    return g;
  }

  private frame = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const { ctx, canvas } = this;
    if (this.ground) ctx.drawImage(this.ground, 0, 0);
    else { ctx.fillStyle = '#5aa83a'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.imageSmoothingEnabled = false;
    const bw = PIXEL_W * S, bh = PIXEL_H * S;
    for (const b of this.blobs) {
      b.t += dt;
      // gentle steering keeps them gliding in curves
      b.vx += Math.cos(b.t * 0.7) * 20 * dt;
      b.vy += Math.sin(b.t * 0.9) * 20 * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < 0 || b.x > canvas.width - bw) { b.vx *= -1; b.x = Math.max(0, Math.min(canvas.width - bw, b.x)); }
      if (b.y < 0 || b.y > canvas.height - bh) { b.vy *= -1; b.y = Math.max(0, Math.min(canvas.height - bh, b.y)); }
      const hover = Math.sin(b.t * 5) * 3;
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(b.x + bw / 2, b.y + bh - 6, bw * 0.32, 6, 0, 0, Math.PI * 2); ctx.fill();
      if (b.img) ctx.drawImage(b.img, Math.round(b.x), Math.round(b.y + hover), bw, bh);
    }
    requestAnimationFrame(this.frame);
  };
}
