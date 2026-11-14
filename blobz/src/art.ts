// Blob art drawn with Canvas2D so skins are cheap: any color, any hat.

export const COLORS = [0x5ec8ff, 0xff6b8b, 0x7ddc5a, 0xffc93c, 0xb18cff, 0xff9248, 0x4fe0c3, 0xf2f2f2];
export const HATS = ['none', 'crown', 'cap', 'flower', 'party'];

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
function shade(c: number, f: number) {
  const r = Math.min(255, Math.max(0, ((c >> 16) & 255) * f));
  const g = Math.min(255, Math.max(0, ((c >> 8) & 255) * f));
  const b = Math.min(255, Math.max(0, (c & 255) * f));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

/** Draws body + hat (no eyes) centered at (cx, cy) with radius r. */
export function drawBlob(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: number, hat: number) {
  ctx.save();
  // body: a soft dome, wider at the bottom
  ctx.beginPath();
  ctx.moveTo(cx - r * 1.05, cy + r * 0.55);
  ctx.bezierCurveTo(cx - r * 1.15, cy - r * 0.6, cx - r * 0.6, cy - r * 1.05, cx, cy - r * 1.05);
  ctx.bezierCurveTo(cx + r * 0.6, cy - r * 1.05, cx + r * 1.15, cy - r * 0.6, cx + r * 1.05, cy + r * 0.55);
  ctx.quadraticCurveTo(cx, cy + r * 0.95, cx - r * 1.05, cy + r * 0.55);
  ctx.closePath();
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.45, r * 0.1, cx, cy, r * 1.2);
  g.addColorStop(0, shade(color, 1.25));
  g.addColorStop(0.6, hex(color));
  g.addColorStop(1, shade(color, 0.75));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.1);
  ctx.strokeStyle = shade(color, 0.5);
  ctx.stroke();
  // shine
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.42, cy - r * 0.55, r * 0.26, r * 0.15, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fill();
  drawHat(ctx, cx, cy - r * 0.95, r, hat);
  ctx.restore();
}

function drawHat(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hat: number) {
  ctx.lineWidth = Math.max(1.5, r * 0.07);
  ctx.strokeStyle = '#3a2a1a';
  if (hat === 1) { // crown
    ctx.beginPath();
    ctx.moveTo(x - r * 0.45, y + r * 0.1);
    ctx.lineTo(x - r * 0.5, y - r * 0.4);
    ctx.lineTo(x - r * 0.22, y - r * 0.15);
    ctx.lineTo(x, y - r * 0.5);
    ctx.lineTo(x + r * 0.22, y - r * 0.15);
    ctx.lineTo(x + r * 0.5, y - r * 0.4);
    ctx.lineTo(x + r * 0.45, y + r * 0.1);
    ctx.closePath();
    ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.stroke();
  } else if (hat === 2) { // cap
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.05, r * 0.5, r * 0.38, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = '#e63946'; ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x + r * 0.45, y + r * 0.05, r * 0.35, r * 0.1, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#c1121f'; ctx.fill(); ctx.stroke();
  } else if (hat === 3) { // flower
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x + r * 0.25 + Math.cos(a) * r * 0.18, y - r * 0.05 + Math.sin(a) * r * 0.18, r * 0.14, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(x + r * 0.25, y - r * 0.05, r * 0.11, 0, Math.PI * 2);
    ctx.fillStyle = '#ffc93c'; ctx.fill();
  } else if (hat === 4) { // party hat
    ctx.beginPath();
    ctx.moveTo(x - r * 0.32, y + r * 0.1);
    ctx.lineTo(x, y - r * 0.7);
    ctx.lineTo(x + r * 0.32, y + r * 0.1);
    ctx.closePath();
    ctx.fillStyle = '#b18cff'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y - r * 0.72, r * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd23f'; ctx.fill();
  }
}

/** Static eyes for previews (the game draws live eyes). */
export function drawEyes(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(cx + s * r * 0.32, cy - r * 0.1, r * 0.2, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * r * 0.32 + r * 0.04, cy - r * 0.05, r * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = '#222'; ctx.fill();
  }
}

export function blobCanvas(color: number, hat: number, size = 96): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d')!;
  drawBlob(ctx, size / 2, size * 0.62, size * 0.3, color, hat);
  return c;
}

export function previewInto(canvas: HTMLCanvasElement, color: number, hat: number) {
  const ctx = canvas.getContext('2d')!;
  const s = canvas.width;
  ctx.clearRect(0, 0, s, s);
  ctx.beginPath(); ctx.ellipse(s / 2, s * 0.88, s * 0.3, s * 0.07, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fill();
  drawBlob(ctx, s / 2, s * 0.62, s * 0.3, color, hat);
  drawEyes(ctx, s / 2, s * 0.62, s * 0.3);
}

// ---------- Pixel blob: Kenney Tiny Dungeon slime, recolored per skin ----------
const SLIME_TILE = 108; // Tiny Dungeon, 12 columns of 16px tiles
const HEADROOM = 6; // rows above the slime for hats
export const PIXEL_W = 16;
export const PIXEL_H = 16 + HEADROOM;

// Kenney sheets used by the DOM UI (menu, HUD, icons). Phaser loads its own copies.
const SHEETS = {
  town: { url: 'assets/kenney-tiny-town/tilemap_packed.png', tile: 16, cols: 12 },
  dungeon: { url: 'assets/kenney-tiny-dungeon/tilemap_packed.png', tile: 16, cols: 12 },
  farm: { url: 'assets/kenney-tiny-farm/tilemap_packed.png', tile: 16, cols: 12 },
  ski: { url: 'assets/kenney-tiny-ski/tilemap_packed.png', tile: 16, cols: 12 },
  battle: { url: 'assets/kenney-tiny-battle/tilemap_packed.png', tile: 16, cols: 18 },
  pp: { url: 'assets/kenney-pixel-platformer/tilemap_packed.png', tile: 18, cols: 20 },
} as const;
export type SheetKey = keyof typeof SHEETS;
const imgs: Partial<Record<SheetKey, HTMLImageElement>> = {};
let sheet: HTMLImageElement | null = null;

export function loadArt(): Promise<void> {
  return Promise.all((Object.keys(SHEETS) as SheetKey[]).map((k) => new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => { imgs[k] = img; resolve(); };
    img.onerror = () => resolve(); // UI falls back to plain shapes/text
    img.src = SHEETS[k].url;
  }))).then(() => { sheet = imgs.dungeon ?? null; });
}

export function artReady() { return !!sheet; }

/** Draws one Kenney tile onto ctx at (x, y) with integer scale. Returns false if not loaded. */
export function drawTile(ctx: CanvasRenderingContext2D, key: SheetKey, frame: number, x: number, y: number, scale: number) {
  const img = imgs[key];
  if (!img) return false;
  const { tile, cols } = SHEETS[key];
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, (frame % cols) * tile, Math.floor(frame / cols) * tile, tile, tile, x, y, tile * scale, tile * scale);
  return true;
}

/** A pixelated canvas holding one tile, for use as an icon in the DOM. */
export function tileCanvas(key: SheetKey, frame: number, scale: number, cls = 'px') {
  const t = SHEETS[key].tile;
  const c = document.createElement('canvas');
  c.width = t * scale; c.height = t * scale; c.className = cls;
  drawTile(c.getContext('2d')!, key, frame, 0, 0, scale);
  return c;
}

// Tiny Ski ships a pixel font: 0-9 at 84, ':' at 94, A-Z at 96.
function glyph(ch: string): number | null {
  if (ch >= '0' && ch <= '9') return 84 + ch.charCodeAt(0) - 48;
  if (ch >= 'A' && ch <= 'Z') return 96 + ch.charCodeAt(0) - 65;
  return ({ ':': 94, '!': 122, '+': 126, '-': 127, '.': 131 } as Record<string, number>)[ch] ?? null;
}

/** Renders text with the Kenney Tiny Ski pixel letters. Falls back to canvas text. */
export function pixelText(text: string, scale: number, spacing = -3) {
  const t = text.toUpperCase();
  const step = 16 + spacing;
  const c = document.createElement('canvas');
  c.width = Math.max(1, (t.length * step - spacing) * scale); c.height = 16 * scale; c.className = 'px';
  const ctx = c.getContext('2d')!;
  [...t].forEach((ch, i) => {
    const g = glyph(ch);
    if (g !== null && drawTile(ctx, 'ski', g, i * step * scale, 0, scale)) return;
    if (ch !== ' ') { ctx.font = `bold ${12 * scale}px sans-serif`; ctx.fillStyle = '#fff'; ctx.fillText(ch, i * step * scale, 13 * scale); }
  });
  return c;
}

const OUT = '#3f2631';
const HAT_PIX: { x: number; y: number; rows: string[] }[] = [
  { x: 0, y: 0, rows: [] },
  { x: 4, y: 4, rows: ['.O.OO.O.', 'OYOYYOYO', 'OYYYYYYO', 'OYYYYYYO', '.OOOOOO.'] }, // crown
  { x: 4, y: 4, rows: ['..OOOO..', '.ORRRRO.', 'ORRRRRRO', 'OrrrrrrrrO', '.OOOOOOOO.'] }, // cap
  { x: 9, y: 4, rows: ['.OWO.', 'OWYWO', '.OWO.', '..G..'] }, // flower
  { x: 4, y: 3, rows: ['...YY...', '...OO...', '..OPPO..', '..OPYO..', '.OPPPPO.', '.OYPPPO.'] }, // party hat
];
const HAT_COL: Record<string, string> = { O: OUT, Y: '#ffd23f', R: '#e63946', r: '#a4161a', W: '#ffffff', G: '#5aa83a', P: '#b18cff' };

function mix(c: number, f: number, toWhite = false) {
  const ch = (v: number) => Math.round(toWhite ? v + (255 - v) * f : v * f);
  return [ch((c >> 16) & 255), ch((c >> 8) & 255), ch(c & 255)];
}

/** 16x22 canvas: recolored slime + pixel hat. Null if the sheet failed to load. */
export function pixelBlob(color: number, hat: number): HTMLCanvasElement | null {
  if (!sheet) return null;
  const c = document.createElement('canvas');
  c.width = PIXEL_W; c.height = PIXEL_H;
  const ctx = c.getContext('2d')!;
  const sx = (SLIME_TILE % 12) * 16, sy = Math.floor(SLIME_TILE / 12) * 16;
  ctx.drawImage(sheet, sx, sy, 16, 16, 0, HEADROOM, 16, 16);
  const data = ctx.getImageData(0, 0, PIXEL_W, PIXEL_H);
  const light = mix(color, 0.45, true), mid = mix(color, 1), dark = mix(color, 0.62);
  for (let i = 0; i < data.data.length; i += 4) {
    const r = data.data[i], g = data.data[i + 1], b = data.data[i + 2];
    let to: number[] | null = null;
    if (r === 105 && g === 255 && b === 212) to = light;
    else if (r === 67 && g === 225 && b === 179) to = mid;
    else if (r === 37 && g === 149 && b === 106) to = dark;
    if (to) { data.data[i] = to[0]; data.data[i + 1] = to[1]; data.data[i + 2] = to[2]; }
  }
  ctx.putImageData(data, 0, 0);
  const h = HAT_PIX[hat] ?? HAT_PIX[0];
  h.rows.forEach((row, ry) => [...row].forEach((ch, rx) => {
    if (ch === '.') return;
    ctx.fillStyle = HAT_COL[ch];
    ctx.fillRect(h.x + rx, h.y + ry, 1, 1);
  }));
  return c;
}

export function pixelPreviewInto(canvas: HTMLCanvasElement, color: number, hat: number) {
  const px = pixelBlob(color, hat);
  if (!px) { previewInto(canvas, color, hat); return; }
  const ctx = canvas.getContext('2d')!;
  const s = canvas.width;
  const k = Math.floor(s / PIXEL_H);
  ctx.clearRect(0, 0, s, s);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath(); ctx.ellipse(s / 2, (s + PIXEL_H * k) / 2 - k * 2, k * 5, k * 1.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.drawImage(px, (s - PIXEL_W * k) / 2, (s - PIXEL_H * k) / 2, PIXEL_W * k, PIXEL_H * k);
}
