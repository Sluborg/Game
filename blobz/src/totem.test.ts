import { describe, expect, it } from 'vitest';
import {
  BASE, createState, DOUBLE_SECONDS, makeTrees, snapshot, step, TOTEM_KINDS, TOTEM_PADS, TOTEM_PRICES, viewFromSnapshot, res,
  type Input, type State,
} from './sim';

const P = (id: string) => ({ id, name: id, color: 0x5ec8ff, shape: 0, eyes: 0, mouth: 0, hat: 0 });
const idle = new Map<string, Input>();
const at = (s: State, id: string, x: number, y: number) => { const p = s.players.find((q) => q.id === id)!; Object.assign(p, { x, y, vx: 0, vy: 0 }); return p; };
const away = (s: State, id: string) => at(s, id, BASE.x, BASE.y + 200);
const run = (s: State, secs: number, inp = idle) => { for (let i = 0; i < secs * 60; i++) step(s, inp, 1 / 60); };
const pad = (k: string) => TOTEM_PADS[TOTEM_KINDS.indexOf(k as never)];

describe('team bank + totems', () => {
  it('totems cost resources from the bank; spending never lowers the quest', () => {
    const s = createState([P('a')], 1);
    const a = at(s, 'a', BASE.x, BASE.y);
    a.carry = ['wood', 'wood', 'wood'];
    step(s, idle, 1 / 60);
    expect(s.bank.wood).toBe(3);
    s.bank.wood = 5;
    at(s, 'a', pad('speed').x, pad('speed').y);
    run(s, 1.2);
    expect(s.totems[0].level).toBe(1);
    expect(s.bank.wood).toBe(5 - TOTEM_PRICES.speed[0].wood!);
    expect(s.delivered.wood).toBe(3);
  });

  it('needs a full second on the pad and enough coins', () => {
    const s = createState([P('a')], 2);
    s.bank = res(9, 3, 9); // one stone short
    const pd = pad('magnet');
    at(s, 'a', pd.x, pd.y);
    run(s, 2);
    expect(s.totems[1].level).toBe(0);
    expect(s.bank.stone).toBe(3);
    s.bank.stone = 4;
    run(s, 0.5);
    expect(s.totems[1].level).toBe(0);
    expect(s.totems[1].buy).toBeGreaterThan(0.4);
    away(s, 'a'); step(s, idle, 1 / 60);
    expect(s.totems[1].buy).toBe(0); // stepping off resets the timer
  });

  it('buys one level per visit, up to level 3', () => {
    const s = createState([P('a')], 3);
    s.bank = res(50, 50, 50);
    const pd = pad('shield');
    for (let visit = 1; visit <= 4; visit++) {
      at(s, 'a', pd.x, pd.y);
      run(s, 3); // standing longer never buys twice
      expect(s.totems[2].level).toBe(Math.min(3, visit));
      away(s, 'a'); step(s, idle, 1 / 60);
    }
    expect(s.bank).toEqual(res(50 - 13, 50 - 13, 50));
  });

  it('speed totem raises top speed, magnet widens pickup', () => {
    const top = (lvl: number) => {
      const s = createState([P('a')], 4);
      s.totems[0].level = lvl;
      s.trees = [];
      at(s, 'a', 100, 100);
      run(s, 2, new Map([['a', { x: 1, y: 0, dash: 0 }]]));
      return s.players[0].vx;
    };
    expect(top(3)).toBeGreaterThan(top(0) * 1.25);
    const s = createState([P('a')], 5);
    s.trees = [];
    s.items = [{ id: 999, kind: 'wood', x: 300, y: 300 }];
    at(s, 'a', 300 + 40, 300);
    step(s, idle, 1 / 60);
    expect(s.players[0].carry).toHaveLength(0);
    s.totems[1].level = 2;
    at(s, 'a', 300 + 40, 300);
    step(s, idle, 1 / 60);
    expect(s.players[0].carry).toEqual(['wood']);
  });

  it('double totem gives 2x resources for 20 s, shield gives charges that refill', () => {
    const s = createState([P('a'), P('b')], 6);
    s.bank = res(20, 20, 20);
    away(s, 'b');
    at(s, 'a', pad('double').x, pad('double').y);
    run(s, 1.1);
    expect(s.doubleT).toBeGreaterThan(DOUBLE_SECONDS - 1);
    const a = at(s, 'a', BASE.x, BASE.y);
    a.carry = ['wood'];
    const before = s.delivered.wood;
    step(s, idle, 1 / 60);
    expect(s.delivered.wood - before).toBe(2);
    run(s, DOUBLE_SECONDS);
    expect(s.doubleT).toBe(0);

    s.bank = res(20, 20, 20);
    at(s, 'a', pad('shield').x, pad('shield').y);
    run(s, 1.1);
    expect(s.players.every((p) => p.shield === 1)).toBe(true);
    s.players[1].shield = 0;
    run(s, 8.1);
    expect(s.players[1].shield).toBe(1);
  });

  it('pads are clear of trees and reachable; state survives the snapshot', () => {
    for (const seed of [1, 77, 4242]) for (const t of makeTrees(seed)) for (const p of TOTEM_PADS) expect(Math.hypot(t.x - p.x, t.y - p.y)).toBeGreaterThan(69);
    const s = createState([P('a')], 8);
    s.bank = res(3, 4, 5); s.totems[3].level = 2; s.totems[0].buy = 0.5; s.doubleT = 12.34; s.players[0].shield = 2;
    const v = viewFromSnapshot(JSON.parse(JSON.stringify(snapshot(s))));
    expect(v.bank).toEqual(res(3, 4, 5));
    expect(v.totems.map((t) => t.level)).toEqual([0, 0, 0, 2]);
    expect(v.totems[0].buy).toBe(0.5);
    expect(v.doubleT).toBeCloseTo(12.3, 1);
    expect(v.players[0].shield).toBe(2);
  });
});
