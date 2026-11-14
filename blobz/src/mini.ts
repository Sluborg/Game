// "Bärregn": a 40 s co-op mini game between rounds (after sunset, before "Spela igen"). Berries and bombs
// fall into a fenced field; a berry that lands on a blob goes into the team basket, a bomb stuns nearby
// blobz for a second. Team goal = a bar with 1-3 stars; every caught berry goes into the village bank.
// Pure TypeScript, run by the host inside the normal sim (sim.ts phase 'mini').

export const MINI_SECONDS = 40;
/** A picture intro (berry on blob = good, bomb = dizzy) before the rain; the clock starts at MINI_SECONDS + this. */
export const MINI_INTRO = 2.5;
/** The field, centred on the base (world px). The sim keeps blobz inside it; nothing else runs meanwhile. */
export const ARENA = { x0: 360, y0: 300, x1: 920, y1: 680 };
export const DROP_HEIGHT = 220; // px above the ground when an item appears
export const FALL_SECONDS = 1.6; // its shadow (or the red ring for a bomb) shows where it lands
export const CATCH_R = 30; // a blob centre this close to the landing point catches it
export const BOMB_R = 64; // a bomb stuns blobz this close
export const STUN_SECONDS = 1;
const BLOB_R = 17;

export type Drop = { id: number; kind: 'berry' | 'bomb'; x: number; y: number; z: number };
export interface Mini {
  t: number; // seconds left
  caught: number;
  goal: [number, number, number]; // berries for 1, 2, 3 stars
  drops: Drop[];
  stun: Record<string, number>; // seconds left per stunned blob
  berryT: number; bombT: number; // spawn timers
  nextId: number;
}
export type MiniFx =
  | { t: 'catch'; x: number; y: number }
  | { t: 'miss'; x: number; y: number }
  | { t: 'boom'; x: number; y: number }
  | { t: 'stun'; id: string };

/** Drops per second for n players (more blobz, more rain) and the star thresholds that go with it. */
export const berryRate = (n: number) => 1.1 + 0.45 * Math.max(1, Math.min(5, n));
export const bombRate = (n: number) => 0.35 + 0.08 * Math.max(1, Math.min(5, n));
export function miniGoal(n: number): [number, number, number] {
  const total = berryRate(n) * (MINI_SECONDS - FALL_SECONDS);
  return [Math.round(total * 0.25), Math.round(total * 0.45), Math.round(total * 0.65)];
}
export const miniStars = (m: { caught: number; goal: [number, number, number] }) => m.goal.filter((g) => m.caught >= g).length;

export function newMini(players: number): Mini {
  return { t: MINI_SECONDS + MINI_INTRO, caught: 0, goal: miniGoal(players), drops: [], stun: {}, berryT: MINI_INTRO + 0.5, bombT: MINI_INTRO + 3, nextId: 1 };
}

interface Body { id: string; x: number; y: number; vx: number; vy: number }

/** Keep a blob inside the field (soft bounce on the fence). */
export function keepInArena(p: Body) {
  const a = ARENA;
  if (p.x < a.x0 + BLOB_R) { p.x = a.x0 + BLOB_R; p.vx = Math.abs(p.vx) * 0.5; }
  if (p.x > a.x1 - BLOB_R) { p.x = a.x1 - BLOB_R; p.vx = -Math.abs(p.vx) * 0.5; }
  if (p.y < a.y0 + BLOB_R) { p.y = a.y0 + BLOB_R; p.vy = Math.abs(p.vy) * 0.5; }
  if (p.y > a.y1 - BLOB_R) { p.y = a.y1 - BLOB_R; p.vy = -Math.abs(p.vy) * 0.5; }
}

/** One mini-game tick after the blobz moved. `rand` is injectable for tests. Returns true when time is up. */
export function stepMini(m: Mini, bodies: Body[], dt: number, fx: MiniFx[], rand = Math.random): boolean {
  m.t = Math.max(0, m.t - dt);
  for (const id in m.stun) { m.stun[id] -= dt; if (m.stun[id] <= 0) delete m.stun[id]; }
  // rain (stops shortly before the end so every drop can still land)
  const n = bodies.length;
  const raining = m.t > FALL_SECONDS;
  const spawn = (kind: Drop['kind']) => {
    const a = ARENA, pad = 30;
    m.drops.push({ id: m.nextId++, kind, x: a.x0 + pad + rand() * (a.x1 - a.x0 - 2 * pad), y: a.y0 + pad + rand() * (a.y1 - a.y0 - 2 * pad), z: DROP_HEIGHT });
  };
  if (raining && (m.berryT -= dt) <= 0) { spawn('berry'); m.berryT = (0.6 + rand() * 0.8) / berryRate(n); }
  if (raining && (m.bombT -= dt) <= 0) { spawn('bomb'); m.bombT = (0.6 + rand() * 0.8) / bombRate(n); }
  // falling + landing
  for (let i = m.drops.length - 1; i >= 0; i--) {
    const d = m.drops[i];
    d.z -= (DROP_HEIGHT / FALL_SECONDS) * dt;
    if (d.z > 0) continue;
    m.drops.splice(i, 1);
    if (d.kind === 'berry') {
      const catcher = bodies.find((b) => !m.stun[b.id] && Math.hypot(b.x - d.x, b.y - d.y) < CATCH_R);
      if (catcher) { m.caught++; fx.push({ t: 'catch', x: d.x, y: d.y }); } else fx.push({ t: 'miss', x: d.x, y: d.y });
    } else {
      fx.push({ t: 'boom', x: d.x, y: d.y });
      for (const b of bodies) {
        if (Math.hypot(b.x - d.x, b.y - d.y) >= BOMB_R) continue;
        if (!m.stun[b.id]) fx.push({ t: 'stun', id: b.id });
        m.stun[b.id] = STUN_SECONDS;
        const dx = b.x - d.x, dy = b.y - d.y, dl = Math.hypot(dx, dy) || 1;
        b.vx = (dx / dl) * 180; b.vy = (dy / dl) * 180; // a little puff away from the blast
      }
    }
  }
  return m.t <= 0;
}
