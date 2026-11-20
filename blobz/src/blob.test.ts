import { describe, expect, it } from 'vitest';
import {
  BLOB_FRAMES, blobGrid, FITTED, blobSvg, bodyLayout, CLASS_HATS, clampLook, EYES, faceIndex, FACE_DIRS, facingFromVelocity, GRID_H, GRID_W,
  hatSize, HATS, MOUTHS, PART_TABLES, SHAPES, type BlobLook, glintKeys,
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
  'Ingen/Kupol': '873aa2fa',
  'Ingen/Boll': 'd33e7f4c',
  'Ingen/Lång': 'f9ec678e',
  'Ingen/Platt': '8f8b83db',
  'Ingen/Päron': '6b3f4d5b',
  'Ingen/Kub': '82b2fcc7',
  'Keps/Kupol': '96258443',
  'Keps/Boll': 'c2371a3f',
  'Keps/Lång': '5153ab95',
  'Keps/Platt': '5315fc91', // re-baselined for 20x20: content the 16x18 frame cut off (or wrapped) is now whole
  'Keps/Päron': '113552c1',
  'Keps/Kub': 'd9df81b6', // re-baselined for 20x20: content the 16x18 frame cut off (or wrapped) is now whole
  'Grodd/Kupol': '22409024',
  'Grodd/Boll': 'b06ed06c',
  'Grodd/Lång': '786a81d4',
  'Grodd/Platt': 'e840999b',
  'Grodd/Päron': '664e0ec9',
  'Grodd/Kub': 'aee82991',
  'Mössa/Kupol': '15a392e9',
  'Mössa/Boll': 'bae9311a',
  'Mössa/Lång': 'f45f7ac7',
  'Mössa/Platt': 'ff353a9c',
  'Mössa/Päron': 'c3770616',
  'Mössa/Kub': '569c75ac',
  'Trollkarl/Kupol': '5980d4fa',
  'Trollkarl/Boll': 'e28af72',
  'Trollkarl/Lång': 'e1b719e0',
  'Trollkarl/Platt': '9f3b12d9',
  'Trollkarl/Päron': 'bd6868b5',
  'Trollkarl/Kub': '781cafcb',
  'Drottningkrona/Kupol': '419007ae',
  'Drottningkrona/Boll': 'baff7797',
  'Drottningkrona/Lång': 'da9a8cb4',
  'Drottningkrona/Päron': '5889e0d',
  'Drottningkrona/Kub': '1464140d',
  'Kattöron/Kupol': 'e4affd48',
  'Kattöron/Boll': '8bb93438',
  'Kattöron/Platt': 'd5ca2d7d',
  'Kattöron/Kub': '58cfd4c5',
  'Kaninöron/Kupol': 'f5c4fb5e',
  'Kaninöron/Boll': '3f00a388',
  'Enhörning/Platt': 'cc67133',
  'Enhörning/Kub': 'c1cfc11d',
  'Gloria/Kupol': 'dbf5509e',
  'Gloria/Boll': '546b0108',
  'Gloria/Platt': '302014df',
  'Gloria/Kub': '15bcca3',
  'Krona/Kub': 'd3870cbb', // round 2
  'Rosett/Platt': 'd3c7983', // round 2
  'Kattöron/Lång': 'a3e1098c', // round 2
  'Kattöron/Päron': '6d2c263d', // round 2
  'Kaninöron/Lång': '657a8780', // round 2
  'Kaninöron/Platt': 'd0dff1f1', // round 2
  'Kaninöron/Kub': '6e7837', // round 2
  'Djävulshorn/Kupol': '5c076576', // round 2
  'Djävulshorn/Boll': '202db41c', // round 2
  'Djävulshorn/Lång': 'dd2cbab2', // round 2
  'Djävulshorn/Platt': 'ce8c5dd1', // round 2
  'Djävulshorn/Päron': '279efbbf', // round 2
  'Djävulshorn/Kub': 'f912247', // round 2
  'Enhörning/Kupol': '5a016c03', // round 2
  'Enhörning/Boll': '4293dd1c', // round 2
  'Enhörning/Lång': '818d6e74', // round 2
  'Enhörning/Päron': '4fb1f929', // round 2
  'Gloria/Lång': '5051105a', // round 2
  'Gloria/Päron': '379c9997', // round 2
  'class:Prästluva/Kupol': 'a8583241', // round 2
  'class:Prästluva/Boll': 'c91f1a1e', // round 2
  'class:Prästluva/Lång': '59a0ec8e', // round 2
  'class:Prästluva/Päron': '2d3760e7', // round 2
  'class:Prästluva/Kub': '668eb1e4', // round 2
  'class:Fjädermössa/Kupol': '5ba7daf9', // round 2
  'class:Fjädermössa/Boll': '3410e854', // round 2
  'class:Fjädermössa/Lång': '8d03b2e9', // round 2
  'class:Fjädermössa/Päron': '2d98a6a8', // round 2
  'class:Fjädermössa/Kub': 'e0e0aba5', // re-baselined for 20x20: content the 16x18 frame cut off (or wrapped) is now whole
  'Rosett/Kupol': '8d0ece43', // round 3
  'Rosett/Boll': 'dbed104b', // round 3
  'Rosett/Lång': '999cae8f', // round 3
  'Rosett/Päron': '8b26acfc', // round 3
  'Rosett/Kub': '5e831aed', // round 3
  'Lurar/Boll': 'ee4ff7fa', // re-baselined for 20x20: content the 16x18 frame cut off (or wrapped) is now whole
  'Antenn/Kupol': 'e1b93a36', // round 3
  'Antenn/Boll': 'f43f2644', // round 3
  'Antenn/Lång': 'a43f4ae', // round 3
  'Antenn/Platt': '883bd03', // round 3
  'Antenn/Päron': '227dcc67', // round 3
  'Antenn/Kub': 'a4e695a1', // round 3
  'class:Fjädermössa/Platt': '3ecb400a', // round 3
  'Krona/Kupol': '9214e84b', // round 4
  'Krona/Boll': '74046a0e', // round 4
  'Krona/Lång': '1dfa414c', // round 4
  'Krona/Platt': 'f6c05a1', // round 4
  'Krona/Päron': '868711fd', // round 4
  'Drottningkrona/Platt': '242ee43d', // round 4
  'Lurar/Lång': 'dcda3d7a', // round 4
  'Lurar/Päron': 'c2f08f87', // round 4
  'Kaninöron/Päron': 'a43ec957', // round 4
  'class:Prästluva/Platt': '4ff963e0', // round 4
  'class:Riddarhjälm/Kupol': '835ad52e', // round 4
  'class:Riddarhjälm/Boll': 'da84f941', // round 4
  'class:Riddarhjälm/Lång': '252136e3', // round 4
  'class:Riddarhjälm/Platt': '31b39eea', // round 4
  'class:Riddarhjälm/Päron': '8ad5b876', // round 4
  'class:Riddarhjälm/Kub': '85c4cbeb', // round 4
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
        // the shine moves off the head when a hat covers it (Stefan + Alea 2026-11-16): those pixels are not the hat
        const shine = new Set(glintKeys(L));
        if (FITTED.includes(HATS[h])) for (const k of d) if (L.mask.has(k) && !shine.has(k)) {
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
