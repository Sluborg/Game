import { describe, expect, it } from 'vitest';
import { BASE, createState, DAY_CYCLE_ENABLED, DUNGEON_ENABLED, STONE_ENABLED, finishMini, MINI_ENABLED, questTargets, step, type Input } from './sim';

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

describe('building footprints + portal ring (Stefan 2026-11-15)', () => {
  const P5 = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, name: id, color: 0x5ec8ff, shape: 0, eyes: 0, mouth: 0, hat: 0 }));
  const idle = new Map<string, Input>();
  const inBox = (b: { x0: number; x1: number; y0: number; y1: number }, x: number, y: number) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;

  it('the main building base is solid: a blob placed inside is snapped out and stays out; it can pass behind the roof', async () => {
    const { solidBoxes } = await import('./sim');
    const s = createState(P5.slice(0, 1), 7);
    const house = solidBoxes(s)[0];
    expect(house.y1).toBe(BASE.y + 30); // the base ends where the picture stands
    const p = s.players[0];
    Object.assign(p, { x: BASE.x, y: BASE.y + 10, vx: 0, vy: 0 });
    for (let i = 0; i < 10; i++) step(s, idle, 1 / 60);
    expect(inBox(house, p.x, p.y)).toBe(false);
    // behind (north of) the base, under the roof: free to stand there
    Object.assign(p, { x: BASE.x, y: house.y0 - 30, vx: 0, vy: 0 });
    step(s, idle, 1 / 60);
    expect(Math.round(p.y)).toBe(house.y0 - 30);
  });

  it('a blob gliding into the house bounces off the wall', () => {
    const s = createState(P5.slice(0, 1), 7);
    const p = s.players[0];
    Object.assign(p, { x: BASE.x - 150, y: BASE.y + 20, vx: 0, vy: 0 });
    const right = new Map<string, Input>([['a', { x: 1, y: 0, dash: 0 }]]);
    for (let i = 0; i < 90; i++) step(s, right, 1 / 60);
    expect(p.x).toBeLessThan(BASE.x - 40);
  });

  it.skipIf(!DUNGEON_ENABLED)('the portal ring is an ellipse in front of the portal, below the pillars; no pushing on it', async () => {
    const { ENTRANCE_RING, onEntrance, solidBoxes } = await import('./sim');
    const s = createState(P5, 7);
    const e = s.entrance;
    expect(onEntrance(e, e.x, e.y + ENTRANCE_RING.dy)).toBe(true);
    expect(onEntrance(e, e.x + ENTRANCE_RING.rx + 1, e.y + ENTRANCE_RING.dy)).toBe(false);
    expect(onEntrance(e, e.x, e.y + 70)).toBe(false); // where blobz come back out of the dungeon
    // two blobz on the same spot inside the ring are not shoved apart
    const [a, b] = s.players;
    Object.assign(a, { x: e.x - 5, y: e.y + 30, vx: 0, vy: 0 }); Object.assign(b, { x: e.x + 5, y: e.y + 30, vx: 0, vy: 0 });
    for (const q of s.players.slice(2)) Object.assign(q, { x: BASE.x, y: BASE.y + 200 });
    step(s, idle, 1 / 60);
    expect(b.x - a.x).toBeCloseTo(10, 0);
    // all 5 fit on open ground inside the ring (none inside a pillar)
    const spots = [-40, -20, 0, 20, 40].map((dx, i) => ({ x: e.x + dx, y: e.y + ENTRANCE_RING.dy + (i % 2 ? 12 : -2) }));
    for (const q of spots) {
      expect(onEntrance(e, q.x, q.y)).toBe(true);
      for (const box of solidBoxes(s)) expect(inBox(box, q.x, q.y)).toBe(false);
    }
  });
});
