// A single agent token: a 16px rounded square holding the agent's portrait, with a
// short status label above its head. Rendered as an absolutely-positioned HTML
// overlay on top of the SVG map (so the portrait stays crisp under viewBox scaling).

import type { Agent } from "../../../game/campaign/types";

const BASE = import.meta.env.BASE_URL;

interface Props {
  agent: Agent;
  leftPct: number;
  topPct: number;
  selected: boolean;
  statusLabel: string;
  onClick: (id: number) => void;
}

export function AgentPiece({ agent, leftPct, topPct, selected, statusLabel, onClick }: Props) {
  return (
    <button
      type="button"
      className={`agent-piece${selected ? " selected" : ""}`}
      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(agent.id);
      }}
      title={statusLabel ? `${agent.name} — ${statusLabel}` : agent.name}
    >
      {statusLabel && <span className="agent-status">{statusLabel}</span>}
      <span className="agent-square">
        <img src={`${BASE}portraits/${agent.portrait}`} alt="" draggable={false} />
      </span>
    </button>
  );
}
