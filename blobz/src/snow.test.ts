import { describe, expect, it } from 'vitest';
import { BASE, cleanBiome, createState, ICE_RX, makeIce, makeTrees, onIce, step, type Input, type State } from './sim';

const P = (id: string) => ({ id, name: id, color: 0x5ec8ff, shape: 0, eyes: 0, mouth: 0, hat: 0 });
const run = (s: State, secs: number, inp: Map<string, Input>) => { for (let i = 0; i < secs * 60; i++) step(s, inp, 1 / 60); };

describe('snow map', () => {
  it('biome: only "snow" is snow, anything else is the meadow; the meadow has no ice', () => {
    expect(cleanBiome('snow')).toBe('snow');
    expect(cleanBiome('lava')).toBe('meadow');
    expect(createState([P('a')], 1).ice).toEqual([]);
    expect(createState([P('a')], 1, undefined, 'snow').biome).toBe('snow');
  });

  it('three frozen ponds, seeded, clear of nodes and away from the base', () => {
    for (const seed of [1, 2, 3, 77, 4242]) {
      const ice = makeIce(seed);
      expect(ice.length).toBe(3);
      expect(makeIce(seed)).toEqual(ice);
      for (const i of ice) {
        expect(Math.hypot(i.x - BASE.x, i.y - BASE.y)).toBeGreaterThan(280);
        for (const t of makeTrees(seed)) expect(onIce([i], t.x, t.y)).toBe(false);
      }
    }
  });

  it('ice is slippery: less grip when steering, a much longer glide when letting go', () => {
    const glide = (ice: boolean) => {
      const s = createState([P('a')], 5, undefined, 'snow');
      s.trees = [];
      const pond = s.ice[0];
      if (!ice) s.ice = [];
      const p = s.players[0];
      Object.assign(p, { x: pond.x - ICE_RX + 20, y: pond.y, vx: 160, vy: 0 });
      const before = p.x;
      run(s, 0.6, new Map([['a', { x: 0, y: 0, dash: 0 }]]));
      return p.x - before;
    };
    expect(glide(true)).toBeGreaterThan(glide(false) * 1.3);
    const grip = (ice: boolean) => {
      const s = createState([P('a')], 5, undefined, 'snow');
      s.trees = [];
      const pond = s.ice[0];
      if (!ice) s.ice = [];
      const p = s.players[0];
      Object.assign(p, { x: pond.x, y: pond.y, vx: 0, vy: 0 });
      run(s, 0.1, new Map([['a', { x: 1, y: 0, dash: 0 }]]));
      return p.vx;
    };
    expect(grip(true)).toBeLessThan(grip(false) * 0.6);
  });
});
