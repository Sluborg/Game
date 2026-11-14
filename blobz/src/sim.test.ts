import { describe, expect, it } from 'vitest';
import { BASE, createState, questTargets, step, type Input } from './sim';

const P = (id: string) => ({ id, name: id, color: 0x5ec8ff, shape: 0, eyes: 0, mouth: 0, hat: 0 });

describe('sim', () => {
  it('blob glides: keeps moving after input stops, then slows down', () => {
    const s = createState([P('a')], 1);
    const inp = new Map<string, Input>([['a', { x: 1, y: 0, dash: 0 }]]);
    for (let i = 0; i < 30; i++) step(s, inp, 1 / 60);
    const v0 = s.players[0].vx;
    inp.set('a', { x: 0, y: 0, dash: 0 });
    step(s, inp, 1 / 60);
    expect(s.players[0].vx).toBeGreaterThan(v0 * 0.9);
    for (let i = 0; i < 120; i++) step(s, inp, 1 / 60);
    expect(Math.abs(s.players[0].vx)).toBeLessThan(10);
  });

  it('carried items fill the team bank and the quest when the blob reaches the base', () => {
    const s = createState([P('a')], 2);
    s.items = [];
    const p = s.players[0];
    p.carry = ['stone', 'wood', 'wood'];
    p.x = BASE.x; p.y = BASE.y;
    step(s, new Map(), 1 / 60);
    expect(s.bank).toEqual({ wood: 2, stone: 1, berry: 0 });
    expect(s.delivered).toEqual({ wood: 2, stone: 1, berry: 0 });
    expect(p.carry).toHaveLength(0);
  });

  it('a gem only moves with 2+ blobz and scores at base', () => {
    const s = createState([P('a'), P('b')], 3);
    s.gems = [{ id: 99, x: 300, y: 300, vx: 0, vy: 0, holders: 0 }];
    const a = s.players[0], b = s.players[1];
    a.x = 290; a.y = 300; b.x = 1000; b.y = 800;
    const toBase: Input = { x: 1, y: 0.5, dash: 0 };
    for (let i = 0; i < 30; i++) step(s, new Map([['a', toBase]]), 1 / 60);
    expect(s.gems[0].x).toBeCloseTo(300, 0);
    a.x = 290; a.y = 300; b.x = 300; b.y = 312; b.vx = a.vx; b.vy = a.vy;
    for (let i = 0; i < 30; i++) step(s, new Map([['a', toBase], ['b', toBase]]), 1 / 60);
    expect(s.gems[0].x).toBeGreaterThan(310);
  });

  it('round ends at 0 seconds', () => {
    const s = createState([P('a')], 4);
    s.time = 0.01;
    step(s, new Map(), 1 / 60);
    expect(s.phase).toBe('end');
  });

  it('quest targets grow with team size', () => {
    expect(questTargets(2)).toEqual({ wood: 10, stone: 6, berry: 5 });
    expect(questTargets(1)).toEqual(questTargets(2));
    expect(questTargets(5).wood).toBeGreaterThan(questTargets(1).wood);
  });
});
