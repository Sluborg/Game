import { describe, expect, it } from 'vitest';
import {
  BASE, createState, makeTrees, NODE_HITS, NODE_REGROW, NODE_YIELD, nodeTool, OBSTACLE_R, snapshot, starsFor, step,
  toolNode, viewFromSnapshot, questTargets, type Input, type State,
} from './sim';

const P = (id: string) => ({ id, name: id, color: 0x5ec8ff, shape: 0, eyes: 0, mouth: 0, hat: 0 });
/** One player next to node i, pressing the action button `hits` times (with tool cooldown in between). */
function swing(s: State, i: number, hits: number) {
  const t = s.trees[i], p = s.players[0];
  const off = (t.kind === 5 ? 0 : OBSTACLE_R[t.kind]) + 20;
  p.x = t.x + off; p.y = t.y; p.vx = 0; p.vy = 0;
  for (let h = 0; h < hits; h++) {
    p.lastDash = h; // the next press is a new counter value
    step(s, new Map<string, Input>([['a', { x: 0, y: 0, dash: h + 1 }]]), 1 / 60);
    for (let k = 0; k < 20; k++) { p.x = t.x + off; p.y = t.y; p.vx = 0; p.vy = 0; step(s, new Map([['a', { x: 0, y: 0, dash: h + 1 }]]), 1 / 60); }
  }
}
/** Kinds of everything dropped so far: on the ground or already picked up. */
const got = (s: State) => [...s.items.map((it) => it.kind), ...s.players.flatMap((p) => p.carry)];
const reset = (s: State) => { s.items = []; s.players.forEach((p) => { p.carry = []; }); };
const nodeOf = (s: State, kind: (k: number) => boolean) => s.trees.findIndex((t) => kind(t.kind));

describe('gathering with tools', () => {
  it('no items spawn on their own: the map starts empty and stays empty without tools', () => {
    const s = createState([P('a')], 1);
    expect(s.items).toHaveLength(0);
    for (let i = 0; i < 600; i++) step(s, new Map(), 1 / 30);
    expect(s.items).toHaveLength(0);
  });

  it('every map has trees, stones and several berry bushes', () => {
    for (const seed of [1, 2, 3, 99, 12345]) {
      const kinds = makeTrees(seed).filter((t) => t.x < 1280).map((t) => nodeTool(t.kind)); // main meadow
      expect(kinds.filter((k) => k === 'axe').length).toBeGreaterThan(8);
      expect(kinds.filter((k) => k === 'pickaxe').length).toBeGreaterThan(2);
      expect(kinds.filter((k) => k === 'rake').length).toBe(8);
    }
  });

  it('axe: 3 hits drop 1 wood, 3 wood per tree, then a stump that regrows after 25 s', () => {
    const s = createState([P('a')], 3);
    // a tree with no other node within reach, so a used-up stump really leaves nothing to hit
    const i = s.trees.findIndex((t, j) => t.kind < 3 && s.trees.every((o, k) => k === j || Math.hypot(o.x - t.x, o.y - t.y) > 110));
    swing(s, i, NODE_HITS[0] - 1);
    expect(got(s)).toHaveLength(0);
    swing(s, i, 1);
    expect(got(s)).toEqual(['wood']);
    reset(s);
    swing(s, i, 3 * 2);
    expect(s.trees[i].left).toBe(0);
    expect(got(s)).toEqual(['wood', 'wood']);
    reset(s);
    swing(s, i, 3); // a stump gives nothing, the button dashes instead
    expect(got(s)).toHaveLength(0);
    for (let k = 0; k < 22 * 10; k++) step(s, new Map(), 1 / 10);
    expect(s.trees[i].left).toBe(0);
    for (let k = 0; k < 4 * 10; k++) step(s, new Map(), 1 / 10);
    expect(s.trees[i].left).toBe(3);
  });

  it('yields and hits per node: rock 3 hits x 2 stone, boulder 4 hits x 4, bush 2 hits x 3 berries', () => {
    expect([NODE_HITS[3], NODE_YIELD[3], NODE_REGROW[3]]).toEqual([3, 2, 30]);
    expect([NODE_HITS[4], NODE_YIELD[4], NODE_REGROW[4]]).toEqual([4, 4, 40]);
    expect([NODE_HITS[5], NODE_YIELD[5], NODE_REGROW[5]]).toEqual([2, 3, 20]);
    const s = createState([P('a')], 4);
    const rock = nodeOf(s, (k) => k === 3);
    swing(s, rock, 3);
    expect(got(s)).toEqual(['stone']);
    swing(s, rock, 3);
    expect(s.trees[rock].left).toBe(0); // rubble after 2 stone
    reset(s);
    const bush = nodeOf(s, (k) => k === 5);
    swing(s, bush, 2);
    expect(got(s)).toEqual(['berry']);
  });

  it('berry bushes are not solid, trees are', () => {
    const s = createState([P('a')], 8);
    const bush = s.trees[nodeOf(s, (k) => k === 5)];
    const p = s.players[0];
    Object.assign(p, { x: bush.x, y: bush.y, vx: 0, vy: 0 });
    step(s, new Map(), 1 / 60);
    expect(Math.hypot(p.x - bush.x, p.y - bush.y)).toBeLessThan(2);
    const tree = s.trees[nodeOf(s, (k) => k < 3)];
    Object.assign(p, { x: tree.x + 2, y: tree.y, vx: 0, vy: 0 });
    step(s, new Map(), 1 / 60);
    expect(Math.hypot(p.x - tree.x, p.y - tree.y)).toBeGreaterThan(20);
  });

  it('the action button only uses a tool near a node; elsewhere it dashes', () => {
    const s = createState([P('a')], 5);
    const t = s.trees[0];
    expect(toolNode(s.trees, () => 3, t.x + OBSTACLE_R[t.kind] + 20, t.y)).toBe(0);
    expect(toolNode(s.trees, () => 0, t.x + OBSTACLE_R[t.kind] + 20, t.y)).toBe(-1);
    const p = s.players[0];
    p.x = BASE.x; p.y = BASE.y + 60; p.vx = 0; p.vy = 0;
    step(s, new Map([['a', { x: 1, y: 0, dash: 1 }]]), 1 / 60);
    expect(p.dashT).toBeGreaterThan(0);
  });

  it('quest targets: 10/6/5 for 1-2 players, x(1 + 0.35*(n-2)) rounded up for 3-5', () => {
    expect(questTargets(1)).toEqual({ wood: 10, stone: 6, berry: 5 });
    expect(questTargets(3)).toEqual({ wood: 14, stone: 9, berry: 7 });
    expect(questTargets(5)).toEqual({ wood: 21, stone: 13, berry: 11 });
  });

  it('quest stars count finished bars; nodes survive the snapshot', () => {
    const s = createState([P('a'), P('b')], 6);
    s.delivered = { wood: 10, stone: 6, berry: 1 };
    expect(starsFor(s.delivered, s.quest)).toBe(2);
    s.trees[2].left = 0;
    const v = viewFromSnapshot(JSON.parse(JSON.stringify(snapshot(s))));
    expect(v.nodes[2]).toBe(0);
    expect(v.nodes).toHaveLength(s.trees.length);
    expect(v.delivered).toEqual(s.delivered);
    expect(v.quest).toEqual(s.quest);
  });
});
