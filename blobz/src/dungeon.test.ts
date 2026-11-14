import { describe, expect, it } from 'vitest';
import {
  bossHp, CLASS_HEARTS, dungeonChoice, LOOT_SECONDS, OFFER_SECONDS, skillOf,
  DONE_SECONDS, DT, dsnap, dview, ENEMY_HP, FLOORS, GH, GW, inSwing, isWall, KO_SECONDS, LEVEL_XP, makeFloor, newRun, SLAM_DMG, START_HEARTS,
  stepDungeon, TOUCH_DMG, WEAPON_STATS, type DFx, type DState,
} from './dungeon';
import { createState, DUNGEON_ENABLED, ENTRANCE_R, entranceOf, makePuzzles, makeTrees, pickWeapon, snapshot, step, viewFromSnapshot, type Input } from './sim';

const P = (id: string) => ({ id, name: id, color: 0x5ec8ff, shape: 0, eyes: 0, mouth: 0, hat: 0 });
type B = { id: string; x: number; y: number; vx: number; vy: number; dashT: number; lastDash: number };
const body = (id: string, x: number, y: number): B => ({ id, x, y, vx: 0, vy: 0, dashT: 0, lastDash: 0 });
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

  it('auto-attack: the nearest goo in reach gets hit at the weapon rate; small 1 hit, medium 3, boss 15; coins + XP', () => {
    for (const [kind, hits] of [[0, 1], [1, 3], [2, 15]] as [0 | 1 | 2, number][]) {
      const d = quiet(newRun(5, { a: 'sword' }));
      const st = d.map.start;
      d.enemies.push({ id: 900, kind, x: st.x + 40, y: st.y, vx: 0, vy: 0, hp: ENEMY_HP[kind], awake: false, stun: 9, slamT: 99, slam: null });
      const a = body('a', st.x, st.y);
      let swings = 0;
      for (let t = 0; t < 60 * 30 && d.enemies.length; t++) {
        const e = d.enemies[0]; e.x = st.x + 40; e.y = st.y; e.stun = 9; e.vx = 0; e.vy = 0;
        a.x = st.x; a.y = st.y; a.vx = 0; a.vy = 0; d.heroes.a.inv = 99;
        swings += run1(d, [a]).fx.filter((f) => f.t === 'swing').length;
      }
      expect(d.enemies).toHaveLength(0);
      expect(swings).toBe(hits);
      expect(d.kills).toBe(1);
      expect(d.coins.length).toBeGreaterThan(0);
      const gold = d.gold + d.coins.reduce((g, c) => g + c.v, 0); // some coins land right under the blob
      for (const c of [...d.coins]) { a.x = c.x; a.y = c.y; run1(d, [a]); }
      expect(d.gold).toBe(gold);
      expect(d.xp).toBeGreaterThan(0);
    }
  });

  it('auto-attack: nothing in reach = no swing; the rate follows the weapon', () => {
    const d = quiet(newRun(5, { a: 'hammer', b: 'sword' }));
    const st = d.map.start;
    const a = body('a', st.x, st.y), b = body('b', st.x, st.y + 300);
    d.enemies.push({ id: 1, kind: 2, x: st.x + 200, y: st.y, vx: 0, vy: 0, hp: 99, awake: false, stun: 99, slamT: 99, slam: null });
    expect(run1(d, [a], undefined, 0.5).fx.some((f) => f.t === 'swing')).toBe(false);
    d.enemies[0].x = st.x + 60; d.heroes.a.inv = 99;
    const n = run1(d, [a], undefined, 2).fx.filter((f) => f.t === 'swing').length;
    expect(n).toBeGreaterThanOrEqual(Math.floor(2 / WEAPON_STATS.hammer.cd) - 1);
    expect(n).toBeLessThanOrEqual(Math.ceil(2 / WEAPON_STATS.hammer.cd) + 1);
    void b;
  });

  it('special attack: big button, cooldown; sword spins all around, hammer slams, spear lunges and pierces', () => {
    for (const w of ['sword', 'hammer', 'spear'] as const) {
      const d = quiet(newRun(5, { a: w }));
      const st = d.map.start;
      const a = body('a', st.x, st.y);
      run1(d, [a], new Map([['a', 0]])); // counter seen
      // goo behind and beside (spear: in a line ahead)
      const spots = w === 'spear' ? [[-10, 0], [30, 0]] : [[-60, 0], [0, 60]];
      if (w === 'spear') a.x = st.x - 70; // the start room is at least 6 tiles wide
      spots.forEach(([dx, dy], i) => d.enemies.push({ id: 50 + i, kind: 1, x: st.x + dx, y: st.y + dy, vx: 0, vy: 0, hp: 3, awake: true, stun: 99, slamT: 99, slam: null }));
      d.heroes.a.atkCd = 99; d.heroes.a.inv = 99; d.heroes.a.fx = 1; d.heroes.a.fy = 0;
      const fx: DFx[] = [];
      for (let t = 0; t < (w === 'spear' ? 24 : 1); t++) { // the lunge moves the blob (the sim does that in game)
        stepDungeon(d, [a], new Map([['a', 1]]), 1, 1 / 60, fx);
        a.x += a.vx / 60; a.y += a.vy / 60; a.dashT = Math.max(0, a.dashT - 1 / 60);
      }
      expect(fx.some((f) => f.t === 'special')).toBe(true);
      expect(d.enemies.every((e) => e.hp < 3)).toBe(true);
      // on cooldown: a second press does nothing
      const { fx: fx2 } = run1(d, [a], new Map([['a', 2]]));
      expect(fx2.some((f) => f.t === 'special')).toBe(false);
      expect(d.heroes.a.spCd).toBeGreaterThan(5);
    }
  });

  it('touching goo costs a heart; 0 hearts = knocked out, revive after 5 s at the stairs', () => {
    const d = quiet(newRun(6, { a: 'hammer' }));
    const st = d.map.start;
    const a = body('a', st.x, st.y);
    d.heroes.a.atkCd = 999; // no auto-attack in this test
    d.enemies.push({ id: 1, kind: 0, x: st.x + 20, y: st.y, vx: 0, vy: 0, hp: 1, awake: true, stun: 0, slamT: 9, slam: null });
    run1(d, [a]);
    expect(d.heroes.a.hearts).toBe(START_HEARTS - TOUCH_DMG);
    d.heroes.a.hearts = TOUCH_DMG; d.heroes.a.inv = 0;
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

  it('a sidestep (dash) dodges damage for 0.4 s', () => {
    const d = quiet(newRun(7, { a: 'sword' }));
    const st = d.map.start;
    const a = body('a', st.x, st.y);
    run1(d, [a]);
    a.lastDash = 1; a.dashT = 0.3; // the sim just dashed
    run1(d, [a]);
    a.dashT = 0;
    expect(d.heroes.a.dodge).toBeGreaterThan(0.3);
    d.enemies.push({ id: 1, kind: 0, x: st.x + 20, y: st.y, vx: 0, vy: 0, hp: 1, awake: true, stun: 0, slamT: 9, slam: null });
    run1(d, [a]);
    expect(d.heroes.a.hearts).toBe(START_HEARTS);
  });

  it('team XP level-up: every blob gets 3 cards from its own class; a pick applies, 10 s auto-picks', () => {
    const d = quiet(newRun(8, { a: 'sword', b: 'staff' }));
    d.xp = LEVEL_XP[0] - 1;
    d.enemies.push({ id: 1, kind: 0, x: 0, y: 0, vx: 0, vy: 0, hp: 0, awake: false, stun: 0, slamT: 9, slam: null });
    const bs = [body('a', d.map.start.x, d.map.start.y), body('b', d.map.start.x + 40, d.map.start.y)];
    const { fx } = run1(d, bs);
    expect(d.level).toBe(2);
    expect(fx.some((f) => f.t === 'level')).toBe(true);
    expect(d.heroes.a.offer).toHaveLength(3);
    expect(d.heroes.a.offer.every((id) => skillOf(id)!.cls === 'krigare')).toBe(true);
    expect(d.heroes.b.offer.every((id) => skillOf(id)!.cls === 'prast')).toBe(true);
    d.heroes.a.offer = ['k-heart', 'k-dmg', 'k-rate'];
    dungeonChoice(d, 'a', 'skill:k-heart');
    expect(d.heroes.a.skills).toEqual(['k-heart']);
    expect(d.heroes.a.maxHearts).toBe(CLASS_HEARTS.krigare + 1);
    dungeonChoice(d, 'a', 'skill:k-dmg'); // not offered any more: ignored
    expect(d.heroes.a.skills).toHaveLength(1);
    run1(d, bs, undefined, OFFER_SECONDS + 0.2);
    expect(d.heroes.b.skills).toHaveLength(1);
    expect(d.heroes.b.offer).toHaveLength(0);
  });

  it('classes: hearts per class; archer shoots in sight only; priest heals and revives; knight wall blocks', () => {
    const d = quiet(newRun(14, { k: 'sword', p: 'staff', b: 'bow', r: 'shield' }));
    expect(d.heroes.r.maxHearts).toBe(CLASS_HEARTS.riddare);
    expect(d.heroes.b.maxHearts).toBe(CLASS_HEARTS.bagskytt);
    const st = d.map.start;
    // archer: a goo 150 px away in the open gets an arrow
    const b = body('b', st.x - 70, st.y);
    d.enemies.push({ id: 7, kind: 1, x: st.x + 60, y: st.y, vx: 0, vy: 0, hp: 3, awake: true, stun: 99, slamT: 99, slam: null });
    d.heroes.b.inv = 99;
    const { fx } = run1(d, [b]);
    expect(fx.some((f) => f.t === 'shot')).toBe(true);
    expect(d.enemies[0].hp).toBe(2);
    d.enemies = [];
    // priest: special heals a hurt friend and revives a knocked-out one
    const p = body('p', st.x, st.y), k = body('k', st.x + 40, st.y), r = body('r', st.x - 40, st.y);
    run1(d, [p, k, r], new Map([['p', 0]]));
    d.heroes.k.hearts = 2; d.heroes.r.hearts = 0; d.heroes.r.ko = 4; d.heroes.r.kx = r.x; d.heroes.r.ky = r.y;
    run1(d, [p, k, r], new Map([['p', 1]]));
    expect(d.heroes.k.hearts).toBe(3);
    expect(d.heroes.r.ko).toBe(0);
    // knight: the wall keeps friends inside safe from goo
    d.heroes.k.inv = 0; d.heroes.k.dodge = 0; d.heroes.r.inv = 0;
    run1(d, [p, k, r], new Map([['r', 0]]));
    run1(d, [p, k, r], new Map([['r', 1]]));
    expect(d.heroes.r.wallT).toBeGreaterThan(2);
    const before = d.heroes.k.hearts;
    d.enemies.push({ id: 8, kind: 0, x: k.x + 25, y: k.y, vx: 0, vy: 0, hp: 9, awake: true, stun: 0, slamT: 99, slam: null });
    d.heroes.k.atkCd = 99; d.heroes.p.atkCd = 99; d.heroes.r.atkCd = 99; d.heroes.k.inv = 0;
    const r2 = run1(d, [p, k, r]);
    expect(d.heroes.k.hearts).toBe(before);
    expect(r2.fx.some((f) => f.t === 'block')).toBe(true);
  });

  it('loot: a chest starts a roll/pass vote; the highest roll wears the item; potions heal everyone', () => {
    const d = quiet(newRun(15, { a: 'sword', b: 'bow' }));
    const c = d.map.chests[0];
    const bs = [body('a', c.x, c.y), body('b', d.map.start.x, d.map.start.y)];
    run1(d, bs);
    expect(d.loot).not.toBeNull();
    const item = d.loot!.item;
    dungeonChoice(d, 'a', 'loot:roll');
    dungeonChoice(d, 'b', 'loot:pass');
    const { fx } = run1(d, bs);
    expect(d.heroes.a.item).toBe(item);
    expect(d.heroes.b.item).toBeNull();
    expect(fx.some((f) => f.t === 'loot' && f.win === 'a')).toBe(true);
    // nobody decides: after 10 s nobody gets it
    d.lootLast = null; d.lootQ.push('ring');
    run1(d, bs, undefined, LOOT_SECONDS + 0.5);
    expect(d.heroes.b.item).toBeNull();
    expect(d.heroes.a.item).toBe(item);
    // potion: +1 heart for every blob
    d.heroes.a.hearts = 2; d.heroes.b.hearts = 1;
    d.coins.push({ id: 99, x: bs[0].x, y: bs[0].y, v: 0, k: 1 });
    run1(d, bs);
    expect(d.heroes.a.hearts).toBe(3);
    expect(d.heroes.b.hearts).toBe(2);
  });

  it('boss HP grows with the team', () => {
    expect(bossHp(1)).toBe(15);
    expect(bossHp(3)).toBe(30);
    expect(bossHp(5)).toBe(45);
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
    expect(d.heroes.a.hearts).toBe(START_HEARTS - SLAM_DMG);
  });

  it('floor 1 has an exit up (not under the arrival point): standing on it 1.5 s ends the run', () => {
    const d = quiet(newRun(12, { a: 'sword' }));
    expect(Math.hypot(d.map.exit.x - d.map.start.x, d.map.exit.y - d.map.start.y)).toBeGreaterThan(40 + 17);
    expect(run1(d, [body('a', d.map.start.x, d.map.start.y)], undefined, 2).r).toBe('stay');
    run1(d, [body('a', d.map.exit.x, d.map.exit.y)], undefined, 1.6);
    expect(d.done).toBeGreaterThan(0);
    expect(d.why).toBe('exit');
    expect(run1(d, [body('a', d.map.exit.x, d.map.exit.y)], undefined, DONE_SECONDS + 0.2).r).toBe('out');
  });

  it('the run ends when its time is up; snapshot round-trips', () => {
    const d = quiet(newRun(13, { a: 'spear' }));
    d.time = 0.05;
    run1(d, [body('a', d.map.start.x, d.map.start.y)], undefined, 0.2);
    expect(d.done).toBeGreaterThan(0);
    expect(d.why).toBe('time');
    d.heroes.a.hearts = 3.5;
    const v = dview(JSON.parse(JSON.stringify(dsnap(d, 13))));
    expect(v.why).toBe('time');
    expect(v.heroes.a.hearts).toBe(3.5);
    expect(v.heroes.a.weapon).toBe('spear');
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
    expect(d.why).toBe('boss');
    expect(go(d.map.stairs.x, d.map.stairs.y, DONE_SECONDS + 0.2).r).toBe('out');
  });

  it('the cave entrance is seeded, the same every time, and clear of pens, trees and the world edge', () => {
    const used = new Set<string>();
    for (let seed = 1; seed < 400; seed++) {
      const e = entranceOf(seed);
      expect(entranceOf(seed)).toEqual(e);
      used.add(`${e.x},${e.y}`);
      for (const l of makePuzzles(seed)) {
        const z = l.zone, pad = ENTRANCE_R + 20;
        expect(e.x > z.x0 - pad && e.x < z.x1 + pad && e.y > z.y0 - pad && e.y < z.y1 + pad).toBe(false);
      }
      if (DUNGEON_ENABLED) for (const t of makeTrees(seed)) expect(Math.hypot(t.x - e.x, t.y - e.y)).toBeGreaterThanOrEqual(80);
      expect(e.x).toBeGreaterThan(100); expect(e.y).toBeGreaterThan(100);
    }
    expect(used.size).toBeGreaterThan(1); // it moves when a pen is in the way
  });

  it.skipIf(!DUNGEON_ENABLED)('meadow: all on the entrance -> weapon cards -> down together; the sun waits underground', () => {
    const s = createState([P('a'), P('b')], 11);
    const idle = new Map<string, Input>();
    for (const p of s.players) Object.assign(p, { x: s.entrance.x, y: s.entrance.y, vx: 0, vy: 0 });
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
