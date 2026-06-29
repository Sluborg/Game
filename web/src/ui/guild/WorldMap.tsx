// Visual world map for the Asset Report guild screen. Renders dev's WorldGraph as
// an illuminated fantasy map: medallion nodes (emblem by kind), danger-coloured
// roads (from each edge's encounterChance), and hero tokens travelling their
// dispatch routes. Clicking a reachable quest node picks it as the destination.
//
// Read-only over GuildState + the pure selectors/graph helpers; the only output is
// onPickDestination. SVG draws roads + route + travel arrows; an HTML overlay draws
// the node medallions and hero tokens (crisp under viewBox scaling).

import { edgeBetween, shortestPath } from "../../game/guild/graph";
import { monsterDef } from "../../game/monsters";
import {
  activeDispatches,
  currentNode,
  nodeById,
  questDestinations,
  remainingTurns,
} from "../../game/guild/selectors";
import type { GuildState } from "../../game/guild/state";
import type { Dispatch, MapNode, NodeId } from "../../game/guild/types";
import {
  DANGER_COLOR,
  DANGER_DASH,
  dangerFromEncounter,
  dangerWord,
  type DangerLevel,
} from "./danger";
import { Icon, type GuildIconKey } from "./icons";

const VB_W = 100;
const VB_H = 70;
const leftPct = (x: number) => x;
const topPct = (y: number) => (y / VB_H) * 100;

interface Pt {
  x: number;
  y: number;
}

function nodePt(n: MapNode): Pt {
  return { x: n.x ?? 50, y: n.y ?? 35 };
}

function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

const KIND_ICON: Record<NonNullable<MapNode["kind"]>, GuildIconKey> = {
  town: "town",
  wild: "wild",
  ruin: "ruin",
  dungeon: "dungeon",
};

function dispatchPoint(state: GuildState, d: Dispatch): Pt {
  const here = nodeById(state, currentNode(d));
  const nextId = d.path[Math.min(d.stepIndex + 1, d.path.length - 1)];
  const next = nodeById(state, nextId);
  if (!here) return { x: 50, y: 35 };
  if (!next || next.id === here.id) return nodePt(here);
  const edge = edgeBetween(state.graph, here.id, next.id);
  const total = edge ? edge.travelTurns : 1;
  const raw = total > 0 ? (total - d.legTurnsLeft) / total : 0;
  const vprog = 0.22 + 0.56 * Math.max(0, Math.min(1, raw)); // never sits on a node
  return lerp(nodePt(here), nodePt(next), vprog);
}

interface Props {
  state: GuildState;
  selectedDest: NodeId | "";
  onPickDestination: (id: NodeId) => void;
}

export function WorldMap({ state, selectedDest, onPickDestination }: Props) {
  const originId = state.originNodeId;
  const quests = questDestinations(state); // reachable quest nodes + eta
  const etaByNode = new Map(quests.map((q) => [q.node.id, q.etaTurns]));
  const reachable = new Set(quests.map((q) => q.node.id));
  const dispatches = activeDispatches(state);

  // Planned route to the currently-selected destination (origin -> dest).
  const routeEdges = new Set<string>();
  if (selectedDest) {
    const r = shortestPath(state.graph, originId, selectedDest);
    for (let i = 0; i < r.path.length - 1; i++) {
      routeEdges.add([r.path[i], r.path[i + 1]].sort().join("|"));
    }
  }
  const edgeKey = (a: string, b: string) => [a, b].sort().join("|");

  return (
    <div className="worldmap">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none">
        <defs>
          <marker
            id="wm-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10 z" fill="context-stroke" />
          </marker>
        </defs>

        {/* Roads, coloured by danger */}
        {state.graph.edges.map((edge) => {
          const a = nodeById(state, edge.from);
          const b = nodeById(state, edge.to);
          if (!a || !b) return null;
          const pa = nodePt(a);
          const pb = nodePt(b);
          const danger = dangerFromEncounter(edge.encounterChance);
          const onRoute = routeEdges.has(edgeKey(edge.from, edge.to));
          const mon = edge.encounterMonster ? monsterDef(edge.encounterMonster).displayName : "the road";
          return (
            <g key={`${edge.from}-${edge.to}`}>
              <line
                x1={pa.x}
                y1={pa.y}
                x2={pb.x}
                y2={pb.y}
                className={`wm-road${onRoute ? " on-route" : ""}`}
                stroke={DANGER_COLOR[danger]}
                strokeDasharray={DANGER_DASH[danger]}
              >
                <title>{`${dangerWord(danger)} road · ${edge.travelTurns} turn${edge.travelTurns === 1 ? "" : "s"} · ${mon}`}</title>
              </line>
              {onRoute && (
                <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} className="wm-road-route" />
              )}
            </g>
          );
        })}

        {/* Hero travel arrows: from the node just left toward the token */}
        {dispatches.map((d) => {
          const here = nodeById(state, currentNode(d));
          if (!here) return null;
          const p = dispatchPoint(state, d);
          const edge = edgeBetween(
            state.graph,
            here.id,
            d.path[Math.min(d.stepIndex + 1, d.path.length - 1)],
          );
          const danger = edge ? dangerFromEncounter(edge.encounterChance) : (1 as DangerLevel);
          const o = nodePt(here);
          return (
            <line
              key={`arrow-${d.id}`}
              x1={o.x}
              y1={o.y}
              x2={p.x}
              y2={p.y}
              className="wm-travel-arrow"
              stroke={DANGER_COLOR[danger]}
              markerEnd="url(#wm-arrow)"
            />
          );
        })}
      </svg>

      {/* Node medallions */}
      {state.graph.nodes.map((node) => {
        const p = nodePt(node);
        const isOrigin = node.id === originId;
        const isReachableQuest = reachable.has(node.id);
        const isSelected = node.id === selectedDest;
        const eta = etaByNode.get(node.id);
        const classes =
          "wm-node" +
          (isOrigin ? " origin" : "") +
          (isReachableQuest ? " quest" : "") +
          (isSelected ? " selected" : "");
        return (
          <button
            type="button"
            key={node.id}
            className={classes}
            style={{ left: `${leftPct(p.x)}%`, top: `${topPct(p.y)}%` }}
            disabled={!isReachableQuest}
            onClick={() => isReachableQuest && onPickDestination(node.id)}
            title={
              isOrigin
                ? `${node.name} — the guild seat`
                : node.questMonster
                  ? `${node.name} — ${monsterDef(node.questMonster).displayName}×${node.questCount ?? 1}${
                      eta != null ? ` · ~${eta} turns` : " · unreachable"
                    }`
                  : node.name
            }
          >
            <span className="wm-medallion">
              <Icon name={isOrigin ? "origin" : KIND_ICON[node.kind ?? "wild"]} size={24} />
            </span>
            <span className="wm-node-label">{node.name}</span>
            {isReachableQuest && eta != null && <span className="wm-node-eta">~{eta}t</span>}
          </button>
        );
      })}

      {/* Hero tokens travelling their routes */}
      {dispatches.map((d) => {
        const p = dispatchPoint(state, d);
        const hero = state.heroes.find((h) => h.id === d.heroId);
        const dest = nodeById(state, d.destNodeId);
        return (
          <div
            key={`tok-${d.id}`}
            className="wm-token"
            style={{ left: `${leftPct(p.x)}%`, top: `${topPct(p.y)}%` }}
            title={`${hero?.name ?? "Hero"} → ${dest?.name ?? d.destNodeId} (~${remainingTurns(state, d)}t)${
              d.agentId ? " · shadowed" : ""
            }`}
          >
            <span className="wm-token-label">
              → {dest?.name ?? d.destNodeId} ~{remainingTurns(state, d)}t
            </span>
            <span className="wm-token-badge">
              <Icon name="hero" size={15} />
            </span>
          </div>
        );
      })}
    </div>
  );
}
