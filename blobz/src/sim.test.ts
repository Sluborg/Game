import { describe, expect, it } from 'vitest';
import { BASE, createState, DAY_CYCLE_ENABLED, STONE_ENABLED, finishMini, MINI_ENABLED, questTargets, step, type Input } from './sim';

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

  it.skipIf(!DAY_CYCLE_ENABLED)('sunset at 0 seconds starts Bärregn; the round ends after it (archived day cycle)', () => {
    const s = createState([P('a')], 4);
    s.time = 0.01;
    step(s, new Map(), 1 / 60);
    expect(s.phase).toBe('mini');
    finishMini(s);
    expect(s.phase).toBe('end');
  });

  it.skipIf(DAY_CYCLE_ENABLED)('no day cycle: no time limit; a complete quest ends the round', () => {
    const s = createState([P('a')], 4);
    const t = s.time;
    for (let i = 0; i < 600; i++) step(s, new Map(), 1 / 60);
    expect(s.phase).toBe('play');
    expect(s.time).toBe(t);
    s.delivered = { ...s.quest, wood: s.quest.wood - 1 };
    step(s, new Map(), 1 / 60);
    expect(s.phase).toBe('play'); // two of three goals is not enough
    s.delivered.wood = s.quest.wood;
    step(s, new Map(), 1 / 60);
    if (MINI_ENABLED) { expect(s.phase).toBe('mini'); finishMini(s); }
    expect(s.phase).toBe('end'); // Bärregn archived: straight to the end screen
  });

  it('quest targets grow with team size', () => {
    expect(questTargets(2)).toEqual({ wood: 10, stone: STONE_ENABLED ? 6 : 0, berry: 5 });
    expect(questTargets(1)).toEqual(questTargets(2));
    expect(questTargets(5).wood).toBeGreaterThan(questTargets(1).wood);
  });
});

describe('village spawn (Stefan 2026-11-15)', () => {
  it('puts all 5 blobz in one row south of the main building, apart, clear of the building, flag, pile, nodes and the cave', async () => {
    const { spawnSpot, SPAWN_Y, MAX_PLAYERS, makeTrees, entranceOf, ENTRANCE_R, BASE: B } = await import('./sim');
    const spots = Array.from({ length: MAX_PLAYERS }, (_, i) => spawnSpot(i));
    expect(new Set(spots.map((p) => p.x)).size).toBe(MAX_PLAYERS);
    for (const p of spots) {
      expect(p.y).toBe(SPAWN_Y);
      expect(p.y - 40).toBeGreaterThan(B.y + 62); // a 40 px blob stands fully below the building foot (+30) and the flag foot (+62)
      expect(Math.abs(p.x - B.x)).toBeLessThanOrEqual(96);
    }
    for (let i = 1; i < spots.length; i++) for (let j = 0; j < i; j++) expect(Math.abs(spots[i].x - spots[j].x)).toBeGreaterThanOrEqual(44);
    for (const seed of [1, 7, 424242]) {
      for (const p of spots) for (const t of makeTrees(seed)) expect(Math.hypot(t.x - p.x, t.y - p.y)).toBeGreaterThan(40);
      const e = entranceOf(seed);
      for (const p of spots) expect(Math.hypot(e.x - p.x, e.y - p.y)).toBeGreaterThan(ENTRANCE_R + 20);
    }
    const s = createState(['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, name: id, color: 0x5ec8ff, shape: 0, eyes: 0, mouth: 0, hat: 0 })), 7);
    expect(s.players.map((p) => [p.x, p.y])).toEqual(spots.map((p) => [p.x, p.y]));
  });
});
