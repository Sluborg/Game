// Blobz v2: pixel blobz on Ninja Adventure's 16 px grid (frame 16x18: body up to 16x16 + 2 rows of hat room).
// ONE 3/4 view facing right; facing left = the same picture mirrored. Built from parts:
//   * a bare body per shape (no face) with anchors: eyes, mouth, head top, head sides,
//   * eyes, mouths and hats as separate small sprites drawn once, placed on the anchors at render time,
//   * special rules for items that wrap the head (headphones, bow, class hoods/helmets).
// Hats sit ON the head's top outline row (never inside the head) and come in S/M/L, picked by head width.
// Rendered to a pixel grid of CSS colours, then to canvas (Phaser) or PNG <img> (menus).

export interface BlobLook { color: number; shape: number; eyes: number; mouth: number; hat: number }

export const COLORS = [
  0x5ec8ff, 0xff6b8b, 0x7ddc5a, 0xffc93c, 0xb18cff, 0xff9248,
  0x4fe0c3, 0xf2f2f2, 0xe63946, 0x3d6bff, 0xc08850, 0x9aa0b4,
];
export const SHAPES = ['Kupol', 'Boll', 'Lång', 'Platt', 'Päron', 'Kub'];
export const EYES = ['Prick', 'Stora', 'Glada', 'Sömniga', 'Blink'];
export const MOUTHS = ['Leende', 'Öppen', 'Lugn', 'Flin', 'Katt'];
export const HATS = ['Ingen', 'Keps', 'Krona', 'Grodd', 'Mössa', 'Trollkarl', 'Rosett', 'Lurar',
  'Kattöron', 'Enhörning', 'Kaninöron', 'Djävulshorn', 'Antenn', 'Gloria', 'Drottningkrona'];
/** Dungeon class gear, worn instead of the skin hat (blobGrid's `classHat`). */
export const CLASS_HATS = ['Prästluva', 'Fjädermössa', 'Riddarhjälm', 'Bandana'];
/** Class hat look: 1 = approved round 2 (frozen), 2 = after the N-5 class cards (white hood with trim, white feather,
 *  cream horns, rogue bandana). Mock only until Stefan rates it; Bandana always draws in style 2. */
export const CLASS_HAT_STYLE = { v: 1 };

/** Frame 20x20: the body (up to 16 wide incl. outline) centred at x = 10 with a 2 px margin on each side for muffs,
 *  ears and brims, and 2 extra rows of hat room on top. */
export const GRID_W = 20;
export const GRID_H = 20;
const CX = GRID_W / 2; // body centre column
/** Frames per look: 0 = idle, 1 = glide (squashed). */
export const BLOB_FRAMES = 2;
/** Vertical centre of the body as a fraction of the grid height (sprite origin). */
export const BODY_CY = 13 / 20;

const INK = '#141b1b'; // Ninja Adventure outline
const PAL: Record<string, string> = {
  K: INK, W: '#f0f6f8', P: '#e26880', R: '#e63946', r: '#aa1e2d', Y: '#ffc93c', y: '#d2961e', G: '#62c458', g: '#3e8c42',
  B: '#3f78dc', b: '#2850a0', S: '#78808c', s: '#464c58', V: '#8c5ac8', v: '#5f3796', C: '#fff7e6', T: '#c0c8d4', t: '#8a94a4',
};

// ---------------------------------------------------------------- bodies
/** Body mask widths per row, top to bottom (max 14, so the outline fits in 16). */
const BODY_ROWS: number[][] = [
  [6, 8, 10, 12, 12, 14, 14, 14, 14, 14, 14, 12], // Kupol
  [4, 8, 10, 12, 12, 12, 12, 12, 12, 10, 8], // Boll
  [4, 6, 8, 8, 10, 10, 10, 10, 10, 10, 10, 8], // Lång (12 rows: leaves 5 rows of hat room)
  [8, 12, 14, 14, 14, 14, 14, 14, 12], // Platt
  [4, 6, 6, 8, 8, 10, 12, 12, 14, 14, 14, 12], // Päron
  [10, 12, 12, 12, 12, 12, 12, 12, 12, 12, 10], // Kub
];
const FACE_X = CX + 1; // 3/4 view: the face sits right of the body centre

type Px = Map<number, string>; // key = y * GRID_W + x
const key = (x: number, y: number) => y * GRID_W + x;

// ---------------------------------------------------------------- feature sprites (rows, anchor x, anchor y)
type Sprite = { rows: string[]; ax: number; ay: number };
const sp = (rows: string[], ax: number, ay = 0): Sprite => ({ rows, ax, ay });
/** Eyes: anchor = centre column, top row. */
const EYE_SPRITES: Sprite[] = [
  sp(['WW.WW', 'WK.WK'], 2), // Prick
  sp(['WW.WW', 'WK.WK', 'WK.WK'], 2), // Stora
  sp(['.K..K.', 'K.KK.K'], 3), // Glada
  sp(['KK.KK'], 2), // Sömniga
  sp(['WW...', 'WK.KK'], 2), // Blink
];
/** Mouths: anchor = centre column, top row. */
const MOUTH_SPRITES: Sprite[] = [
  sp(['K..K', '.KK.'], 2), // Leende
  sp(['KKK', 'KPK', '.K.'], 1), // Öppen
  sp(['KKK'], 1), // Lugn
  sp(['KKKK', 'KWWK', '.KK.'], 2), // Flin
  sp(['K.K', '.K.'], 1), // Katt
];
const MAX_EYE = Math.max(...EYE_SPRITES.map((s) => s.rows.length));
const MAX_MOUTH = Math.max(...MOUTH_SPRITES.map((s) => s.rows.length));

function cap(cw: number, h: number, bill: number): Sprite {
  const rows = ['.' + 'R'.repeat(cw - 2) + '.' + '.'.repeat(bill)];
  for (let i = 1; i < h - 1; i++) rows.push('R'.repeat(cw) + '.'.repeat(bill));
  rows.push('R'.repeat(cw) + 'r'.repeat(bill)); // the bill sticks out toward the face (3/4 view, right)
  return sp(rows, cw >> 1, h - 1);
}
/** Hats that sit on the head, in sizes S / M / L (anchor = crown centre, bottom row). */
const HAT_SIZES: Record<string, Sprite[]> = {
  Keps: [cap(6, 2, 2), cap(8, 3, 3), cap(10, 3, 4)],
  Krona: [sp(['Y.Y.Y', 'YYYYY'], 2, 1), sp(['Y..Y..Y', 'YY.Y.YY', 'YYYYYYY'], 3, 2), sp(['Y...Y...Y', 'YY.YRY.YY', 'YYYYYYYYY'], 4, 2)],
  Grodd: [sp(['GG.GG', '.GgG.', '..g..'], 2, 2), sp(['GG.GG', '.GgG.', '..g..'], 2, 2), sp(['GGG.GGG', '.GGgGG.', '...g...'], 3, 2)],
  Mössa: [sp(['..WW..', '.BBBB.', 'bbbbbb'], 3, 2), sp(['...WW...', '..BBBB..', '.BBBBBB.', 'bbbbbbbb'], 4, 3),
    sp(['....WW....', '..BBBBBB..', '.BBBBBBBB.', 'bbbbbbbbbb'], 5, 3)],
  Trollkarl: [sp(['...V...', '..VVV..', '.VVVVV.', 'vvvvvvv'], 3, 3), sp(['....V....', '...VVV...', '..VVVVV..', 'vvvvvvvvv'], 4, 3),
    sp(['.....V.....', '....VVV....', '...VVVVV...', '..VVVVVVV..', 'vvvvvvvvvvv'], 5, 4)],
};
const BOW = sp(['RR.RR', 'RrRrR', 'RR.RR'], 2, 1);
/** "Top changers" that grow out of the head (S / M / L). pair: left piece, the right one is mirrored and sits at
 *  the other end of the head's top row; centre: one piece on top; float: hovers above (halo). M / m / P = the blob's
 *  own colour, its shade and an inner-ear pink. Anchor = bottom row; for pairs the outer column. */
type Top = { kind: 'pair' | 'fixed' | 'centre' | 'float'; sizes: Sprite[] };
const TOPS: Record<string, Top> = {
  // cat ears: never smaller than 3x3, tips pointing outward
  Kattöron: { kind: 'pair', sizes: [sp(['M..', 'MM.', 'MPM'], 0, 2), sp(['M..', 'MM.', 'MPM'], 0, 2), sp(['M...', 'MM..', 'MPM.', 'MPPM'], 0, 3)] },
  // bunny ears: one size, rounded tops, the same spacing on every head ('fixed')
  Kaninöron: { kind: 'fixed', sizes: [0, 1, 2].map(() => sp(['MM', 'MP', 'MP', 'MP'], 0, 3)) }, // the approved dome/ball ears
  // devil horns: wide base on the head, curving out and up to a tip
  Djävulshorn: { kind: 'pair', sizes: [sp(['R..', 'Rr.', '.rR'], 0, 2), sp(['R...', 'R...', 'Rr..', '.rRR'], 0, 3), sp(['R....', 'R....', 'Rr...', '.Rr..', '..rRR'], 0, 4)] },
  // unicorn: a white spiral horn pointing forward (toward the face)
  Enhörning: { kind: 'centre', sizes: [sp(['..W', '.Wt', 'WW.'], 0, 2), sp(['...W', '..Wt', '.tW.', 'WWt.'], 0, 3), sp(['..Y', '.Yy', '.yY', 'Yy.', 'YYy'], 1, 4)] }, // L: approved as is (frozen)
  // alien antennas: two stalks in the blob's own colour with a ball on top
  Antenn: { kind: 'pair', sizes: [sp(['MM', 'MM', '.m', '.m'], 0, 3), sp(['MM', 'MM', '.m', '.m'], 0, 3), sp(['MM.', 'MM.', '.m.', '..m', '..m'], 0, 4)] },
  Gloria: { kind: 'float', sizes: [sp(['.YYYY.', 'Y....Y', '.YYYY.'], 3, 2), sp(['.YYYY.', 'Y....Y', '.YYYY.'], 3, 2), sp(['.YYYYYY.', 'Y......Y', '.YYYYYY.'], 4, 2)] },
};

/** Part tables, exported for tests only. */
export const PART_TABLES = { bodies: BODY_ROWS, eyes: EYE_SPRITES, mouths: MOUTH_SPRITES, hats: HAT_SIZES, tops: TOPS, palette: PAL };

// ---------------------------------------------------------------- layout
export interface BodyLayout {
  rows: number[]; mask: Set<number>; top: number; bottom: number;
  eye: [number, number]; mouth: [number, number]; headW: number; earY: number;
}

/** Body mask + anchors for a shape and frame. Exported for tests. */
export function bodyLayout(shape: number, frame = 0): BodyLayout {
  let ws = [...(BODY_ROWS[shape] ?? BODY_ROWS[0])];
  if (frame === 1) {
    if (ws.length > 9) ws = ws.slice(1); // glide: one row lower (the flat body only widens)
    ws = ws.map((w, i) => (i >= ws.length >> 1 ? Math.min(14, w + 2) : w));
  }
  const bottom = GRID_H - 2, h = ws.length, top = bottom - h + 1;
  const mask = new Set<number>();
  ws.forEach((w, i) => { for (let x = CX - (w >> 1); x < CX - (w >> 1) + w; x++) mask.add(key(x, top + i)); });
  // eyes start ~28% down, on rows at least 10 wide; the mouth sits under the TALLEST eyes + a gap of 2 (1 if short)
  let r = Math.max(1, Math.round(h * 0.28));
  while (r < h && Array.from({ length: MAX_EYE }, (_, k) => ws[Math.min(h - 1, r + k)]).some((w) => w < 10)) r++;
  const space = h - 2 - (r + MAX_EYE - 1);
  const gap = space >= MAX_MOUTH + 2 ? 2 : 1;
  if (space < MAX_MOUTH + 1) r = Math.max(1, r - (MAX_MOUTH + 1 - space));
  const eyeY = top + r;
  return {
    rows: ws, mask, top, bottom, eye: [FACE_X, eyeY], mouth: [FACE_X, eyeY + MAX_EYE + gap],
    headW: ws[Math.min(1, h - 1)], earY: top + Math.min(3, Math.floor(h / 3)),
  };
}

function spritePx(s: Sprite, ax: number, ay: number, extra: Record<string, string> = {}, mirror = false): Px {
  const out: Px = new Map();
  s.rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === '.') return;
    const dx = mirror ? -(i - s.ax) : i - s.ax; // mirrored: the piece grows the other way from its anchor
    out.set(key(ax + dx, ay - s.ay + j), extra[ch] ?? PAL[ch]);
  }));
  return out;
}
function outlineOf(pts: Set<number>): Set<number> {
  const out = new Set<number>();
  for (const k of pts) {
    const x = k % GRID_W, y = Math.floor(k / GRID_W);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H && !pts.has(key(nx, ny))) out.add(key(nx, ny));
    }
  }
  return out;
}
/** Top outline row of the body at column x (the row a hat brim sits on). */
function topOutline(mask: Set<number>, x: number) {
  for (let y = 0; y < GRID_H; y++) if (mask.has(key(x, y))) return y - 1;
  return GRID_H;
}

/** Hat size by head width (second body row): S below 8 px, M 8-10, L 11+. */
export function hatSize(headW: number) { return headW < 8 ? 0 : headW <= 10 ? 1 : 2; }

/** Fitted hats follow the head's curve: the hat body is the scalp (head rows above the eyes) plus the outline ring
 *  around it, so its bottom edge hugs the head and wraps a little down the sides; the decoration goes on top. */
export const FITTED = ['Keps', 'Krona', 'Mössa', 'Trollkarl', 'Drottningkrona'];
/** A band of even thickness along the head's top outline: the outline ring above `yLim` plus the head pixels within
 *  `depth` steps of it. `line` = the next layer in: the hat's bottom border, which steps down with the head's curve. */
function headBand(L: BodyLayout, depth: number, yLim: number): { body: Set<number>; line: Set<number> } {
  const dist = new Map<number, number>();
  let front = [...outlineOf(L.mask)];
  for (const k of front) dist.set(k, 0);
  for (let d = 1; front.length && d <= depth + 1; d++) {
    const next: number[] = [];
    for (const k of front) {
      const x = k % GRID_W, y = Math.floor(k / GRID_W);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = key(x + dx, y + dy);
        if (L.mask.has(n) && !dist.has(n)) { dist.set(n, d); next.push(n); }
      }
    }
    front = next;
  }
  const body = new Set<number>(), line = new Set<number>();
  for (const [k, d] of dist) {
    const y = Math.floor(k / GRID_W);
    if (y > yLim) continue;
    if (d <= depth) body.add(k); else if (L.mask.has(k)) line.add(k);
  }
  // close the band's ends: the head pixel right under its lowest pixels on each side
  for (const k of body) {
    const below = k + GRID_W;
    if (Math.floor(k / GRID_W) === yLim && L.mask.has(below) && !body.has(below)) line.add(below);
  }
  for (const k of line) if (Math.floor(k / GRID_W) > L.eye[1] - 2) line.delete(k); // never touch the row above the eyes' gap
  return { body, line };
}

function fittedHat(name: string, L: BodyLayout, size: number): { px: Px; line: Set<number> } {
  // the hat band follows the head's curve; it stays >= 1 free row above the eyes
  const yLim = Math.max(L.top - 1, Math.min(L.earY, L.eye[1] - 3)); // a very short head (Platt): the outline row only
  const band = headBand(L, 1, yLim);
  const body = band.body;
  const xs = [...body].map((k) => k % GRID_W), x0 = Math.min(...xs), x1 = Math.max(...xs);
  const col = { Keps: ['R', 'r'], Krona: ['Y', 'y'], Drottningkrona: ['Y', 'y'], Mössa: ['B', 'b'], Trollkarl: ['V', 'v'] }[name]!;
  const px: Px = new Map();
  for (const k of body) px.set(k, PAL[(k % GRID_W) > x0 + ((x1 - x0) * 2) / 3 ? col[1] : col[0]]);
  const topY = Math.min(...[...body].map((k) => Math.floor(k / GRID_W)));
  const at = (x: number, y: number, c: string) => px.set(key(x, y), PAL[c]);
  const cx = (x0 + x1) >> 1;
  if (name === 'Keps') { // rounded crown above the scalp + a bill sticking out toward the face (right)
    const w = x1 - x0 + 1;
    for (let x = x0 + 2; x <= x1 - 2; x++) at(x, topY - 1, x > x0 + (w * 2) / 3 ? 'r' : 'R');
    const billY = Math.max(...[...body].map((k) => Math.floor(k / GRID_W))), bx = Math.max(...[...body].filter((k) => Math.floor(k / GRID_W) === billY).map((k) => k % GRID_W));
    for (let i = 1; i <= 2 + size && bx + i <= GRID_W - 2; i++) at(bx + i, billY, 'r'); // the bill (its outline stays in the frame)
  } else if (name === 'Mössa') { // knit band + pompom
    for (let x = x0 + 2; x <= x1 - 2; x++) at(x, topY - 1, 'B');
    at(cx, topY - 2, 'W'); at(cx + 1, topY - 2, 'W');
  } else if (name === 'Krona') { // classic crown: three spikes (left, middle, right), jewels on the band
    // every head gets the approved cube crown: three spikes 3 tall; narrow bands use 1-px spike bases so they stay apart
    const wide = x1 - x0 + 1 >= 10;
    if (wide) for (const sx of [x0 + 1, cx, x1 - 1]) {
      at(sx - 1, topY - 1, 'Y'); at(sx + 1, topY - 1, 'y'); at(sx, topY - 1, 'Y'); at(sx, topY - 2, 'Y'); at(sx, topY - 3, 'Y');
    } else { // narrow band: a solid rim row, two outer spikes and a taller middle one
      for (let x = x0 + 1; x <= x1 - 1; x++) at(x, topY - 1, x > cx ? 'y' : 'Y');
      at(x0 + 1, topY - 2, 'Y'); at(x1 - 1, topY - 2, 'y');
      at(cx, topY - 2, 'Y'); at(cx, topY - 3, 'Y');
    }
    at(cx, topY, 'R');
  } else if (name === 'Drottningkrona') { // the queen crown: little points all along the band
    for (let x = x0 + 1; x <= x1 - 1; x += 2) { at(x, topY - 1, 'Y'); if (size > 0 && (x - x0) % 4 === 1) at(x, topY - 2, 'Y'); }
    at(cx, topY - 1, 'R');
  } else if (name === 'Trollkarl') { // cone, leaning toward the face
    const h = Math.min(3 + size, topY - 3); // approved height (as in the old 16x18 frame, 2 rows lower)
    for (let j = 1; j <= h; j++) {
      const half = Math.max(0, Math.round(((x1 - x0) / 2 - 1) * (1 - j / (h + 1))));
      for (let x = cx - half + (j > h - 2 ? 1 : 0); x <= cx + half + (j > h - 2 ? 1 : 0); x++) at(x, topY - j, x > cx ? 'v' : 'V');
    }
  }
  let line = band.line;
  if ((name === 'Krona' || name === 'Drottningkrona') && line.size === 0) { // short head: lift the crown one row, so the
    const up: Px = new Map(); // head's own outline row becomes its dark bottom border and the eyes stay free
    for (const [k, c] of px) up.set(k - GRID_W, c);
    return { px: up, line };
  }
  return { px, line };
}

// ---------------------------------------------------------------- look direction (compat + new)
/** Where a blob looks. Only dx's sign matters now (dx < 0 = facing left = mirrored); dy is ignored. */
export interface Face { dx: number; dy: number }
/** Kept for the game code: 9 directions, index 0 = centre, then N, NE, E, SE, S, SW, W, NW. */
export const FACE_DIRS: Face[] = [
  { dx: 0, dy: 0 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 0 }, { dx: 1, dy: 1 },
  { dx: 0, dy: 1 }, { dx: -1, dy: 1 }, { dx: -1, dy: 0 }, { dx: -1, dy: -1 },
];
/** Velocity -> index into FACE_DIRS (0 when slower than `dead`, in the same units as vx/vy). */
export function faceIndex(vx: number, vy: number, dead = 0.15): number {
  if (Math.hypot(vx, vy) < dead) return 0;
  const oct = Math.round(Math.atan2(vx, -vy) / (Math.PI / 4));
  return 1 + ((oct % 8) + 8) % 8;
}
export type Facing = 'left' | 'right';
/** Facing from velocity: left/right by vx; `prev` is kept while slower than `dead` or moving straight up/down. */
export function facingFromVelocity(vx: number, vy: number, dead = 0.15, prev: Facing = 'right'): Facing {
  if (Math.hypot(vx, vy) < dead || Math.abs(vx) < dead * 0.5) return prev;
  return vx < 0 ? 'left' : 'right';
}

// ---------------------------------------------------------------- render
function shade(c: number, f: number) {
  const ch = [(c >> 16) & 255, (c >> 8) & 255, c & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
}

/** The classic crown ("Tre Kronor"): straight walls, a flat band, three spikes of equal height, sitting ON the head with
 *  the head's top outline row as its dark bottom border. */
function classicCrown(L: BodyLayout): Px {
  const xa = CX - (L.rows[0] >> 1) - 1, xb = CX + (L.rows[0] >> 1), y = L.top - 2, w = xb - xa + 1;
  const px: Px = new Map();
  const mid = w % 2 ? [xa + (w >> 1)] : [xa + (w >> 1) - 1, xa + (w >> 1)];
  for (let x = xa; x <= xb; x++) {
    const shade = x > xa + (w * 2) / 3 ? PAL.y : PAL.Y;
    px.set(key(x, y), PAL.y); px.set(key(x, y - 1), shade); // band + body
    if (x === xa || x === xb || mid.includes(x)) px.set(key(x, y - 2), shade); // three equal tips
  }
  for (const m of mid) px.set(key(m, y), PAL.R); // a jewel on the band
  return px;
}

/** Dungeon class gear (CLASS_HATS), fitted to the head's curve. */
function gear(px: Px, L: BodyLayout, classHat: number) {
  const short = L.eye[1] - 3 < L.top; // Platt: no scalp row to cover above the eyes
  const ring = outlineOf(L.mask);
  let body: Set<number>, line: Set<number>;
  if (short) { // a band around the head instead: outline ring + one more ring outside, the head's top row as the border
    const ring2 = outlineOf(new Set([...L.mask, ...ring]));
    const lx = CX - (L.rows[0] >> 1) - 1, rx = CX + (L.rows[0] >> 1); // no wider than the head's top row + its outline
    const inX = (k: number) => k % GRID_W >= lx && k % GRID_W <= rx;
    if (classHat === 0) { // priest: the hood ends on a full dark line along the head's top row (outline columns included)
      body = new Set([...ring, ...ring2].filter((k) => Math.floor(k / GRID_W) < L.top && inX(k)));
      line = new Set([...L.mask, ...ring].filter((k) => Math.floor(k / GRID_W) === L.top && inX(k)));
    } else {
      body = new Set([...ring, ...ring2].filter((k) => Math.floor(k / GRID_W) < L.top + 1 && Math.floor(k / GRID_W) <= L.earY && inX(k)));
      line = new Set([...L.mask].filter((k) => Math.floor(k / GRID_W) === L.top));
    }
  } else ({ body, line } = headBand(L, classHat === 0 && (CLASS_HAT_STYLE.v === 2) ? 3 : 2, L.eye[1] - (classHat === 0 && CLASS_HAT_STYLE.v === 2 ? 2 : 3)));
  const v2 = CLASS_HAT_STYLE.v === 2 || classHat === 3;
  const [fill, sh] = classHat === 0 ? (v2 ? [PAL.W, '#c8d0dc'] : [PAL.C, '#e2cfb2']) : classHat === 1 ? [PAL.G, PAL.g]
    : classHat === 2 ? [PAL.T, PAL.t] : ['#5a4a86', '#3e3263'];
  const xs = [...body].map((k) => k % GRID_W), x0 = Math.min(...xs), x1 = Math.max(...xs), cx = (x0 + x1) >> 1;
  const ys = [...body].map((k) => Math.floor(k / GRID_W)), topY = Math.min(...ys), botY = Math.max(...ys.filter((y) => y < L.eye[1]));
  const extra: Px = new Map();
  const at = (x: number, y: number, c: string) => extra.set(key(x, y), c);
  if (classHat === 1) { // archer cap: peak pointing forward, feather in the middle pointing up and back
    for (let x = cx; x <= x1 + 1; x++) at(x, topY - 1, x > cx + 2 ? PAL.g : PAL.G);
    at(x1 + 1, topY, PAL.g); if (x1 + 2 <= GRID_W - 2) at(x1 + 2, topY, PAL.g);
    if (v2) { // a white feather at the back of the cap, pointing up and back
      const len = Math.min(4, topY - 3);
      for (let i = 0; i < len; i++) { const fx = x0 + 2 - (i >> 1); if (fx >= 2) at(fx, topY - 1 - i, i === len - 1 ? '#c8d0dc' : PAL.W); }
    } else {
      const len = Math.min(4, topY - 4);
      for (let i = 1; i <= len; i++) at(cx - (i >> 1), topY - 1 - i, i === len ? PAL.r : PAL.R);
    }
  } else if (classHat === 2) { // viking helm: steel cap on the head's curve, a raised dome, rivets, two yellow horns
    for (let x = x0 + 2; x <= x1 - 2; x++) at(x, topY - 1, x > x0 + ((x1 - x0) * 2) / 3 ? PAL.t : PAL.T); // the dome rises
    for (let x = x0 + 1; x <= x1 - 1; x += 3) if (body.has(key(x, botY))) at(x, botY, '#f4f7fa'); // rivets on the rim
    const [hY, hy] = v2 ? ['#f2e6c8', '#cbb98e'] : [PAL.Y, PAL.y]; // style 2: cream horns like the tank card
    for (const [hx, dir] of [[x0, 1], [x1, -1]] as [number, number][]) { // horns: out from the cap, up, tips curling in
      at(hx + dir, topY - 1, hy); at(hx, topY - 1, hY); at(hx, topY - 2, hY); at(hx + dir, topY - 3, hY);
    }
    if (v2) for (let y = topY - 1; y <= botY; y++) if (!extra.has(key(cx, y)) || y === topY - 1) at(cx, y, PAL.t); // centre ridge
  } else if (classHat === 0 && v2) { // hood: a soft raised top, then it falls down the back of the head (left)
    for (let x = x0 + 1; x <= x1 - 2; x++) at(x, topY - 1, x > x0 + ((x1 - x0) * 2) / 3 ? sh : fill);
    for (let y = botY + 1; y <= Math.min(L.eye[1] + 2, L.bottom - 2); y++) {
      let xl = GRID_W; for (let x = 0; x < GRID_W; x++) if (L.mask.has(key(x, y))) { xl = x; break; }
      if (xl >= GRID_W || xl >= FACE_X - 2) continue;
      at(xl, y, sh); if (xl - 1 >= 2) at(xl - 1, y, fill);
    }
  } else if (classHat === 3) { // bandana: knot at the back, two tails flying back
    const ky = botY;
    for (const [dx, dy, c] of [[-1, 0, '#6a5296'], [-2, 0, '#6a5296'], [-2, 1, '#6a5296'], [-3, 1, fill], [-3, 2, fill], [-1, 1, sh]] as [number, number, string][])
      if (x0 + dx >= 2) at(x0 + dx, ky + dy, c);
  }
  const all = new Set([...body, ...extra.keys()]);
  for (const k of outlineOf(all)) if (!L.mask.has(k) || Math.floor(k / GRID_W) < L.eye[1] - 1) if (!line.has(k)) px.set(k, INK);
  for (const k of line) if (Math.floor(k / GRID_W) < L.eye[1]) px.set(k, INK);
  for (const k of body) px.set(k, (k % GRID_W) > x0 + ((x1 - x0) * 2) / 3 ? sh : fill);
  for (const [k, c] of extra) px.set(k, c);
  if (classHat === 0 && v2) { // hood trim: a tan edge where the hood meets the face
    for (const k of body) { const b = k + GRID_W; if (L.mask.has(b) && !body.has(b) && !extra.has(b)) px.set(k, '#e8a050'); }
  }
  if (classHat === 0 && !v2) { // priest: a raised cream badge with a red cross, front-middle of the hood
    const bx = FACE_X - 1, by = Math.min(topY + 1, L.eye[1] - 3);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const edge = Math.abs(dx) === 2 || Math.abs(dy) === 2;
      if (Math.abs(dx) === 2 && Math.abs(dy) === 2) continue;
      if (by + dy >= L.eye[1]) continue;
      px.set(key(bx + dx, by + dy), edge ? INK : (dx === 0 || dy === 0) ? PAL.R : PAL.C);
    }
  }
}

/** Pixel grid of CSS colours (null = transparent). `classHat`: index into CLASS_HATS, replaces the skin hat.
 *  `face`: dx < 0 = facing left (mirrored). `frame`: 0 idle, 1 glide. */
export function blobGrid(look: BlobLook, classHat?: number, face?: Face, frame = 0): (string | null)[][] {
  const L = bodyLayout(look.shape, frame);
  const px: Px = new Map();
  let mask = new Set(L.mask);
  const hatName = classHat === undefined ? HATS[look.hat] ?? 'Ingen' : '';
  const sized = FITTED.includes(hatName) ? undefined : HAT_SIZES[hatName];
  let hat: Px | null = null;
  const classic = hatName === 'Krona' && look.shape !== 5; // the cube keeps its approved fitted crown
  const fitted = FITTED.includes(hatName) && !classic ? fittedHat(hatName, L, hatSize(L.headW)) : null;
  if (sized) {
    // brim ON the head's top outline row at the crown's centre; never inside the head
    const spr = sized[hatSize(L.headW)];
    const cx = CX;
    hat = spritePx(spr, cx, topOutline(mask, cx));
    for (const k of hat.keys()) mask.delete(k); // a pointy top under a hat is covered, not poking through
  }
  // body
  const base = shade(look.color, 1), dark = shade(look.color, 0.72), white = '#ffffff';
  for (const k of mask) {
    const x = k % GRID_W, y = Math.floor(k / GRID_W);
    const edge = !mask.has(key(x, y + 1)) || (!mask.has(key(x + 1, y)) && y > L.top + 2);
    px.set(k, edge ? dark : base);
  }
  for (const k of outlineOf(mask)) px.set(k, INK);
  const gy = L.top + 1, gx = CX - (L.rows[1] >> 1) + 1; // glint on the back (left) side
  for (const [x, y] of [[gx, gy], [gx + 1, gy], [gx, gy + 1]]) if (mask.has(key(x, y))) px.set(key(x, y), white);
  // class hoods / helmets wrap the head above the eyes
  if (classHat !== undefined) gear(px, L, classHat);
  // face
  const inBody = (k: number) => L.mask.has(k);
  for (const [k, c] of spritePx(EYE_SPRITES[look.eyes] ?? EYE_SPRITES[0], L.eye[0], L.eye[1])) if (inBody(k)) px.set(k, c);
  for (const [k, c] of spritePx(MOUTH_SPRITES[look.mouth] ?? MOUTH_SPRITES[0], L.mouth[0], L.mouth[1])) if (inBody(k)) px.set(k, c);
  // hats
  if (classic) {
    const crown = classicCrown(L);
    for (const k of outlineOf(new Set(crown.keys()))) if (!L.mask.has(k)) px.set(k, INK);
    for (const [k, c] of crown) px.set(k, c);
  } else if (fitted) {
    const keys = new Set(fitted.px.keys());
    for (const k of outlineOf(keys)) if (!L.mask.has(k)) px.set(k, INK);
    for (const k of fitted.line) px.set(k, INK);
    for (const [k, c] of fitted.px) px.set(k, c);
  } else if (hat) {
    for (const k of outlineOf(new Set(hat.keys()))) if (!mask.has(k)) px.set(k, INK); // the hat's own outline, never over the head
    for (const [k, c] of hat) px.set(k, c);
  } else if (hatName === 'Rosett') { // a hair bow on the forehead, right above the eyes (it may cover the outline)
    const by = Math.max(L.top - 1, L.eye[1] - 3); // bottom row 2 above the eyes: one clear row (Platt keeps its approved spot)
    const bow = spritePx(BOW, FACE_X, by);
    for (const k of outlineOf(new Set(bow.keys()))) if (Math.floor(k / GRID_W) <= by + 1) px.set(k, INK);
    for (const [k, c] of bow) px.set(k, c);
  } else if (hatName === 'Lurar') { // ear muffs: a headband one px outside the head's outline + muffs at ear height
    const ring = outlineOf(L.mask);
    const band = new Set([...outlineOf(new Set([...L.mask, ...ring]))].filter((k) => Math.floor(k / GRID_W) < L.earY));
    for (const k of outlineOf(band)) if (!L.mask.has(k) && !ring.has(k)) px.set(k, INK);
    for (const k of band) px.set(k, '#2c3038'); // black headband with a dark grey shade
    const row = L.rows[L.earY - L.top], xl = CX - (row >> 1) - 1, xr = CX + (row >> 1);
    const cups = new Set<number>();
    const big = look.shape !== 1; // Boll: approved as is
    // 3-wide muffs; on the widest heads the outer column gives way so the muff's outline stays inside the frame
    const xsC = (big ? [xl - 2, xl - 1, xl, xr, xr + 1, xr + 2] : [xl - 1, xl, xr, xr + 1]).filter((x) => x >= 1 && x <= GRID_W - 2);
    const dys = big ? [-2, -1, 0, 1, 2] : [-1, 0, 1];
    for (const x of xsC) for (const dy of dys) if (x >= 0 && x < GRID_W && !L.mask.has(key(x, L.earY + dy))) cups.add(key(x, L.earY + dy));
    for (const k of outlineOf(cups)) if (!L.mask.has(k)) px.set(k, INK);
    for (const k of cups) px.set(k, Math.floor(k / GRID_W) === L.earY - 1 ? '#4a505a' : '#2c3038');
  } else if (TOPS[hatName]) { // top changers: grow out of the head's top outline row (pairs at both ends of the top row)
    const t = TOPS[hatName], spr = t.sizes[hatSize(L.headW)];
    const own = { M: base, m: dark, P: '#f4a0b4' };
    const oy = L.top - 1; // the top outline row: the pieces' bottom row replaces it, so they grow out of the head
    const parts: Px[] = [];
    if (t.kind === 'pair' || t.kind === 'fixed') { // at the ends of the second row (or fixed spacing), on each column's outline
      const half = t.kind === 'fixed' ? 4 : L.rows[1] >> 1, xl = CX - half, xr = CX + half - 1;
      if (t.kind === 'fixed' && L.rows[2] < 8) { // Päron: ears on the shoulders of the pointy top, the dome/ball length, no legs
        parts.push(spritePx(spr, CX - 3, topOutline(L.mask, CX - 2), own), spritePx(spr, CX + 2, topOutline(L.mask, CX + 1), own, true));
      } else if (t.kind === 'fixed' && L.rows[1] < 8) { // narrow head (Lång): full-length ears from the highest point, legs reach down
        for (const [x, mir] of [[xl, false], [xr, true]] as [number, boolean][]) {
          const cols = [x, mir ? x - 1 : x + 1];
          const y = Math.min(...cols.map((c) => topOutline(L.mask, c)));
          const piece = spritePx(spr, x, y, own, mir);
          for (const c of cols) for (let yy = y + 1; yy <= topOutline(L.mask, c); yy++) piece.set(key(c, yy), own.M);
          parts.push(piece);
        }
      } else parts.push(spritePx(spr, xl, topOutline(L.mask, xl), own), spritePx(spr, xr, topOutline(L.mask, xr), own, true));
    } else if (t.kind === 'centre') parts.push(spritePx(spr, FACE_X, oy, own));
    else parts.push(spritePx(spr, CX, oy - 1, own)); // halo: one free row above the head
    const all = new Map(parts.flatMap((p) => [...p]).filter(([k]) => !L.mask.has(k))); // grows out of, never into, the head
    for (const k of outlineOf(new Set(all.keys()))) if (!L.mask.has(k)) px.set(k, INK);
    for (const [k, c] of all) px.set(k, c);
  }
  const g: (string | null)[][] = Array.from({ length: GRID_H }, () => Array<string | null>(GRID_W).fill(null));
  for (const [k, c] of px) {
    const x = k % GRID_W, y = Math.floor(k / GRID_W);
    if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) g[y][x] = c;
  }
  if (face && face.dx < 0) g.forEach((r) => r.reverse());
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
export function blobCanvas(look: BlobLook, scale = 1, classHat?: number, face?: Face, frame = 0): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = GRID_W * scale; c.height = GRID_H * scale;
  const ctx = c.getContext('2d')!;
  blobGrid(look, classHat, face, frame).forEach((row, y) => row.forEach((col, x) => {
    if (!col) return;
    ctx.fillStyle = col;
    ctx.fillRect(x * scale, y * scale, scale, scale);
  }));
  return c;
}

// Menus show blobz as PNG <img> (not inline SVG): phone "force dark" modes recolor inline SVG fills,
// raster images are left alone. Cached per look.
const pngCache = new Map<string, string>();
export function blobEl(look: BlobLook, cls = 'blob') {
  const k = JSON.stringify(look);
  let url = pngCache.get(k);
  if (!url) { url = blobCanvas(look, 6).toDataURL('image/png'); pngCache.set(k, url); }
  const s = document.createElement('span');
  s.className = cls;
  const img = new Image();
  img.src = url; img.alt = ''; img.draggable = false;
  s.append(img);
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
