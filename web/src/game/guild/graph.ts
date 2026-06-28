// World-graph helpers: adjacency, BFS shortest-path, edge lookup.
//
// The graph is UNDIRECTED — an edge {from,to} is walkable both ways. BFS gives
// the fewest-hops path (classic unweighted shortest path); the returned
// `travelTurns` is the SUM of edge.travelTurns along that path (the ETA), not a
// weighted Dijkstra cost. This matches the spec ("BFS shortest-path returning
// the node path and total travel turns").

import type { Edge, NodeId, PathResult, WorldGraph } from "./types";

/** All nodes directly reachable from `id`, with the connecting edge. */
export function neighbors(graph: WorldGraph, id: NodeId): Array<{ node: NodeId; edge: Edge }> {
  const out: Array<{ node: NodeId; edge: Edge }> = [];
  for (const e of graph.edges) {
    if (e.from === id) out.push({ node: e.to, edge: e });
    else if (e.to === id) out.push({ node: e.from, edge: e });
  }
  return out;
}

/** The edge connecting two adjacent nodes, or undefined if none. */
export function edgeBetween(graph: WorldGraph, a: NodeId, b: NodeId): Edge | undefined {
  return graph.edges.find(
    (e) => (e.from === a && e.to === b) || (e.from === b && e.to === a),
  );
}

export function hasNode(graph: WorldGraph, id: NodeId): boolean {
  return graph.nodes.some((n) => n.id === id);
}

/** Sum of edge travel-turns along a node path. 0 for a 0/1-length path. */
export function travelTurnsOf(graph: WorldGraph, path: NodeId[]): number {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const e = edgeBetween(graph, path[i], path[i + 1]);
    total += e ? e.travelTurns : 0;
  }
  return total;
}

/**
 * BFS shortest path (fewest hops) from `start` to `dest`.
 * - same node            -> { path:[start], travelTurns:0 }
 * - unknown / unreachable -> { path:[], travelTurns:0, unreachable:true }
 */
export function shortestPath(graph: WorldGraph, start: NodeId, dest: NodeId): PathResult {
  if (!hasNode(graph, start) || !hasNode(graph, dest)) {
    return { path: [], travelTurns: 0, unreachable: true };
  }
  if (start === dest) {
    return { path: [start], travelTurns: 0, unreachable: false };
  }

  const prev = new Map<NodeId, NodeId>();
  const visited = new Set<NodeId>([start]);
  const queue: NodeId[] = [start];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const { node } of neighbors(graph, cur)) {
      if (visited.has(node)) continue;
      visited.add(node);
      prev.set(node, cur);
      if (node === dest) {
        // Reconstruct.
        const path: NodeId[] = [dest];
        let step: NodeId | undefined = dest;
        while (step !== undefined && step !== start) {
          step = prev.get(step);
          if (step !== undefined) path.unshift(step);
        }
        return { path, travelTurns: travelTurnsOf(graph, path), unreachable: false };
      }
      queue.push(node);
    }
  }

  return { path: [], travelTurns: 0, unreachable: true };
}
