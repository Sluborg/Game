// Procedural pixel blobz: a round ball (like the title art) on an 18x24 pixel grid.
// Every part (color, eyes, mouth, hat) is a choice, rendered to SVG (DOM) or canvas (Phaser).

export interface BlobLook { color: number; shape: number; eyes: number; mouth: number; hat: number }

export const COLORS = [
  0x5ec8ff, 0xff6b8b, 0x7ddc5a, 0xffc93c, 0xb18cff, 0xff9248,
  0x4fe0c3, 0xf2f2f2, 0xe63946, 0x3d6bff, 0xc08850, 0x9aa0b4,
];
export const SHAPES = ['Kupol', 'Boll', 'Lång', 'Platt', 'Päron', 'Kub'];
export const EYES = ['Glada', 'Runda', 'Stora', 'Nöjda', 'Sömniga', 'Coola', 'Kär', 'Stjärnor', 'Arga', 'Rosiga'];
export const MOUTHS = ['Öppen', 'Leende', 'Tunga', 'Tänder', 'Oj', 'Lugn'];
export const HATS = ['Ingen', 'Krona', 'Keps', 'Blomma', 'Partyhatt', 'Mössa', 'Rosett', 'Halmhatt',
  'Pirat', 'Trollkarl', 'Viking', 'Kock', 'Lurar', 'Kanin', 'Katt', 'Gloria', 'Cylinder', 'Bandana', 'Antenn', 'Grodd'];

export const GRID_W = 18;
export const GRID_H = 24;
/** Vertical center of the ball, as a fraction of the grid height (sprite origin). */
export const BODY_CY = 15.5 / GRID_H;

const OUT = '#3f2631';
const PAL: Record<string, string> = {
  K: '#1b1018', W: '#ffffff', R: '#ff5a6e', Y: '#ffd23f', y: '#e0a81e', C: '#e63946', c: '#a4161a',
  G: '#5aa83a', P: '#b18cff', p: '#7d5fd6', B: '#3d6bff', b: '#2a4bb8', S: '#e9c46a', s: '#c99a3e', N: '#ff8fab',
  H: '#ff4d6d', D: '#4a4a55', g: '#a7adb8', w: '#f3ead8', O: '#ff8a3d', L: '#7ccf4a', l: '#3f8f2f', E: '#2b2b33',
};

// Eye patterns: left eye drawn at x=4 (mirrored to the right eye), top row y=12.
// A pattern with `wide` spans both eyes (x=3..14).
const EYE_PIX: { rows: string[]; wide?: boolean; mirror?: boolean; dy?: number }[] = [
  { rows: ['WWW', 'WKK', 'WKK'] }, // happy (like the art)
  { rows: ['WWW', 'WKW', 'WKW', 'WWW'] }, // round, centred pupil
  { rows: ['WWWW', 'WWKK', 'WWKK', 'WWWW'], mirror: true }, // big
  { rows: ['.KK.', 'K..K', 'K..K'] }, // content ^^ (thick arcs)
  { rows: ['KKKK', 'WWKK', 'WWKK'] }, // sleepy
  { rows: ['KKKKKKKKKKKK', 'KWWKKKKWWKKK', '.KKKK..KKKK.'], wide: true }, // cool shades
  { rows: ['H.H', 'HHH', '.H.'] }, // heart eyes
  { rows: ['.Y.', 'YYY', '.Y.'] }, // star eyes
  { rows: ['K..', '.KK', 'WWK', 'WKK'], mirror: true, dy: -1 }, // angry brows
  { rows: ['WWW', 'WKK', 'WKK', '...', 'NN.'], mirror: true }, // blushing
];
// Mouth patterns, centered (even widths), top row y=17. Near-black outline + red/white inside.
const MOUTH_PIX: string[][] = [
  ['KKKK', 'KRRK', '.KK.'], // open
  ['K....K', '.KKKK.'], // smile
  ['KKKK', 'KRRK', '.RR.'], // tongue
  ['KKKK', 'KWWK', '.KK.'], // teeth
  ['.KK.', 'KRRK', '.KK.'], // oh
  ['.KKKK.'], // calm
];
// Hats: x offset, bottom row lands on the top of the head. `lift` raises it (halo), `drop` lowers it
// onto the forehead (bandana), `side` paints extra pieces at absolute rows (headphone cups, mirrored).
// 'M' / 'm' = the blob's own body color / shade (cat ears).
const HAT_PIX: { x: number; rows: string[]; lift?: number; drop?: number; side?: { x: number; y: number; rows: string[] } }[] = [
  { x: 0, rows: [] },
  { x: 5, rows: ['K.K..K.K', 'KYKYYKYK', 'KYYYYYYK', 'KYYRYYYK', 'KyyyyyyK', '.KKKKKK.'] }, // crown
  { x: 4, rows: ['...KKKK...', '..KCCCCK..', '.KCCCCCCK.', '.KCCCCCCCKKK', '.KccccccccccK', '..KKKKKKKKKK'] }, // cap
  { x: 10, rows: ['.KWK..', 'KWYWK.', '.KWK..', '..GK..', '..G...'] }, // flower
  { x: 5, rows: ['...YY...', '...KK...', '..KPPK..', '..KPYK..', '.KPPPPK.', '.KYPPPPK', 'KPPPPYPK', 'KppppppK'] }, // party hat
  { x: 4, rows: ['....KK....', '...KWWK...', '..KKKKKK..', '.KBBBBBBK.', 'KBBBBBBBBK', 'KbbbbbbbbK', 'KWWWWWWWWK', '.KKKKKKKK.'] }, // beanie
  { x: 5, rows: ['KK....KK', 'KNK..KNK', 'KNNKKNNK', 'KNNNNNNK', 'KNK..KNK', 'KK....KK'] }, // bow
  { x: 2, rows: ['.....KKKK.....', '....KSSSSK....', '...KSSSSSSK...', '...KCCCCCCK...', 'KKKSSSSSSSSKKK', 'KssssssssssssK', '.KKKKKKKKKKKK.'] }, // straw hat
  { x: 2, rows: ['.....KKKK.....', '..KKKEEEEKKK..', '.KEEEEEEEEEEK.', 'KYEEEEWWEEEEYK', 'KYYYYYYYYYYYYK', '.KKKKKKKKKKKK.'] }, // pirate
  { x: 3, rows: ['........KK..', '.......KPPK.', '......KPPK..', '.....KPPPK..', '....KPPPPPK.', '...KPPPPPPPK', '.KKYYYYYYYYKK', 'KPPPPPPPPPPPK'] }, // wizard
  { x: 1, rows: ['.KK..........KK.', 'KwwK........KwwK', 'KwwK..KKKK..KwwK', '.KwwKKggggKKwwK.', '..KKggggggggKK..', '..KDDDDDDDDDDK..', '..KKKKKKKKKKKK..'] }, // viking
  { x: 4, rows: ['..KKKKKK..', '.KWWWWWWK.', 'KWWWWWWWWK', 'KWWWWWWWWK', '.KWWWWWWK.', '.KwwwwwwK.', '.KKKKKKKK.'] }, // chef
  { x: 3, rows: ['...KKKKKK...', '..KggggggK..', '.KgKKKKKKgK.', 'KgK......KgK', 'KgK......KgK'], side: { x: 0, y: 11, rows: ['.KK', 'KOK', 'KOK', 'KOK', '.KK'] } }, // headphones
  { x: 4, rows: ['.KK....KK.', 'KWNK..KNWK', 'KWNK..KNWK', 'KWNK..KNWK', 'KWNK..KNWK', 'KWWK..KWWK', '.KK....KK.'] }, // bunny ears
  { x: 3, rows: ['K..........K', 'KK........KK', 'KNK......KNK', 'KMNK....KNMK', 'KMMMK..KMMMK'] }, // cat ears
  { x: 4, lift: 2, rows: ['.KKKKKKKK.', 'KYYYYYYYYK', '.KKKKKKKK.'] }, // halo
  { x: 5, rows: ['.KKKKKK.', '.KEEEEK.', '.KEEEEK.', '.KCCCCK.', 'KKKKKKKK', 'KEEEEEEK', '.KKKKKK.'] }, // top hat
  { x: 3, drop: 2, rows: ['.KKKKKKKKK..', 'KCCCCCCCCCKK', 'KCWCCCCCCKCK', '.KKKKKKKKK.K'] }, // bandana
  { x: 7, rows: ['.KK.', 'KYYK', 'KYYK', '.KK.', '.DK.', '.DK.'] }, // antenna
  { x: 4, rows: ['.KK...KK.', 'KLLK.KLLK', 'KlLLKLLlK', '.KKlLlKK.', '...KlK...', '...KlK...'] }, // sprout
];

function rgb(c: number) { return [(c >> 16) & 255, (c >> 8) & 255, c & 255]; }
function css([r, g, b]: number[]) { return `rgb(${r | 0},${g | 0},${b | 0})`; }
function tone(c: number, f: number) {
  const v = rgb(c);
  return css(f >= 1 ? v.map((x) => x + (255 - x) * (f - 1)) : v.map((x) => x * f));
}

// Body shapes. Each returns the half-width of row y (or <0 outside); the face sits on rows 12-19
// so every shape keeps those rows wide enough. TOP[] is the first body row (hats sit on it).
const SHAPE_TOP = [8, 8, 6, 10, 7, 8];
const BOTTOM = 21;
function halfWidth(shape: number, y: number) {
  const top = SHAPE_TOP[shape] ?? 8;
  const t = (y + 0.5 - top) / (BOTTOM + 1 - top);
  if (t < 0 || t > 1) return -1;
  const ease = (k: number) => Math.sin(Math.min(1, k) * Math.PI / 2);
  switch (shape) {
    case 1: return 8 * Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2)) + 0.4; // ball
    case 2: return t > 0.9 ? 6.5 - ((t - 0.9) / 0.1) * 2 : 2.5 + 4 * ease(t / 0.35); // tall
    case 3: return t > 0.8 ? 8 - ((t - 0.8) / 0.2) * 2.2 : 4.5 + 3.5 * ease(t / 0.45); // flat/wide
    case 4: return t > 0.88 ? 8 - ((t - 0.88) / 0.12) * 2.6 : 2.5 + 2 * ease(t / 0.3) + 3.5 * ease(Math.max(0, t - 0.35) / 0.4); // pear
    case 5: return t < 0.08 || t > 0.93 ? 6 : 7.5; // cube with soft corners
    default: return t > 0.86 ? 8 - ((t - 0.86) / 0.14) * 2.6 : 3 + 5 * ease(t / 0.62); // dome
  }
}
let curShape = 0;
function inBody(x: number, y: number) {
  const w = halfWidth(curShape, y);
  return w > 0 && Math.abs(x + 0.5 - 9) <= w;
}

/** Pixel grid of CSS colors (null = transparent). */
export function blobGrid(look: BlobLook): (string | null)[][] {
  const g: (string | null)[][] = Array.from({ length: GRID_H }, () => Array<string | null>(GRID_W).fill(null));
  const set = (x: number, y: number, col: string | null) => { if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H && col) g[y][x] = col; };
  curShape = look.shape;
  const top = SHAPE_TOP[look.shape] ?? 8;
  const mid = tone(look.color, 1), light = tone(look.color, 1.45), dark = tone(look.color, 0.68);
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
    if (inBody(x, y)) {
      let col = mid;
      if (!inBody(x, y + 2) || !inBody(x + 2, y + 1)) col = dark; // bottom/right shade
      // diagonal shine stripe top-left, like the art
      const d = (x - 3.5) + (y - 9.5);
      if (y >= top + 1 && y <= top + 4 && x >= 2 && x <= 7 && d >= 1.5 + (top - 8) && d <= 4 + (top - 8) && inBody(x - 1, y) && inBody(x, y - 1)) col = light;
      set(x, y, col);
    } else if (inBody(x - 1, y) || inBody(x + 1, y) || inBody(x, y - 1) || inBody(x, y + 1)) {
      set(x, y, OUT);
    }
  }

  const paint = (rows: string[], x0: number, y0: number, mirror = false) => rows.forEach((row, ry) => [...row].forEach((ch, rx) => {
    if (ch === '.') return;
    set(mirror ? x0 + row.length - 1 - rx : x0 + rx, y0 + ry, ch === 'M' ? mid : ch === 'm' ? dark : PAL[ch]);
  }));
  const eye = EYE_PIX[look.eyes] ?? EYE_PIX[0];
  const ey = 12 + (eye.dy ?? 0);
  if (eye.wide) paint(eye.rows, 3, ey);
  else { paint(eye.rows, 4, ey); paint(eye.rows, GRID_W - 4 - eye.rows[0].length, ey, eye.mirror); }
  const mouth = MOUTH_PIX[look.mouth] ?? MOUTH_PIX[0];
  paint(mouth, 9 - mouth[0].length / 2, 17);
  const hat = HAT_PIX[look.hat] ?? HAT_PIX[0];
  const hatBottom = Math.min(top + 2 + (hat.drop ?? 0), 11) - (hat.lift ?? 0); // never over the eyes (row 12)
  paint(hat.rows, hat.x, Math.max(0, hatBottom - hat.rows.length));
  if (hat.side) { paint(hat.side.rows, hat.side.x, hat.side.y); paint(hat.side.rows, GRID_W - hat.side.x - hat.side.rows[0].length, hat.side.y, true); }
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
    shape: pick(l.shape, SHAPES.length), eyes: pick(l.eyes, EYES.length), mouth: pick(l.mouth, MOUTHS.length), hat: pick(l.hat, HATS.length),
  };
}

export function randomLook(): BlobLook {
  const r = (n: number) => Math.floor(Math.random() * n);
  return { color: COLORS[r(COLORS.length)], shape: r(SHAPES.length), eyes: r(EYES.length), mouth: r(MOUTHS.length), hat: r(HATS.length) };
}
