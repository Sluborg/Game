import { describe, expect, it } from 'vitest';
import {
  BASE, createState, GOO_HP, GOO_NEAR, snapshot, step, viewFromSnapshot, WAVES, waveMix,
  type Goo, type GooKind, type Input, type State,
} from './sim';

const P = (id: string) => ({ id, name: id, color: 0x5ec8ff, shape: 0, eyes: 0, mouth: 0, hat: 0 });
const idle = new Map<string, Input>();
const goo = (s: State, kind: GooKind, x: number, y: number): Goo => {
  const g: Goo = { id: s.nextId++, kind, x, y, vx: 0, vy: 0, hp: GOO_HP[kind], loot: [], stun: 0, cd: {} };
  s.goos.push(g);
  return g;
};
/** A blank test field: no nodes, no waves yet. */
const field = (n = 1) => { const s = createState(Array.from({ length: n }, (_, i) => P('p' + i)), 1); s.trees = []; s.wave = WAVES.length; return s; };
const put = (s: State, i: number, x: number, y: number) => Object.assign(s.players[i], { x, y, vx: 0, vy: 0 });
/** Player i dashes (new dash counter) towards +x. */
const dash = (s: State, i: number, n: number) => { s.players[i].dashCd = 0; return new Map<string, Input>([[s.players[i].id, { x: 1, y: 0, dash: n }]]); };

describe('goo waves', () => {
  it('waves come every ~45 s with the boss in the last minute', () => {
    expect(WAVES).toEqual([150, 105, 58, 20]);
    expect(waveMix(2, 3)[2]).toBe(1);
    expect(WAVES[2]).toBeLessThan(60);
    const s = createState([P('a'), P('b')], 2);
    for (let t = 0; t < 29; t++) step(s, idle, 1);
    expect(s.goos).toHaveLength(0);
    while (s.wave === 0) step(s, idle, 1 / 60);
    expect(s.time).toBeLessThanOrEqual(150);
    expect(s.wave).toBe(1);
    expect(s.goos).toHaveLength(waveMix(0, 2)[0]);
    expect(s.fx.some((f) => f.t === 'wave')).toBe(true);
    for (const g of s.goos) expect(g.x <= 25 || g.x >= 1255 || g.y <= 25 || g.y >= 935).toBe(true); // from the edge
    s.time = 57; s.fx = [];
    step(s, idle, 1 / 60);
    expect(s.goos.some((g) => g.kind === 2)).toBe(true);
    expect(s.fx.some((f) => f.t === 'wave' && f.boss)).toBe(true);
  });

  it('goo heads for the base, and for a carrying blob it can see', () => {
    const s = field();
    const g = goo(s, 0, 100, BASE.y);
    put(s, 0, 1000, 900);
    for (let i = 0; i < 60; i++) step(s, idle, 1 / 60);
    expect(g.x).toBeGreaterThan(130);
    const h = goo(s, 0, 400, 200);
    put(s, 0, 400, 400);
    s.players[0].carry = ['wood'];
    for (let i = 0; i < 60; i++) step(s, idle, 1 / 60);
    expect(h.y).toBeGreaterThan(230);
  });

  it('touching a carrier steals one item; a shield charge blocks it', () => {
    const s = field();
    put(s, 0, 500, 300);
    s.players[0].carry = ['wood', 'stone'];
    const g = goo(s, 0, 500 + 25, 300);
    step(s, idle, 1 / 60);
    expect(s.players[0].carry).toEqual(['wood']);
    expect(g.loot).toEqual(['stone']);
    const s2 = field();
    put(s2, 0, 500, 300);
    s2.players[0].carry = ['berry'];
    s2.players[0].shield = 1;
    const g2 = goo(s2, 1, 500 + 30, 300);
    step(s2, idle, 1 / 60);
    expect(s2.players[0].carry).toEqual(['berry']);
    expect(s2.players[0].shield).toBe(0);
    expect(g2.loot).toEqual([]);
    expect(s2.fx.some((f) => f.t === 'shield')).toBe(true);
  });

  it('dash splats: small 1 hit, medium 2, boss 5; the loot drops back', () => {
    for (const [kind, hits] of [[0, 1], [1, 2], [2, 5]] as [GooKind, number][]) {
      const s = field(2);
      const g = goo(s, kind, 560, 300);
      g.loot = ['stone'];
      let n = 0;
      for (let h = 0; h < hits; h++) {
        // alternate blobz so per-blob cooldowns never block (the boss wants several blobz)
        const i = h % 2;
        put(s, 1 - i, 1000, 900);
        for (let k = 0; k < 40 && s.goos.includes(g) && g.hp === GOO_HP[kind] - h; k++) {
          put(s, i, g.x - 60, g.y); n++;
          step(s, dash(s, i, n), 1 / 60);
          for (let f = 0; f < 6; f++) step(s, new Map([[s.players[i].id, { x: 1, y: 0, dash: n }]]), 1 / 60);
          for (let w = 0; w < 40; w++) step(s, idle, 1 / 60); // wait out cooldowns + stun
        }
      }
      expect(s.goos.includes(g)).toBe(false);
      expect(s.fx.some((f) => f.t === 'splat')).toBe(true);
      expect(s.items.some((it) => it.kind === 'stone')).toBe(true);
    }
  });

  it('a full goo runs to the edge and the loot is lost; at the base it nibbles the bank', () => {
    const s = field();
    put(s, 0, 1000, 900);
    const g = goo(s, 0, 60, 500);
    g.loot = ['wood'];
    for (let i = 0; i < 120; i++) step(s, idle, 1 / 60);
    expect(s.goos.includes(g)).toBe(false);
    s.bank = { wood: 1, stone: 5, berry: 0 };
    const h = goo(s, 1, BASE.x + 20, BASE.y);
    step(s, idle, 1 / 60);
    expect(h.loot).toEqual(['stone', 'stone']);
    expect(s.bank).toEqual({ wood: 1, stone: 3, berry: 0 });
  });

  it('a goo nearby turns the tool button into an attack; goo survives the snapshot', () => {
    const s = createState([P('a')], 3);
    s.wave = WAVES.length;
    const t = s.trees.find((n) => n.kind < 3)!;
    put(s, 0, t.x + 35, t.y);
    goo(s, 0, t.x + 35 + GOO_NEAR - 10, t.y + 40);
    step(s, new Map([['a', { x: 0, y: 0, dash: 1 }]]), 1 / 60);
    expect(s.players[0].dashT).toBeGreaterThan(0);
    expect(t.hits).toBe(0);
    s.goos[0].loot = ['berry'];
    const v = viewFromSnapshot(JSON.parse(JSON.stringify(snapshot(s))));
    expect(v.goos[0]).toMatchObject({ kind: 0, hp: 1, loot: ['berry'] });
  });
});
