// Turn counter + agent tally + "End Turn" button. Mirrors the kingdom DayBar.

import type { CampaignState } from "../../../game/campaign/types";

interface Props {
  state: CampaignState;
  onEndTurn: () => void;
}

export function TurnBar({ state, onEndTurn }: Props) {
  const traveling = state.agents.filter((a) => a.location.kind === "transit").length;
  const acting = state.agents.filter(
    (a) => a.location.kind === "node" && a.currentAction !== "IDLE",
  ).length;
  return (
    <div className="daybar turnbar">
      <div className="daybar-info">
        <div className="daybar-day">⏳ Turn {state.turn}</div>
        <div className="daybar-gold">{state.agents.length} agents</div>
        <div className="daybar-income">
          {acting} acting · {traveling} travelling
        </div>
      </div>
      <button className="btn btn-end-day" onClick={onEndTurn}>
        End Turn ▶
      </button>
    </div>
  );
}
