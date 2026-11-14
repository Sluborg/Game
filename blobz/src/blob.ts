// Procedural pixel blobz: a round ball (like the title art) on an 18x24 pixel grid.
// Every part (color, eyes, mouth, hat) is a choice, rendered to SVG (DOM) or canvas (Phaser).

export interface BlobLook { color: number; eyes: number; mouth: number; hat: number }

export const COLORS = [
  0x5ec8ff, 0xff6b8b, 0x7ddc5a, 0xffc93c, 0xb18cff, 0xff9248,
  0x4fe0c3, 0xf2f2f2, 0xe63946, 0x3d6bff, 0x8a5a3c, 0x555a66,
];
export const EYES = ['Glada', 'Pärlor', 'Stora', 'Nöjda', 'Sömniga', 'Coola'];
export const MOUTHS = ['Öppen', 'Leende', 'Tunga', 'Tänder', 'Oj', 'Lugn'];
export const HATS = ['Ingen', 'Krona', 'Keps', 'Blomma', 'Partyhatt', 'Mössa', 'Rosett', 'Halmhatt'];

export const GRID_W = 18;
export const GRID_H = 24;
/** Vertical center of the ball, as a fraction of the grid height (sprite origin). */
export const BODY_CY = 15.5 / GRID_H;

const OUT = '#3f2631';
const PAL: Record<string, string> = {
  K: OUT, W: '#ffffff', R: '#e84a5f', Y: '#ffd23f', y: '#e0a81e', C: '#e63946', c: '#a4161a',
  G: '#5aa83a', P: '#b18cff', p: '#7d5fd6', B: '#3d6bff', b: '#2a4bb8', S: '#e9c46a', s: '#c99a3e', N: '#ff8fab',
};

// Eye patterns: left eye drawn at x=4 (mirrored to the right eye), top row y=12.
// A pattern with `wide` spans both eyes (x=3..14).
const EYE_PIX: { rows: string[]; wide?: boolean; mirror?: boolean }[] = [
  { rows: ['WWW', 'WKK', 'WKK'] }, // happy (like the art)
  { rows: ['.K.', '.K.'] }, // beady
  { rows: ['WWW', 'WWK', 'WKK', 'WWW'], mirror: true }, // big
  { rows: ['.K.', 'K.K'] }, // content ^^
  { rows: ['KKK', 'WKK'] }, // sleepy
  { rows: ['KKKKKKKKKKKK', '.KWKKK.KWKKK', '..KKK...KKK.'], wide: true }, // cool shades
];
// Mouth patterns, centered (even widths), top row y=17.
const MOUTH_PIX: string[][] = [
  ['KKKK', 'KRRK', '.KK.'], // open
  ['K..K', '.KK.'], // smile
  ['KKKK', '.RR.', '.RR.'], // tongue
  ['KKKK', 'KWWK', '.KK.'], // teeth
  ['KK', 'KK'], // oh
  ['KKKK'], // calm
];
// Hats: x offset, bottom row lands on the top of the head (y=9).
const HAT_PIX: { x: number; rows: string[] }[] = [
  { x: 0, rows: [] },
  { x: 5, rows: ['K.K..K.K', 'KYKYYKYK', 'KYYYYYYK', 'KYYRYYYK', 'KyyyyyyK', '.KKKKKK.'] }, // crown
  { x: 4, rows: ['...KKKK...', '..KCCCCK..', '.KCCCCCCK.', '.KCCCCCCCKKK', '.KccccccccccK', '..KKKKKKKKKK'] }, // cap
  { x: 10, rows: ['.KWK..', 'KWYWK.', '.KWK..', '..GK..', '..G...'] }, // flower
  { x: 5, rows: ['...YY...', '...KK...', '..KPPK..', '..KPYK..', '.KPPPPK.', '.KYPPPPK', 'KPPPPYPK', 'KppppppK'] }, // party hat
  { x: 4, rows: ['....KK....', '...KWWK...', '..KKKKKK..', '.KBBBBBBK.', 'KBBBBBBBBK', 'KbbbbbbbbK', 'KWWWWWWWWK', '.KKKKKKKK.'] }, // beanie
  { x: 5, rows: ['KK....KK', 'KNK..KNK', 'KNNKKNNK', 'KNNNNNNK', 'KNK..KNK', 'KK....KK'] }, // bow
  { x: 2, rows: ['.....KKKK.....', '....KSSSSK....', '...KSSSSSSK...', '...KCCCCCCK...', 'KKKSSSSSSSSKKK', 'KssssssssssssK', '.KKKKKKKKKKKK.'] }, // straw hat
];

function rgb(c: number) { return [(c >> 16) & 255, (c >> 8) & 255, c & 255]; }
function css([r, g, b]: number[]) { return `rgb(${r | 0},${g | 0},${b | 0})`; }
function tone(c: number, f: number) {
  const v = rgb(c);
  return css(f >= 1 ? v.map((x) => x + (255 - x) * (f - 1)) : v.map((x) => x * f));
}

// Dome like the title art: narrow rounded top, wide sides, flat bottom with soft corners.
const TOP = 8, BOTTOM = 21;
function halfWidth(y: number) {
  const t = (y + 0.5 - TOP) / (BOTTOM + 1 - TOP);
  if (t < 0 || t > 1) return -1;
  if (t > 0.86) return 8 - ((t - 0.86) / 0.14) * 2.6; // rounded bottom corners
  return 3 + 5 * Math.sin(Math.min(1, t / 0.62) * Math.PI / 2);
}
function inBody(x: number, y: number) {
  const w = halfWidth(y);
  return w > 0 && Math.abs(x + 0.5 - 9) <= w;
}

/** Pixel grid of CSS colors (null = transparent). */
export function blobGrid(look: BlobLook): (string | null)[][] {
  const g: (string | null)[][] = Array.from({ length: GRID_H }, () => Array<string | null>(GRID_W).fill(null));
  const set = (x: number, y: number, col: string | null) => { if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H && col) g[y][x] = col; };
  const mid = tone(look.color, 1), light = tone(look.color, 1.45), dark = tone(look.color, 0.68);
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
    if (inBody(x, y)) {
      let col = mid;
      if (!inBody(x, y + 2) || !inBody(x + 2, y + 1)) col = dark; // bottom/right shade
      // diagonal shine stripe top-left, like the art
      const d = (x - 3.5) + (y - 9.5);
      if (y >= 9 && y <= 12 && x >= 3 && x <= 7 && d >= 1.5 && d <= 4 && inBody(x - 1, y) && inBody(x, y - 1)) col = light;
      set(x, y, col);
    } else if (inBody(x - 1, y) || inBody(x + 1, y) || inBody(x, y - 1) || inBody(x, y + 1)) {
      set(x, y, OUT);
    }
  }

  const paint = (rows: string[], x0: number, y0: number, mirror = false) => rows.forEach((row, ry) => [...row].forEach((ch, rx) => {
    if (ch === '.') return;
    set(mirror ? x0 + row.length - 1 - rx : x0 + rx, y0 + ry, PAL[ch]);
  }));
  const eye = EYE_PIX[look.eyes] ?? EYE_PIX[0];
  if (eye.wide) paint(eye.rows, 3, 12);
  else { paint(eye.rows, 4, 12); paint(eye.rows, GRID_W - 4 - eye.rows[0].length, 12, eye.mirror); }
  const mouth = MOUTH_PIX[look.mouth] ?? MOUTH_PIX[0];
  paint(mouth, 9 - mouth[0].length / 2, 17);
  const hat = HAT_PIX[look.hat] ?? HAT_PIX[0];
  paint(hat.rows, hat.x, 10 - hat.rows.length);
  return g;
}

/** Crisp pixel SVG (scales to any size without blur). */
export function blobSvg(look: BlobLook): string {
  const g = blobGrid(look);
  let rects = '';
  for (let y = 0; y < GRID_H; y++) {
    let x = 0;
    while (x < GRID_W) {
      const col = g[y][x];
      if (!col) { x++; continue; }
      let w = 1;
      while (x + w < GRID_W && g[y][x + w] === col) w++;
      rects += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${col}"/>`;
      x += w;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID_W} ${GRID_H}" shape-rendering="crispEdges">${rects}</svg>`;
}

/** Canvas at integer scale (Phaser textures, previews). */
export function blobCanvas(look: BlobLook, scale = 1): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = GRID_W * scale; c.height = GRID_H * scale;
  const ctx = c.getContext('2d')!;
  blobGrid(look).forEach((row, y) => row.forEach((col, x) => {
    if (!col) return;
    ctx.fillStyle = col;
    ctx.fillRect(x * scale, y * scale, scale, scale);
  }));
  return c;
}

/** <span> holding the SVG, for menus. */
export function blobEl(look: BlobLook, cls = 'blob') {
  const s = document.createElement('span');
  s.className = cls;
  s.innerHTML = blobSvg(look);
  return s;
}

export function clampLook(l: Partial<BlobLook>): BlobLook {
  const pick = (v: unknown, n: number) => Math.max(0, Math.min(n - 1, Math.floor(Number(v)) || 0));
  return {
    color: COLORS.includes(Number(l.color)) ? Number(l.color) : COLORS[0],
    eyes: pick(l.eyes, EYES.length), mouth: pick(l.mouth, MOUTHS.length), hat: pick(l.hat, HATS.length),
  };
}

export function randomLook(): BlobLook {
  const r = (n: number) => Math.floor(Math.random() * n);
  return { color: COLORS[r(COLORS.length)], eyes: r(EYES.length), mouth: r(MOUTHS.length), hat: r(HATS.length) };
}
