// Campaign state hook. A thin React layer over game/campaign: holds CampaignState,
// advances turns, issues agent orders, tracks the (non-persisted) selection, and
// saves to localStorage. Mirrors useGame.ts.

import { useCallback, useEffect, useRef, useState } from "react";
import { createInitialCampaignState, findNode } from "../game/campaign/data";
import { advanceTurn, orderAction, orderMove } from "../game/campaign/engine";
import { clearCampaign, loadCampaign, saveCampaign } from "../game/campaign/persistence";
import type {
  Agent,
  AgentActionType,
  CampaignState,
  MapNode,
} from "../game/campaign/types";

export interface CampaignApi {
  state: CampaignState;
  selectedAgentId: number | null;
  selectedAgent: Agent | null;
  selectedAgentNode: MapNode | null;
  endTurn: () => void;
  move: (agentId: number, edgeId: string) => void;
  act: (agentId: number, action: AgentActionType) => void;
  selectAgent: (id: number | null) => void;
  reset: () => void;
}

export function useCampaign(): CampaignApi {
  const [state, setState] = useState<CampaignState>(() => loadCampaign());
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);

  // Skip persisting on the very first render (we just loaded it).
  const hydrated = useRef(false);
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    saveCampaign(state);
  }, [state]);

  const endTurn = useCallback(() => {
    setState((s) => advanceTurn(s).state);
  }, []);

  const move = useCallback((agentId: number, edgeId: string) => {
    setState((s) => orderMove(s, agentId, edgeId));
    setSelectedAgentId(null); // order given — deselect for clarity
  }, []);

  const act = useCallback((agentId: number, action: AgentActionType) => {
    setState((s) => orderAction(s, agentId, action));
  }, []);

  const selectAgent = useCallback((id: number | null) => {
    setSelectedAgentId(id);
  }, []);

  const reset = useCallback(() => {
    clearCampaign();
    setState(createInitialCampaignState());
    setSelectedAgentId(null);
  }, []);

  const selectedAgent = state.agents.find((a) => a.id === selectedAgentId) ?? null;
  const selectedAgentNode =
    selectedAgent && selectedAgent.location.kind === "node"
      ? findNode(state, selectedAgent.location.nodeId) ?? null
      : null;

  return {
    state,
    selectedAgentId,
    selectedAgent,
    selectedAgentNode,
    endTurn,
    move,
    act,
    selectAgent,
    reset,
  };
}
