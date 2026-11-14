// Floating thumbstick (touch anywhere on the left/middle of the screen),
// a big dash button, plus keyboard (WASD / arrows + space) for desktop.
import type { Input } from './sim';

export class Controls {
  private sx = 0; private sy = 0;
  private kx = 0; private ky = 0;
  private dashCount = 0;
  private stickId: number | null = null;
  private ox = 0; private oy = 0;
  private keys = new Set<string>();
  onDash: () => void = () => {};
  readonly stick = document.getElementById('stick')!;
  readonly knob = document.getElementById('knob')!;
  readonly dashBtn = document.getElementById('dash')!;
  private readonly R = 56;

  constructor() {
    window.addEventListener('pointerdown', this.down, { passive: false });
    window.addEventListener('pointermove', this.move, { passive: false });
    window.addEventListener('pointerup', this.up);
    window.addEventListener('pointercancel', this.up);
    this.dashBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.dash(); });
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.code === 'Space' && !e.repeat) this.dash();
      this.keys.add(e.code);
      this.updateKeys();
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); this.updateKeys(); });
    window.addEventListener('blur', () => { this.keys.clear(); this.updateKeys(); this.release(); });
  }

  private active() { return !document.getElementById('hud')!.classList.contains('hidden'); }

  private dash() {
    if (!this.active()) return;
    this.dashCount++;
    this.onDash();
  }

  private updateKeys() {
    const k = this.keys;
    this.kx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    this.ky = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
  }

  private down = (e: PointerEvent) => {
    if (!this.active() || this.stickId !== null || e.target === this.dashBtn) return;
    this.stickId = e.pointerId;
    this.ox = e.clientX; this.oy = e.clientY;
    this.stick.style.display = 'block';
    this.stick.style.left = this.ox + 'px';
    this.stick.style.top = this.oy + 'px';
    this.setKnob(0, 0);
    document.getElementById('hint')!.style.opacity = '0';
    e.preventDefault();
  };

  private move = (e: PointerEvent) => {
    if (e.pointerId !== this.stickId) return;
    let dx = e.clientX - this.ox, dy = e.clientY - this.oy;
    const d = Math.hypot(dx, dy);
    if (d > this.R) {
      // drag the stick base along so the thumb never "runs out"
      this.ox += (dx / d) * (d - this.R); this.oy += (dy / d) * (d - this.R);
      this.stick.style.left = this.ox + 'px'; this.stick.style.top = this.oy + 'px';
      dx = e.clientX - this.ox; dy = e.clientY - this.oy;
    }
    this.sx = dx / this.R; this.sy = dy / this.R;
    const m = Math.hypot(this.sx, this.sy);
    if (m < 0.12) { this.sx = 0; this.sy = 0; }
    this.setKnob(dx, dy);
    e.preventDefault();
  };

  private up = (e: PointerEvent) => { if (e.pointerId === this.stickId) this.release(); };

  private release() {
    this.stickId = null; this.sx = 0; this.sy = 0;
    this.stick.style.display = 'none';
  }

  private setKnob(dx: number, dy: number) { this.knob.style.transform = `translate(${dx}px, ${dy}px)`; }

  read(): Input {
    let x = this.sx + this.kx, y = this.sy + this.ky;
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, dash: this.dashCount };
  }

  setCooldown(on: boolean) { this.dashBtn.classList.toggle('cd', on); }
}
