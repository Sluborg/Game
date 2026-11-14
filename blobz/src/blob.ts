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
  'Kattöron', 'Enhörning', 'Kaninöron', 'Djävulshorn', 'Antenn', 'Gloria'];
/** Dungeon class gear, worn instead of the skin hat (blobGrid's `classHat`). */
export const CLASS_HATS = ['Prästluva', 'Fjädermössa', 'Riddarhjälm'];

export const GRID_W = 16;
export const GRID_H = 18;
/** Frames per look: 0 = idle, 1 = glide (squashed). */
export const BLOB_FRAMES = 2;
/** Vertical centre of the body as a fraction of the grid height (sprite origin). */
export const BODY_CY = 11 / 18;

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
const FACE_X = 9; // 3/4 view: the face sits right of the body centre (8)

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
type Top = { kind: 'pair' | 'centre' | 'float'; sizes: Sprite[] };
const TOPS: Record<string, Top> = {
  Kattöron: { kind: 'pair', sizes: [sp(['M.', 'MM'], 0, 1), sp(['M..', 'MM.', 'MPM'], 0, 2), sp(['M...', 'MM..', 'MPM.', 'MPPM'], 0, 3)] },
  Kaninöron: { kind: 'pair', sizes: [sp(['MM', 'MP', 'MP'], 0, 2), sp(['MM', 'MP', 'MP', 'MP'], 0, 3), sp(['.MM', 'MPM', 'MPM', 'MPM', 'MPM'], 0, 4)] },
  Djävulshorn: { kind: 'pair', sizes: [sp(['R.', 'RR'], 0, 1), sp(['R..', 'Rr.', '.RR'], 0, 2), sp(['R...', 'Rr..', '.Rr.', '..RR'], 0, 3)] },
  Enhörning: { kind: 'centre', sizes: [sp(['Y', 'y', 'Y'], 0, 2), sp(['.Y', 'Yy', 'yY', 'YY'], 1, 3), sp(['..Y', '.Yy', '.yY', 'Yy.', 'YYy'], 1, 4)] },
  Antenn: { kind: 'centre', sizes: [sp(['R', 'K', 'K'], 0, 2), sp(['RR', 'RR', '.K', '.K'], 1, 3), sp(['RR.', 'RR.', '.K.', '.K.', '.K.'], 1, 4)] },
  Gloria: { kind: 'float', sizes: [sp(['YYYY'], 2, 0), sp(['.YYYY.', 'Y....Y', '.YYYY.'], 3, 2), sp(['.YYYYYY.', 'Y......Y', '.YYYYYY.'], 4, 2)] },
};
const PLUME = sp(['.R', 'RR', 'R.'], 1, 2);
const FEATHER = sp(['R.', 'RR', '.R', '.R'], 0, 3);

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
  ws.forEach((w, i) => { for (let x = 8 - (w >> 1); x < 8 - (w >> 1) + w; x++) mask.add(key(x, top + i)); });
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
export const FITTED = ['Keps', 'Krona', 'Mössa', 'Trollkarl'];
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
  const col = { Keps: ['R', 'r'], Krona: ['Y', 'y'], Mössa: ['B', 'b'], Trollkarl: ['V', 'v'] }[name]!;
  const px: Px = new Map();
  for (const k of body) px.set(k, PAL[(k % GRID_W) > x0 + ((x1 - x0) * 2) / 3 ? col[1] : col[0]]);
  const topY = Math.min(...[...body].map((k) => Math.floor(k / GRID_W)));
  const at = (x: number, y: number, c: string) => px.set(key(x, y), PAL[c]);
  const cx = (x0 + x1) >> 1;
  if (name === 'Keps') { // rounded crown above the scalp + a bill sticking out toward the face (right)
    const w = x1 - x0 + 1;
    for (let x = x0 + 2; x <= x1 - 2; x++) at(x, topY - 1, x > x0 + (w * 2) / 3 ? 'r' : 'R');
    const billY = Math.max(...[...body].map((k) => Math.floor(k / GRID_W))), bx = Math.max(...[...body].filter((k) => Math.floor(k / GRID_W) === billY).map((k) => k % GRID_W));
    for (let i = 1; i <= 2 + size; i++) at(bx + i, billY, 'r'); // the bill leaves the band's lowest front pixel
  } else if (name === 'Mössa') { // knit band + pompom
    for (let x = x0 + 2; x <= x1 - 2; x++) at(x, topY - 1, 'B');
    at(cx, topY - 2, 'W'); at(cx + 1, topY - 2, 'W');
  } else if (name === 'Krona') { // points on the band
    for (let x = x0 + 1; x <= x1 - 1; x += 2) { at(x, topY - 1, 'Y'); if (size > 0 && (x - x0) % 4 === 1) at(x, topY - 2, 'Y'); }
    at(cx, topY - 1, 'R');
  } else if (name === 'Trollkarl') { // cone, leaning toward the face
    const h = Math.min(3 + size, topY - 1); // the tip's outline still fits in row 0
    for (let j = 1; j <= h; j++) {
      const half = Math.max(0, Math.round(((x1 - x0) / 2 - 1) * (1 - j / (h + 1))));
      for (let x = cx - half + (j > h - 2 ? 1 : 0); x <= cx + half + (j > h - 2 ? 1 : 0); x++) at(x, topY - j, x > cx ? 'v' : 'V');
    }
  }
  return { px, line: band.line };
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

/** Pixel grid of CSS colours (null = transparent). `classHat`: index into CLASS_HATS, replaces the skin hat.
 *  `face`: dx < 0 = facing left (mirrored). `frame`: 0 idle, 1 glide. */
export function blobGrid(look: BlobLook, classHat?: number, face?: Face, frame = 0): (string | null)[][] {
  const L = bodyLayout(look.shape, frame);
  const px: Px = new Map();
  let mask = new Set(L.mask);
  const hatName = classHat === undefined ? HATS[look.hat] ?? 'Ingen' : '';
  const sized = FITTED.includes(hatName) ? undefined : HAT_SIZES[hatName];
  let hat: Px | null = null;
  const fitted = FITTED.includes(hatName) ? fittedHat(hatName, L, hatSize(L.headW)) : null;
  if (sized) {
    // brim ON the head's top outline row at the crown's centre; never inside the head
    const spr = sized[hatSize(L.headW)];
    const cx = 8;
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
  const gy = L.top + 1, gx = 8 - (L.rows[1] >> 1) + 1; // glint on the back (left) side
  for (const [x, y] of [[gx, gy], [gx + 1, gy], [gx, gy + 1]]) if (mask.has(key(x, y))) px.set(key(x, y), white);
  // class hoods / helmets wrap the head above the eyes
  if (classHat !== undefined) {
    const band = headBand(L, 2, Math.max(L.top - 1, L.eye[1] - 3)); // hood / helmet: a thicker band that follows the head's curve
    const hood = band.body;
    const fill = classHat === 0 ? PAL.C : classHat === 1 ? PAL.G : PAL.T;
    const sh = classHat === 0 ? '#e2cfb2' : classHat === 1 ? PAL.g : PAL.t;
    for (const k of outlineOf(hood)) if (!L.mask.has(k)) px.set(k, INK);
    for (const k of band.line) px.set(k, INK);
    for (const k of hood) { const x = k % GRID_W; px.set(k, x > 10 ? sh : fill); }
    const top = L.top;
    if (classHat === 0) for (const [dx, dy] of [[0, 1], [-1, 2], [0, 2], [1, 2], [0, 3]]) px.set(key(FACE_X + dx, top + dy), PAL.R); // red cross
    const extra = classHat === 1 ? spritePx(FEATHER, 8 - (L.rows[0] >> 1), top) : classHat === 2 ? spritePx(PLUME, 8, top - 1) : new Map();
    for (const k of outlineOf(new Set(extra.keys()))) if (!hood.has(k) && !L.mask.has(k)) px.set(k, INK);
    for (const [k, c] of extra) px.set(k, c);
  }
  // face
  const inBody = (k: number) => L.mask.has(k);
  for (const [k, c] of spritePx(EYE_SPRITES[look.eyes] ?? EYE_SPRITES[0], L.eye[0], L.eye[1])) if (inBody(k)) px.set(k, c);
  for (const [k, c] of spritePx(MOUTH_SPRITES[look.mouth] ?? MOUTH_SPRITES[0], L.mouth[0], L.mouth[1])) if (inBody(k)) px.set(k, c);
  // hats
  if (fitted) {
    const keys = new Set(fitted.px.keys());
    for (const k of outlineOf(keys)) if (!L.mask.has(k)) px.set(k, INK);
    for (const k of fitted.line) px.set(k, INK);
    for (const [k, c] of fitted.px) px.set(k, c);
  } else if (hat) {
    for (const k of outlineOf(new Set(hat.keys()))) if (!mask.has(k)) px.set(k, INK); // the hat's own outline, never over the head
    for (const [k, c] of hat) px.set(k, c);
  } else if (hatName === 'Rosett') { // a bow ON the head's top-right outline (its bottom row is the outline row)
    const y = L.top - 2, x = Math.min(GRID_W - 3, 8 + (L.rows[0] >> 1));
    const bow = spritePx(BOW, x, y);
    for (const k of outlineOf(new Set(bow.keys()))) if (!L.mask.has(k)) px.set(k, INK);
    for (const [k, c] of bow) px.set(k, c);
  } else if (hatName === 'Lurar') { // headphones: the band IS the head's top outline, cups outside the sides at ear height
    for (const k of outlineOf(L.mask)) if (Math.floor(k / GRID_W) < L.earY - 1) px.set(k, PAL.S);
    const row = L.rows[L.earY - L.top], xl = 8 - (row >> 1) - 1, xr = 8 + (row >> 1);
    const cups = new Set<number>();
    for (const x of [xl - 1, xl, xr, xr + 1]) for (const dy of [-1, 0, 1]) if (!L.mask.has(key(x, L.earY + dy))) cups.add(key(x, L.earY + dy));
    for (const k of outlineOf(cups)) if (!L.mask.has(k)) px.set(k, INK);
    for (const k of cups) px.set(k, PAL.R);
  } else if (TOPS[hatName]) { // top changers: grow out of the head's top outline row (pairs at both ends of the top row)
    const t = TOPS[hatName], spr = t.sizes[hatSize(L.headW)];
    const own = { M: base, m: dark, P: '#f4a0b4' };
    const oy = L.top - 1; // the top outline row: the pieces' bottom row replaces it, so they grow out of the head
    const parts: Px[] = [];
    if (t.kind === 'pair') { // at the ends of the second row (wider than a pointy top), each on its own column's outline
      const half = L.rows[1] >> 1, xl = 8 - half, xr = 8 + half - 1;
      parts.push(spritePx(spr, xl, topOutline(L.mask, xl), own), spritePx(spr, xr, topOutline(L.mask, xr), own, true));
    } else if (t.kind === 'centre') parts.push(spritePx(spr, 9, oy, own));
    else parts.push(spritePx(spr, 8, oy - 1, own)); // halo: one free row above the head
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
