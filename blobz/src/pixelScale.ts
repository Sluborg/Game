// Whole-pixel scaling (Stefan 2026-11-15: "art never loses pixels"). Phones draw CSS px at a device-pixel ratio such as
// 2.625, so a whole CSS factor (3x = 7.875 device px per art px) still rounds unevenly. intFit picks the largest WHOLE
// number of DEVICE pixels per art pixel that fits the box, and returns the CSS size that gives exactly that.
//
// API (also for Code 2): intFit(natW, natH, boxW, boxH, dpr?) -> { w, h, k }
//   natW/natH: the art's native size in art px; boxW/boxH: the space in CSS px; dpr: defaults to devicePixelRatio
//   k: device px per art px (>= 1); w/h: the CSS size to set (natW * k / dpr). Centre it in the box yourself.
export function intFit(natW: number, natH: number, boxW: number, boxH: number, dpr = window.devicePixelRatio || 1) {
  const k = Math.max(1, Math.floor(Math.min((boxW * dpr) / natW, (boxH * dpr) / natH) + 1e-6));
  return { w: (natW * k) / dpr, h: (natH * k) / dpr, k };
}

/** Size an <img> to the largest whole number of device px per art px that fits boxW x boxH (CSS px). The art size is
 *  the image's natural size unless given (e.g. a blob picture drawn 6 px per grid px: art = [20, 20]). Waits for load. */
export function snapImg(img: HTMLImageElement, boxW: number, boxH = boxW, art?: [number, number]) {
  const go = () => {
    const [nw, nh] = art ?? [img.naturalWidth, img.naturalHeight];
    if (!nw || !nh) return;
    const { w, h } = intFit(nw, nh, boxW, boxH);
    img.style.width = w + 'px'; img.style.height = h + 'px';
  };
  if (img.complete && img.naturalWidth) go(); else img.addEventListener('load', go, { once: true });
}

/** Whole-pixel rules for the DOM pixel art: [selector, box width, box height, art size if not the natural size]. */
const SNAP: [string, number, number, [number, number]?][] = [
  ['#hud-quest .qicon', 20, 20], ['#hud-quest .qstar', 20, 20], ['#hud-quest .qtitle img', 32, 22],
  ['#hud-quest .qbimg', 40, 28], ['#hud-quest .qbico', 24, 24],
  ['#hud-bank img', 18, 18], ['#edge-arrows .edge img', 18, 18],
  ['#build-panel .bcost .c img', 16, 16],
  ['#end .endrows .qicon', 16, 16], ['#end .endrows .qstar', 22, 22], ['#end .stars .star', 76, 68],
  ['#btn-build .kicon', 48, 48], ['#btn-menu .kicon', 48, 48], ['.backbtn .icon', 48, 48], ['.kclose img', 48, 48],
  ['.pgbtn img', 48, 48], ['#dash img', 48, 48],
  ['#preview .blob img', 60, 60, [20, 20]], ['#preview2 .blob img', 120, 120, [20, 20]],
  ['#lobby-list .seat .blob img', 60, 60, [20, 20]],
];

/** Apply SNAP to every matching image whose source or box changed since last time (cheap enough to call each frame). */
export function snapAll(root: ParentNode = document) {
  for (const [sel, bw, bh, art] of SNAP) {
    root.querySelectorAll<HTMLImageElement>(sel).forEach((img) => {
      const key = `${img.getAttribute('src')?.slice(-40)}|${bw}x${bh}|${window.devicePixelRatio}`;
      if (img.dataset.snap === key) return;
      img.dataset.snap = key;
      snapImg(img, bw, bh, art);
    });
  }
}

/** Phaser canvas at DEVICE resolution (Lead 2026-11-15: Code owns it; one helper for the meadow and Code 2's dungeon).
 *  The game size is CSS size x dpr() (main.ts, viewport.ts) and Phaser shows it shrunk by 1 / dpr(), so one game px is
 *  one device px. A scene therefore:
 *    - reads its size in CSS px as  this.scale.width / dpr(), this.scale.height / dpr()
 *    - sets its camera with  snapZoom(rawCssZoom, artScale): the CSS zoom it would have used, snapped so one art px
 *      (drawn at artScale world px) is a whole number of device px, returned already multiplied by dpr()
 *    - converts camera / world positions to CSS px with  cam.zoom / dpr()  (e.g. DOM markers over the game). */
export const DPR_CANVAS = true;
/** Highest canvas resolution factor (Lead 2026-11-15). 3 = no cap on any phone today. Set lower (e.g. 2) if the
 *  dungeon stutters: a phone above the cap renders at floor(DPR_MAX) device px per CSS px (whole numbers, so the
 *  integer art scale holds; the browser then stretches the canvas the last bit, slightly soft). */
export const DPR_MAX = 3;
/** Phone testing: ?dpr=1|2|2.625 (clamped 1..3) replaces the device's ratio, read once at boot. */
const DPR_URL = (() => {
  if (typeof location === 'undefined') return null;
  const v = parseFloat(new URLSearchParams(location.search).get('dpr') ?? '');
  return Number.isFinite(v) ? Math.max(1, Math.min(3, v)) : null;
})();
/** The canvas resolution factor: device px per CSS px the game renders at (1 while DPR_CANVAS is off). */
export const dpr = () => {
  if (!DPR_CANVAS) return 1;
  const d = DPR_URL ?? (window.devicePixelRatio || 1);
  return d > DPR_MAX ? Math.max(1, Math.floor(DPR_MAX)) : d;
};
/** Meadow camera zoom snapped so one art px (drawn at artScale) is a whole number of device px (or CSS px while
 *  DPR_CANVAS is off): zoom = max(1, round(artScale * raw * d)) / (artScale * d), d = dpr(). */
export const snapZoom = (raw: number, artScale = 3) => { const d = dpr(); return (Math.max(1, Math.round(artScale * raw * d)) / (artScale * d)) * d; };
