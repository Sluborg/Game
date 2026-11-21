import { describe, expect, it } from 'vitest';
import { nextBgScale, intFit, type BgState } from './pixelScale';

const run = (d: number, sizes: [number, number][]) => { let s: BgState | null = null; return sizes.map(([w, h]) => (s = nextBgScale(s, w, h, d)).k); };

describe('background scale is stable (Lead 2026-11-21)', () => {
  it('the address bar sliding 844 <-> 790 keeps k', () => {
    const [a, b, c, d] = run(2.625, [[390, 844], [390, 790], [390, 844], [390, 800]]);
    expect(a).toBe(6); // 844 tall at 2.625: 844 * 2.625 / 430 = 5.15 -> 6
    expect([b, c, d]).toEqual([6, 6, 6]);
  });
  it('first seen with the bar shown (790) and then hidden (844) rises once and then stays', () => {
    const ks = run(2.625, [[390, 790], [390, 844], [390, 790], [390, 844], [390, 790]]);
    expect(ks).toEqual([5, 6, 6, 6, 6]);
  });
  it('a keyboard that shrinks the viewport (844 -> 450) keeps k', () => {
    expect(run(2.625, [[390, 844], [390, 450], [390, 844]])).toEqual([6, 6, 6]);
  });
  it('a different width or an orientation change starts over', () => {
    expect(run(2, [[390, 844], [360, 780]])).toEqual([4, 4]); // 844*2/430 = 3.9 -> 4; 780*2/430 = 3.6 -> 4
    const k = run(2, [[390, 844], [844, 390], [390, 844]]);
    expect(k[1]).toBe(Math.ceil((844 * 2) / 240)); // landscape: the width decides (7.03 -> 8)
    expect(k[2]).toBe(4);
  });
  it('always whole device px per art px and always covers the screen', () => {
    for (const d of [1, 2, 2.625, 3]) for (const [w, h] of [[360, 640], [390, 844], [412, 915], [430, 932]]) {
      const s = nextBgScale(null, w, h, d);
      expect(Number.isInteger(s.k)).toBe(true);
      expect((240 * s.k) / d).toBeGreaterThanOrEqual(w - 1e-6);
      expect((430 * s.k) / d).toBeGreaterThanOrEqual(h - 1e-6);
    }
    expect(intFit(150, 104, 316, 230, 2.625).k).toBe(5); // sanity: the logo helper next to it still holds
  });
});
