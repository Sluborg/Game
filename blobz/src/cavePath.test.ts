import { describe, expect, it } from 'vitest';
import { cavePath } from './cavePath';
import { BASE, entranceOf, isSolid, makeTrees, makeWater, WATER_TILE } from './sim';
import { waterTiles } from './water';

describe('cave path (dirt from the yard to the dungeon)', () => {
  for (const seed of [1, 7, 42, 1234, 98765]) {
    it(`seed ${seed}: joins the yard and the cave, off water and clear of nodes`, () => {
      const path = cavePath(seed);
      expect(path.size).toBeGreaterThan(0);
      const tiles = [...path].map((k) => k.split(',').map(Number));
      const T = WATER_TILE, e = entranceOf(seed);
      const at = (p: { x: number; y: number }, r: number) => tiles.some(([tx, ty]) => Math.hypot((tx + 0.5) * T - p.x, (ty + 0.5) * T - p.y) < r);
      expect(at(BASE, 2 * T)).toBe(true);
      expect(at(e, 2 * T)).toBe(true);
      const wet = new Set(waterTiles(makeWater(seed).water).map((t) => t.tx + ',' + t.ty));
      expect([...path].some((k) => wet.has(k))).toBe(false);
      // no node stands on a path tile (outside the yard and the cave mouth)
      const onPath = makeTrees(seed).filter((n) => path.has(Math.floor(n.x / T) + ',' + Math.floor(n.y / T))
        && Math.hypot(n.x - BASE.x, n.y - BASE.y) > BASE.r + 60 && Math.hypot(n.x - e.x, n.y - e.y) > 120);
      expect(onPath.filter((n) => isSolid(n.kind) || n.kind === 5)).toEqual([]);
    });
  }
});
