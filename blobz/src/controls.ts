// Floating thumbstick (touch anywhere on the left/middle of the screen),
// a big dash button, plus keyboard (WASD / arrows + space) for desktop.
import type { Input } from './sim';
import { t } from './i18n';
import { NI } from './ninjaArt';

export class Controls {
  private sx = 0; private sy = 0;
  private kx = 0; private ky = 0;
  private dashCount = 0;
  private atkCount = 0;
  private atkTimer = 0;
  readonly atkBtn = document.getElementById('attack')!;
  private stickId: number | null = null;
  private ox = 0; private oy = 0;
  private keys = new Set<string>();
  onDash: () => void = () => {};
  readonly stick = document.getElementById('stick')!;
  readonly knob = document.getElementById('knob')!;
  readonly dashBtn = document.getElementById('dash')!;
  private readonly R = 56;
  private holdTimer = 0;
  /** Tool the action button uses right now (null = dash). Holding the button repeats tool swings. */
  tool: 'axe' | 'pickaxe' | 'rake' | null = null;
  static readonly REPEAT_MS = 350;

  constructor() {
    window.addEventListener('pointerdown', this.down, { passive: false });
    window.addEventListener('pointermove', this.move, { passive: false });
    window.addEventListener('pointerup', this.up);
    window.addEventListener('pointercancel', this.up);
    this.dashBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.press(); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) this.dashBtn.addEventListener(ev, () => this.stopHold());
    // Attack (dungeon only): tap = one swing, hold = a swing every 0.3 s
    this.atkBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.attackPress(); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) this.atkBtn.addEventListener(ev, () => this.attackStop());
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.code === 'Space' && !e.repeat) this.press();
      if ((e.code === 'KeyJ' || e.code === 'KeyF') && !e.repeat) this.attackPress();
      this.keys.add(e.code);
      this.updateKeys();
    });
    window.addEventListener('keyup', (e) => { if (e.code === 'KeyJ' || e.code === 'KeyF') this.attackStop(); if (e.code === 'Space') this.stopHold(); this.keys.delete(e.code); this.updateKeys(); });
    window.addEventListener('blur', () => { this.keys.clear(); this.updateKeys(); this.release(); this.stopHold(); });
  }

  private active() { return !document.getElementById('hud')!.classList.contains('hidden'); }

  /** One action now, then one every REPEAT_MS while held (only while a tool is in use, never repeat-dash). */
  private press() {
    this.dash();
    this.stopHold();
    this.dashBtn.classList.add('down'); // calm press (style.css): touch :active is unreliable after preventDefault
    this.holdTimer = window.setInterval(() => { if (this.tool) this.dash(); }, Controls.REPEAT_MS);
  }

  private attackPress() {
    if (!this.active() || this.atkBtn.classList.contains('hidden')) return;
    this.atkCount++;
    this.attackStop();
    this.atkTimer = window.setInterval(() => { this.atkCount++; }, 300);
  }

  private attackStop() { clearInterval(this.atkTimer); this.atkTimer = 0; }

  /** Dungeon layout: big Attack button bottom-right, the action/dash button smaller above-left of it. */
  setDungeon(on: boolean) {
    this.atkBtn.classList.toggle('hidden', !on);
    document.getElementById('hud')!.classList.toggle('dungeon', on);
    if (!on) this.attackStop();
  }

  private stopHold() { clearInterval(this.holdTimer); this.holdTimer = 0; this.dashBtn.classList.remove('down'); }

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
    if (!this.active() || this.stickId !== null || e.target === this.dashBtn || e.target === this.atkBtn) return;
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
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, dash: this.dashCount, atk: this.atkCount };
  }

  setCooldown(on: boolean) { this.dashBtn.classList.toggle('cd', on && !this.tool); }

  /** Switch the action button between dash and a tool (Ninja skill icons, ninjaArt.ts). */
  setTool(tool: Controls['tool']) {
    if (tool === this.tool) return;
    this.tool = tool;
    const img = this.dashBtn.querySelector('img');
    if (img) img.src = tool ? NI[tool] : NI.dash; // free-standing Ninja tool sprites; N-17 play = dash
    this.dashBtn.setAttribute('aria-label', t(tool === 'axe' ? 'tool.axe' : tool === 'pickaxe' ? 'tool.pickaxe' : tool === 'rake' ? 'tool.rake' : 'hud.dash'));
    this.dashBtn.classList.toggle('tool', !!tool);
  }
}
