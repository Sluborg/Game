import { describe, expect, it } from 'vitest';
import { blobGrid, blobSvg, clampLook, EYES, GRID_H, GRID_W, HATS, MOUTHS } from './blob';

describe('blob', () => {
  it('clamps bad looks from the network', () => {
    const l = clampLook({ color: 123, eyes: 99, mouth: -3, hat: Number.NaN });
    expect(l.eyes).toBe(EYES.length - 1);
    expect(l.mouth).toBe(0);
    expect(l.hat).toBe(0);
  });

  it('every part combination renders a full grid', () => {
    for (let e = 0; e < EYES.length; e++) for (let m = 0; m < MOUTHS.length; m++) for (let h = 0; h < HATS.length; h++) {
      const g = blobGrid({ color: 0x5ec8ff, eyes: e, mouth: m, hat: h });
      expect(g).toHaveLength(GRID_H);
      expect(g.every((r) => r.length === GRID_W)).toBe(true);
    }
  });

  it('the bare body is left/right symmetric', () => {
    const g = blobGrid({ color: 0x5ec8ff, eyes: 1, mouth: 4, hat: 0 });
    for (let y = 14; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) expect(!!g[y][x]).toBe(!!g[y][GRID_W - 1 - x]);
  });

  it('svg is crisp pixels', () => {
    expect(blobSvg({ color: 0xff6b8b, eyes: 0, mouth: 0, hat: 1 })).toContain('shape-rendering="crispEdges"');
  });
});
