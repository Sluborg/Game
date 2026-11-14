import { describe, expect, it } from 'vitest';
import {
  BASE, BUILD_COST, BUILD_KINDS, BUILD_RING, BUILD_SPOTS, BUILDING_ENABLED, cleanVillage, COTTAGE_COST, COTTAGE_PAD, createState,
  DOUBLE_SECONDS, ENTRANCE, makePuzzles, makeTrees, makeWater, newVillage, NODE_HITS, puzzleCorners, questTargets, res,
  snapshot, step, TOTEM_PADS, viewFromSnapshot, villageOf,
  type BuildKind, type Input, type State,
} from './sim';

const P = (id: string) => ({ id, name: id, color: 0x5ec8ff, shape: 0, eyes: 0, mouth: 0, hat: 0 });
const idle = new Map<string, Input>();
const run = (s: State, secs: number, inp = idle) => { for (let i = 0; i < secs * 60; i++) step(s, inp, 1 / 60); };
const at = (s: State, i: number, x: number, y: number) => Object.assign(s.players[i], { x, y, vx: 0, vy: 0 });
const b = (s: State, k: BuildKind) => s.builds.find((x) => x.kind === k)!;
const finish = (s: State, k: BuildKind) => { b(s, k).state = 2; };
const away = (s: State) => at(s, 0, 100, 480);

describe.skipIf(!BUILDING_ENABLED)('base building', () => {
  it('six spots in a ring around the cottage, clear of totems, the cottage pad, the dungeon entrance and puzzles', () => {
    const pads = [...TOTEM_PADS, COTTAGE_PAD, ENTRANCE];
    for (const k of BUILD_KINDS) {
      const p = BUILD_SPOTS[k];
      const r = Math.hypot(p.x - BASE.x, p.y - BASE.y);
      expect(r).toBeGreaterThanOrEqual(140); expect(r).toBeLessThanOrEqual(BUILD_RING + 1);
      for (const q of pads) expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThan(60);
    }
    for (let seed = 1; seed < 200; seed++) for (const l of makePuzzles(seed)) for (const p of Object.values(BUILD_SPOTS)) {
      expect(p.x > l.zone.x0 - 40 && p.x < l.zone.x1 + 40 && p.y > l.zone.y0 - 40 && p.y < l.zone.y1 + 40).toBe(false);
    }
  });

  it('costs from the spec', () => {
    expect(BUILD_COST).toEqual({
      storage: res(6, 0, 0), workshop: res(8, 4, 0), garden: res(6, 0, 4), well: res(0, 6, 0), watchtower: res(10, 6, 0), bridge: res(12, 8, 0),
    });
    expect(COTTAGE_COST).toEqual([res(20, 15, 10), res(40, 30, 20)]);
  });

  it('stand 1 s with enough in the bank: built at once and paid; not enough: nothing happens', () => {
    const s = createState([P('a')], 1);
    const sp = BUILD_SPOTS.storage;
    s.bank = res(5, 9, 9);
    at(s, 0, sp.x, sp.y);
    run(s, 2);
    expect(b(s, 'storage').state).toBe(0);
    s.bank.wood = 7;
    run(s, 0.5);
    expect(b(s, 'storage').state).toBe(0);
    run(s, 0.6);
    expect(b(s, 'storage').state).toBe(2);
    expect(s.bank).toEqual(res(1, 9, 9));
    expect(s.builtNow).toEqual(['storage']);
    expect(s.fx.some((f) => f.t === 'build' && f.done)).toBe(true);
  });

  it('effects: storage carries 4, workshop one hit less, well makes the double totem last +50%', () => {
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
    const s3 = createState([P('a')], 4);
    finish(s3, 'well');
    s3.bank = res(0, 0, 20);
    const pd = TOTEM_PADS[3]; // double
    at(s3, 0, pd.x, pd.y);
    run(s3, 1.1);
    expect(s3.doubleT).toBeGreaterThan(DOUBLE_SECONDS * 1.5 - 1);
  });

  it('garden grows berries beside it and berry bushes regrow 2x', () => {
    const s = createState([P('a')], 5);
    finish(s, 'garden');
    away(s);
    run(s, 13);
    expect(s.items.some((it) => it.kind === 'berry' && Math.hypot(it.x - BUILD_SPOTS.garden.x, it.y - BUILD_SPOTS.garden.y) < 90)).toBe(true);
    const bush = s.trees.find((t) => t.kind === 5)!;
    bush.left = 0; bush.regrow = 20;
    run(s, 10.2);
    expect(bush.left).toBe(3);
  });

  it('the water corner is a free (non-puzzle) corner behind water; the bridge opens it; it has extra nodes', () => {
    for (let seed = 1; seed < 60; seed++) {
      const w = makeWater(seed);
      expect(puzzleCorners(seed)).not.toContain(w.corner);
      const inside = makeTrees(seed).filter((t) => t.x > w.area.x0 && t.x < w.area.x1 && t.y > w.area.y0 && t.y < w.area.y1);
      expect(inside.length).toBeGreaterThanOrEqual(5);
    }
    const s = createState([P('a')], 6);
    const w = s.water;
    s.trees = s.trees.filter((t) => Math.hypot(t.x - w.bridge.x, t.y - w.bridge.y) > 150);
    const into = w.area.x0 === 0 ? -1 : 1; // towards the corner
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

  it('cottage: level 2 then 3, +20% quest each, +1 carry at 2, faster regrow at 3', () => {
    const s = createState([P('a'), P('b')], 7);
    at(s, 1, 900, 300);
    expect(s.quest).toEqual(questTargets(2, 1));
    expect(questTargets(2, 2).wood).toBe(12);
    s.bank = res(99, 99, 99);
    at(s, 0, COTTAGE_PAD.x, COTTAGE_PAD.y);
    run(s, 1.1);
    expect(s.cottage.level).toBe(2);
    expect(s.quest).toEqual(questTargets(2, 2));
    run(s, 2);
    expect(s.cottage.level).toBe(2); // one level per visit
    away(s); step(s, idle, 1 / 60);
    at(s, 0, COTTAGE_PAD.x, COTTAGE_PAD.y);
    run(s, 1.1);
    expect(s.cottage.level).toBe(3);
    expect(s.bank).toEqual(res(99 - 60, 99 - 45, 99 - 30));
    s.trees = []; s.items = [0, 1, 2, 3].map((i) => ({ id: 200 + i, kind: 'stone' as const, x: 300 + i, y: 300 }));
    at(s, 0, 302, 300);
    run(s, 0.2);
    expect(s.players[0].carry).toHaveLength(4);
  });

  it('the village (buildings, cottage, bank) survives a save/load; the quest resets; junk starts fresh', () => {
    const s = createState([P('a')], 8);
    finish(s, 'well');
    s.cottage.level = 2;
    s.bank = res(3, 4, 5);
    s.delivered = res(9, 9, 9);
    const saved = JSON.parse(JSON.stringify(villageOf(s)));
    const next = createState([P('a'), P('b')], 99, saved);
    expect(b(next, 'well').state).toBe(2);
    expect(b(next, 'bridge').state).toBe(0);
    expect(next.cottage.level).toBe(2);
    expect(next.bank).toEqual(res(3, 4, 5));
    expect(next.delivered).toEqual(res());
    expect(next.quest).toEqual(questTargets(2, 2));
    expect(cleanVillage({ v: 1, cottage: 3 })).toEqual(newVillage());
    expect(cleanVillage('nope')).toEqual(newVillage());
    expect(cleanVillage({ v: 2, cottage: 9, builds: { well: 'yes' }, bank: { wood: -5 } })).toMatchObject({ cottage: 3, bank: res() });
  });

  it('spots are clear of trees; build state survives the snapshot', () => {
    for (const seed of [1, 2, 50, 51, 777]) for (const t of makeTrees(seed)) for (const p of [...Object.values(BUILD_SPOTS), COTTAGE_PAD]) expect(Math.hypot(t.x - p.x, t.y - p.y)).toBeGreaterThan(70);
    const s = createState([P('a')], 9);
    finish(s, 'garden'); s.cottage.level = 3; s.builtNow = ['garden'];
    const v = viewFromSnapshot(JSON.parse(JSON.stringify(snapshot(s))));
    expect(v.builds.map((x) => x.state)).toEqual(BUILD_KINDS.map((k) => (k === 'garden' ? 2 : 0)));
    expect(v.cottage.level).toBe(3);
    expect(v.builtNow).toEqual(['garden']);
  });
});
