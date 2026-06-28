// Detail card for the selected agent: portrait, name, flavor skills (as pips),
// current activity, a keyboard/touch-accessible "Travel to…" list, and — when
// standing at a node — the NodeActionMenu. Hidden when nothing is selected.

import { ACTION_DEFS, edgesFrom, findNode, nodeName, otherEnd } from "../../../game/campaign/data";
import type {
  Agent,
  AgentActionType,
  CampaignState,
  DangerLevel,
} from "../../../game/campaign/types";
import { DANGER_COLOR, dangerWord } from "./danger";
import { NodeActionMenu } from "./NodeActionMenu";

const BASE = import.meta.env.BASE_URL;

interface Props {
  agent: Agent | null;
  state: CampaignState;
  onAction: (agentId: number, action: AgentActionType) => void;
  onMove: (agentId: number, edgeId: string) => void;
  onDeselect: () => void;
}

function Pips({ rating }: { rating: number }) {
  return (
    <span className="pips">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`pip${i < rating ? " pip-on" : ""}`} />
      ))}
    </span>
  );
}

function activityText(state: CampaignState, agent: Agent): string {
  if (agent.location.kind === "transit") {
    const dest = findNode(state, agent.location.destination)?.name ?? "";
    const left = agent.location.remainingTurns;
    return `Travelling to the ${dest} — ${left} turn${left === 1 ? "" : "s"} left`;
  }
  if (agent.currentAction === "IDLE") return "Awaiting orders";
  return ACTION_DEFS[agent.currentAction].label;
}

export function AgentInspector({ agent, state, onAction, onMove, onDeselect }: Props) {
  if (!agent) return null;
  const atNode = agent.location.kind === "node" ? findNode(state, agent.location.nodeId) : undefined;
  const travelEdges = atNode ? edgesFrom(state, atNode.id) : [];

  return (
    <div className="inspector card">
      <img className="inspector-portrait" src={`${BASE}portraits/${agent.portrait}`} alt="" />
      <div className="card-body">
        <div className="card-head">
          <span className="card-name">{agent.name}</span>
          <button className="btn btn-reset" onClick={onDeselect} title="Deselect">
            ✕
          </button>
        </div>
        <div className="inspector-activity">{activityText(state, agent)}</div>

        <div className="inspector-skills">
          {agent.skills.map((skill) => (
            <div key={skill.name} className="skill-row">
              <span>{skill.name}</span>
              <Pips rating={skill.rating} />
            </div>
          ))}
        </div>

        {atNode ? (
          <>
            <div className="inspector-section-title">Travel</div>
            <div className="travel-menu">
              {travelEdges.map((edge) => {
                const dest = otherEnd(edge, atNode.id);
                const danger = edge.danger as DangerLevel;
                return (
                  <button
                    key={edge.id}
                    className="btn btn-travel"
                    onClick={() => onMove(agent.id, edge.id)}
                    title={`Travel to the ${nodeName(state, dest)} — ${dangerWord(danger)} path, ${edge.turnCost} turn${edge.turnCost === 1 ? "" : "s"}`}
                  >
                    <span className="travel-dot" style={{ background: DANGER_COLOR[danger] }} />
                    <span className="travel-dest">→ {nodeName(state, dest)}</span>
                    <span className="travel-meta">
                      {dangerWord(danger)} · {edge.turnCost}t
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="inspector-section-title">Act here</div>
            <NodeActionMenu agent={agent} node={atNode} onAction={onAction} />
          </>
        ) : (
          <div className="card-sub">On the road — give new orders when it arrives.</div>
        )}
      </div>
    </div>
  );
}
