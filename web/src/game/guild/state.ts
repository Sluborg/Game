// Guild state: the player-facing world the Asset Report sim runs on. Pure
// constructors + dispatch helpers; the turn loop lives in turnEngine.ts.

import { HP_PER_LEVEL } from "../constants";
import { baseMaxHpForClass } from "../heroes";
import type { HeroClass, NodeId } from "./types";
import type { Agent, Dispatch, Hero, WorldGraph } from "./types";
import { edgeBetween, shortestPath } from "./graph";
import { ORIGIN_NODE, TEST_WORLD } from "./mapData";

export interface GuildState {
  turn: number;
  /** Base RNG seed; combined with turn + dispatch ids for per-stream rolls. */
  seed: number;
  /** True treasury (player sees claimed gold per report; this is the real sum). */
  gold: number;
  graph: WorldGraph;
  heroes: Hero[];
  agents: Agent[];
  dispatches: Dispatch[];
  nextDispatchId: number;
  /** Node every dispatch departs from (the guild seat). */
  originNodeId: NodeId;
}

function maxHpFor(heroClass: HeroClass, level: number): number {
  return baseMaxHpForClass(heroClass) + (level - 1) * HP_PER_LEVEL;
}

export function createGuildHero(
  id: string,
  name: string,
  heroClass: HeroClass,
  level: number,
  trust: number,
): Hero {
  const maxHp = maxHpFor(heroClass, level);
  return {
    id,
    name,
    stats: { level, heroClass, maxHp, hp: maxHp, experience: 0 },
    trust: Math.max(0, Math.min(100, trust)),
  };
}

export function createAgent(id: string, name: string, quality: number): Agent {
  return { id, name, quality: Math.max(0, Math.min(100, quality)), alive: true };
}

/** A fresh guild: a small roster, a few agents, the test world. */
export function createInitialGuildState(seed = 0x5eed): GuildState {
  return {
    turn: 0,
    seed: seed >>> 0,
    gold: 0,
    graph: TEST_WORLD,
    originNodeId: ORIGIN_NODE,
    heroes: [
      createGuildHero("h1", "Gunter", "WARRIOR", 3, 80),
      createGuildHero("h2", "Sylva", "RANGER", 2, 55),
      createGuildHero("h3", "Morwen", "WIZARD", 2, 30),
      createGuildHero("h4", "Shade", "ROGUE", 4, 15),
    ],
    agents: [
      createAgent("a1", "Quill the Honest", 85),
      createAgent("a2", "Bram Ledger", 55),
      createAgent("a3", "Crooked Pip", 25),
    ],
    dispatches: [],
    nextDispatchId: 1,
  };
}

/** True if the hero has been lost in the field (a dispatch ended `lost`). */
export function isHeroLost(state: GuildState, heroId: string): boolean {
  return state.dispatches.some((d) => d.heroId === heroId && d.status === "lost");
}

/**
 * True if the hero can be dispatched: alive (HP > 0), not lost in the field,
 * and not already out on an active (traveling) dispatch. A hero who "did not
 * return" or was wiped (HP 0) must NOT read as idle.
 */
export function isHeroAvailable(state: GuildState, heroId: string): boolean {
  const hero = state.heroes.find((h) => h.id === heroId);
  if (!hero || hero.stats.hp <= 0) return false;
  if (isHeroLost(state, heroId)) return false;
  return !state.dispatches.some(
    (d) => d.heroId === heroId && d.status === "traveling",
  );
}

/** True if the agent is alive and not already attached to an active dispatch. */
export function isAgentAvailable(state: GuildState, agentId: string): boolean {
  const agent = state.agents.find((a) => a.id === agentId);
  if (!agent || !agent.alive) return false;
  return !state.dispatches.some(
    (d) => d.agentId === agentId && d.status === "traveling",
  );
}

/**
 * Send a hero (optionally with an agent) from the origin to `destNodeId`.
 * Returns the new state, or the original state unchanged if the move is
 * invalid (unknown hero, hero busy, agent busy, unreachable destination).
 */
export function dispatchHero(
  state: GuildState,
  heroId: string,
  destNodeId: NodeId,
  agentId: string | null,
): GuildState {
  const hero = state.heroes.find((h) => h.id === heroId);
  if (!hero) return state;
  if (!isHeroAvailable(state, heroId)) return state;
  if (agentId && !isAgentAvailable(state, agentId)) return state;

  const route = shortestPath(state.graph, state.originNodeId, destNodeId);
  if (route.unreachable) return state;

  const firstEdge =
    route.path.length > 1 ? edgeBetween(state.graph, route.path[0], route.path[1]) : undefined;
  const firstEdgeTurns = firstEdge ? firstEdge.travelTurns : 0;

  const dispatch: Dispatch = {
    id: `d${state.nextDispatchId}`,
    heroId,
    agentId: agentId ?? null,
    destNodeId,
    path: route.path,
    stepIndex: 0,
    legTurnsLeft: firstEdgeTurns,
    status: "traveling",
    startedTurn: state.turn,
    log: [],
  };

  return {
    ...state,
    dispatches: [...state.dispatches, dispatch],
    nextDispatchId: state.nextDispatchId + 1,
  };
}
