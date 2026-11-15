// Living blobz in the menus (PLAN step 5): they breathe (a soft squash), blink now and then and hop when tapped.
// Works on any element made by blobEl(): the blink swaps the picture for the same look with sleepy eyes for a moment.
// Plus the blob-wipe: a big round wipe in the player's colour, carrying their blob, between screens.
import { blobEl, type BlobLook } from './blob';

const BLINK_EYES = 3; // "Sömniga": eyes half shut reads as a blink
const live = new Set<{ el: HTMLElement; open: string; shut: string; next: number }>();
let timer = 0;

function tick() {
  const now = performance.now();
  for (const b of live) {
    if (!b.el.isConnected) { live.delete(b); continue; }
    if (now < b.next) continue;
    const img = b.el.querySelector('img');
    if (!img) continue;
    img.src = b.shut;
    window.setTimeout(() => { img.src = b.open; }, 140);
    b.next = now + 2200 + Math.random() * 3800;
  }
  if (!live.size) { clearInterval(timer); timer = 0; }
}

/** Make a blobEl() picture alive: breathing, blinking, a hop on tap. Returns the same element. */
export function alive(el: HTMLElement, look: BlobLook): HTMLElement {
  const open = el.querySelector('img')?.src;
  if (!open || look.eyes === BLINK_EYES) return el; // already sleepy eyes: no blink, still breathes
  const shut = blobEl({ ...look, eyes: BLINK_EYES }).querySelector('img')!.src;
  el.classList.add('alive');
  el.style.setProperty('--breath-delay', `${-Math.random() * 2.6}s`);
  live.add({ el, open, shut, next: performance.now() + 800 + Math.random() * 3000 });
  if (!timer) timer = window.setInterval(tick, 120);
  el.addEventListener('pointerdown', () => { el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop'); });
  return el;
}

/** Blob-wipe: a circle in the player's colour grows over the screen with their blob in the middle, then opens again.
 *  Purely visual (pointer-events: none); the screen change itself happens at once, so nothing waits on it. */
export function blobWipe(color: number, look: BlobLook) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let w = document.getElementById('wipe');
  if (!w) { w = document.createElement('div'); w.id = 'wipe'; w.setAttribute('aria-hidden', 'true'); document.body.append(w); }
  w.style.setProperty('--wipe', '#' + color.toString(16).padStart(6, '0'));
  w.replaceChildren(blobEl(look));
  w.classList.remove('go'); void w.offsetWidth; w.classList.add('go');
}
