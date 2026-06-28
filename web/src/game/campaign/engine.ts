// Pure campaign turn engine, analogous to dayEngine.advanceDay. No React, no DOM.
// advanceTurn processes transit + actions and returns a fresh state + report.
// orderMove / orderAction are validated order helpers called from the hook.

import { ACTION_DEFS, edgesFrom, nodeName } from "./data";
import type {
  ActionResult,
  Agent,
  AgentActionType,
  CampaignState,
  MapEdge,
  ResultKind,
} from "./types";

export interface TurnResult {
  state: CampaignState;
  report: ActionResult[];
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * Advance one turn. Agents in transit progress (arriving when remaining hits 0);
 * agents at a node report on their chosen action and reset to IDLE.
 */
export function advanceTurn(state: CampaignState): TurnResult {
  const turn = state.turn + 1;
  const report: ActionResult[] = [];
  let seq = 0;
  const push = (
    agent: Agent,
    nodeId: ActionResult["nodeId"],
    action: AgentActionType,
    kind: ResultKind,
    text: string,
  ) => {
    report.push({
      id: `${turn}-${agent.id}-${seq++}`,
      agentId: agent.id,
      agentName: agent.name,
      action,
      nodeId,
      kind,
      text,
    });
  };

  const agents = state.agents.map((agent): Agent => {
    if (agent.location.kind === "transit") {
      const { destination, edgeId, origin } = agent.location;
      const remaining = agent.location.remainingTurns - 1;
      if (remaining <= 0) {
        push(agent, destination, "IDLE", "arrival", `${agent.name} arrived at the ${nodeName(state, destination)}.`);
        return { ...agent, location: { kind: "node", nodeId: destination }, currentAction: "IDLE" };
      }
      push(
        agent,
        destination,
        "IDLE",
        "transit",
        `${agent.name} is travelling to the ${nodeName(state, destination)} (${plural(remaining, "turn")} left).`,
      );
      return { ...agent, location: { kind: "transit", edgeId, origin, destination, remainingTurns: remaining } };
    }

    // At a node: report on the chosen action, then reset to IDLE for next turn.
    const nodeId = agent.location.nodeId;
    if (agent.currentAction === "IDLE") {
      push(agent, nodeId, "IDLE", "idle", `${agent.name} waited at the ${nodeName(state, nodeId)}.`);
    } else {
      const def = ACTION_DEFS[agent.currentAction];
      push(agent, nodeId, agent.currentAction, "action", `${agent.name} ${def.reportVerb} in the ${nodeName(state, nodeId)}.`);
    }
    return { ...agent, currentAction: "IDLE" };
  });

  return { state: { ...state, turn, agents, lastReport: report }, report };
}

function replaceAgent(state: CampaignState, agentId: number, next: Agent): CampaignState {
  return { ...state, agents: state.agents.map((a) => (a.id === agentId ? next : a)) };
}

/**
 * Send an agent onto an edge. The agent steps onto the path immediately (so the
 * "just sent" arrow renders before End Turn); advanceTurn only decrements.
 * No-op if the agent is not at a node touching that edge.
 */
export function orderMove(state: CampaignState, agentId: number, edgeId: string): CampaignState {
  const agent = state.agents.find((a) => a.id === agentId);
  if (!agent || agent.location.kind !== "node") return state;
  const here = agent.location.nodeId;
  const edge: MapEdge | undefined = edgesFrom(state, here).find((e) => e.id === edgeId);
  if (!edge) return state;
  const destination = edge.from === here ? edge.to : edge.from;
  return replaceAgent(state, agentId, {
    ...agent,
    currentAction: "IDLE",
    location: {
      kind: "transit",
      edgeId: edge.id,
      origin: here,
      destination,
      remainingTurns: edge.turnCost,
    },
  });
}

/**
 * Set an agent's action for this turn. Rejected (state unchanged) if the agent is
 * in transit, the action is disabled, or a home-only action is chosen off-home.
 */
export function orderAction(state: CampaignState, agentId: number, action: AgentActionType): CampaignState {
  const agent = state.agents.find((a) => a.id === agentId);
  if (!agent || agent.location.kind !== "node") return state;
  const def = ACTION_DEFS[action];
  if (!def || !def.enabled) return state;
  const atHome = state.nodes.find((n) => n.id === (agent.location as { nodeId: string }).nodeId)?.kind === "HOME";
  if (def.homeOnly && !atHome) return state;
  return replaceAgent(state, agentId, { ...agent, currentAction: action });
}

// ---- Report grouping (pure; used by the AssetReport UI) ----

export type GroupBy = "action" | "area" | "agent";

export interface ReportGroup {
  key: string;
  label: string;
  entries: ActionResult[];
}

/**
 * Group report entries for display. Default "action" groups by action type;
 * "area" by node; "agent" by agent. Order follows first appearance.
 */
export function groupReport(report: ActionResult[], by: GroupBy, state: CampaignState): ReportGroup[] {
  const groups: ReportGroup[] = [];
  const index = new Map<string, ReportGroup>();
  for (const entry of report) {
    let key: string;
    let label: string;
    if (by === "action") {
      key = entry.action;
      label = ACTION_DEFS[entry.action]?.label ?? entry.action;
    } else if (by === "area") {
      key = entry.nodeId;
      label = nodeName(state, entry.nodeId);
    } else {
      key = String(entry.agentId);
      label = entry.agentName;
    }
    let group = index.get(key);
    if (!group) {
      group = { key, label, entries: [] };
      index.set(key, group);
      groups.push(group);
    }
    group.entries.push(entry);
  }
  return groups;
}
