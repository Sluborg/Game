import { describe, expect, it } from 'vitest';
import {
  BLOB_FRAMES, blobGrid, blobSvg, bodyLayout, CLASS_HATS, clampLook, EYES, faceIndex, FACE_DIRS, facingFromVelocity, GRID_H, GRID_W,
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

  it('hats sit on top of or around the head: never over the face, head-top hats never inside the head', () => {
    const onTop = ['Keps', 'Krona', 'Grodd', 'Mössa', 'Trollkarl', 'Rosett', 'Lurar', 'Kattöron', 'Enhörning', 'Kaninöron', 'Djävulshorn', 'Antenn', 'Gloria'];
    for (let s = 0; s < SHAPES.length; s++) for (let f = 0; f < BLOB_FRAMES; f++) {
      const L = bodyLayout(s, f);
      const bare = blobGrid(look({ shape: s }), undefined, undefined, f);
      const face = new Set([...spritePts(PART_TABLES.eyes[0], L.eye[0], L.eye[1]), ...spritePts(PART_TABLES.mouths[0], L.mouth[0], L.mouth[1])]);
      for (let h = 1; h < HATS.length; h++) {
        const d = diff(bare, blobGrid(look({ shape: s, hat: h }), undefined, undefined, f));
        expect(d.length, `${HATS[h]} on ${SHAPES[s]}`).toBeGreaterThan(0);
        for (const k of d) expect(face.has(k), `${HATS[h]} over the face of ${SHAPES[s]}`).toBe(false);
        if (onTop.includes(HATS[h])) for (const k of d) expect(L.mask.has(k), `${HATS[h]} inside ${SHAPES[s]}`).toBe(false);
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
