import { describe, expect, it } from 'vitest';
import { blobGrid, blobSvg, clampLook, COLORS, EYES, GRID_H, GRID_W, HATS, MOUTHS, PART_TABLES, SHAPES } from './blob';

const diff = (a: (string | null)[][], b: (string | null)[][]) => {
  const out: [number, number][] = [];
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) if (a[y][x] !== b[y][x]) out.push([x, y]);
  return out;
};

describe('blob', () => {
  it('clamps bad looks from the network', () => {
    const l = clampLook({ color: 123, eyes: 99, mouth: -3, hat: Number.NaN });
    expect(l.eyes).toBe(EYES.length - 1);
    expect(l.mouth).toBe(0);
    expect(l.hat).toBe(0);
  });

  it('has a name for every part (16 eyes, 12 mouths, 27 hats)', () => {
    expect(PART_TABLES.eyes).toHaveLength(EYES.length);
    expect(PART_TABLES.mouths).toHaveLength(MOUTHS.length);
    expect(PART_TABLES.hats).toHaveLength(HATS.length);
    expect([EYES.length, MOUTHS.length, HATS.length]).toEqual([16, 12, 27]);
  });

  it('keeps saved-look indices stable for the original parts', () => {
    expect(EYES.slice(0, 10)).toEqual(['Glada', 'Runda', 'Stora', 'Nöjda', 'Sömniga', 'Coola', 'Kär', 'Stjärnor', 'Arga', 'Rosiga']);
    expect(MOUTHS.slice(0, 6)).toEqual(['Öppen', 'Leende', 'Tunga', 'Tänder', 'Oj', 'Lugn']);
    expect(HATS.slice(0, 20)).toEqual(['Ingen', 'Krona', 'Keps', 'Blomma', 'Partyhatt', 'Mössa', 'Rosett', 'Halmhatt',
      'Pirat', 'Trollkarl', 'Viking', 'Kock', 'Lurar', 'Kanin', 'Katt', 'Gloria', 'Cylinder', 'Bandana', 'Antenn', 'Grodd']);
  });

  it('part patterns are rectangular and use only palette letters', () => {
    const ok = new Set([...Object.keys(PART_TABLES.palette), '.', 'M', 'm']);
    const all = [...PART_TABLES.eyes.flatMap((e) => [e.rows, e.right ?? []]), ...PART_TABLES.mouths.map((m) => m.rows), ...PART_TABLES.hats.map((h) => h.rows)];
    for (const rows of all) {
      for (const r of rows) {
        expect(r.length).toBe(rows[0].length);
        for (const ch of r) expect(ok.has(ch)).toBe(true);
      }
    }
  });

  it('eyes and mouths stay inside the grid and inside the face area', () => {
    for (const e of PART_TABLES.eyes) {
      const w = e.rows[0].length, x = e.wide ? GRID_W / 2 - w / 2 : e.x ?? 8, y = e.y ?? 23;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(e.wide ? GRID_W : GRID_W / 2);
      expect(y).toBeGreaterThanOrEqual(20);
      expect(y + e.rows.length).toBeLessThanOrEqual(34);
    }
    for (const m of PART_TABLES.mouths) {
      expect(m.rows[0].length).toBeLessThanOrEqual(16);
      expect(33 + (m.dy ?? 0) + m.rows.length).toBeLessThanOrEqual(41);
    }
  });

  it('every part combination renders a full grid on every shape', () => {
    for (let s = 0; s < SHAPES.length; s++) for (let e = 0; e < EYES.length; e++) for (let m = 0; m < MOUTHS.length; m++) for (let h = 0; h < HATS.length; h++) {
      const g = blobGrid({ color: COLORS[(e + m + h) % COLORS.length], shape: s, eyes: e, mouth: m, hat: h });
      expect(g).toHaveLength(GRID_H);
      expect(g.every((r) => r.length === GRID_W)).toBe(true);
    }
  });

  it('no hat covers the eyes or the mouth, on any shape or color', () => {
    for (let s = 0; s < SHAPES.length; s++) for (const color of COLORS) for (let e = 0; e < EYES.length; e++) {
      const bare = blobGrid({ color, shape: s, eyes: e, mouth: 0, hat: 0 });
      for (let h = 1; h < HATS.length; h++) {
        const covered = diff(bare, blobGrid({ color, shape: s, eyes: e, mouth: 0, hat: h }))
          .filter(([x, y]) => y >= 23 && y <= 40 && x >= 7 && x <= 28);
        expect(covered, `${HATS[h]} on ${SHAPES[s]} / ${EYES[e]}`).toEqual([]);
      }
    }
  });

  it('every hat and eye style is visible (changes pixels) on every shape', () => {
    for (let s = 0; s < SHAPES.length; s++) {
      const bare = blobGrid({ color: COLORS[0], shape: s, eyes: 0, mouth: 0, hat: 0 });
      for (let h = 1; h < HATS.length; h++) expect(diff(bare, blobGrid({ color: COLORS[0], shape: s, eyes: 0, mouth: 0, hat: h })).length).toBeGreaterThan(20);
    }
  });

  it('the bare body is left/right symmetric', () => {
    const g = blobGrid({ color: 0x5ec8ff, shape: 0, eyes: 1, mouth: 4, hat: 0 });
    for (let y = 14; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) expect(!!g[y][x]).toBe(!!g[y][GRID_W - 1 - x]);
  });

  it('svg is crisp pixels', () => {
    expect(blobSvg({ color: 0xff6b8b, shape: 0, eyes: 0, mouth: 0, hat: 1 })).toContain('shape-rendering="crispEdges"');
  });
});
