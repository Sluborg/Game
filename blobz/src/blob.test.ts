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

/** Cells Stefan approved on the board (2026-11-14, sheet from 502dae7): frozen pixel for pixel (FNV-1a of the grid). */
const FROZEN: Record<string, string> = {
  'Ingen/Kupol': 'ebe76a92',
  'Ingen/Boll': '94a208a2',
  'Ingen/Lång': 'd3b103ea',
  'Ingen/Platt': '906d2579',
  'Ingen/Päron': '891f638b',
  'Ingen/Kub': '24f69827',
  'Keps/Kupol': '2441e2b4',
  'Keps/Boll': '187100a7',
  'Keps/Lång': '9def6cea',
  'Keps/Platt': 'c42b930b',
  'Keps/Päron': '818cc486',
  'Keps/Kub': 'fca1d6f0',
  'Grodd/Kupol': '71ee8bde',
  'Grodd/Boll': '8704fd46',
  'Grodd/Lång': '5eb4415e',
  'Grodd/Platt': 'a1528d3',
  'Grodd/Päron': '118e05b7',
  'Grodd/Kub': 'd4068e71',
  'Mössa/Kupol': '4856bf',
  'Mössa/Boll': '7df338ba',
  'Mössa/Lång': 'e8051c75',
  'Mössa/Platt': 'ee3b61c',
  'Mössa/Päron': '473bfbc0',
  'Mössa/Kub': 'f1f27c78',
  'Trollkarl/Kupol': '272e8b18',
  'Trollkarl/Boll': '1aee77ae',
  'Trollkarl/Lång': '5dcf7d5a',
  'Trollkarl/Platt': '7588019b',
  'Trollkarl/Päron': '9a9ce5d7',
  'Trollkarl/Kub': '8c3a9c53',
  'Drottningkrona/Kupol': '60145497',
  'Drottningkrona/Boll': '895cf172',
  'Drottningkrona/Lång': '68ae0fd7',
  'Drottningkrona/Päron': '27bd760e',
  'Drottningkrona/Kub': '9256ed28',
  'Kattöron/Kupol': 'd374b6b8',
  'Kattöron/Boll': '6bfccf2e',
  'Kattöron/Platt': '8a040e55',
  'Kattöron/Kub': 'a99ec01d',
  'Kaninöron/Kupol': 'eecd2610',
  'Kaninöron/Boll': 'b38851ae',
  'Enhörning/Platt': '250d9b13',
  'Enhörning/Kub': '3d0ebaa9',
  'Gloria/Kupol': '8f894c16',
  'Gloria/Boll': '2c069bc6',
  'Gloria/Platt': 'a467ca5',
  'Gloria/Kub': '5f2ee233',
  'Krona/Kub': '45ef35d2', // round 2
  'Rosett/Platt': '46e56ef5', // round 2
  'Kattöron/Lång': '8e85fa38', // round 2
  'Kattöron/Päron': '9cff2335', // round 2
  'Kaninöron/Lång': 'c332f82', // round 2
  'Kaninöron/Platt': '2ffb93e7', // round 2
  'Kaninöron/Kub': 'f61336f7', // round 2
  'Djävulshorn/Kupol': '4bf4f048', // round 2
  'Djävulshorn/Boll': '9d98f752', // round 2
  'Djävulshorn/Lång': 'f575095e', // round 2
  'Djävulshorn/Platt': '1fb8f9a7', // round 2
  'Djävulshorn/Päron': '556f4db7', // round 2
  'Djävulshorn/Kub': '5bfdc4d7', // round 2
  'Enhörning/Kupol': 'b0be8a2b', // round 2
  'Enhörning/Boll': '90e83f88', // round 2
  'Enhörning/Lång': '83a360f6', // round 2
  'Enhörning/Päron': 'f870e59f', // round 2
  'Gloria/Lång': 'c40c2d7e', // round 2
  'Gloria/Päron': 'cb704c57', // round 2
  'class:Prästluva/Kupol': 'dcfa7ab7', // round 2
  'class:Prästluva/Boll': '62c23428', // round 2
  'class:Prästluva/Lång': '46f42288', // round 2
  'class:Prästluva/Päron': 'c2d61139', // round 2
  'class:Prästluva/Kub': '8393e8b0', // round 2
  'class:Fjädermössa/Kupol': 'f7c8f3af', // round 2
  'class:Fjädermössa/Boll': 'cda1863c', // round 2
  'class:Fjädermössa/Lång': '60a0698d', // round 2
  'class:Fjädermössa/Päron': 'cb184630', // round 2
  'class:Fjädermössa/Kub': 'f133f332', // round 2
  'Rosett/Kupol': '138349c4', // round 3
  'Rosett/Boll': 'efc4dfce', // round 3
  'Rosett/Lång': 'fc24f42', // round 3
  'Rosett/Päron': '9b03bec7', // round 3
  'Rosett/Kub': '93a54a3d', // round 3
  'Lurar/Boll': '53afdf0a', // round 3
  'Antenn/Kupol': 'c3113e70', // round 3
  'Antenn/Boll': '25c004a', // round 3
  'Antenn/Lång': '20400398', // round 3
  'Antenn/Platt': 'b2951511', // round 3
  'Antenn/Päron': '486c0215', // round 3
  'Antenn/Kub': 'a180e3d9', // round 3
  'class:Fjädermössa/Platt': 'ad14270a', // round 3
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
    const onTop = ['Grodd', 'Lurar', 'Kattöron', 'Enhörning', 'Kaninöron', 'Djävulshorn', 'Antenn', 'Gloria']; // Rosett: a hair bow, may sit on the forehead
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

  it('nothing is cut off at the frame edge (row 0 holds at most a hat outline)', () => {
    for (let s = 0; s < SHAPES.length; s++) for (let h = 0; h < HATS.length; h++) for (let f = 0; f < BLOB_FRAMES; f++) {
      const g = blobGrid(look({ shape: s, hat: h }), undefined, undefined, f);
      for (const c of g[0]) if (c) expect(c.toLowerCase()).toBe('#141b1b');
    }
  });

  it('approved hat cells stay pixel-identical (frozen)', () => {
    for (const [cell, hash] of Object.entries(FROZEN)) {
      const [hat, shape] = cell.split('/');
      const cls = hat.startsWith('class:') ? CLASS_HATS.indexOf(hat.slice(6)) : undefined;
      const g = blobGrid({ color: 0x5ec8ff, shape: SHAPES.indexOf(shape), eyes: 0, mouth: 0, hat: cls === undefined ? HATS.indexOf(hat) : 0 }, cls);
      expect(fnv(JSON.stringify(g)), cell).toBe(hash);
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
