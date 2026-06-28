// The node action menu for the selected agent. Buttons come from MENU_ACTIONS,
// filtered by node kind (home-only actions only at the Village). Disabled actions
// (e.g. Follow Adventurers) are shown but not selectable. Each button shows its
// emblem. Actions don't do anything yet — they set the agent's activity for the turn.

import { ACTION_DEFS, MENU_ACTIONS } from "../../../game/campaign/data";
import type { Agent, AgentActionType, MapNode } from "../../../game/campaign/types";
import { Icon } from "./icons";

interface Props {
  agent: Agent;
  node: MapNode;
  onAction: (agentId: number, action: AgentActionType) => void;
}

export function NodeActionMenu({ agent, node, onAction }: Props) {
  const atHome = node.kind === "HOME";
  const actions = MENU_ACTIONS.filter((a) => !ACTION_DEFS[a].homeOnly || atHome);
  return (
    <div className="action-menu">
      {actions.map((action) => {
        const def = ACTION_DEFS[action];
        const active = agent.currentAction === action;
        const disabled = !def.enabled;
        return (
          <button
            key={action}
            className={`btn btn-action${active ? " active" : ""}`}
            disabled={disabled}
            title={disabled ? `${def.label} — coming soon` : def.label}
            onClick={() => onAction(agent.id, action)}
          >
            <Icon name={def.icon} size={15} />
            <span>{def.label}</span>
            {disabled && <span className="soon">soon</span>}
          </button>
        );
      })}
    </div>
  );
}
