import { describe, expect, it } from 'vitest';
import {
  BASE, BRIDGE_Y, BUILDING_ENABLED, BUILD_COST, BUILD_KINDS, BUILD_SPOTS, cleanVillage, COTTAGE_COST, COTTAGE_PAD, createState, makeTrees,
  newVillage, NODE_HITS, questTargets, res, RIVER, snapshot, step, viewFromSnapshot, villageOf,
  type BuildKind, type Input, type State,
} from './sim';

const P = (id: string) => ({ id, name: id, color: 0x5ec8ff, shape: 0, eyes: 0, mouth: 0, hat: 0 });
const idle = new Map<string, Input>();
const run = (s: State, secs: number, inp = idle) => { for (let i = 0; i < secs * 60; i++) step(s, inp, 1 / 60); };
const at = (s: State, i: number, x: number, y: number) => Object.assign(s.players[i], { x, y, vx: 0, vy: 0 });
const b = (s: State, k: BuildKind) => s.builds.find((x) => x.kind === k)!;
const finish = (s: State, k: BuildKind) => { b(s, k).state = 2; };

// paused behind BUILDING_ENABLED (see sim.ts); these run again when it is switched on
describe.skipIf(!BUILDING_ENABLED)('base building', () => {
  it('standing 1 s on a spot starts a site; it pays itself from the bank until done', () => {
    const s = createState([P('a')], 1);
    const sp = BUILD_SPOTS.storage;
    at(s, 0, sp.x, sp.y);
    run(s, 0.5);
    expect(b(s, 'storage').state).toBe(0);
    run(s, 0.6);
    expect(b(s, 'storage').state).toBe(1);
    expect(s.fx.some((f) => f.t === 'build' && !f.done)).toBe(true);
    s.bank = res(5, 1, 0); // partly
    step(s, idle, 1 / 60);
    expect(b(s, 'storage').paid).toEqual(res(5, 1, 0));
    expect(s.bank).toEqual(res());
    s.bank = res(10, 10, 10);
    step(s, idle, 1 / 60);
    expect(b(s, 'storage').state).toBe(2);
    const c = BUILD_COST.storage;
    expect(s.bank).toEqual(res(10 - (c.wood - 5), 10 - (c.stone - 1), 10 - c.berry));
    expect(s.builtNow).toEqual(['storage']);
  });

  it('effects: storage carries 4, workshop needs one hit less, well buffs speed near the base', () => {
    const s = createState([P('a')], 2);
    s.trees = [];
    finish(s, 'storage');
    s.items = [0, 1, 2, 3].map((i) => ({ id: 100 + i, kind: 'wood' as const, x: 300 + i * 2, y: 300 }));
    at(s, 0, 303, 300);
    run(s, 0.2);
    expect(s.players[0].carry).toHaveLength(4);
    const s2 = createState([P('a')], 3);
    const i = s2.trees.findIndex((t, j) => t.kind < 3 && s2.trees.every((o, k) => k === j || Math.hypot(o.x - t.x, o.y - t.y) > 110));
    finish(s2, 'workshop');
    const t = s2.trees[i];
    for (let h = 1; h <= NODE_HITS[0] - 1; h++) {
      at(s2, 0, t.x + 37, t.y);
      step(s2, new Map([['a', { x: 0, y: 0, dash: h }]]), 1 / 60);
      run(s2, 0.4, new Map([['a', { x: 0, y: 0, dash: h }]]));
    }
    expect(t.left).toBe(2); // 2 hits gave a wood
    const top = (well: boolean) => {
      const w = createState([P('a')], 4);
      w.trees = [];
      if (well) finish(w, 'well');
      at(w, 0, BASE.x - 150, BASE.y + 140);
      run(w, 0.5, new Map([['a', { x: 1, y: 0, dash: 0 }]]));
      return w.players[0].vx;
    };
    expect(top(true)).toBeGreaterThan(top(false) * 1.1);
  });

  it('garden grows berries beside it and speeds up nearby bushes', () => {
    const s = createState([P('a')], 5);
    finish(s, 'garden');
    at(s, 0, 100, 100);
    run(s, 13);
    expect(s.items.some((it) => it.kind === 'berry' && Math.hypot(it.x - BUILD_SPOTS.garden.x, it.y - BUILD_SPOTS.garden.y) < 80)).toBe(true);
  });

  it('the river blocks until the bridge is built; the east meadow has extra nodes', () => {
    expect(makeTrees(9).filter((t) => t.x > RIVER.x1).length).toBeGreaterThanOrEqual(10);
    const s = createState([P('a')], 6);
    s.trees = s.trees.filter((t) => t.x < RIVER.x0 - 100);
    const east = new Map([['a', { x: 1, y: 0, dash: 0 }]]);
    at(s, 0, RIVER.x0 - 60, BRIDGE_Y);
    run(s, 2, east);
    expect(s.players[0].x).toBeLessThan(RIVER.x0);
    finish(s, 'bridge');
    at(s, 0, RIVER.x0 - 60, BRIDGE_Y);
    run(s, 2, east);
    expect(s.players[0].x).toBeGreaterThan(RIVER.x1);
  });

  it('cottage upgrades to level 2 and 3, each raising the quest', () => {
    const s = createState([P('a'), P('b')], 7);
    expect(s.quest).toEqual(questTargets(2, 1));
    at(s, 0, COTTAGE_PAD.x, COTTAGE_PAD.y);
    s.bank = res(99, 99, 99);
    run(s, 1.1);
    expect(s.cottage.level).toBe(2);
    expect(s.quest).toEqual(questTargets(2, 2));
    expect(questTargets(2, 2).wood).toBeGreaterThan(questTargets(2, 1).wood);
    run(s, 2); // still standing: no second upgrade without stepping off
    expect(s.cottage.level).toBe(2);
    at(s, 0, 100, 100); step(s, idle, 1 / 60);
    at(s, 0, COTTAGE_PAD.x, COTTAGE_PAD.y);
    run(s, 1.1);
    expect(s.cottage.level).toBe(3);
    expect(s.bank).toEqual(res(99 - COTTAGE_COST[0].wood - COTTAGE_COST[1].wood, 99 - COTTAGE_COST[0].stone - COTTAGE_COST[1].stone, 99 - COTTAGE_COST[0].berry - COTTAGE_COST[1].berry));
  });

  it('the village survives a save/load into the next round; junk saves start fresh', () => {
    const s = createState([P('a')], 8);
    finish(s, 'well');
    b(s, 'bridge').state = 1; b(s, 'bridge').paid = res(3, 1, 0);
    s.cottage.level = 2;
    const saved = JSON.parse(JSON.stringify(villageOf(s)));
    const next = createState([P('a'), P('b')], 99, saved);
    expect(b(next, 'well').state).toBe(2);
    expect(b(next, 'bridge')).toMatchObject({ state: 1, paid: res(3, 1, 0) });
    expect(next.cottage.level).toBe(2);
    expect(next.quest).toEqual(questTargets(2, 2));
    expect(next.builtNow).toEqual([]);
    expect(cleanVillage({ v: 99 })).toEqual(newVillage());
    expect(cleanVillage('nope')).toEqual(newVillage());
    expect(cleanVillage({ v: 1, cottage: 9, builds: { well: { state: 7 } } }).cottage).toBe(3);
  });

  it('spots are clear of trees; build state survives the snapshot', () => {
    for (const seed of [1, 2, 50, 51, 777]) for (const t of makeTrees(seed)) for (const p of [...Object.values(BUILD_SPOTS), COTTAGE_PAD]) expect(Math.hypot(t.x - p.x, t.y - p.y)).toBeGreaterThan(70);
    const s = createState([P('a')], 9);
    finish(s, 'garden'); b(s, 'workshop').state = 1; b(s, 'workshop').paid = res(2, 3, 0); s.cottage.level = 3; s.builtNow = ['garden'];
    const v = viewFromSnapshot(JSON.parse(JSON.stringify(snapshot(s))));
    expect(v.builds.map((x) => x.state)).toEqual(BUILD_KINDS.map((k) => (k === 'garden' ? 2 : k === 'workshop' ? 1 : 0)));
    expect(v.builds[BUILD_KINDS.indexOf('workshop')].paid).toEqual(res(2, 3, 0));
    expect(v.cottage.level).toBe(3);
    expect(v.builtNow).toEqual(['garden']);
  });
});
