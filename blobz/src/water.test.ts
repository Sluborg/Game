import { describe, expect, it } from 'vitest';
import { makeWater, WATER_W, WORLD_H, WORLD_W } from './sim';
import { shoreTile, WATER_TILE, waterTiles } from './water';

describe('water corner on the 32 px grid + shore pieces', () => {
  it('every corner layout: channel 64 px (2 tiles), all edges on the grid', () => {
    expect(WATER_W).toBe(2 * WATER_TILE);
    for (let seed = 1; seed < 80; seed++) {
      const w = makeWater(seed);
      for (const r of w.water) {
        for (const x of [r.x0, r.x1]) if (x > 0 && x < WORLD_W) expect(x % WATER_TILE, `seed ${seed} x`).toBe(0);
        for (const y of [r.y0, r.y1]) if (y > 0 && y < WORLD_H) expect(y % WATER_TILE, `seed ${seed} y`).toBe(0);
      }
    }
  });

  it('8-neighbour shore logic (ported from water_variants.py)', () => {
    // a 3x3 pond at tiles 1..3
    const pond = (tx: number, ty: number) => tx >= 1 && tx <= 3 && ty >= 1 && ty <= 3;
    expect(shoreTile(pond, 1, 1)).toBe('nw');
    expect(shoreTile(pond, 3, 1)).toBe('ne');
    expect(shoreTile(pond, 1, 3)).toBe('sw');
    expect(shoreTile(pond, 3, 3)).toBe('se');
    expect(shoreTile(pond, 2, 1)).toBe('n');
    expect(shoreTile(pond, 2, 3)).toBe('s');
    expect(shoreTile(pond, 1, 2)).toBe('w');
    expect(shoreTile(pond, 3, 2)).toBe('e');
    expect(['open', 'open2']).toContain(shoreTile(pond, 2, 2));
    // an L: the inner bend gets an inner corner
    const ell = (tx: number, ty: number) => (tx >= 0 && tx <= 1 && ty >= 0 && ty <= 5) || (ty >= 4 && ty <= 5 && tx >= 0 && tx <= 5);
    expect(shoreTile(ell, 1, 3)).toBe('e');
    expect(shoreTile(ell, 1, 4)).toBe('ine');
  });

  it('the L of a real map: 2 tiles wide, inner corner at the bend, no shore along the world edge', () => {
    const w = makeWater(1);
    const tiles = waterTiles(w.water);
    expect(tiles.length).toBeGreaterThan(20);
    const shores = new Set(tiles.map((t) => t.shore));
    expect([...shores].some((s) => s.startsWith('i'))).toBe(true); // the bend
    // tiles on the world border have no shore facing the border
    for (const t of tiles) {
      if (t.tx === 0) expect(['w', 'nw', 'sw']).not.toContain(t.shore);
      if (t.ty === 0) expect(['n', 'nw', 'ne']).not.toContain(t.shore);
    }
  });
});
