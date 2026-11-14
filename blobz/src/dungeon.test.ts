import { describe, expect, it } from 'vitest';
import {
  DT, ENEMY_HP, FLOORS, GH, GW, inSwing, isWall, KO_SECONDS, LEVEL_XP, makeFloor, newRun, START_HEARTS, stepDungeon,
  type DFx, type DState,
} from './dungeon';
import { createState, DUNGEON_ENABLED, ENTRANCE, pickWeapon, snapshot, step, viewFromSnapshot, type Input } from './sim';

const P = (id: string) => ({ id, name: id, color: 0x5ec8ff, shape: 0, eyes: 0, mouth: 0, hat: 0 });
type B = { id: string; x: number; y: number; vx: number; vy: number; dashT: number };
const body = (id: string, x: number, y: number): B => ({ id, x, y, vx: 0, vy: 0, dashT: 0 });
/** Flood fill from the start: every room centre, chest and the stairs must be reachable. */
function reachable(f: ReturnType<typeof makeFloor>, x: number, y: number) {
  const seen = new Uint8Array(GW * GH);
  const q = [[Math.floor(f.start.x / DT), Math.floor(f.start.y / DT)]];
  while (q.length) {
    const [cx, cy] = q.pop()!;
    if (cx < 0 || cy < 0 || cx >= GW || cy >= GH || seen[cy * GW + cx] || f.solid[cy * GW + cx]) continue;
    seen[cy * GW + cx] = 1;
    q.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  return seen[Math.floor(y / DT) * GW + Math.floor(x / DT)] === 1;
}
const run1 = (d: DState, bodies: B[], atk = new Map<string, number>(), secs = 1 / 60) => {
  const fx: DFx[] = [];
  let r: 'stay' | 'out' = 'stay';
  for (let t = 0; t < secs * 60 && r === 'stay'; t++) r = stepDungeon(d, bodies, atk, 1, 1 / 60, fx);
  return { fx, r };
};
/** An empty, closed test floor (keeps the rooms, removes enemies) */
const quiet = (d: DState) => { d.enemies = []; return d; };

describe('dungeon v1', () => {
  it('floors: 6-9 rooms, everything reachable, boss room on floor 3, deterministic', () => {
    for (const seed of [1, 2, 3, 42, 1000]) for (let fl = 1; fl <= FLOORS; fl++) {
      const f = makeFloor(seed, fl, 3);
      expect(f.rooms.length).toBeGreaterThanOrEqual(6);
      expect(f.rooms.length).toBeLessThanOrEqual(9);
      expect(isWall(f, f.start.x, f.start.y)).toBe(false);
      expect(reachable(f, f.stairs.x, f.stairs.y)).toBe(true);
      for (const c of f.chests) expect(reachable(f, c.x, c.y)).toBe(true);
      for (const sp of f.spawns) expect(isWall(f, sp.x, sp.y)).toBe(false);
      expect(f.spawns.filter((sp) => sp.kind === 2).length).toBe(fl === FLOORS ? 1 : 0);
      expect(makeFloor(seed, fl, 3)).toEqual(f);
    }
  });

  it('weapons: sword arc, hammer all around, spear long and narrow', () => {
    expect(inSwing('sword', 0, 0, 1, 0, 50, 0, 14)).toBe(true);
    expect(inSwing('sword', 0, 0, 1, 0, -50, 0, 14)).toBe(false);
    expect(inSwing('hammer', 0, 0, 1, 0, -50, 0, 14)).toBe(true);
    expect(inSwing('spear', 0, 0, 1, 0, 100, 0, 14)).toBe(true);
    expect(inSwing('sword', 0, 0, 1, 0, 100, 0, 14)).toBe(false);
    expect(inSwing('spear', 0, 0, 1, 0, 40, 40, 14)).toBe(false);
  });

  it('combat: small 1 hit, medium 3, boss 15; kills drop coins + XP; coins add gold', () => {
    for (const [kind, hits] of [[0, 1], [1, 3], [2, 15]] as [0 | 1 | 2, number][]) {
      const d = quiet(newRun(5, { a: 'sword' }));
      const st = d.map.start;
      d.enemies.push({ id: 900, kind, x: st.x + 40, y: st.y, vx: 0, vy: 0, hp: ENEMY_HP[kind], awake: false, stun: 9, slamT: 99, slam: null });
      const a = body('a', st.x, st.y);
      let n = 0;
      for (let h = 0; h < hits && d.enemies.length; h++) {
        d.heroes.a.atkCd = 0; d.heroes.a.fx = 1; d.heroes.a.fy = 0; d.heroes.a.inv = 99;
        const e = d.enemies[0]; e.x = st.x + 40; e.y = st.y; e.stun = 9;
        a.x = st.x; a.y = st.y; a.vx = 0; a.vy = 0;
        run1(d, [a], new Map([['a', ++n]]));
      }
      expect(d.enemies).toHaveLength(0);
      expect(n).toBe(hits);
      expect(d.kills).toBe(1);
      expect(d.coins.length).toBeGreaterThan(0);
      const gold = d.gold + d.coins.reduce((g, c) => g + c.v, 0); // some coins land right under the blob
      for (const c of [...d.coins]) { a.x = c.x; a.y = c.y; run1(d, [a]); }
      expect(d.gold).toBe(gold);
      expect(d.xp).toBeGreaterThan(0);
    }
  });

  it('touching goo costs a heart; 0 hearts = knocked out, revive after 5 s at the stairs', () => {
    const d = quiet(newRun(6, { a: 'hammer' }));
    const st = d.map.start;
    const a = body('a', st.x, st.y);
    d.enemies.push({ id: 1, kind: 0, x: st.x + 20, y: st.y, vx: 0, vy: 0, hp: 1, awake: true, stun: 0, slamT: 9, slam: null });
    run1(d, [a]);
    expect(d.heroes.a.hearts).toBe(START_HEARTS - 1);
    d.heroes.a.hearts = 1; d.heroes.a.inv = 0;
    const e = d.enemies[0]; e.x = a.x + 20; e.y = a.y;
    const { fx } = run1(d, [a]);
    expect(d.heroes.a.ko).toBeGreaterThan(0);
    expect(fx.some((f) => f.t === 'ko')).toBe(true);
    d.enemies = [];
    a.x = st.x + 200;
    run1(d, [a], undefined, KO_SECONDS + 0.2);
    expect(d.heroes.a.ko).toBe(0);
    expect(d.heroes.a.hearts).toBe(d.heroes.a.maxHearts);
    expect(Math.hypot(a.x - st.x, a.y - st.y)).toBeLessThan(20);
  });

  it('a dash dodges damage', () => {
    const d = quiet(newRun(7, { a: 'sword' }));
    const st = d.map.start;
    const a = { ...body('a', st.x, st.y), dashT: 0.3 };
    d.enemies.push({ id: 1, kind: 0, x: st.x + 20, y: st.y, vx: 0, vy: 0, hp: 1, awake: true, stun: 0, slamT: 9, slam: null });
    run1(d, [a]);
    expect(d.heroes.a.hearts).toBe(START_HEARTS);
  });

  it('team XP levels up: alternately +1 heart and +damage', () => {
    const d = quiet(newRun(8, { a: 'sword', b: 'spear' }));
    d.xp = LEVEL_XP[0] - 1;
    d.enemies.push({ id: 1, kind: 0, x: 0, y: 0, vx: 0, vy: 0, hp: 0, awake: false, stun: 0, slamT: 9, slam: null });
    const { fx } = run1(d, [body('a', d.map.start.x, d.map.start.y), body('b', d.map.start.x, d.map.start.y)]);
    expect(d.level).toBe(2);
    expect(d.heroes.a.maxHearts).toBe(START_HEARTS + 1);
    expect(fx.some((f) => f.t === 'level' && f.bonus === 'heart')).toBe(true);
    d.xp = LEVEL_XP[1];
    d.enemies.push({ id: 2, kind: 0, x: 0, y: 0, vx: 0, vy: 0, hp: 0, awake: false, stun: 0, slamT: 9, slam: null });
    run1(d, [body('a', d.map.start.x, d.map.start.y)]);
    expect(d.level).toBe(3);
    expect(d.dmgBonus).toBe(1);
  });

  it('boss slam is telegraphed, then hurts blobz inside the circle', () => {
    const d = quiet(newRun(9, { a: 'sword' }));
    const st = d.map.start;
    const a = body('a', st.x, st.y);
    d.enemies.push({ id: 1, kind: 2, x: st.x + 150, y: st.y, vx: 0, vy: 0, hp: 15, awake: true, stun: 99, slamT: 0.01, slam: null });
    run1(d, [a]);
    expect(d.enemies[0].slam).not.toBeNull();
    expect(d.heroes.a.hearts).toBe(START_HEARTS);
    run1(d, [a], undefined, 1.2);
    expect(d.heroes.a.hearts).toBe(START_HEARTS - 1);
  });

  it('floor 1 has an exit up (not under the arrival point): standing on it 1.5 s leaves the dungeon', () => {
    const d = quiet(newRun(12, { a: 'sword' }));
    expect(Math.hypot(d.map.exit.x - d.map.start.x, d.map.exit.y - d.map.start.y)).toBeGreaterThan(40 + 17);
    expect(run1(d, [body('a', d.map.start.x, d.map.start.y)], undefined, 2).r).toBe('stay');
    expect(run1(d, [body('a', d.map.exit.x, d.map.exit.y)], undefined, 1.6).r).toBe('out');
  });

  it('stairs: everyone on them 1.5 s goes down; the last floor exit needs the boss gone', () => {
    const d = quiet(newRun(10, { a: 'sword', b: 'sword' }));
    const go = (x: number, y: number, secs: number) => { const bs = [body('a', x, y), body('b', x + 5, y)]; return { bs, ...run1(d, bs, undefined, secs) }; };
    go(d.map.stairs.x, d.map.stairs.y, 1.6);
    expect(d.floor).toBe(2);
    quiet(d);
    go(d.map.stairs.x, d.map.stairs.y, 1.6);
    expect(d.floor).toBe(3);
    expect(d.enemies.some((e) => e.kind === 2)).toBe(true);
    d.enemies = d.enemies.filter((e) => e.kind === 2).map((e) => ({ ...e, stun: 999, x: 40, y: 40 }));
    go(d.map.stairs.x, d.map.stairs.y, 1.6);
    expect(d.done).toBe(0);
    d.enemies = [];
    go(d.map.stairs.x, d.map.stairs.y, 1.6);
    expect(d.done).toBeGreaterThan(0);
    expect(go(d.map.stairs.x, d.map.stairs.y, 4.2).r).toBe('out');
  });

  it.skipIf(!DUNGEON_ENABLED)('meadow: all on the entrance -> weapon cards -> down together; the sun waits underground', () => {
    const s = createState([P('a'), P('b')], 11);
    const idle = new Map<string, Input>();
    for (const p of s.players) Object.assign(p, { x: ENTRANCE.x, y: ENTRANCE.y, vx: 0, vy: 0 });
    for (let i = 0; i < 100; i++) step(s, idle, 1 / 60);
    expect(s.mode).toBe('pick');
    pickWeapon(s, 'a', 'hammer');
    step(s, idle, 1 / 60);
    expect(s.mode).toBe('pick');
    pickWeapon(s, 'b', 'spear');
    pickWeapon(s, 'b', 'laser'); // ignored
    step(s, idle, 1 / 60);
    expect(s.mode).toBe('dungeon');
    expect(s.dg!.heroes.a.weapon).toBe('hammer');
    expect(s.dg!.heroes.b.weapon).toBe('spear');
    const t = s.time;
    for (let i = 0; i < 120; i++) step(s, idle, 1 / 60);
    expect(s.time).toBe(t);
    const v = viewFromSnapshot(JSON.parse(JSON.stringify(snapshot(s))));
    expect(v.mode).toBe('dungeon');
    expect(v.dungeon!.floor).toBe(1);
    expect(v.dungeon!.heroes.a.weapon).toBe('hammer');
    expect(v.dungeon!.enemies.length).toBe(s.dg!.enemies.length);
  });
});
