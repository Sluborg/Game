import { describe, expect, it, vi } from 'vitest';
import { KEYS } from './i18n';
import {
  AIM_WARN, BITE_TIME, CLASS_MOVE_COOLDOWN, DUNGEON_TIMER_ENABLED, CLASS_WEAPONS, BITE_WARN, bossHp, BURST, BURST_DMG, BURST_GAP, BURST_SPREAD, CLASS_HP, CLASSES, DASH_TIME, DASH_WARN, DONE_SECONDS, dsnap, DT, dungeonChoice, dview, effectLines, ENEMY_HP, ENEMY_R, ENEMY_TOUCH, FLOORS, floorHp, floorDmg, actMul, GH, GW,
  HEAL_BOLT, heroMods, refresh, inSwing, isWall, ITEMS, itemOf, KO_SECONDS, LEVEL_XP, LOOT_SECONDS, makeFloor, makeGoo, newRun as newRunAny, POTION_HP, roomCracks, REGEN_EVERY,
  ITEM_ICON, ITEM_SLOTS, collideWalls, lootReplaces, skillIcon, skillOf, unstick, inDoorway, roomTiles, roomGap, ROOM_TUNE, ROOM_STUB, ROOM_TRANS, ROOM_WALK_IN, roomSpecials, EARLY_ROOMS, ROOM_T, ROOMS_ENABLED, ROOMS, ROOM_W, MINIBOSS_ROOM, SPAWN_WARN, READY_SECONDS, makeRoom, roomType, roomClear, diffFloor, enterFloor, SKILLS, SLAM_DMG, SPIT_DMG, stepDungeon, WEAPON_STATS, WEAPONS, type DFx, type DState, type EnemyKind, type Enemy, type Mods,
} from './dungeon';
import { cleanVillage, createState, DUNGEON_ENABLED, newVillage, villageOf, PICK_TIMER_ENABLED, ENTRANCE_R, entranceOf, makePuzzles, makeTrees, pickWeapon, snapshot, step, viewFromSnapshot, type Input } from './sim';

/** Art's skill icons in the repo (vite glob, no node fs types needed). */
/** ChatGPT N-23 skill + item icons (art/dungeon/skills, art/dungeon/items) */
const N23 = Object.keys(import.meta.glob(['../public/art/dungeon/skills/*.png', '../public/art/dungeon/items/*.png'])).map((k) => k.replace('../public/', ''));
/** The classic 5-floor dungeon unless a test passes rooms = true (rooms are the default since 2026-11-15, ?classic keeps
 *  the old one reachable; its tests stay). */
const newRun = (seed: number, picks: Record<string, (typeof WEAPONS)[number]>, dungeon = 1, rooms = false) => newRunAny(seed, picks, dungeon, rooms);
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
/** An empty test floor (keeps the rooms, removes enemies) */
const quiet = (d: DState) => { d.enemies = []; d.spit = []; return d; };
/** A goo on the current floor, with overrides. */
const goo = (d: DState, kind: EnemyKind, x: number, y: number, o: Partial<Enemy> = {}): Enemy => {
  const e = { ...makeGoo(d, kind, x, y), ...o };
  d.enemies.push(e);
  return e;
};
const still = { stun: 999, slamT: 999, cd: 999 };
/** rooms: remove the layout's cover (walls, pillars) so a test has open floor */
const clearCover = (d: DState) => { const m = d.map, W = m.gw!; for (let y = 3; y < m.gh! - 1 - ROOM_STUB; y++) for (let x = 1; x < W - 1; x++) m.solid[y * W + x] = 0; m.walls = []; m.columns = []; };
/** The middle of the floor's biggest room, a little left of centre: open space for monster attacks to the right. */
const roomMid = (d: DState) => { const r = d.map.rooms.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a)); return { x: (r.x + r.w / 2) * DT - 70, y: (r.y + r.h / 2) * DT }; };

describe('dungeon', () => {
  it('floors: 6-9 rooms, everything reachable, boss on floor 3, spitters and mediums, deterministic', () => {
    for (const seed of [1, 2, 3, 42, 1000]) for (let fl = 1; fl <= FLOORS; fl++) {
      const f = makeFloor(seed, fl, 3);
      expect(f.rooms.length).toBeGreaterThanOrEqual(6);
      expect(f.rooms.length).toBeLessThanOrEqual(9);
      expect(isWall(f, f.start.x, f.start.y)).toBe(false);
      expect(reachable(f, f.stairs.x, f.stairs.y)).toBe(true);
      for (const c of f.chests) expect(reachable(f, c.x, c.y)).toBe(true);
      for (const sp of f.spawns) expect(isWall(f, sp.x, sp.y)).toBe(false);
      expect(f.spawns.filter((sp) => sp.kind === 2).length).toBe(fl === FLOORS ? 1 : 0);
      expect(f.spawns.some((sp) => sp.kind === 3)).toBe(true);
      expect(f.spawns.some((sp) => sp.kind === 1)).toBe(true);
      expect(makeFloor(seed, fl, 3)).toEqual(f);
    }
    // deeper = more goo
    const count = (fl: number) => makeFloor(7, fl, 1).spawns.length;
    expect(count(2)).toBeGreaterThan(count(1) - 3);
  });

  it('difficulty (Stefan): a gentle Dungeon 1, slow scaling per floor, each dungeon a step harder; Dungeon 3 = the old difficulty', () => {
    expect(FLOORS).toBe(5);
    expect(floorHp(1, 1, 1)).toBeCloseTo(0.6); // Dungeon 1 floor 1: 60% monster health
    expect(floorDmg(1, 1)).toBeCloseTo(0.5); // and half damage
    expect(actMul(1, 1)).toBeCloseTo(1.5); // and 50% longer between attacks
    expect(floorHp(FLOORS, 1, 1)).toBeCloseTo(0.8); // slow scaling over the dungeon
    expect(floorHp(1, 1, 2)).toBeCloseTo(floorHp(FLOORS, 1, 1)); // the next dungeon starts where the last one ended
    expect(floorHp(1, 1, 3)).toBeCloseTo(1); // Dungeon 3 = the old floor 1
    expect(floorDmg(1, 3)).toBeCloseTo(1);
    expect(floorHp(1, 3, 3)).toBeCloseTo(1.5); // more blobz = more health
    expect(bossHp(1, 3)).toBe(300);
    expect(bossHp(3, 3)).toBe(660);
    expect(bossHp(1, 1)).toBe(200);
    const d1 = makeFloor(7, 1, 1, 1).spawns.length, d3 = makeFloor(7, 1, 1, 3).spawns.length;
    expect(d1).toBeLessThan(d3); // fewer monsters at the start
    const d = newRun(3, { a: 'sword', b: 'bow' });
    expect(d.dungeon).toBe(1);
    expect(d.enemies.find((e) => e.kind === 0)!.mx).toBe(Math.round(ENEMY_HP[0] * floorHp(1, 2, 1)));
    expect(dview(dsnap(d, 3)).dungeon).toBe(1);
  });

  it('weapon balance (Stefan): no spear on offer; the crossbow hits clearly softer than melee; the Riddare below the sword', () => {
    expect(CLASS_WEAPONS.rogue).not.toContain('spear');
    expect(WEAPON_STATS.spear).toBeDefined(); // the code stays
    const dps = (w: keyof typeof WEAPON_STATS) => WEAPON_STATS[w].dmg / WEAPON_STATS[w].cd;
    expect(WEAPON_STATS.bow.dmg).toBeLessThan(WEAPON_STATS.sword.dmg * 0.7);
    expect(dps('bow')).toBeLessThanOrEqual(dps('sword') * 0.7);
    expect(dps('bow')).toBeLessThan(dps('dagger') * 0.7);
    expect(dps('shield')).toBeLessThan(dps('sword'));
    expect(WEAPON_STATS.shield.kb).toBeGreaterThan(WEAPON_STATS.sword.kb); // heavier: more knockback
  });

  it('weapons: sword arc, hammer all around, spear long and narrow', () => {
    expect(inSwing('sword', 0, 0, 1, 0, 50, 0, 14)).toBe(true);
    expect(inSwing('sword', 0, 0, 1, 0, -50, 0, 14)).toBe(false);
    expect(inSwing('hammer', 0, 0, 1, 0, -50, 0, 14)).toBe(true);
    expect(inSwing('spear', 0, 0, 1, 0, 100, 0, 14)).toBe(true);
    expect(inSwing('sword', 0, 0, 1, 0, 100, 0, 14)).toBe(false);
    expect(inSwing('spear', 0, 0, 1, 0, 40, 40, 14)).toBe(false);
  });

  it('auto-attack: the nearest goo in reach is hit at the weapon rate for the weapon damage; kills drop coins + XP', () => {
    const d = quiet(newRun(5, { a: 'sword' }));
    const st = d.map.start, a = body('a', st.x, st.y);
    const e = goo(d, 1, st.x + 40, st.y, { ...still, hp: 50, mx: 50 });
    d.heroes.a.inv = 99;
    let swings = 0;
    for (let t = 0; t < 60 * 10 && d.enemies.length; t++) {
      e.x = st.x + 40; e.y = st.y; e.vx = 0; e.vy = 0;
      a.x = st.x; a.y = st.y; a.vx = 0; a.vy = 0;
      swings += run1(d, [a]).fx.filter((f) => f.t === 'swing').length;
    }
    expect(swings).toBe(Math.ceil(50 / WEAPON_STATS.sword.dmg));
    expect(d.kills).toBe(1);
    expect(d.coins.length).toBeGreaterThan(0);
    expect(d.xp).toBeGreaterThan(0);
    // nothing in reach: no swing
    const d2 = quiet(newRun(5, { a: 'hammer' }));
    goo(d2, 1, d2.map.start.x + 200, d2.map.start.y, still);
    expect(run1(d2, [body('a', d2.map.start.x, d2.map.start.y)], undefined, 0.5).fx.some((f) => f.t === 'swing')).toBe(false);
  });

  it('special attack: big button, cooldown; spin and slam hit all around, lunge pierces', () => {
    for (const w of ['sword', 'hammer', 'spear'] as const) {
      const d = quiet(newRun(5, { a: w }));
      const st = d.map.start, a = body('a', st.x, st.y);
      run1(d, [a], new Map([['a', 0]]));
      const spots = w === 'spear' ? [[-10, 0], [30, 0]] : [[-60, 0], [0, 60]];
      if (w === 'spear') a.x = st.x - 70;
      for (const [dx, dy] of spots) goo(d, 1, st.x + dx, st.y + dy, { ...still, awake: true, hp: 200, mx: 200 });
      d.heroes.a.atkCd = 99; d.heroes.a.inv = 99; d.heroes.a.fx = 1; d.heroes.a.fy = 0;
      const fx: DFx[] = [];
      for (let t = 0; t < (w === 'spear' ? 24 : 1); t++) {
        stepDungeon(d, [a], new Map([['a', 1]]), 1, 1 / 60, fx);
        a.x += a.vx / 60; a.y += a.vy / 60; a.dashT = Math.max(0, a.dashT - 1 / 60);
      }
      expect(fx.some((f) => f.t === 'special')).toBe(true);
      expect(d.enemies.every((e) => e.hp < 200)).toBe(true);
      expect(run1(d, [a], new Map([['a', 2]])).fx.some((f) => f.t === 'special')).toBe(false);
      expect(d.heroes.a.spCd).toBeGreaterThan(5);
    }
  });

  it('health is points: a touch costs the goo\'s damage; 0 = knocked out, back after 5 s with full health', () => {
    const d = quiet(newRun(6, { a: 'hammer' }, 3));
    const st = d.map.start, a = body('a', st.x, st.y);
    d.heroes.a.atkCd = 999;
    expect(d.heroes.a.hp).toBe(CLASS_HP.rogue);
    goo(d, 0, st.x + 20, st.y, { awake: true, stun: 999 });
    run1(d, [a]);
    expect(d.heroes.a.hp).toBe(CLASS_HP.rogue - ENEMY_TOUCH[0]);
    d.heroes.a.hp = 5; d.heroes.a.inv = 0;
    const e = d.enemies[0]; e.x = a.x + 20; e.y = a.y;
    const { fx } = run1(d, [a]);
    expect(d.heroes.a.ko).toBeGreaterThan(0);
    expect(fx.some((f) => f.t === 'ko')).toBe(true);
    d.enemies = [];
    a.x = st.x + 200;
    run1(d, [a], undefined, KO_SECONDS + 0.2);
    expect(d.heroes.a.ko).toBe(0);
    expect(d.heroes.a.hp).toBe(d.heroes.a.maxHp);
    expect(Math.hypot(a.x - st.x, a.y - st.y)).toBeLessThan(20);
  });

  it('a sidestep (dash) dodges touches and spit', () => {
    const d = quiet(newRun(7, { a: 'sword' }));
    const st = d.map.start, a = body('a', st.x, st.y);
    run1(d, [a]);
    a.lastDash = 1; a.dashT = 0.3;
    run1(d, [a]);
    a.dashT = 0;
    expect(d.heroes.a.dodge).toBeGreaterThan(0.3);
    goo(d, 0, st.x + 20, st.y, { awake: true, stun: 999 });
    d.spit.push({ id: 900, x: st.x - 20, y: st.y, vx: 100, vy: 0, t: 1 });
    run1(d, [a]);
    expect(d.heroes.a.hp).toBe(CLASS_HP.rogue);
  });

  it('spitters keep their distance; they aim first (warning), then fire a burst of 3 along the aim; spit hurts, walls stop it', () => {
    const d = quiet(newRun(16, { a: 'staff' }, 3));
    const st = roomMid(d), a = body('a', st.x, st.y);
    d.heroes.a.atkCd = 999;
    const s = goo(d, 3, st.x + 120, st.y, { awake: true, cd: 0.01 });
    run1(d, [a], undefined, 0.05);
    expect(s.act).toBe(5); // aiming: no shot yet
    expect(d.spit).toHaveLength(0);
    const aim = s.ang!;
    const { fx } = run1(d, [a], undefined, AIM_WARN + BURST_GAP * BURST);
    expect(fx.filter((f) => f.t === 'spit')).toHaveLength(BURST);
    // the shots fly along the aim taken when the warning started (spread a little)
    for (const sp of d.spit) { const da = Math.atan2(sp.vy, sp.vx) - aim; expect(Math.abs(Math.atan2(Math.sin(da), Math.cos(da)))).toBeLessThanOrEqual(BURST_SPREAD + 1e-6); }
    // it backs off from a blob that is too close
    d.spit = []; s.act = 0; s.cd = 999; s.x = a.x + 60; s.y = a.y;
    const before = Math.hypot(s.x - a.x, s.y - a.y);
    run1(d, [a], undefined, 0.5);
    expect(Math.hypot(s.x - a.x, s.y - a.y)).toBeGreaterThan(before);
    // a burst shot costs BURST_DMG, an old-style spit (boss ring) SPIT_DMG
    d.enemies = []; d.spit = []; d.heroes.a.hp = 100; d.heroes.a.inv = 0;
    d.spit.push({ id: 901, x: a.x - 40, y: a.y, vx: 210, vy: 0, t: 1, dmg: BURST_DMG });
    run1(d, [a], undefined, 0.3);
    expect(d.heroes.a.hp).toBe(100 - BURST_DMG);
    expect(d.spit).toHaveLength(0);
    d.heroes.a.inv = 0;
    d.spit.push({ id: 902, x: a.x - 40, y: a.y, vx: 210, vy: 0, t: 1 });
    run1(d, [a], undefined, 0.3);
    expect(d.heroes.a.hp).toBe(100 - BURST_DMG - SPIT_DMG);
  });

  it('a burst aimed during the warning misses a blob that sidestepped', () => {
    const d = quiet(newRun(16, { a: 'staff' }));
    const st = roomMid(d), a = body('a', st.x, st.y);
    d.heroes.a.atkCd = 999;
    goo(d, 3, st.x + 150, st.y, { awake: true, cd: 0.01 });
    run1(d, [a], undefined, 0.05);
    a.y += 60; // stepped out of the line while it aimed
    run1(d, [a], undefined, AIM_WARN + 1.2);
    expect(d.heroes.a.hp).toBe(CLASS_HP.healer);
  });

  it('bat: telegraphed dash (stands still during the warning), dashes along the aim, then backs off (hit and run)', () => {
    const d = quiet(newRun(18, { a: 'staff' }));
    const st = roomMid(d), a = body('a', st.x, st.y);
    d.heroes.a.atkCd = 999;
    const bat = goo(d, 0, st.x + 140, st.y, { awake: true, cd: 0.01 });
    run1(d, [a], undefined, 0.05);
    expect(bat.act).toBe(1);
    const x0 = bat.x;
    run1(d, [a], undefined, DASH_WARN - 0.1);
    expect(Math.abs(bat.x - x0)).toBeLessThan(6); // the wind-up holds still
    const { fx } = run1(d, [a], undefined, 0.15);
    expect(fx.some((f) => f.t === 'mdash')).toBe(true);
    expect(bat.act).toBe(2);
    run1(d, [a], undefined, DASH_TIME + 0.05);
    expect(d.heroes.a.hp).toBeLessThan(CLASS_HP.healer); // it hit the blob that stayed in the line
    expect(bat.act).toBe(7); // and backs off
    const near = Math.hypot(bat.x - a.x, bat.y - a.y);
    run1(d, [a], undefined, 0.4);
    expect(Math.hypot(bat.x - a.x, bat.y - a.y)).toBeGreaterThan(near);
  });

  it('slime: dash, then a short second warning and a bite where it landed; a sidestep during the warning dodges', () => {
    const d = quiet(newRun(19, { a: 'staff' }));
    const st = roomMid(d), a = body('a', st.x, st.y);
    d.heroes.a.atkCd = 999;
    const sl = goo(d, 1, st.x + 160, st.y, { awake: true, cd: 0.01 });
    run1(d, [a], undefined, 0.05);
    expect(sl.act).toBe(1);
    a.y += 70; // sidestep the dash
    run1(d, [a], undefined, DASH_WARN + DASH_TIME + 0.02);
    expect(d.heroes.a.hp).toBe(CLASS_HP.healer);
    expect(sl.act).toBe(3); // bite wind-up, aimed at the blob's new spot
    const { fx } = run1(d, [a], undefined, BITE_WARN + BITE_TIME + 0.05);
    expect(fx.some((f) => f.t === 'bite')).toBe(true);
  });

  it('monster actions travel in the snapshot (state, angle, time left) for the warnings on every phone', () => {
    const d = quiet(newRun(18, { a: 'staff' }));
    const st = roomMid(d), a = body('a', st.x, st.y);
    d.heroes.a.atkCd = 999;
    goo(d, 0, st.x + 140, st.y, { awake: true, cd: 0.01 });
    run1(d, [a], undefined, 0.05);
    const e = dview(dsnap(d, 18)).enemies[0];
    expect(e.act).toBe(1);
    expect(Math.abs(e.ang - Math.PI)).toBeLessThan(0.05);
    expect(e.at).toBeGreaterThan(0.4);
  });

  it('goo gang up: one waking calls the goo around it', () => {
    const d = quiet(newRun(17, { a: 'staff' }));
    const st = d.map.start, a = body('a', st.x, st.y);
    d.heroes.a.atkCd = 999;
    goo(d, 0, st.x + 100, st.y, { stun: 999 });
    const far = goo(d, 0, st.x + 100 + 200, st.y, { stun: 999 }); // 300+ from the blob: would not see it alone
    run1(d, [a]);
    expect(far.awake).toBe(true);
  });

  it('boss: telegraphed slam; below half health it turns angry (phase 2): spit ring + small goo per slam', () => {
    const d = quiet(newRun(9, { a: 'sword' }, 3));
    const st = d.map.start, a = body('a', st.x, st.y);
    d.heroes.a.atkCd = 999;
    const boss = goo(d, 2, st.x + 150, st.y, { awake: true, stun: 999, slamT: 0.01 });
    run1(d, [a]);
    expect(boss.slam).not.toBeNull();
    run1(d, [a], undefined, 1.2);
    expect(d.heroes.a.hp).toBe(CLASS_HP.rogue - SLAM_DMG);
    expect(Math.hypot(boss.x - a.x, boss.y - a.y)).toBeLessThan(ENEMY_R[2] + 20); // it leapt onto the slam spot
    // phase 2
    boss.hp = boss.mx / 2 - 1; boss.slamT = 0.01; boss.slam = null; d.heroes.a.inv = 99;
    const { fx } = run1(d, [a], undefined, 1.3);
    expect(fx.some((f) => f.t === 'phase2')).toBe(true);
    expect(fx.filter((f) => f.t === 'spit').length).toBeGreaterThanOrEqual(8);
    expect(d.enemies.filter((e) => e.kind === 0).length).toBe(2);
  });

  it('level-up: 3 cards from the own class; no timer: the picking blob is frozen and safe', () => {
    const d = quiet(newRun(8, { a: 'sword', b: 'staff' }));
    d.xp = LEVEL_XP[0] - 1;
    goo(d, 0, 0, 0, { hp: 0 });
    const bs = [body('a', d.map.start.x, d.map.start.y), body('b', d.map.start.x + 40, d.map.start.y)];
    const { fx } = run1(d, bs);
    expect(d.level).toBe(2);
    expect(fx.some((f) => f.t === 'level')).toBe(true);
    expect(d.heroes.a.offer.every((id) => skillOf(id)!.cls === 'rogue')).toBe(true);
    expect(d.heroes.b.offer.every((id) => skillOf(id)!.cls === 'healer')).toBe(true);
    d.heroes.a.offer = ['rogue-extraheart', 'rogue-power', 'rogue-rage'];
    dungeonChoice(d, 'a', 'skill:rogue-extraheart');
    expect(d.heroes.a.skills).toEqual(['rogue-extraheart']);
    expect(d.heroes.a.maxHp).toBe(CLASS_HP.rogue + 25);
    dungeonChoice(d, 'a', 'skill:rogue-power'); // not offered any more: ignored
    expect(d.heroes.a.skills).toHaveLength(1);
    const bx = bs[1].x, hb = d.heroes.b.hp;
    goo(d, 0, bs[1].x + 20, bs[1].y, { awake: true, stun: 0 });
    bs[1].vx = 200;
    run1(d, bs, undefined, 15);
    expect(d.heroes.b.offer).toHaveLength(3);
    expect(bs[1].x).toBe(bx);
    expect(d.heroes.b.hp).toBe(hb);
    dungeonChoice(d, 'b', 'skill:' + d.heroes.b.offer[0]);
    expect(d.heroes.b.skills).toHaveLength(1);
  });

  it('classes: health per class; marksman shoots in sight only; healer toggles and heals/revives with bolts; tank shield blocks the front', () => {
    const d = quiet(newRun(14, { k: 'sword', p: 'staff', b: 'bow', r: 'shield' }));
    expect(d.heroes.r.maxHp).toBe(CLASS_HP.tank);
    expect(d.heroes.b.maxHp).toBe(CLASS_HP.marksman);
    const st = d.map.start;
    const b = body('b', st.x - 70, st.y);
    goo(d, 1, st.x + 60, st.y, still);
    d.heroes.b.inv = 99;
    const { fx } = run1(d, [b]);
    expect(fx.some((f) => f.t === 'shot')).toBe(true);
    expect(d.enemies[0].hp).toBe(d.enemies[0].mx - WEAPON_STATS.bow.dmg);
    d.enemies = [];
    const p = body('p', st.x, st.y), k = body('k', st.x + 40, st.y), r = body('r', st.x - 40, st.y);
    d.heroes.k.atkCd = 99; d.heroes.r.atkCd = 99;
    // healer: a press toggles the wand to heal mode (the button's auto-repeat while held does not toggle back)
    run1(d, [p, k, r], new Map([['p', 0]]));
    expect(d.heroes.p.mode).toBe(0);
    const tg = run1(d, [p, k, r], new Map([['p', 1]])).fx;
    expect(d.heroes.p.mode).toBe(1);
    expect(tg.some((f) => f.t === 'mode')).toBe(true);
    run1(d, [p, k, r], new Map([['p', 2]]), 0.3); // held: repeat
    expect(d.heroes.p.mode).toBe(1);
    // knocked-out friend first (wakes), then the hurt one
    d.heroes.k.hp = 30; d.heroes.r.hp = 0; d.heroes.r.ko = 4; d.heroes.r.kx = r.x; d.heroes.r.ky = r.y;
    d.heroes.p.atkCd = 0;
    run1(d, [p, k, r]);
    expect(d.heroes.r.ko).toBe(0);
    d.heroes.p.atkCd = 0;
    run1(d, [p, k, r]);
    expect(d.heroes.k.hp).toBe(30 + HEAL_BOLT);
    // a fresh press later toggles back to damage
    run1(d, [p, k, r], new Map([['p', 2]]), 0.6);
    run1(d, [p, k, r], new Map([['p', 3]]));
    expect(d.heroes.p.mode).toBe(0);
    // knight: holding the big button raises the shield, it blocks a monster in front, not one behind
    d.heroes.p.atkCd = 99; d.heroes.r.inv = 0; d.heroes.r.dodge = 0; d.heroes.r.shield = 0;
    d.heroes.r.fx = 1; d.heroes.r.fy = 0;
    run1(d, [p, k, r], new Map([['r', 0]]));
    run1(d, [p, k, r], new Map([['r', 1]]));
    expect(d.heroes.r.guard).toBe(true);
    const hp0 = d.heroes.r.hp;
    goo(d, 0, r.x + 22, r.y, { awake: true, stun: 0, hp: 999, mx: 999 });
    const r2 = run1(d, [p, k, r], new Map([['r', 2]]));
    expect(d.heroes.r.hp).toBe(hp0);
    expect(r2.fx.some((f) => f.t === 'block')).toBe(true);
    // released: the shield drops after a moment
    run1(d, [p, k, r], new Map([['r', 2]]), 0.5);
    expect(d.heroes.r.guard).toBe(false);
  });

  it('class moves (small button): rogue 2 dodge charges sideways, marksman jumps back, knight shield charge + slash, healer phases out', () => {
    const press = (d: DState, bs: B[], i = 0) => { bs[i].lastDash++; return run1(d, bs).fx; };
    // rogue: two dodges in a row, the third waits for the recharge (6 s per charge)
    const r = quiet(newRun(40, { a: 'dagger' })), st = r.map.start, ra = [body('a', st.x, st.y)];
    run1(r, ra);
    const h = r.heroes.a; h.fx = 1; h.fy = 0;
    expect(press(r, ra).some((f) => f.t === 'move')).toBe(true);
    expect(Math.abs(ra[0].vy)).toBeGreaterThan(300); // sideways to an aim pointing right
    expect(h.dodge).toBeGreaterThan(0);
    const side1 = Math.sign(ra[0].vy);
    ra[0].vx = 0; ra[0].vy = 0;
    expect(press(r, ra).some((f) => f.t === 'move')).toBe(true);
    expect(Math.sign(ra[0].vy)).toBe(-side1); // stick idle: alternates
    expect(press(r, ra).some((f) => f.t === 'move')).toBe(false);
    expect(h.charges).toBe(0);
    run1(r, ra, undefined, CLASS_MOVE_COOLDOWN.rogue + 0.1);
    expect(h.charges).toBe(1);
    // marksman: jumps away from the nearest monster
    const mk = quiet(newRun(41, { b: 'bow' })), ms = mk.map.start, mb = [body('b', ms.x, ms.y)];
    run1(mk, mb);
    goo(mk, 1, ms.x + 80, ms.y, still);
    press(mk, mb);
    expect(mb[0].vx).toBeLessThan(-300);
    expect(press(mk, mb).some((f) => f.t === 'move')).toBe(false); // 8 s cooldown
    // knight: rushes at the monster with the shield up, then slashes
    const k = quiet(newRun(42, { k: 'shield' })), ks = roomMid(k), kb = [body('k', ks.x, ks.y)];
    run1(k, kb);
    goo(k, 1, ks.x + 150, ks.y, { ...still, hp: 999, mx: 999 });
    k.heroes.k.atkCd = 99;
    press(k, kb);
    expect(k.heroes.k.guard).toBe(true);
    expect(kb[0].vx).toBeGreaterThan(300);
    let slashed = false;
    for (let i = 0; i < 40 && !slashed; i++) { kb[0].x += kb[0].vx / 60; slashed = run1(k, kb).fx.some((f) => f.t === 'swing'); }
    expect(slashed).toBe(true);
    // healer: phased out 2 s: no attacks, no damage
    const p = quiet(newRun(43, { p: 'staff' })), ps = p.map.start, pb = [body('p', ps.x, ps.y)];
    run1(p, pb);
    goo(p, 1, ps.x + 60, ps.y, { ...still, hp: 999, mx: 999 });
    press(p, pb);
    expect(p.heroes.p.phase).toBeGreaterThan(1.5);
    expect(run1(p, pb, undefined, 1).fx.some((f) => f.t === 'shot')).toBe(false);
    expect(dview(dsnap(p, 1)).heroes.p.phase).toBe(true);
    run1(p, pb, undefined, 1.2);
    expect(run1(p, pb, undefined, 0.7).fx.some((f) => f.t === 'shot')).toBe(true);
  });

  it('every skill and item has its ChatGPT N-23 icon file (skills and items are different sets)', () => {
    for (const sk of SKILLS) expect(N23).toContain(skillIcon(sk.id));
    for (const it of ITEMS) expect(N23).toContain(ITEM_ICON[it.id]);
    expect(SKILLS.every((sk) => skillIcon(sk.id).startsWith('art/dungeon/skills/'))).toBe(true);
    expect(ITEMS.every((it) => ITEM_ICON[it.id].startsWith('art/dungeon/items/'))).toBe(true);
  });

  describe('Archero rooms (ROOMS_ENABLED off; rooms passed explicitly)', () => {
    const clearRoom = (d: DState, bs: B[]) => {
      // play the room out: let each wave land, then remove it, until the door is open
      for (let i = 0; i < 20 && !roomClear(d); i++) { run1(d, bs, undefined, 2.2); d.enemies = []; d.spit = []; }
    };
    it('on by default (Stefan 2026-11-15); the old 5-floor dungeon stays reachable (?classic)', () => {
      expect(ROOMS_ENABLED).toBe(true);
      expect(newRunAny(3, { a: 'sword' }).rooms).toBe(true);
      const d = newRunAny(3, { a: 'sword' }, 1, false);
      expect(d.rooms).toBe(false);
      expect(d.map.gw).toBeUndefined();
    });
    it('cracks: 1-2 per 3x3 block (~11-20 % of the floor), never two touching; the entrance gap and every spawn reachable for 1-5 blobz', () => {
      for (const tiles of [7, 8, 9]) for (const players of [1, 2, 3, 4, 5]) for (let room = 1; room <= ROOMS; room++) {
        const f = makeRoom(7 + players, room, players, 1, tiles), W = f.gw!, H = f.gh!, T = f.dt!;
        expect(W).toBe(tiles);
        const c = roomCracks(f, 99 + room);
        let floor = 0;
        for (let y = 3; y < H - 1; y++) for (let x = 1; x < W - 1; x++) floor++;
        expect(c.size / floor).toBeGreaterThanOrEqual(0.11);
        expect(c.size / floor).toBeLessThanOrEqual(0.2);
        for (const i of c) {
          const x = i % W, y = Math.floor(i / W);
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) expect(c.has((y + dy) * W + x + dx)).toBe(false);
        }
        // start in the last floor row, above the bottom wall's gap (the 3 middle tiles); every spawn reachable from it
        expect(Math.floor(f.start.y / T)).toBe(H - 2 - ROOM_STUB); // the last floor row, above the bottom wall and its hallway
        expect(roomGap(W)).toContain(Math.floor(f.start.x / T)); // right above the entrance gap
        // cover never closes a row: every floor row keeps a free run of >= 2 tiles (5 blobz get through)
        for (let y = 3; y < H - 1 - ROOM_STUB; y++) { let run = 0, best = 0; for (let x = 1; x < W - 1; x++) { run = f.solid[y * W + x] ? 0 : run + 1; best = Math.max(best, run); } expect(best).toBeGreaterThanOrEqual(2); }
        const seen = new Uint8Array(W * H), q = [[Math.floor(f.start.x / T), Math.floor(f.start.y / T)]];
        while (q.length) { const [x, y] = q.pop()!; if (x < 0 || y < 0 || x >= W || y >= H || seen[y * W + x] || f.solid[y * W + x]) continue; seen[y * W + x] = 1; q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
        for (const w of f.waves!) for (const sp of w) expect(seen[Math.floor(sp.y / T) * W + Math.floor(sp.x / T)]).toBe(1);
        expect(seen[Math.floor(f.stairs.y / T) * W + Math.floor(f.stairs.x / T)]).toBe(1);
      }
    });
    it('a room is screen-wide and tall, the start at the bottom and the door at the top; taller with more blobz', () => {
      for (let room = 1; room <= ROOMS; room++) {
        const f = makeRoom(5, room, 1);
        expect(f.gw).toBe(ROOM_W + 2);
        expect(f.gw! * f.dt!).toBe(432); // 0x72 tiles at 3x: the screen width
        expect((f.gh! - 4) * f.dt!).toBeGreaterThanOrEqual(1.35 * 930); // ~1.4+ screens of floor
        expect(f.start.y).toBeGreaterThan(f.stairs.y + 20 * f.dt!);
        expect(isWall(f, f.start.x, f.start.y)).toBe(false);
        expect(isWall(f, f.stairs.x, f.stairs.y)).toBe(false);
        expect(f.waves!.length).toBeGreaterThanOrEqual(2);
        for (const w of f.waves!) for (const sp of w) expect(isWall(f, sp.x, sp.y)).toBe(false);
      }
      expect(makeRoom(5, 1, 5).gh!).toBe(makeRoom(5, 1, 1).gh! + 3);
      expect(roomType(MINIBOSS_ROOM)).toBe('boss');
      expect(roomType(ROOMS)).toBe('boss');
      expect(makeRoom(5, 3, 5).waves![0].length).toBeGreaterThan(makeRoom(5, 3, 1).waves![0].length); // +1 per extra blob
    });
    it('waves land after their ring, one after another; the door opens when the room is clear; 10 rooms, the boss last', () => {
      const d = newRun(21, { a: 'sword', b: 'bow' }, 1, true);
      expect(d.rooms).toBe(true);
      const bs = () => [body('a', d.map.start.x, d.map.start.y), body('b', d.map.start.x + 30, d.map.start.y)];
      let b = bs();
      expect(d.enemies.length).toBe(0); // a calm arrival
      const fx = run1(d, b, undefined, 1.3).fx;
      expect(fx.some((f) => f.t === 'spawn')).toBe(true);
      expect(d.enemies.length).toBe(0); // still the landing ring
      run1(d, b, undefined, SPAWN_WARN + 0.1);
      expect(d.enemies.length).toBeGreaterThan(0);
      expect(d.enemies.every((e) => e.awake && e.calm)).toBe(true); // Dungeon 1 room 1: calm
      expect(roomClear(d)).toBe(false);
      clearRoom(d, b);
      expect(roomClear(d)).toBe(true);
      expect(dview(dsnap(d, 21))).toMatchObject({ rooms: true, wave: 2, waves: 2 });
      for (let room = 2; room <= ROOMS; room++) {
        b = [body('a', d.map.stairs.x, d.map.stairs.y), body('b', d.map.stairs.x + 10, d.map.stairs.y)];
        run1(d, b, undefined, READY_SECONDS + ROOM_TRANS + 0.1); // the door counts, then everyone slides up through it
        expect(d.floor).toBe(room);
        b = bs();
        if (room === MINIBOSS_ROOM || room === ROOMS) {
          run1(d, b, undefined, 2.2);
          const boss = d.enemies.find((e) => e.kind === 2)!;
          expect(boss.mx).toBe(room === MINIBOSS_ROOM ? Math.round(d.bossMax * 0.5) : d.bossMax);
        }
        clearRoom(d, b);
      }
      b = [body('a', d.map.stairs.x, d.map.stairs.y), body('b', d.map.stairs.x + 10, d.map.stairs.y)];
      run1(d, b, undefined, READY_SECONDS + 0.1);
      expect(d.done).toBeGreaterThan(0);
      expect(d.why).toBe('boss');
    });
    it('room layouts (Stefan): seeded cover from 0x72 pieces in every room, pillars only in boss rooms; start in the entrance; max 1 shooter early', () => {
      const looks = new Set<string>();
      for (const seed of [5, 9, 13]) for (let room = 1; room <= ROOMS; room++) {
        const f = makeRoom(seed, room, 2);
        expect(Math.floor(f.start.y / f.dt!)).toBe(f.gh! - 2 - ROOM_STUB); // the last floor row, right above the bottom wall's gap
        if (room <= EARLY_ROOMS) for (const w of f.waves!) expect(w.filter((sp) => sp.kind === 3).length).toBeLessThanOrEqual(1);
        const cols = f.columns ?? [], walls = f.walls ?? [];
        if (roomType(room) === 'boss') { expect(walls.length).toBe(0); expect(cols.length).toBeGreaterThanOrEqual(1); }
        else expect(cols.length + walls.length).toBeGreaterThanOrEqual(3);
        for (const c of [...cols, ...walls]) expect(isWall(f, (c.x + 0.5) * ROOM_T, (c.y + 0.5) * ROOM_T)).toBe(true); // blocks walking and shots
        for (const w of f.waves!) for (const sp of w) expect(isWall(f, sp.x, sp.y)).toBe(false);
        expect(JSON.stringify(makeRoom(seed, room, 2).walls)).toBe(JSON.stringify(walls)); // seeded: host and joiners match
        looks.add(JSON.stringify(walls.map((w) => [w.x, w.y - f.gh!])));
      }
      expect(looks.size).toBeGreaterThan(10); // plenty of different designs
    });
    it('playtest fixes: anything pushed into a wall or out of the room snaps back to the nearest floor tile', () => {
      const f = makeRoom(5, 1, 1), T = f.dt!;
      for (const o of [{ x: 4, y: 20 * T, vx: 300, vy: 0 }, { x: 4.5 * T, y: -50, vx: 0, vy: -300 }, { x: 999, y: 10.5 * T, vx: 0, vy: 0 }, { x: 4.5 * T, y: (f.gh! - 0.5) * T, vx: 0, vy: 0 }]) {
        unstick(f, o);
        expect(isWall(f, o.x, o.y)).toBe(false);
        expect(o.vx).toBe(0);
      }
      // a monster shoving a blob into the side wall leaves it on the floor
      const d = newRun(23, { a: 'sword' }, 1, true);
      const a = body('a', 1.2 * T, 12 * T);
      goo(d, 1, a.x + 20, a.y, { ...still, hp: 999, mx: 999 });
      d.heroes.a.inv = 99;
      run1(d, [a], undefined, 0.2);
      expect(isWall(d.map, a.x, a.y)).toBe(false);
    });
    it('playtest fixes: sticky auto-aim, early rooms aim slower, the jump back goes away from the target', () => {
      const d = quiet(newRun(24, { b: 'bow' }, 1, true));
      enterFloor(d, 24, 4, 1); quiet(d); d.wave = 99; clearCover(d);
      const T = d.map.dt!, b = [body('b', 4.5 * T, 20 * T)];
      d.heroes.b.inv = 99;
      b[0].vx = 100; // walking: the crossbow holds fire (no knockback moving the monsters), the aim still updates
      const e1 = goo(d, 1, b[0].x, b[0].y - 150, { ...still, hp: 9999, mx: 9999 });
      run1(d, b, undefined, 0.2);
      expect(d.heroes.b.tgt).toBe(e1.id);
      const e2 = goo(d, 1, b[0].x + 70, b[0].y - 125, { ...still, hp: 9999, mx: 9999 }); // a bit closer: stays on e1
      run1(d, b, undefined, 1);
      expect(d.heroes.b.tgt).toBe(e1.id);
      e2.x = b[0].x + 40; e2.y = b[0].y - 60; // clearly closer (>25 %) for 0.5 s: switches
      run1(d, b, undefined, 0.3);
      expect(d.heroes.b.tgt).toBe(e1.id);
      run1(d, b, undefined, 0.4);
      expect(d.heroes.b.tgt).toBe(e2.id);
      // the jump back: away from the target (up the screen = target), even with another monster to the side
      e1.hp = 0; d.enemies = d.enemies.filter((e) => e.hp > 0);
      goo(d, 1, b[0].x + 60, b[0].y + 10, { ...still, hp: 9999, mx: 9999 });
      d.heroes.b.tgt = e2.id; d.heroes.b.mvCd = 0; b[0].vx = 0;
      b[0].lastDash++; run1(d, b);
      expect(b[0].vy).toBeGreaterThan(200); // down, away from e2 (above), not left away from the side monster
      // rooms 1-3: the shooter winds up longer than later rooms
      const wind = (room: number) => {
        const r = quiet(newRun(25, { a: 'sword' }, 1, true));
        if (room > 1) { enterFloor(r, 25, room, 1); quiet(r); }
        r.wave = 99;
        const a = body('a', 4.5 * T, 20 * T); r.heroes.a.inv = 99;
        const s = goo(r, 3, a.x, a.y - 200, { awake: true, cd: 0 });
        run1(r, [a], undefined, 0.05);
        return s.actT ?? 0;
      };
      expect(wind(2)).toBeCloseTo(ROOM_TUNE.aimWarn - 0.05, 2); // the same clear 0.8 s aim line in every room
      expect(wind(4)).toBeCloseTo(ROOM_TUNE.aimWarn - 0.05, 2);
    });
    it('integer scale: the room is as wide as the narrowest phone allows at exactly 3x (7-9 tiles of 48 px)', () => {
      expect([roomTiles(360), roomTiles(390), roomTiles(412), roomTiles(432), roomTiles(1000), roomTiles(320), roomTiles()]).toEqual([7, 8, 8, 9, 9, 7, 9]);
      expect(roomGap(7)).toEqual([2, 3, 4]);
      expect(roomGap(8)).toEqual([3, 4]);
      // the width holds for the whole room and travels in the snapshot (the narrowest phone: e2e dungeon-rooms)
      const d = newRunAny(9, { a: 'sword', b: 'bow' }, 1, true, 360);
      expect(d.rw).toBe(7);
      expect(d.map.gw! * d.map.dt!).toBe(336);
      expect(dview(dsnap(d, 9)).roomTiles).toBe(7);
      // the open door's tiles sit under the 2-tile leaf in an even room too
      const e = newRunAny(9, { a: 'sword' }, 1, true, 400);
      expect(e.rw).toBe(8);
      e.wave = 99; e.pending = []; e.enemies = [];
      run1(e, [body('a', e.map.start.x, e.map.start.y)], undefined, 0.1);
      const T = e.map.dt!;
      expect([2, 3, 4, 5].map((x) => isWall(e.map, (x + 0.5) * T, 2.5 * T))).toEqual([true, false, false, true]);
    });
    it('pacing (Stefan): at most 1/3 of a wave shoots or dashes (rooms 1-3: one), others only chase; level-ups wait for a clear room', () => {
      expect([1, 2, 3].map((r) => roomSpecials(r, 9))).toEqual([1, 1, 1]);
      expect([roomSpecials(4, 3), roomSpecials(4, 7), roomSpecials(10, 9)]).toEqual([1, 2, 3]);
      for (const room of [1, 3, 4, 7, 10]) {
        const d = newRun(30 + room, { a: 'sword', b: 'bow', c: 'staff' }, 2, true);
        if (room > 1) { enterFloor(d, 30 + room, room, 3); }
        const T = d.map.dt!, bs = [body('a', 2 * T, d.map.start.y), body('b', 3 * T, d.map.start.y), body('c', 4 * T, d.map.start.y)];
        for (const h of Object.values(d.heroes)) h.inv = 999;
        run1(d, bs, undefined, 1.2 + SPAWN_WARN + 0.1);
        const alive = d.enemies.filter((e) => e.kind !== 2);
        const specials = alive.filter((e) => e.kind === 3 || !e.calm).length;
        expect(specials).toBeLessThanOrEqual(roomSpecials(room, alive.length));
        expect(alive.every((e) => e.kind === 3 || e.kind <= 1)).toBe(true);
      }
      // level-ups gained mid-room wait for the clear room, then show before the door counts
      const d = newRun(40, { a: 'sword' }, 1, true);
      const a = [body('a', d.map.start.x, d.map.start.y)];
      run1(d, a, undefined, 1.3 + SPAWN_WARN);
      expect(roomClear(d)).toBe(false);
      d.xp = 10_000; d.enemies[0].hp = 0; // a kill hands out the XP
      run1(d, a, undefined, 0.1);
      expect(d.level).toBeGreaterThan(1);
      expect(d.heroes.a.pending).toBeGreaterThan(0);
      expect(d.heroes.a.offer.length).toBe(0); // not yet: the room is still fighting
      const e = newRun(40, { a: 'sword' }, 1, true); Object.assign(e.heroes.a, { pending: 1 });
      dungeonChoice(e, 'a', 'skill:open'); // the HUD level-up button: open them now, mid-room
      expect(e.heroes.a.offer.length).toBe(3);
      expect(dview(dsnap(d, 40)).heroes.a.pending).toBeGreaterThan(0); // the badge count travels to every phone
      d.enemies = []; d.pending = []; d.wave = 99;
      run1(d, a, undefined, 0.1);
      expect(d.heroes.a.offer.length).toBe(3); // the room is clear: the cards show
    });
    it('the open door: the doorway is walkable, the whole doorway + 1 tile below counts, no bumping inside it', () => {
      const d = newRun(26, { a: 'sword', b: 'bow', c: 'staff' }, 1, true);
      const T = d.map.dt!, sx = d.map.stairs.x;
      expect(isWall(d.map, sx, 2.5 * T)).toBe(true); // closed: the wall face
      d.wave = 99; d.pending = []; d.enemies = [];
      expect(roomClear(d)).toBe(true);
      // three blobz squeezed into the doorway, two of them overlapping: they stay put and the 1.5 s count runs
      const bs = [body('a', sx - 50, 2.4 * T), body('b', sx, 2.6 * T), body('c', sx + 6, 2.6 * T)];
      run1(d, bs, undefined, 0.5);
      expect(isWall(d.map, sx, 2.5 * T)).toBe(false); // open: walk into it
      expect(bs.every((b) => inDoorway(d.map, b.x, b.y))).toBe(true);
      expect(Math.hypot(bs[1].x - bs[2].x, bs[1].y - bs[2].y)).toBeLessThan(10); // not pushed apart
      expect(d.ready).toBeGreaterThan(0.4);
      for (let k = 0; k < 200 && !(d.trans ?? 0); k++) run1(d, bs); // until the door has counted
      // forward, never back: the blobz slide UP through the door (no new room yet) ...
      expect(d.trans).toBeGreaterThan(0);
      const y0 = bs.map((b) => b.y);
      run1(d, bs, undefined, ROOM_TRANS / 2);
      expect(bs.every((b, i) => b.y < y0[i])).toBe(true);
      expect(d.floor).toBe(1);
      run1(d, bs, undefined, ROOM_TRANS / 2 + 0.05);
      // ... then the next room: they start in its hallway below the bottom wall and walk in, still going up
      expect(d.floor).toBe(2);
      const T2 = d.map.dt!, hall = (d.map.gh! - 1 - ROOM_STUB) * T2;
      expect(bs.every((b) => b.y > hall)).toBe(true);
      expect(dview(dsnap(d, 26)).walkIn).toBeGreaterThan(0);
      const y1 = bs.map((b) => b.y);
      run1(d, bs, undefined, ROOM_WALK_IN);
      expect(bs.every((b, i) => b.y < y1[i] - 80)).toBe(true);
      expect(inDoorway(d.map, d.map.start.x, d.map.start.y)).toBe(false);
    });
    it('the floor under the thin side walls is walkable up to the 15 px wall strip (Stefan: it looked like floor)', () => {
      const f = makeRoom(5, 1, 1), T = f.dt!, W = f.gw!, y = 20.5 * T;
      expect(isWall(f, 0.6 * T, y)).toBe(false); // the edge column's floor
      expect(isWall(f, 10, y)).toBe(true); // the wall strip itself
      expect(isWall(f, W * T - 10, y)).toBe(true);
      const o = { x: 0.2 * T, y, vx: -300, vy: 0 };
      collideWalls(f, o, 14);
      expect(o.x).toBe(15 + 14); // pressed against the strip, not a whole tile away
      expect(o.vx).toBe(0);
    });
    it('an open loot card holds the door (it never follows the team into the next room)', () => {
      const d = newRun(27, { a: 'sword', b: 'bow' }, 1, true);
      d.wave = 99; d.pending = []; d.enemies = []; d.lootQ.push('helm');
      const sx = d.map.stairs.x, T = d.map.dt!, bs = [body('a', sx - 10, 2.6 * T), body('b', sx + 10, 2.6 * T)];
      run1(d, bs, undefined, READY_SECONDS + 0.5);
      expect(d.loot).not.toBeNull();
      expect(d.ready).toBe(0);
      expect(d.trans ?? 0).toBe(0);
      dungeonChoice(d, 'a', 'loot:roll'); dungeonChoice(d, 'b', 'loot:pass');
      run1(d, bs, undefined, 0.1);
      d.lootLast = null;
      for (let k = 0; k < 300 && !(d.trans ?? 0); k++) run1(d, bs);
      expect(d.trans).toBeGreaterThan(0); // decided: now the door counts
    });
    it('corridor: climbing past the line starts the next wave early; the difficulty spreads over the 10 rooms', () => {
      const d = newRun(22, { a: 'sword' }, 1, true);
      enterFloor(d, 22, 2, 1);
      expect(roomType(2)).toBe('corridor');
      const b = [body('a', d.map.start.x, d.map.start.y)];
      run1(d, b, undefined, 1.3 + SPAWN_WARN);
      expect(d.wave).toBe(1);
      b[0].y = d.map.lines![0] - 40; // climbed past the first line while wave 1 is still alive
      run1(d, b, undefined, 0.1);
      expect(d.wave).toBe(2);
      expect(diffFloor({ rooms: true, floor: 1 })).toBe(1);
      expect(diffFloor({ rooms: true, floor: ROOMS })).toBe(FLOORS);
    });
  });

  it('lifesteal (Stefan: was far too strong): +1 per splat, at most 3 health a second', () => {
    const d = quiet(newRun(51, { a: 'dagger' }));
    d.heroes.a.skills.push('rogue-lifesteal'); refresh(d.heroes.a);
    const st = d.map.start, a = [body('a', st.x, st.y)];
    run1(d, a);
    d.heroes.a.hp = 10;
    for (let k = 0; k < 10; k++) goo(d, 0, st.x + 20, st.y + (k - 5) * 2, { ...still, hp: 1, mx: 1, by: 'a' });
    for (const e of d.enemies) e.hp = 0; // ten splats in the same tick
    const rnd = vi.spyOn(Math, 'random').mockReturnValue(0.99); // no potion drop
    run1(d, a);
    rnd.mockRestore();
    expect(d.heroes.a.hp).toBe(13);
  });

  it('marksman shoots only while standing still', () => {
    const d = quiet(newRun(14, { b: 'bow' }));
    const st = d.map.start;
    goo(d, 1, st.x + 60, st.y, { ...still, hp: 999, mx: 999 });
    d.heroes.b.inv = 99;
    const moving = body('b', st.x - 70, st.y); moving.vx = 120;
    expect(run1(d, [moving]).fx.some((f) => f.t === 'shot')).toBe(false);
    const standing = body('b', st.x - 70, st.y);
    expect(run1(d, [standing]).fx.some((f) => f.t === 'shot')).toBe(true);
  });

  it('loot: 20 s to roll; a player who already wears the item passes automatically', () => {
    expect(LOOT_SECONDS).toBe(20);
    const d = quiet(newRun(15, { a: 'sword', b: 'bow' }));
    d.heroes.b.items = ['helm'];
    d.lootQ.push('helm');
    const bs = [body('a', d.map.start.x, d.map.start.y), body('b', d.map.start.x + 40, d.map.start.y)];
    run1(d, bs);
    expect(d.loot!.rolls.b).toBe(0);
    expect(d.loot!.rolls.a).toBe(-1);
    dungeonChoice(d, 'a', 'loot:roll');
    run1(d, bs);
    expect(d.heroes.a.items).toEqual(['helm']);
  });

  it('items: 3 slots; a 4th item replaces the oldest (only then "Byter ut din")', () => {
    expect(ITEM_SLOTS).toBe(3);
    const d = quiet(newRun(16, { a: 'sword' }));
    const sa = [body('a', d.map.start.x, d.map.start.y)];
    const take = (it: string) => { d.lootLast = null; d.lootQ.push(it); run1(d, sa); dungeonChoice(d, 'a', 'loot:roll'); run1(d, sa); };
    expect(lootReplaces([], 'helm')).toBeNull();
    for (const it of ['helm', 'ring', 'gloves']) take(it);
    expect(d.heroes.a.items).toEqual(['helm', 'ring', 'gloves']);
    expect(heroMods(d.heroes.a).hp).toBe(ITEMS.filter((i) => ['helm', 'ring', 'gloves'].includes(i.id)).reduce((k, i) => k + ((i.mod as Mods).hp ?? 0), 0)); // all three count
    expect(lootReplaces(d.heroes.a.items, 'amulet')).toBe('helm');
    expect(lootReplaces(d.heroes.a.items, 'ring')).toBeNull(); // already have it
    take('amulet');
    expect(d.heroes.a.items).toEqual(['ring', 'gloves', 'amulet']);
    expect(dview(dsnap(d, 16)).heroes.a.items).toEqual(['ring', 'gloves', 'amulet']);
  });

  it('loot alone: "Använd" takes it at once (no dice); with friends: roll/pass, highest roll wears it', () => {
    const solo = quiet(newRun(15, { a: 'sword' }));
    solo.lootQ.push('ring');
    const sa = [body('a', solo.map.start.x, solo.map.start.y)];
    run1(solo, sa);
    dungeonChoice(solo, 'a', 'loot:roll');
    const sf = run1(solo, sa).fx;
    expect(solo.heroes.a.items).toEqual(['ring']);
    expect(sf.some((f) => f.t === 'loot' && f.win === 'a' && f.roll === 100)).toBe(true);
    const d = quiet(newRun(15, { a: 'sword', b: 'bow' }));
    d.lootQ.push('helm');
    const bs = [body('a', d.map.start.x, d.map.start.y), body('b', d.map.start.x + 40, d.map.start.y)];
    run1(d, bs);
    expect(d.loot!.item).toBe('helm');
    dungeonChoice(d, 'a', 'loot:roll');
    dungeonChoice(d, 'b', 'loot:pass');
    run1(d, bs);
    expect(d.heroes.a.items).toEqual(['helm']);
    expect(d.heroes.a.maxHp).toBe(CLASS_HP.rogue + 30);
    d.lootLast = null; d.lootQ.push('ring');
    run1(d, bs, undefined, LOOT_SECONDS + 0.5);
    expect(d.heroes.b.items).toEqual([]);
    // potion: health for every blob
    d.heroes.a.hp = 20; d.heroes.b.hp = 10;
    d.coins.push({ id: 99, x: bs[0].x, y: bs[0].y, v: 0, k: 1 });
    run1(d, bs);
    expect(d.heroes.a.hp).toBe(20 + POTION_HP);
    expect(d.heroes.b.hp).toBe(10 + POTION_HP);
  });

  it('drops are rare: medium goo never drop items; the boss always does', () => {
    const d = quiet(newRun(18, { a: 'hammer' }));
    const st = d.map.start;
    for (let i = 0; i < 30; i++) goo(d, 1, st.x, st.y, { hp: 0 });
    run1(d, [body('a', st.x + 300, st.y)]);
    expect(d.lootQ).toHaveLength(0);
    goo(d, 2, st.x, st.y, { hp: 0 });
    run1(d, [body('a', st.x + 300, st.y)]);
    expect(d.lootQ.length + (d.loot ? 1 : 0)).toBe(1);
  });

  /** The healer's wand in heal mode shoots one green bolt at a hurt friend; returns that friend. */
  function healBolt(skill: string | null) {
    const d = quiet(newRun(31, { a: 'staff', f: 'sword' }));
    d.heroes.a.skills = skill ? [skill] : []; refresh(d.heroes.a);
    d.heroes.a.mode = 1; d.heroes.f.hp = 10; d.heroes.f.atkCd = 999;
    const st = d.map.start;
    const fx = run1(d, [body('a', st.x, st.y), body('f', st.x + 80, st.y)]).fx;
    expect(fx.some((x) => x.t === 'shot' && x.k === 1)).toBe(true);
    return { f: d.heroes.f };
  }

  // ---- every skill and item does what its card says (one check per id) ----
  const WEAPON_OF = { rogue: 'sword', healer: 'staff', marksman: 'bow', tank: 'shield' } as const;
  /** Measure the effect of a mod in play: damage per hit, swings per second, heal amount, health, etc. */
  function measure(cls: keyof typeof WEAPON_OF, key: keyof Mods, val: number) {
    const w = WEAPON_OF[cls];
    const run = (mod: Partial<Mods>) => {
      const d = quiet(newRun(31, { a: w }));
      d.heroes.a.skills = []; d.heroes.a.items = [];
      // apply via a fake skill entry: push the real skill id that holds this mod
      const sk = SKILLS.find((k) => k.cls === cls && (k.mod as Record<string, number>)[key] === val) ?? ITEMS.find((i) => (i.mod as Record<string, number>)[key] === val);
      if (Object.keys(mod).length && sk) { if ('cls' in sk) d.heroes.a.skills = [sk.id]; else d.heroes.a.items = [sk.id]; }
      refresh(d.heroes.a);
      const st = d.map.start, a = body('a', st.x, st.y);
      d.heroes.a.inv = 99;
      return { d, a, st };
    };
    return { base: run({}), mod: run({ [key]: val }) };
  }
  for (const sk of [...SKILLS.map((s) => ({ id: s.id, cls: s.cls, mod: s.mod })), ...ITEMS.map((i) => ({ id: 'item:' + i.id, cls: 'rogue' as const, mod: i.mod }))]) {
    it(`effect works: ${sk.id} (${JSON.stringify(sk.mod)})`, () => {
      for (const [key, val] of Object.entries(sk.mod) as [keyof Mods, number][]) {
        const { base, mod } = measure(sk.cls, key, val);
        const h0 = base.d.heroes.a, h1 = mod.d.heroes.a;
        const m1 = heroMods(h1), m0 = heroMods(h0);
        if (key === 'hp') { expect(h1.maxHp - h0.maxHp).toBe(val); continue; }
        if (key === 'dmg') {
          // damage per hit on a sturdy goo
          const hit = (x: typeof base) => { const e = goo(x.d, 1, x.st.x + 40, x.st.y, { ...still, hp: 999, mx: 999 }); run1(x.d, [x.a]); return 999 - e.hp; };
          expect(hit(mod) / hit(base)).toBeCloseTo(val, 1);
          continue;
        }
        if (key === 'rate') {
          const swings = (x: typeof base) => { goo(x.d, 1, x.st.x + 40, x.st.y, { ...still, hp: 9999, mx: 9999 }); return run1(x.d, [x.a], undefined, 3).fx.filter((f) => f.t === 'swing').length; };
          expect(swings(mod)).toBeGreaterThan(swings(base));
          continue;
        }
        if (key === 'spCd') {
          const cd = (x: typeof base) => { run1(x.d, [x.a], new Map([['a', 0]])); run1(x.d, [x.a], new Map([['a', 1]])); return x.d.heroes.a.spCd; };
          expect(cd(mod) / cd(base)).toBeCloseTo(val, 1);
          continue;
        }
        if (key === 'heal') {
          expect(healBolt(sk.id).f.hp - 10).toBe(Math.round(HEAL_BOLT * val));
          expect(healBolt(null).f.hp - 10).toBe(HEAL_BOLT);
          continue;
        }
        if (key === 'mvCd') {
          // the class move recharges faster: after one move the wait before the next is shorter
          const wait = (x: typeof base) => { run1(x.d, [x.a]); x.a.lastDash++; run1(x.d, [x.a]); return x.d.heroes.a.mvCd; };
          expect(wait(mod) / wait(base)).toBeCloseTo(val, 1);
          continue;
        }
        if (key === 'regen') {
          const x = mod; x.d.heroes.a.hp = 10;
          run1(x.d, [x.a], undefined, REGEN_EVERY + 0.1);
          expect(x.d.heroes.a.hp).toBe(10 + val);
          continue;
        }
        if (key === 'killHeal') {
          const x = mod; x.d.heroes.a.hp = 10;
          goo(x.d, 0, x.st.x + 30, x.st.y, { ...still, hp: 1, mx: 1 });
          const rnd = vi.spyOn(Math, 'random').mockReturnValue(0.99); // no potion drop (4 %) to heal on top
          run1(x.d, [x.a]);
          rnd.mockRestore();
          expect(x.d.heroes.a.hp).toBe(10 + val);
          continue;
        }
        if (key === 'shieldAll') {
          expect(healBolt(sk.id).f.shield).toBe(val);
          expect(healBolt(null).f.shield).toBe(0);
          continue;
        }
        if (key === 'koFast') {
          const x = measure('healer', 'koFast', val).mod; // the healer holds it, a friend gets knocked out
          const d = quiet(newRun(32, { p: 'staff', k: 'sword' }));
          d.heroes.p.skills = x.d.heroes.a.skills;
          const k = body('k', d.map.start.x, d.map.start.y), p = body('p', d.map.start.x + 200, d.map.start.y);
          d.heroes.k.hp = 1; d.heroes.k.atkCd = 999;
          goo(d, 0, k.x + 20, k.y, { awake: true, stun: 999 });
          run1(d, [k, p]);
          expect(d.heroes.k.ko).toBeCloseTo(KO_SECONDS - val, 1);
          continue;
        }
        if (key === 'arrows' || key === 'trap') {
          const x = mod;
          for (let i = 0; i < 6; i++) goo(x.d, 0, x.st.x + Math.cos(i) * 55, x.st.y + Math.sin(i) * 55, { ...still, hp: 999, mx: 999, stun: 0 });
          x.d.heroes.a.atkCd = 999;
          run1(x.d, [x.a], new Map([['a', 0]]));
          const fx = run1(x.d, [x.a], new Map([['a', 1]])).fx;
          if (key === 'arrows') expect(fx.filter((f) => f.t === 'shot').length).toBe(3 + val);
          else expect(Math.max(...x.d.enemies.map((e) => e.stun))).toBeGreaterThanOrEqual(val);
          continue;
        }
        if (key === 'pierce') {
          const x = mod;
          goo(x.d, 0, x.st.x + 60, x.st.y, { ...still, hp: 999, mx: 999 });
          const back = goo(x.d, 0, x.st.x + 100, x.st.y, { ...still, hp: 999, mx: 999 });
          run1(x.d, [x.a]);
          expect(back.hp).toBeLessThan(999);
          continue;
        }
        if (key === 'crit') {
          const x = mod;
          const e = goo(x.d, 1, x.st.x + 60, x.st.y, { ...still, hp: 99999, mx: 99999 });
          const hits: number[] = [];
          for (let i = 0; i < 200; i++) { const hp = e.hp; x.d.heroes.a.atkCd = 0; run1(x.d, [x.a]); hits.push(hp - e.hp); }
          expect(hits.some((h) => h === 2 * WEAPON_STATS.bow.dmg)).toBe(true);
          continue;
        }
        if (key === 'stun' || key === 'kb') {
          const hit = (x: typeof base) => { const e = goo(x.d, 1, x.st.x + 40, x.st.y, { hp: 999, mx: 999, awake: false, stun: 0, slamT: 999, cd: 999 }); run1(x.d, [x.a]); return key === 'stun' ? e.stun : Math.hypot(e.vx, e.vy); };
          if (key === 'stun') expect(hit(mod) - hit(base)).toBeCloseTo(val, 1);
          else expect(hit(mod) / hit(base)).toBeCloseTo(val, 1);
          continue;
        }
        if (key === 'dodge') {
          const dd = (x: typeof base) => { run1(x.d, [x.a]); x.a.lastDash = 1; x.a.dashT = 0.3; run1(x.d, [x.a]); return x.d.heroes.a.dodge; };
          expect(dd(mod) - dd(base)).toBeCloseTo(val, 1);
          continue;
        }
        if (key === 'wallT') {
          const wt = (x: typeof base) => { run1(x.d, [x.a], new Map([['a', 0]])); run1(x.d, [x.a], new Map([['a', 1]])); return x.d.heroes.a.wallT; };
          expect(wt(mod) - wt(base)).toBeCloseTo(val, 1);
          continue;
        }
        if (key === 'taunt') {
          // a goo between a tank (farther) and a rogue (nearer) goes for the tank only with the lure
          const d = quiet(newRun(33, { t: 'shield', r: 'sword' }));
          d.heroes.t.skills = h1.skills; d.heroes.t.atkCd = 1e9; d.heroes.r.atkCd = 1e9;
          const st = d.map.start;
          const e = goo(d, 0, st.x, st.y, { awake: true, stun: 0 });
          const t = body('t', st.x + 210, st.y), r = body('r', st.x - 60, st.y);
          run1(d, [t, r], undefined, 0.3);
          expect(e.x).toBeGreaterThan(st.x);
          continue;
        }
        if (key === 'spR') {
          expect(m1.spR / m0.spR).toBeCloseTo(val, 2);
          continue;
        }
        throw new Error('no check for ' + key);
      }
    });
  }

  it('skills: 6 per class, icons exist, every card shows numbers', () => {
    for (const c of ['rogue', 'healer', 'marksman', 'tank'] as const) {
      const ids = SKILLS.filter((k) => k.cls === c).map((k) => k.id);
      expect(ids).toHaveLength(6);
      for (const id of ids) { expect(id.startsWith(c + '-')).toBe(true); expect(N23).toContain(skillIcon(id)); }
    }
    for (const s of [...SKILLS, ...ITEMS]) {
      const lines = effectLines(s.mod);
      expect(lines.length).toBeGreaterThan(0);
      for (const l of lines) { expect(l.n).toBeGreaterThan(0); expect(KEYS).toContain(`dg.fx.${l.key}`); }
    }
    expect(itemOf('cape')).toBeUndefined(); // reach item removed (no clear effect)
  });

  it('hitboxes are the drawn goo: just inside the sprite hits, just outside misses (melee, bolt, contact)', () => {
    expect(ENEMY_R.slice(0, 3)).toEqual([16, 21, 47]);
    for (const kind of [0, 1, 2] as const) for (const w of ['sword', 'spear', 'bow'] as const) for (const [gap, hits] of [[-2, true], [2, false]] as [number, boolean][]) {
      const d = quiet(newRun(21, { a: w }));
      const st = d.map.start, a = body('a', st.x, st.y);
      const reach = w === 'bow' ? 60 : WEAPON_STATS[w].reach;
      if (w === 'bow') WEAPON_STATS.bow.reach = 60;
      goo(d, kind, st.x + reach + ENEMY_R[kind] + gap, st.y, { ...still, hp: 999, mx: 999 });
      d.heroes.a.fx = 1; d.heroes.a.fy = 0; d.heroes.a.inv = 99;
      const { fx } = run1(d, [a]);
      if (w === 'bow') WEAPON_STATS.bow.reach = 200;
      expect(fx.some((f) => f.t === 'swing'), `${w} vs goo ${kind} at gap ${gap}`).toBe(hits);
    }
    for (const kind of [0, 1, 2] as const) for (const [gap, hurts] of [[-1, true], [1, false]] as [number, boolean][]) {
      const d = quiet(newRun(22, { a: 'staff' }));
      const st = d.map.start, a = body('a', st.x, st.y);
      d.heroes.a.atkCd = 99;
      goo(d, kind, st.x, st.y + 17 + ENEMY_R[kind] + gap, { ...still, awake: true, hp: 999, mx: 999 });
      run1(d, [a]);
      expect(d.heroes.a.hp < CLASS_HP.healer, `contact goo ${kind} gap ${gap}`).toBe(hurts);
    }
  });

  it('i18n: every class, weapon, special, skill and item has a dg.* key in sv and en', () => {
    const keys = new Set<string>(KEYS);
    const camel = (id: string) => id.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
    for (const c of CLASSES) { expect(keys.has(`dg.class.${c}`)).toBe(true); expect(keys.has(`dg.classHint.${c}`)).toBe(true); }
    for (const w of WEAPONS) { expect(keys.has(`dg.weapon.${w}`), w).toBe(true); expect(keys.has(`dg.special.${w}`), w).toBe(true); }
    for (const k of SKILLS) expect(keys.has(`dg.skill.${camel(k.id)}`), k.id).toBe(true);
    for (const i of ITEMS) expect(keys.has(`dg.item.${i.id}`), i.id).toBe(true);
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

  it('no time limit underground (DUNGEON_TIMER_ENABLED off); snapshot round-trips', () => {
    const d = quiet(newRun(13, { a: 'spear' }));
    expect(DUNGEON_TIMER_ENABLED).toBe(false);
    d.time = 0.05;
    run1(d, [body('a', d.map.start.x, d.map.start.y)], undefined, 2);
    expect(d.done).toBe(0); // the clock no longer ends a run
    expect(d.time).toBe(0.05);
    d.why = 'time'; // (the snapshot still carries every end reason)
    d.heroes.a.hp = 37;
    goo(d, 3, 100, 100, { hp: 12 });
    d.spit.push({ id: 77, x: 5, y: 6, vx: 1, vy: 0, t: 1 });
    const v = dview(JSON.parse(JSON.stringify(dsnap(d, 13))));
    expect(v.why).toBe('time');
    expect(v.heroes.a.hp).toBe(37);
    expect(v.heroes.a.maxHp).toBe(CLASS_HP.rogue);
    expect(v.heroes.a.weapon).toBe('spear');
    expect(v.enemies[0]).toMatchObject({ kind: 3, hp: 12 });
    expect(v.spit).toEqual([{ id: 77, x: 5, y: 6 }]);
  });

  it('stairs: everyone on them 1.5 s goes down; the last floor exit needs the boss gone', () => {
    const d = quiet(newRun(10, { a: 'sword', b: 'sword' }));
    const go = (x: number, y: number, secs: number) => { const bs = [body('a', x, y), body('b', x + 5, y)]; return { bs, ...run1(d, bs, undefined, secs) }; };
    for (let fl = 2; fl <= FLOORS; fl++) {
      go(d.map.stairs.x, d.map.stairs.y, 1.6);
      expect(d.floor).toBe(fl);
      if (fl < FLOORS) quiet(d);
    }
    expect(d.enemies.some((e) => e.kind === 2)).toBe(true);
    d.enemies = d.enemies.filter((e) => e.kind === 2).map((e) => ({ ...e, stun: 999, slamT: 999, x: 40, y: 40 }));
    d.spit = [];
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
    expect(used.size).toBeGreaterThan(1);
  });

  it.skipIf(!DUNGEON_ENABLED)('the entrance leads to the next unlocked dungeon; beating the boss unlocks the next one, saved with the village', () => {
    const s = createState([P('a')], 12, { ...newVillage(), dungeon: 2 });
    expect(s.dungeon).toBe(2);
    const idle = new Map<string, Input>();
    Object.assign(s.players[0], { x: s.entrance.x, y: s.entrance.y, vx: 0, vy: 0 });
    for (let i = 0; i < 100; i++) step(s, idle, 1 / 60);
    pickWeapon(s, 'a', 'dagger');
    step(s, idle, 1 / 60);
    expect(s.mode).toBe('dungeon');
    expect(s.dg!.dungeon).toBe(2);
    s.dg!.done = 0.01; s.dg!.why = 'exit'; // leaving early does not unlock
    for (let i = 0; i < 10; i++) step(s, idle, 1 / 60);
    expect(s.mode).toBe('meadow');
    expect(s.dungeon).toBe(2);
    Object.assign(s.players[0], { x: s.entrance.x, y: s.entrance.y, vx: 0, vy: 0 });
    for (let i = 0; i < 100; i++) step(s, idle, 1 / 60);
    pickWeapon(s, 'a', 'dagger');
    step(s, idle, 1 / 60);
    s.dg!.done = 0.01; s.dg!.why = 'boss';
    for (let i = 0; i < 10; i++) step(s, idle, 1 / 60);
    expect(s.dungeon).toBe(3);
    expect(villageOf(s).dungeon).toBe(3);
    expect(cleanVillage(JSON.parse(JSON.stringify(villageOf(s)))).dungeon).toBe(3);
    expect(cleanVillage({ ...newVillage(), dungeon: 'x' }).dungeon).toBe(1);
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
    // no pick timer (PICK_TIMER_ENABLED off): b may take its time, nobody is pushed down unpicked
    expect(PICK_TIMER_ENABLED).toBe(false);
    for (let i = 0; i < 60 * 40; i++) step(s, idle, 1 / 60);
    expect(s.mode).toBe('pick');
    pickWeapon(s, 'b', 'spear');
    pickWeapon(s, 'b', 'laser'); // ignored
    step(s, idle, 1 / 60);
    expect(s.mode).toBe('dungeon');
    expect(s.dg!.heroes.a.weapon).toBe('hammer');
    const t = s.time;
    for (let i = 0; i < 120; i++) step(s, idle, 1 / 60);
    expect(s.time).toBe(t);
    const v = viewFromSnapshot(JSON.parse(JSON.stringify(snapshot(s))));
    expect(v.mode).toBe('dungeon');
    expect(v.dungeon!.heroes.a.weapon).toBe('hammer');
  });
});
