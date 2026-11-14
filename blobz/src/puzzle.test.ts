import { describe, expect, it } from 'vitest';
import {
  BASE, CHEST_POINTS, createState, makePuzzles, makeTrees, puzzleNeeds, snapshot, step, viewFromSnapshot,
  WORLD_H, WORLD_W, type Input, type State,
} from './sim';

const P = (id: string) => ({ id, name: id, color: 0x5ec8ff, shape: 0, eyes: 0, mouth: 0, hat: 0 });
const idle = new Map<string, Input>();
const park = (s: State, id: string, x: number, y: number) => {
  const p = s.players.find((q) => q.id === id)!;
  p.x = x; p.y = y; p.vx = 0; p.vy = 0;
};
/** Move everyone far from the plates so the test controls exactly who stands where. */
const clear = (s: State) => s.players.forEach((p, i) => park(s, p.id, BASE.x - 40 + i * 40, BASE.y));

describe('co-op puzzles', () => {
  it('layout is deterministic, inside the world, 2 pens in different corners, gate faces the base', () => {
    for (const seed of [1, 42, 999, 123456]) {
      const a = makePuzzles(seed), b = makePuzzles(seed);
      expect(a).toEqual(b);
      expect(a).toHaveLength(2);
      expect(Math.hypot(a[0].cx - a[1].cx, a[0].cy - a[1].cy)).toBeGreaterThan(300);
      for (const l of a) {
        expect(l.zone.x0).toBeGreaterThan(0); expect(l.zone.x1).toBeLessThan(WORLD_W);
        expect(l.zone.y0).toBeGreaterThan(0); expect(l.zone.y1).toBeLessThan(WORLD_H);
        expect(l.gateDown).toBe(l.cy < BASE.y);
        // plates and pen kept clear of trees
        for (const t of makeTrees(seed)) expect(t.x > l.zone.x0 - 30 && t.x < l.zone.x1 + 30 && t.y > l.zone.y0 - 30 && t.y < l.zone.y1 + 30).toBe(false);
      }
    }
  });

  it('needs 2 and 3 plates, never more than the players', () => {
    expect(puzzleNeeds(1)).toEqual([1, 1]);
    expect(puzzleNeeds(2)).toEqual([2, 2]);
    expect(puzzleNeeds(5)).toEqual([2, 3]);
    expect(createState(['a', 'b', 'c'].map(P), 7).puzzles.map((z) => z.need)).toEqual([2, 3]);
  });

  it('gate opens only while all plates are held at the same time, then stays open', () => {
    const s = createState(['a', 'b', 'c'].map(P), 7);
    const l = s.layout[1]; // the 3-plate puzzle
    clear(s);
    park(s, 'a', l.plates[0].x, l.plates[0].y);
    park(s, 'b', l.plates[1].x, l.plates[1].y);
    step(s, idle, 1 / 60);
    expect(s.puzzles[1].mask).toBe(0b011);
    expect(s.puzzles[1].open).toBe(false);
    park(s, 'c', l.plates[2].x, l.plates[2].y);
    s.fx = [];
    step(s, idle, 1 / 60);
    expect(s.puzzles[1].open).toBe(true);
    expect(s.fx.some((f) => f.t === 'gate')).toBe(true);
    clear(s);
    step(s, idle, 1 / 60);
    expect(s.puzzles[1].mask).toBe(0);
    expect(s.puzzles[1].open).toBe(true);
  });

  it('closed gate blocks the way in; open gate lets a blob reach the chest for +25 once', () => {
    const s = createState(['a', 'b'].map(P), 11);
    const l = s.layout[0];
    clear(s);
    // glide straight at the closed gate from outside
    const dir = l.gateDown ? -1 : 1;
    const outsideY = l.gateDown ? l.gate.y1 + 40 : l.gate.y0 - 40;
    park(s, 'a', l.cx, outsideY);
    const push = new Map<string, Input>([['a', { x: 0, y: dir, dash: 0 }]]);
    for (let i = 0; i < 120; i++) step(s, push, 1 / 60);
    const a = s.players.find((p) => p.id === 'a')!;
    expect(l.gateDown ? a.y > l.gate.y0 : a.y < l.gate.y1).toBe(true); // still outside
    expect(s.score).toBe(0);
    s.puzzles[0].open = true;
    for (let i = 0; i < 180 && !s.puzzles[0].taken; i++) step(s, push, 1 / 60);
    expect(s.puzzles[0].taken).toBe(true);
    expect(s.score).toBe(CHEST_POINTS);
    for (let i = 0; i < 30; i++) step(s, push, 1 / 60);
    expect(s.score).toBe(CHEST_POINTS);
  });

  it('puzzle state survives the network snapshot', () => {
    const s = createState(['a', 'b', 'c'].map(P), 3);
    s.puzzles[0] = { need: 2, mask: 0b10, open: true, taken: false };
    const v = viewFromSnapshot(JSON.parse(JSON.stringify(snapshot(s))));
    expect(v.puzzles).toEqual(s.puzzles);
  });

  it('items never spawn inside pens or on plates', () => {
    const s = createState(['a', 'b'].map(P), 5);
    for (let i = 0; i < 600; i++) step(s, idle, 1 / 10);
    for (const it of s.items) for (const l of s.layout) {
      expect(it.x > l.zone.x0 && it.x < l.zone.x1 && it.y > l.zone.y0 && it.y < l.zone.y1).toBe(false);
    }
  });
});
