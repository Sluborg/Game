// Campaign mode data model. The player is the Guild Master of a Village, moving
// agents around a node map. All structures are plain & serializable (no functions,
// no Maps) so the localStorage snapshot pattern in persistence.ts works verbatim.

// Heraldic emblem keys owned by the game layer (the UI's icons.tsx maps each key
// to an SVG). Kept here so game/ stays free of any ui/ dependency.
export type IconKey =
  | "village"
  | "mine"
  | "ruins"
  | "forest"
  | "quests"
  | "rumors"
  | "relations"
  | "business"
  | "recruit"
  | "follow"
  | "guildHall"
  | "train";

// Fixed node set for the starter map; string ids so edges/agents reference them
// stably across saves.
export type NodeId = "VILLAGE" | "FOREST" | "MINES" | "RUINS";

export type NodeKind = "HOME" | "FOREST" | "MINES" | "RUINS";

// Danger 1 (safe) .. 5 (deadly). Drives edge color + dash pattern.
export type DangerLevel = 1 | 2 | 3 | 4 | 5;

export interface MapNode {
  id: NodeId;
  kind: NodeKind;
  name: string;
  icon: IconKey; // heraldic emblem, rendered via icons.tsx (not emoji)
  x: number; // SVG viewBox coords, see CampaignMap
  y: number;
}

export interface MapEdge {
  id: string; // canonical `${from}->${to}`
  from: NodeId;
  to: NodeId;
  danger: DangerLevel;
  turnCost: number; // 1 (safe) or 2 (unsafe)
}

// Flavor-only skill shown on the agent card (no mechanical effect yet).
export interface AgentSkill {
  name: string;
  rating: number; // 1..5, rendered as pips
}

// Action ids drive report grouping + menu rendering.
export type AgentActionType =
  | "QUESTS" // Look for Quests
  | "RUMORS" // Gather Rumors
  | "RELATIONS" // Build Relations
  | "BUSINESS" // Investigate Business
  | "RECRUIT" // Recruit
  | "FOLLOW" // Follow Adventurers (disabled / coming soon)
  | "GUILD_HALL" // Guild Hall management (home only)
  | "TRAIN" // Train (home only)
  | "IDLE"; // default, did nothing this turn

// Where an agent physically is.
export type AgentLocation =
  | { kind: "node"; nodeId: NodeId }
  | {
      kind: "transit";
      edgeId: string;
      origin: NodeId; // the "just sent from" node — drives the arrow
      destination: NodeId;
      remainingTurns: number; // decremented each turn; arrives at 0
    };

export interface Agent {
  id: number;
  name: string;
  portrait: string; // committed image filename, e.g. "portrait-01.svg"
  skills: AgentSkill[];
  location: AgentLocation;
  currentAction: AgentActionType; // what it's doing this turn (status label)
}

// One line in the Asset Report.
export type ResultKind = "action" | "arrival" | "transit" | "idle";

export interface ActionResult {
  id: string; // unique per entry (turn + agent + seq) for React keys
  agentId: number;
  agentName: string;
  action: AgentActionType; // grouping key for "by action" (default)
  nodeId: NodeId; // grouping key for "by area"
  text: string;
  kind: ResultKind; // for color-coding
}

export interface CampaignState {
  turn: number;
  nodes: MapNode[];
  edges: MapEdge[];
  agents: Agent[];
  nextAgentId: number;
  // Results of the turn just ended, shown at the start of the current turn.
  // Replaced wholesale each turn (not an accumulating log). Empty on turn 1.
  lastReport: ActionResult[];
}
