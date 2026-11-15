import { describe, expect, it } from 'vitest';
import {
  BLOB_FRAMES, blobGrid, FITTED, blobSvg, bodyLayout, CLASS_HATS, clampLook, EYES, faceIndex, FACE_DIRS, facingFromVelocity, GRID_H, GRID_W,
  hatSize, HATS, MOUTHS, PART_TABLES, SHAPES, type BlobLook,
} from './blob';

const look = (o: Partial<BlobLook> = {}): BlobLook => ({ color: 0x5ec8ff, shape: 0, eyes: 0, mouth: 0, hat: 0, ...o });
const key = (x: number, y: number) => y * GRID_W + x;
const diff = (a: (string | null)[][], b: (string | null)[][]) => {
  const out: number[] = [];
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) if (a[y][x] !== b[y][x]) out.push(key(x, y));
  return out;
};
/** Where a feature sprite lands (same rule as blob.ts). */
const spritePts = (s: { rows: string[]; ax: number; ay: number }, ax: number, ay: number) => {
  const out: number[] = [];
  s.rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') out.push(key(ax - s.ax + i, ay - s.ay + j)); }));
  return out;
};

/** Cells Stefan approved on the board (2026-11-14): frozen pixel for pixel. FNV-1a of the grid CROPPED to its content,
 *  so the 16x18 -> 20x20 frame change (a pure offset) keeps the same hashes. */
const FROZEN: Record<string, string> = {
  'Ingen/Kupol': 'c6704e42',
  'Ingen/Boll': 'cc20786c',
  'Ingen/Lång': 'c81d74ce',
  'Ingen/Platt': '8b371783',
  'Ingen/Päron': '24684b7b',
  'Ingen/Kub': '7fa95b27',
  'Keps/Kupol': '262c097c',
  'Keps/Boll': '14b7691a',
  'Keps/Lång': '9d22e7a8',
  'Keps/Platt': 'ba134ea1', // re-baselined for 20x20: content the 16x18 frame cut off (or wrapped) is now whole
  'Keps/Päron': 'ee30b59e',
  'Keps/Kub': 'daeb261b', // re-baselined for 20x20: content the 16x18 frame cut off (or wrapped) is now whole
  'Grodd/Kupol': 'b043715c',
  'Grodd/Boll': 'f7ea230c',
  'Grodd/Lång': '6677f0b4',
  'Grodd/Platt': 'caf49343',
  'Grodd/Päron': '9f4a09',
  'Grodd/Kub': 'c03b0c51',
  'Mössa/Kupol': 'a40a91d9',
  'Mössa/Boll': '382b27ec',
  'Mössa/Lång': 'aecb1423',
  'Mössa/Platt': 'b05f064c',
  'Mössa/Päron': 'f511f6ee',
  'Mössa/Kub': '7454022a',
  'Trollkarl/Kupol': '272e8b18',
  'Trollkarl/Boll': 'eab90c68',
  'Trollkarl/Lång': 'e076fc52',
  'Trollkarl/Platt': 'd16da801',
  'Trollkarl/Päron': '9a9ce5d7',
  'Trollkarl/Kub': 'c617f9fb',
  'Drottningkrona/Kupol': 'e155fc8d',
  'Drottningkrona/Boll': '22583a64',
  'Drottningkrona/Lång': 'bbd40f33',
  'Drottningkrona/Päron': '2a5ec566',
  'Drottningkrona/Kub': '9a04ff10',
  'Kattöron/Kupol': '2e419d30',
  'Kattöron/Boll': 'fbe0de18',
  'Kattöron/Platt': 'f961bdc5',
  'Kattöron/Kub': '8cbe1685',
  'Kaninöron/Kupol': 'e575fcd6',
  'Kaninöron/Boll': '1553a828',
  'Enhörning/Platt': '1250863b',
  'Enhörning/Kub': '8eef243d',
  'Gloria/Kupol': '8f894c16',
  'Gloria/Boll': '2abe05a8',
  'Gloria/Platt': '32b8ed67',
  'Gloria/Kub': '92d25c3',
  'Krona/Kub': '8c6e27ae', // round 2
  'Rosett/Platt': 'b53e2b8b', // round 2
  'Kattöron/Lång': '41c4f30c', // round 2
  'Kattöron/Päron': 'd622953d', // round 2
  'Kaninöron/Lång': 'e35a4e80', // round 2
  'Kaninöron/Platt': 'e64d1b59', // round 2
  'Kaninöron/Kub': '638b4557', // round 2
  'Djävulshorn/Kupol': '2bd84dae', // round 2
  'Djävulshorn/Boll': 'aee58fbc', // round 2
  'Djävulshorn/Lång': 'fa7b2a32', // round 2
  'Djävulshorn/Platt': 'bfece3b9', // round 2
  'Djävulshorn/Päron': 'fadcd0ff', // round 2
  'Djävulshorn/Kub': 'c8780a7', // round 2
  'Enhörning/Kupol': 'b0be8a2b', // round 2
  'Enhörning/Boll': 'd14bb8bc', // round 2
  'Enhörning/Lång': 'f642b0d4', // round 2
  'Enhörning/Päron': '8ae99a69', // round 2
  'Gloria/Lång': 'aec011da', // round 2
  'Gloria/Päron': 'cb704c57', // round 2
  'class:Prästluva/Kupol': 'ae9c38b1', // round 2
  'class:Prästluva/Boll': '87f72bf6', // round 2
  'class:Prästluva/Lång': '27d1f9ce', // round 2
  'class:Prästluva/Päron': '5b9d27', // round 2
  'class:Prästluva/Kub': 'c0de2136', // round 2
  'class:Fjädermössa/Kupol': 'f7c8f3af', // round 2
  'class:Fjädermössa/Boll': 'cf7e318a', // round 2
  'class:Fjädermössa/Lång': 'd4a58fb1', // round 2
  'class:Fjädermössa/Päron': 'cb184630', // round 2
  'class:Fjädermössa/Kub': '8e5dd8fb', // re-baselined for 20x20: content the 16x18 frame cut off (or wrapped) is now whole
  'Rosett/Kupol': '31286a82', // round 3
  'Rosett/Boll': 'd7a9c41c', // round 3
  'Rosett/Lång': 'f1339f06', // round 3
  'Rosett/Päron': '14831077', // round 3
  'Rosett/Kub': 'da7cf08d', // round 3
  'Lurar/Boll': 'fb8f555a', // re-baselined for 20x20: content the 16x18 frame cut off (or wrapped) is now whole
  'Antenn/Kupol': '2d77536e', // round 3
  'Antenn/Boll': 'de67c984', // round 3
  'Antenn/Lång': 'bad986e', // round 3
  'Antenn/Platt': 'b0856f0b', // round 3
  'Antenn/Päron': 'f5a208a7', // round 3
  'Antenn/Kub': '9c8482a1', // round 3
  'class:Fjädermössa/Platt': 'ad14270a', // round 3
  'Krona/Kupol': '142d37f3', // round 4
  'Krona/Boll': '784676ce', // round 4
  'Krona/Lång': 'f256dcc', // round 4
  'Krona/Platt': 'f984ebc9', // round 4
  'Krona/Päron': 'f2fe7ffd', // round 4
  'Drottningkrona/Platt': 'f4edb585', // round 4
  'Lurar/Lång': '85af08da', // round 4
  'Lurar/Päron': '73752eef', // round 4
  'Kaninöron/Päron': 'f3e77f17', // round 4
  'class:Prästluva/Platt': '1e5206e0', // round 4
  'class:Riddarhjälm/Kupol': '482a51be', // round 4
  'class:Riddarhjälm/Boll': '8806bebd', // round 4
  'class:Riddarhjälm/Lång': '63f18a83', // round 4
  'class:Riddarhjälm/Platt': '909f46a', // round 4
  'class:Riddarhjälm/Päron': 'd8bb5a9e', // round 4
  'class:Riddarhjälm/Kub': 'fa37a3c5', // round 4
};
const cropped = (g: (string | null)[][]) => {
  let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
  g.forEach((r, y) => r.forEach((c, x) => { if (c) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }));
  return g.slice(y0, y1 + 1).map((r) => r.slice(x0, x1 + 1));
};
const fnv = (s: string) => { let x = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; } return x.toString(16); };

describe('blobz v2 (16 px Ninja grid, one 3/4 view)', () => {
  it('every look x frame x class hat renders a 16x18 grid with a body', () => {
    for (let s = 0; s < SHAPES.length; s++) for (let e = 0; e < EYES.length; e++) for (let m = 0; m < MOUTHS.length; m++)
      for (let h = 0; h < HATS.length; h++) for (let f = 0; f < BLOB_FRAMES; f++) {
        const g = blobGrid(look({ shape: s, eyes: e, mouth: m, hat: h }), undefined, undefined, f);
        expect(g).toHaveLength(GRID_H);
        expect(g.every((r) => r.length === GRID_W)).toBe(true);
        expect(g.flat().filter(Boolean).length).toBeGreaterThan(60);
      }
    for (let s = 0; s < SHAPES.length; s++) for (let c = 0; c < CLASS_HATS.length; c++)
      expect(blobGrid(look({ shape: s }), c).flat().filter(Boolean).length).toBeGreaterThan(60);
    expect(blobSvg(look())).toContain('<svg');
  });

  it('eyes and mouths sit inside the body, mouth below the eyes with a gap, above the bottom edge', () => {
    for (let s = 0; s < SHAPES.length; s++) for (let f = 0; f < BLOB_FRAMES; f++) {
      const L = bodyLayout(s, f);
      PART_TABLES.eyes.forEach((es) => PART_TABLES.mouths.forEach((ms) => {
        const ep = spritePts(es, L.eye[0], L.eye[1]), mp = spritePts(ms, L.mouth[0], L.mouth[1]);
        for (const k of [...ep, ...mp]) expect(L.mask.has(k), `shape ${s} frame ${f}`).toBe(true);
        const eyeBottom = Math.max(...ep.map((k) => Math.floor(k / GRID_W)));
        const mouthTop = Math.min(...mp.map((k) => Math.floor(k / GRID_W)));
        const mouthBottom = Math.max(...mp.map((k) => Math.floor(k / GRID_W)));
        expect(mouthTop - eyeBottom - 1).toBeGreaterThanOrEqual(1);
        expect(mouthBottom).toBeLessThan(L.bottom);
      }));
    }
  });

  it('hats sit on top of, around or fitted to the head: never over the face, toppers never inside the head', () => {
    const onTop = ['Grodd', 'Kattöron', 'Enhörning', 'Kaninöron', 'Djävulshorn', 'Antenn', 'Gloria']; // Rosett: a hair bow, may sit on the forehead
    for (let s = 0; s < SHAPES.length; s++) for (let f = 0; f < BLOB_FRAMES; f++) {
      const L = bodyLayout(s, f);
      const bare = blobGrid(look({ shape: s }), undefined, undefined, f);
      const face = new Set([...spritePts(PART_TABLES.eyes[0], L.eye[0], L.eye[1]), ...spritePts(PART_TABLES.mouths[0], L.mouth[0], L.mouth[1])]);
      for (let h = 1; h < HATS.length; h++) {
        const d = diff(bare, blobGrid(look({ shape: s, hat: h }), undefined, undefined, f));
        expect(d.length, `${HATS[h]} on ${SHAPES[s]}`).toBeGreaterThan(0);
        for (const k of d) expect(face.has(k), `${HATS[h]} over the face of ${SHAPES[s]}`).toBe(false);
        if (onTop.includes(HATS[h])) for (const k of d) expect(L.mask.has(k), `${HATS[h]} inside ${SHAPES[s]}`).toBe(false);
        if (FITTED.includes(HATS[h])) for (const k of d) if (L.mask.has(k)) {
          // fitted hats cover the scalp only: at least one free row above the eyes
          expect(Math.floor(k / GRID_W), `${HATS[h]} too low on ${SHAPES[s]}`).toBeLessThanOrEqual(L.eye[1] - (HATS[h].endsWith('rona') ? 1 : 2)); // crowns: border row on short heads
        }
      }
    }
  });

  it('hat size follows head width: narrow heads S, wide heads L', () => {
    const size = (s: number) => hatSize(bodyLayout(s).headW);
    expect(size(SHAPES.indexOf('Lång'))).toBe(0);
    expect(size(SHAPES.indexOf('Päron'))).toBe(0);
    expect(size(SHAPES.indexOf('Platt'))).toBe(2);
    expect(size(SHAPES.indexOf('Kub'))).toBe(2);
    for (const sizes of Object.values(PART_TABLES.hats)) expect(sizes).toHaveLength(3);
  });

  it('nothing is cut off at the frame edge (the border holds at most an outline)', () => {
    for (let s = 0; s < SHAPES.length; s++) for (let h = 0; h < HATS.length; h++) for (let f = 0; f < BLOB_FRAMES; f++) {
      const g = blobGrid(look({ shape: s, hat: h }), undefined, undefined, f);
      const edge = [...g[0], ...g[GRID_H - 1], ...g.map((r) => r[0]), ...g.map((r) => r[GRID_W - 1])];
      for (const c of edge) if (c) expect(c.toLowerCase(), `${HATS[h]} on ${SHAPES[s]}`).toBe('#141b1b'); // only an outline may touch the edge
    }
  });

  it('approved hat cells stay pixel-identical (frozen)', () => {
    for (const [cell, hash] of Object.entries(FROZEN)) {
      const [hat, shape] = cell.split('/');
      const cls = hat.startsWith('class:') ? CLASS_HATS.indexOf(hat.slice(6)) : undefined;
      const g = blobGrid({ color: 0x5ec8ff, shape: SHAPES.indexOf(shape), eyes: 0, mouth: 0, hat: cls === undefined ? HATS.indexOf(hat) : 0 }, cls);
      expect(fnv(JSON.stringify(cropped(g))), cell).toBe(hash);
    }
  });

  it('facing left is the mirrored picture', () => {
    for (let s = 0; s < SHAPES.length; s++) {
      const r = blobGrid(look({ shape: s, hat: 1, eyes: 4 }));
      const l = blobGrid(look({ shape: s, hat: 1, eyes: 4 }), undefined, { dx: -1, dy: 0 });
      expect(l).toEqual(r.map((row) => [...row].reverse()));
    }
  });

  it('faceIndex and facingFromVelocity', () => {
    expect(FACE_DIRS).toHaveLength(9);
    expect(faceIndex(0, 0)).toBe(0);
    expect(FACE_DIRS[faceIndex(5, 0)]).toEqual({ dx: 1, dy: 0 });
    expect(FACE_DIRS[faceIndex(-5, 0)]).toEqual({ dx: -1, dy: 0 });
    expect(facingFromVelocity(5, 0)).toBe('right');
    expect(facingFromVelocity(-5, 1)).toBe('left');
    expect(facingFromVelocity(0, 5, 0.15, 'left')).toBe('left'); // straight down keeps the last facing
    expect(facingFromVelocity(0.01, 0, 0.15, 'left')).toBe('left'); // standing still keeps it too
  });

  it('clampLook maps old part indices into the new, smaller tables', () => {
    const l = clampLook({ color: 123, shape: 9, eyes: 15, mouth: 11, hat: 26 });
    expect(l.shape).toBe(SHAPES.length - 1);
    expect(l.eyes).toBe(EYES.length - 1);
    expect(l.mouth).toBe(MOUTHS.length - 1);
    expect(l.hat).toBe(HATS.length - 1);
  });
});
