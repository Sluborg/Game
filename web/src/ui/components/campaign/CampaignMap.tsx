// The campaign map. SVG renders the paths (danger-colored) and the "just sent"
// arrows; an absolutely-positioned HTML overlay renders the node medallions and the
// agent tokens, so emblems + portraits stay crisp under viewBox scaling.
//
// Coordinate model: the SVG viewBox is 100 x 70 and the container is locked to that
// aspect ratio, so an (x, y) in viewBox units maps to (x%, y/70*100%) of the box.

import { edgesFrom, findNode, otherEnd } from "../../../game/campaign/data";
import type {
  Agent,
  CampaignState,
  DangerLevel,
  MapNode,
  NodeId,
} from "../../../game/campaign/types";
import { DANGER_COLOR, DANGER_DASH, dangerLabel, dangerWord } from "./danger";
import { AgentPiece } from "./AgentPiece";
import { Icon } from "./icons";

const VB_W = 100;
const VB_H = 70;

const leftPct = (x: number) => (x / VB_W) * 100;
const topPct = (y: number) => (y / VB_H) * 100;

interface Props {
  state: CampaignState;
  selectedAgentId: number | null;
  onSelectAgent: (id: number | null) => void;
  onMove: (agentId: number, edgeId: string) => void;
}

interface Pt {
  x: number;
  y: number;
}

// Visual progress along a path: never sits exactly on a node, so a freshly sent
// agent visibly steps onto the path and its origin->agent arrow is visible.
function visualProgress(remaining: number, cost: number): number {
  const p = 1 - remaining / cost;
  return 0.22 + 0.56 * p;
}

function agentPoint(state: CampaignState, agent: Agent, indexAtNode: number, countAtNode: number): Pt {
  if (agent.location.kind === "transit") {
    const o = findNode(state, agent.location.origin)!;
    const d = findNode(state, agent.location.destination)!;
    const p = visualProgress(agent.location.remainingTurns, costOf(state, agent.location.edgeId));
    return { x: o.x + (d.x - o.x) * p, y: o.y + (d.y - o.y) * p };
  }
  const n = findNode(state, agent.location.nodeId)!;
  const spread = 10; // wider so the larger tokens don't overlap at a node
  const dx = (indexAtNode - (countAtNode - 1) / 2) * spread;
  return { x: n.x + dx, y: n.y + 10 };
}

// A point a fraction `t` along A→B (used to place a direction arrow toward the
// destination on a selectable path).
function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function costOf(state: CampaignState, edgeId: string): number {
  return state.edges.find((e) => e.id === edgeId)?.turnCost ?? 1;
}

// Danger-label position: the edge midpoint nudged perpendicular to the path, away
// from the map center, so labels don't collide with node names.
const CENTER: Pt = { x: 55, y: 35 };
function labelPoint(a: Pt, b: Pt): Pt {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len;
  let ny = dx / len;
  // Point the normal away from the map center.
  if ((mid.x - CENTER.x) * nx + (mid.y - CENTER.y) * ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  const k = 4.5;
  return { x: mid.x + nx * k, y: mid.y + ny * k };
}

function statusFor(state: CampaignState, agent: Agent): string {
  if (agent.location.kind === "transit") {
    return `→ ${findNode(state, agent.location.destination)?.name ?? ""}`;
  }
  if (agent.currentAction === "IDLE") return "";
  // Compact label (drop the leading verb words for the bubble).
  return ACTION_SHORT[agent.currentAction] ?? "";
}

const ACTION_SHORT: Record<string, string> = {
  QUESTS: "Quests",
  RUMORS: "Rumors",
  RELATIONS: "Relations",
  BUSINESS: "Business",
  RECRUIT: "Recruit",
  GUILD_HALL: "Guild Hall",
  TRAIN: "Training",
};

export function CampaignMap({ state, selectedAgentId, onSelectAgent, onMove }: Props) {
  const selected = state.agents.find((a) => a.id === selectedAgentId) ?? null;
  const selectedNode: NodeId | null =
    selected && selected.location.kind === "node" ? selected.location.nodeId : null;
  const reachableEdges = selectedNode ? edgesFrom(state, selectedNode) : [];
  const selectableEdgeIds = new Set(reachableEdges.map((e) => e.id));
  const reachableNodeIds = new Set(
    selectedNode ? reachableEdges.map((e) => otherEnd(e, selectedNode)) : [],
  );

  // Order agents per node so multiple tokens at one node don't overlap.
  const order = new Map<number, { idx: number; count: number }>();
  const byNode = new Map<NodeId, Agent[]>();
  for (const a of state.agents) {
    if (a.location.kind === "node") {
      const list = byNode.get(a.location.nodeId) ?? [];
      list.push(a);
      byNode.set(a.location.nodeId, list);
    }
  }
  for (const list of byNode.values()) {
    list.forEach((a, idx) => order.set(a.id, { idx, count: list.length }));
  }

  return (
    <div
      className="campaign-map"
      onClick={() => onSelectAgent(null)}
      role="application"
      aria-label="Campaign map"
    >
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none">
        <defs>
          <marker
            id="cm-arrow"
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

        {/* Paths */}
        {state.edges.map((edge) => {
          const a = findNode(state, edge.from)!;
          const b = findNode(state, edge.to)!;
          const danger = edge.danger as DangerLevel;
          const selectable = selectableEdgeIds.has(edge.id);
          const mid = labelPoint(a, b);
          const word = dangerWord(danger);
          const plateW = word.length * 1.7 + 3;
          return (
            <g key={edge.id}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={`map-edge${selectable ? " selectable" : ""}`}
                stroke={DANGER_COLOR[danger]}
                strokeDasharray={DANGER_DASH[danger]}
              >
                <title>{dangerLabel(danger)}</title>
              </line>
              {selectable &&
                (() => {
                  // Arrow points from the selected agent's node toward the
                  // reachable neighbour, so it's obvious where it can go.
                  const here = selectedNode === edge.from ? a : b;
                  const there = selectedNode === edge.from ? b : a;
                  const tail = lerp(here, there, 0.52);
                  const head = lerp(here, there, 0.66);
                  return (
                    <>
                      <line
                        x1={tail.x}
                        y1={tail.y}
                        x2={head.x}
                        y2={head.y}
                        className="map-dir-arrow"
                        stroke={DANGER_COLOR[danger]}
                        markerEnd="url(#cm-arrow)"
                      />
                      <line
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        className="map-edge-hit"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selected) onMove(selected.id, edge.id);
                        }}
                      />
                    </>
                  );
                })()}
              <rect
                className="map-edge-plate"
                x={mid.x - plateW / 2}
                y={mid.y - 3}
                width={plateW}
                height={4.6}
                rx={1.4}
                fill={DANGER_COLOR[danger]}
              />
              <text x={mid.x} y={mid.y + 0.3} className="map-edge-label" textAnchor="middle">
                {word}
              </text>
            </g>
          );
        })}

        {/* "Just sent" arrows: origin -> agent, for agents in transit */}
        {state.agents.map((agent) => {
          if (agent.location.kind !== "transit") return null;
          const o = findNode(state, agent.location.origin)!;
          const pt = agentPoint(state, agent, 0, 1);
          const danger = (state.edges.find((e) => e.id === (agent.location as { edgeId: string }).edgeId)
            ?.danger ?? 1) as DangerLevel;
          return (
            <line
              key={`arrow-${agent.id}`}
              x1={o.x}
              y1={o.y}
              x2={pt.x}
              y2={pt.y}
              className="map-arrow"
              stroke={DANGER_COLOR[danger]}
              markerEnd="url(#cm-arrow)"
            />
          );
        })}
      </svg>

      {/* Node medallions (HTML overlay) */}
      {state.nodes.map((node: MapNode) => (
        <div
          key={node.id}
          className={`map-node${selectedNode === node.id ? " current" : ""}${
            reachableNodeIds.has(node.id) ? " reachable" : ""
          }`}
          style={{ left: `${leftPct(node.x)}%`, top: `${topPct(node.y)}%` }}
        >
          <span className="map-node-medallion">
            <Icon name={node.icon} size={26} />
          </span>
          <span className="map-node-label">{node.name}</span>
        </div>
      ))}

      {/* Agent tokens (HTML overlay) */}
      {state.agents.map((agent) => {
        const o = order.get(agent.id) ?? { idx: 0, count: 1 };
        const pt = agentPoint(state, agent, o.idx, o.count);
        return (
          <AgentPiece
            key={agent.id}
            agent={agent}
            leftPct={leftPct(pt.x)}
            topPct={topPct(pt.y)}
            selected={agent.id === selectedAgentId}
            statusLabel={statusFor(state, agent)}
            onClick={onSelectAgent}
          />
        );
      })}
    </div>
  );
}
