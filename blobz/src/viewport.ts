// Viewport watcher (Stefan 2026-11-15: switching apps or rotating the phone broke the layout, "half the screen green").
// Every resize / orientationchange / visualViewport resize / return to the tab is debounced (100 ms), the screen is
// measured again and every registered listener gets the new size: the Phaser canvas + camera, the DOM HUD, Code 2's
// dungeon scene. Landscape is parked: on a phone held sideways a full-screen "Turn your phone" overlay covers the game
// and input pauses; the game keeps running (the host keeps simulating) and resumes as it was when turned back.
//
// API (also for Code 2):
//   onViewport(cb: (w, h) => void): () => void   called after every settled change (and once right away); returns unsubscribe
//   rotateBlocked(): boolean                      true while the "turn your phone" overlay is up (pause your input)
//   watchViewport(): void                         installed once by main.ts
type Cb = (w: number, h: number) => void;
const cbs = new Set<Cb>();
let timer = 0;
let installed = false;

/** A phone (touch, small short side). Desktop windows and tablets may stay landscape. */
const isPhone = () => (navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches) && Math.min(innerWidth, innerHeight) < 600;
/** Automated test browsers keep landscape usable (many e2e specs play in landscape) unless a test asks for the check. */
const checkRotate = () => {
  if (!navigator.webdriver) return true;
  try { return localStorage.getItem('blobz.rotateTest') === '1'; } catch { return false; }
};

export const rotateBlocked = () => document.body.classList.contains('rotate-block');

function apply() {
  timer = 0;
  const w = Math.round(innerWidth), h = Math.round(innerHeight);
  document.body.classList.toggle('rotate-block', checkRotate() && isPhone() && w > h);
  for (const cb of cbs) { try { cb(w, h); } catch (e) { console.error(e); } }
}
const schedule = () => { if (timer) clearTimeout(timer); timer = window.setTimeout(apply, 100); };

export function onViewport(cb: Cb): () => void {
  cbs.add(cb);
  cb(Math.round(innerWidth), Math.round(innerHeight));
  return () => cbs.delete(cb);
}

export function watchViewport() {
  if (installed) return;
  installed = true;
  addEventListener('resize', schedule);
  addEventListener('orientationchange', schedule);
  addEventListener('pageshow', schedule);
  addEventListener('focus', schedule);
  visualViewport?.addEventListener('resize', schedule);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') schedule(); });
  apply();
}
