import { describe, expect, it } from 'vitest';
import {
  atHome, BASE, BUILD_COST, BUILD_KINDS, BUILD_LOCK, BUILD_SPOTS, BUILDING_ENABLED, cleanVillage, COTTAGE_COST, createState,
  entranceOf, makePuzzles, makeTrees, makeWater, newVillage, NODE_HITS, puzzleCorners, questTargets, requestBuild, res,
  snapshot, step, viewFromSnapshot, villageOf,
  type BuildKind, type Input, type State,
} from './sim';

const P = (id: string) => ({ id, name: id, color: 0x5ec8ff, shape: 0, eyes: 0, mouth: 0, hat: 0 });
const idle = new Map<string, Input>();
const run = (s: State, secs: number, inp = idle) => { for (let i = 0; i < secs * 60; i++) step(s, inp, 1 / 60); };
const at = (s: State, i: number, x: number, y: number) => Object.assign(s.players[i], { x, y, vx: 0, vy: 0 });
const b = (s: State, k: BuildKind) => s.builds.find((x) => x.kind === k)!;
const finish = (s: State, k: BuildKind) => { b(s, k).state = 2; };
const home = (s: State, i = 0) => at(s, i, BASE.x, BASE.y + 40);

describe.skipIf(!BUILDING_ENABLED)('base building (build panel at the cottage)', () => {
  it('costs from the spec', () => {
    expect(BUILD_COST).toEqual({
      storage: res(6, 0, 0), workshop: res(8, 4, 0), garden: res(6, 0, 4), well: res(0, 6, 0), watchtower: res(10, 6, 0), bridge: res(12, 8, 0),
    });
    expect(COTTAGE_COST).toEqual([res(20, 15, 10), res(40, 30, 20)]);
  });

  it('build from the panel: needs the price, the player at home; pays, builds, pops an fx at the fixed spot', () => {
    const s = createState([P('a')], 1);
    s.bank = res(5, 9, 9);
    home(s);
    expect(requestBuild(s, 'a', 'storage')).toBe(false); // 5 of 6 wood
    s.bank.wood = 7;
    at(s, 0, 100, 100);
    expect(atHome(100, 100)).toBe(false);
    expect(requestBuild(s, 'a', 'storage')).toBe(false); // not at home
    home(s);
    expect(requestBuild(s, 'a', 'storage')).toBe(true);
    expect(b(s, 'storage').state).toBe(2);
    expect(s.bank).toEqual(res(1, 9, 9));
    expect(s.builtNow).toEqual(['storage']);
    const fx = s.fx.find((f) => f.t === 'build');
    expect(fx).toMatchObject({ x: BUILD_SPOTS.storage.x, y: BUILD_SPOTS.storage.y, kind: 'storage' });
    expect(requestBuild(s, 'a', 'storage')).toBe(false); // already built
    expect(requestBuild(s, 'nobody', 'well')).toBe(false);
  });

  it('one build at a time: a second build waits for the lock', () => {
    const s = createState([P('a'), P('b')], 2);
    s.bank = res(99, 99, 99);
    home(s, 0); home(s, 1);
    expect(requestBuild(s, 'a', 'storage')).toBe(true);
    expect(requestBuild(s, 'b', 'well')).toBe(false);
    run(s, BUILD_LOCK + 0.05);
    home(s, 1);
    expect(requestBuild(s, 'b', 'well')).toBe(true);
  });

  it('no totems any more; their effects live in buildings: workshop +10% speed, storage +pickup, well doubles berries', () => {
    expect('totems' in createState([P('a')], 3)).toBe(false);
    const top = (shop: boolean) => {
      const w = createState([P('a')], 4);
      w.trees = [];
      if (shop) finish(w, 'workshop');
      at(w, 0, 100, 300);
      run(w, 2, new Map([['a', { x: 1, y: 0, dash: 0 }]]));
      return w.players[0].vx;
    };
    expect(top(true)).toBeGreaterThan(top(false) * 1.05);
    const s = createState([P('a')], 5);
    s.trees = [];
    s.items = [{ id: 1, kind: 'wood', x: 300, y: 300 }];
    at(s, 0, 300 + 32, 300); step(s, idle, 1 / 60);
    expect(s.players[0].carry).toHaveLength(0);
    finish(s, 'storage');
    at(s, 0, 300 + 32, 300); step(s, idle, 1 / 60);
    expect(s.players[0].carry).toEqual(['wood']);
    const w = createState([P('a')], 6);
    finish(w, 'well');
    home(w);
    w.players[0].carry = ['berry', 'wood'];
    step(w, idle, 1 / 60);
    expect(w.delivered).toEqual(res(1, 0, 2));
  });

  it('effects: storage carries 4, workshop one hit less', () => {
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
    expect(t.left).toBe(2);
  });

  it('garden grows berries beside it and berry bushes regrow 2x', () => {
    const s = createState([P('a')], 5);
    finish(s, 'garden');
    at(s, 0, 100, 480);
    run(s, 13);
    expect(s.items.some((it) => it.kind === 'berry' && Math.hypot(it.x - BUILD_SPOTS.garden.x, it.y - BUILD_SPOTS.garden.y) < 90)).toBe(true);
    const bush = s.trees.find((t) => t.kind === 5)!;
    bush.left = 0; bush.regrow = 20;
    run(s, 10.2);
    expect(bush.left).toBe(3);
  });

  it('the water corner is a free corner behind water; the bridge opens it', () => {
    for (let seed = 1; seed < 60; seed++) {
      const w = makeWater(seed);
      expect(puzzleCorners(seed)).not.toContain(w.corner);
      const inside = makeTrees(seed).filter((t) => t.x > w.area.x0 && t.x < w.area.x1 && t.y > w.area.y0 && t.y < w.area.y1);
      expect(inside.length).toBeGreaterThanOrEqual(5);
    }
    const s = createState([P('a')], 6);
    const w = s.water;
    s.trees = s.trees.filter((t) => Math.hypot(t.x - w.bridge.x, t.y - w.bridge.y) > 150);
    const into = w.area.x0 === 0 ? -1 : 1;
    const go = new Map([['a', { x: into, y: 0, dash: 0 }]]);
    at(s, 0, w.bridge.x - into * 80, w.bridge.y);
    run(s, 2, go);
    const inArea = () => s.players[0].x > w.area.x0 && s.players[0].x < w.area.x1;
    expect(inArea()).toBe(false);
    finish(s, 'bridge');
    at(s, 0, w.bridge.x - into * 80, w.bridge.y);
    run(s, 2, go);
    expect(inArea()).toBe(true);
  });

  it('cottage upgrade from the panel: level 2 then 3, +20% quest, +1 carry at 2', () => {
    const s = createState([P('a'), P('b')], 7);
    s.bank = res(99, 99, 99);
    home(s);
    expect(requestBuild(s, 'a', 'cottage')).toBe(true);
    expect(s.cottage.level).toBe(2);
    expect(s.quest).toEqual(questTargets(2, 2));
    run(s, BUILD_LOCK + 0.05);
    home(s);
    expect(requestBuild(s, 'a', 'cottage')).toBe(true);
    expect(s.cottage.level).toBe(3);
    run(s, BUILD_LOCK + 0.05);
    home(s);
    expect(requestBuild(s, 'a', 'cottage')).toBe(false); // max
    expect(s.bank).toEqual(res(99 - 60, 99 - 45, 99 - 30));
  });

  it('village (buildings, cottage, bank) survives save/load; quest resets; junk starts fresh', () => {
    const s = createState([P('a')], 8);
    finish(s, 'well'); s.cottage.level = 2; s.bank = res(3, 4, 5); s.delivered = res(9, 9, 9);
    const next = createState([P('a'), P('b')], 99, JSON.parse(JSON.stringify(villageOf(s))));
    expect(b(next, 'well').state).toBe(2);
    expect(next.cottage.level).toBe(2);
    expect(next.bank).toEqual(res(3, 4, 5));
    expect(next.delivered).toEqual(res());
    expect(cleanVillage('nope')).toEqual(newVillage());
  });

  it('nothing to stand on near the cottage any more; spots stay clear of puzzles, trees and the cave', () => {
    for (let seed = 1; seed < 120; seed++) {
      for (const l of makePuzzles(seed)) for (const p of Object.values(BUILD_SPOTS)) expect(p.x > l.zone.x0 - 40 && p.x < l.zone.x1 + 40 && p.y > l.zone.y0 - 40 && p.y < l.zone.y1 + 40).toBe(false);
      const e = entranceOf(seed);
      for (const p of Object.values(BUILD_SPOTS)) expect(Math.hypot(p.x - e.x, p.y - e.y)).toBeGreaterThan(60);
    }
    for (const seed of [1, 2, 50]) for (const t of makeTrees(seed)) for (const p of Object.values(BUILD_SPOTS)) expect(Math.hypot(t.x - p.x, t.y - p.y)).toBeGreaterThan(70);
    const s = createState([P('a')], 9);
    finish(s, 'garden'); s.cottage.level = 3; s.builtNow = ['garden'];
    const v = viewFromSnapshot(JSON.parse(JSON.stringify(snapshot(s))));
    expect(v.builds.map((x) => x.state)).toEqual(BUILD_KINDS.map((k) => (k === 'garden' ? 2 : 0)));
    expect(v.cottage.level).toBe(3);
  });
});
