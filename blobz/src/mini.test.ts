import { describe, expect, it } from 'vitest';
import { ARENA, BOMB_R, DROP_HEIGHT, FALL_SECONDS, MINI_INTRO, MINI_SECONDS, miniGoal, miniStars, newMini, stepMini, type MiniFx } from './mini';
import { createState, finishMini, snapshot, step, viewFromSnapshot, type Input, type State } from './sim';

const P = (id: string) => ({ id, name: id, color: 0x5ec8ff, shape: 0, eyes: 0, mouth: 0, hat: 0 });
const body = (id: string, x: number, y: number) => ({ id, x, y, vx: 0, vy: 0 });
const sunset = (n: number) => { const s = createState(Array.from({ length: n }, (_, i) => P('p' + i)), 3); s.time = 0.01; step(s, new Map(), 1 / 60); return s; };
const run = (s: State, secs: number, inp = new Map<string, Input>()) => { for (let i = 0; i < secs * 60; i++) step(s, inp, 1 / 60); };

describe('Bärregn mini game', () => {
  it('starts at sunset for 1-5 players, everyone inside the field, goal grows with the team', () => {
    for (let n = 1; n <= 5; n++) {
      const s = sunset(n);
      expect(s.phase).toBe('mini');
      expect(s.mini!.t).toBeCloseTo(MINI_SECONDS + MINI_INTRO, 0);
      for (const p of s.players) expect(p.x > ARENA.x0 && p.x < ARENA.x1 && p.y > ARENA.y0 && p.y < ARENA.y1).toBe(true);
    }
    expect(miniGoal(5)[2]).toBeGreaterThan(miniGoal(1)[2]);
    const g = miniGoal(3);
    expect(g[0]).toBeLessThan(g[1]); expect(g[1]).toBeLessThan(g[2]);
  });

  it('a short picture intro first: no rain until it is over', () => {
    const m = newMini(3);
    const fx: MiniFx[] = [];
    for (let i = 0; i < (MINI_INTRO - 0.1) * 60; i++) stepMini(m, [body('a', 640, 480)], 1 / 60, fx);
    expect(m.drops).toHaveLength(0);
    for (let i = 0; i < 1 * 60; i++) stepMini(m, [body('a', 640, 480)], 1 / 60, fx);
    expect(m.drops.length).toBeGreaterThan(0);
  });

  it('a berry landing on a blob is caught; one landing on the ground is lost', () => {
    const m = newMini(1);
    m.berryT = m.bombT = 99;
    m.drops = [{ id: 1, kind: 'berry', x: 500, y: 400, z: 1 }, { id: 2, kind: 'berry', x: 800, y: 600, z: 1 }];
    const fx: MiniFx[] = [];
    stepMini(m, [body('a', 505, 402)], 0.1, fx);
    expect(m.caught).toBe(1);
    expect(fx.map((f) => f.t).sort()).toEqual(['catch', 'miss']);
  });

  it('a bomb stuns nearby blobz for 1 s (they cannot catch or move meanwhile)', () => {
    const s = sunset(2);
    const m = s.mini!;
    m.berryT = m.bombT = 99; m.drops = [];
    const [a, b] = s.players;
    Object.assign(a, { x: 500, y: 450 }); Object.assign(b, { x: 800, y: 450 });
    m.drops.push({ id: 9, kind: 'bomb', x: 500 + BOMB_R / 2, y: 450, z: 0.1 });
    step(s, new Map(), 1 / 60);
    expect(m.stun[a.id]).toBeGreaterThan(0);
    expect(m.stun[b.id]).toBeUndefined();
    const x0 = a.x;
    run(s, 0.5, new Map([[a.id, { x: 1, y: 0, dash: 0 }]]));
    expect(Math.abs(a.x - x0)).toBeLessThan(30); // only the blast puff, no steering
    m.drops.push({ id: 10, kind: 'berry', x: a.x, y: a.y, z: 0.1 });
    step(s, new Map(), 1 / 60);
    expect(m.caught).toBe(0);
    run(s, 0.6);
    expect(m.stun[a.id]).toBeUndefined();
  });

  it('it rains: berries and bombs fall over the field, shadows first, and the rain stops before the end', () => {
    const m = newMini(3);
    const fx: MiniFx[] = [];
    let maxDrops = 0;
    for (let t = 0; t < 20 * 60; t++) { stepMini(m, [], 1 / 60, fx); maxDrops = Math.max(maxDrops, m.drops.length); }
    expect(fx.filter((f) => f.t === 'miss').length).toBeGreaterThan(20);
    expect(fx.some((f) => f.t === 'boom')).toBe(true);
    for (const d of m.drops) { expect(d.z).toBeLessThanOrEqual(DROP_HEIGHT); expect(d.x > ARENA.x0 && d.x < ARENA.x1).toBe(true); }
    m.t = FALL_SECONDS - 0.01; m.drops = [];
    for (let t = 0; t < 30; t++) stepMini(m, [], 1 / 60, fx);
    expect(m.drops).toHaveLength(0);
  });

  it('blobz cannot leave the field; time up -> end screen, berries into the bank with stars', () => {
    const s = sunset(2);
    const a = s.players[0];
    Object.assign(a, { x: ARENA.x1 - 30, y: 450, vx: 900, vy: 0 });
    run(s, 0.5, new Map([[a.id, { x: 1, y: 0, dash: 0 }]]));
    expect(a.x).toBeLessThanOrEqual(ARENA.x1);
    const bank = s.bank.berry;
    s.mini!.caught = s.mini!.goal[1];
    s.mini!.t = 0.01;
    step(s, new Map(), 1 / 60);
    expect(s.phase).toBe('end');
    expect(s.bank.berry).toBe(bank + s.miniResult!.caught);
    expect(s.miniResult!.stars).toBeGreaterThanOrEqual(2);
    expect(s.fx.some((f) => f.t === 'minidone')).toBe(true);
  });

  it('the host can skip: ends at once and keeps what was caught; mini state survives the snapshot', () => {
    const s = sunset(3);
    s.mini!.caught = 4;
    s.mini!.drops = [{ id: 1, kind: 'bomb', x: 500, y: 400, z: 90 }];
    s.mini!.stun = { p1: 0.5 };
    const v = viewFromSnapshot(JSON.parse(JSON.stringify(snapshot(s))));
    expect(v.phase).toBe('mini');
    expect(v.mini).toMatchObject({ caught: 4, goal: s.mini!.goal, stunned: ['p1'] });
    expect(v.mini!.drops[0]).toMatchObject({ kind: 'bomb', z: 90 });
    finishMini(s);
    expect(s.phase).toBe('end');
    expect(s.miniResult).toEqual({ caught: 4, stars: miniStars({ caught: 4, goal: miniGoal(3) }) });
    const v2 = viewFromSnapshot(JSON.parse(JSON.stringify(snapshot(s))));
    expect(v2.miniResult).toEqual(s.miniResult);
  });
});
