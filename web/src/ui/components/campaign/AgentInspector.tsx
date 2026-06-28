// Detail card for the selected agent: portrait, name, flavor skills (as pips),
// current activity, and — when standing at a node — the NodeActionMenu. Hidden when
// nothing is selected. Movement is done by clicking paths on the map, not here.

import { ACTION_DEFS, findNode } from "../../../game/campaign/data";
import type {
  Agent,
  AgentActionType,
  CampaignState,
} from "../../../game/campaign/types";
import { NodeActionMenu } from "./NodeActionMenu";

const BASE = import.meta.env.BASE_URL;

interface Props {
  agent: Agent | null;
  state: CampaignState;
  onAction: (agentId: number, action: AgentActionType) => void;
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

export function AgentInspector({ agent, state, onAction, onDeselect }: Props) {
  if (!agent) return null;
  const atNode = agent.location.kind === "node" ? findNode(state, agent.location.nodeId) : undefined;

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
          <NodeActionMenu agent={agent} node={atNode} onAction={onAction} />
        ) : (
          <div className="card-sub">On the road — give new orders when it arrives.</div>
        )}
      </div>
    </div>
  );
}
