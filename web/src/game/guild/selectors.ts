// Pure read-side helpers for the UI. No state mutation.

import { edgeBetween, shortestPath, travelTurnsOf } from "./graph";
import type { GuildState } from "./state";
import type { Agent, Dispatch, DispatchEvent, Hero, MapNode } from "./types";

export function heroById(state: GuildState, id: string): Hero | undefined {
  return state.heroes.find((h) => h.id === id);
}

export function agentById(state: GuildState, id: string | null): Agent | undefined {
  return id ? state.agents.find((a) => a.id === id) : undefined;
}

export function nodeById(state: GuildState, id: string): MapNode | undefined {
  return state.graph.nodes.find((n) => n.id === id);
}

/** Quest destinations reachable from the origin, with their ETA in turns. */
export function questDestinations(
  state: GuildState,
): Array<{ node: MapNode; etaTurns: number }> {
  const out: Array<{ node: MapNode; etaTurns: number }> = [];
  for (const node of state.graph.nodes) {
    if (node.id === state.originNodeId) continue;
    if (!node.questMonster) continue;
    const route = shortestPath(state.graph, state.originNodeId, node.id);
    if (route.unreachable) continue;
    out.push({ node, etaTurns: route.travelTurns });
  }
  return out.sort((a, b) => a.etaTurns - b.etaTurns);
}

/** Travel-turns still remaining before a dispatch reaches its destination. */
export function remainingTurns(state: GuildState, d: Dispatch): number {
  if (d.status !== "traveling") return 0;
  let total = d.legTurnsLeft;
  for (let i = d.stepIndex + 1; i < d.path.length - 1; i++) {
    const e = edgeBetween(state.graph, d.path[i], d.path[i + 1]);
    total += e ? e.travelTurns : 0;
  }
  return total;
}

/** Total travel-turns of a dispatch's whole route. */
export function totalTurns(state: GuildState, d: Dispatch): number {
  return travelTurnsOf(state.graph, d.path);
}

/** The node a traveling dispatch is currently nearest to (its last node). */
export function currentNode(d: Dispatch): string {
  return d.path[Math.min(d.stepIndex, d.path.length - 1)];
}

export interface ReportRow {
  dispatch: Dispatch;
  hero: Hero | undefined;
  event: DispatchEvent;
}

/** Every report produced on a given turn, newest dispatches last. */
export function reportsForTurn(state: GuildState, turn: number): ReportRow[] {
  const rows: ReportRow[] = [];
  for (const d of state.dispatches) {
    for (const event of d.log) {
      if (event.turn === turn) {
        rows.push({ dispatch: d, hero: heroById(state, d.heroId), event });
      }
    }
  }
  return rows;
}

/** Active (still traveling) dispatches. */
export function activeDispatches(state: GuildState): Dispatch[] {
  return state.dispatches.filter((d) => d.status === "traveling");
}

/** The most recent turn on which any report was filed, or 0 if none yet. */
export function latestReportTurn(state: GuildState): number {
  let max = 0;
  for (const d of state.dispatches) {
    for (const e of d.log) if (e.turn > max) max = e.turn;
  }
  return max;
}
