// Static campaign data: the action catalog and the initial-state factory.
// Analogous to economy.createInitialState for the kingdom game.

import type { IconKey } from "../../ui/components/campaign/icons";
import type {
  AgentActionType,
  CampaignState,
  MapEdge,
  MapNode,
  NodeId,
} from "./types";

export interface ActionDef {
  label: string;
  icon: IconKey;
  homeOnly: boolean; // only available at the HOME node (Village)
  enabled: boolean; // false => shown but not selectable ("Coming soon")
  reportVerb: string; // fragment for report text: "looked for Quests"
}

export const ACTION_DEFS: Record<AgentActionType, ActionDef> = {
  QUESTS: { label: "Look for Quests", icon: "quests", homeOnly: false, enabled: true, reportVerb: "looked for Quests" },
  RUMORS: { label: "Gather Rumors", icon: "rumors", homeOnly: false, enabled: true, reportVerb: "gathered Rumors" },
  RELATIONS: { label: "Build Relations", icon: "relations", homeOnly: false, enabled: true, reportVerb: "built Relations" },
  BUSINESS: { label: "Investigate Business", icon: "business", homeOnly: false, enabled: true, reportVerb: "investigated Business" },
  RECRUIT: { label: "Recruit", icon: "recruit", homeOnly: false, enabled: true, reportVerb: "looked to Recruit" },
  FOLLOW: { label: "Follow Adventurers", icon: "follow", homeOnly: false, enabled: false, reportVerb: "followed Adventurers" },
  GUILD_HALL: { label: "Guild Hall", icon: "guildHall", homeOnly: true, enabled: true, reportVerb: "managed the Guild Hall" },
  TRAIN: { label: "Train", icon: "train", homeOnly: true, enabled: true, reportVerb: "trained at the Village" },
  IDLE: { label: "Idle", icon: "recruit", homeOnly: false, enabled: true, reportVerb: "waited" },
};

// Actions offered in the node action menu, in display order. IDLE is implicit
// (the reset state), not a menu choice.
export const MENU_ACTIONS: AgentActionType[] = [
  "QUESTS",
  "RUMORS",
  "RELATIONS",
  "BUSINESS",
  "RECRUIT",
  "FOLLOW",
  "GUILD_HALL",
  "TRAIN",
];

const NODES: MapNode[] = [
  { id: "VILLAGE", kind: "HOME", name: "Village", icon: "village", x: 20, y: 35 },
  { id: "FOREST", kind: "FOREST", name: "Forest", icon: "forest", x: 70, y: 15 },
  { id: "MINES", kind: "MINES", name: "Mines", icon: "mine", x: 70, y: 55 },
  { id: "RUINS", kind: "RUINS", name: "Ruins", icon: "ruins", x: 90, y: 35 },
];

// Stored once; treated as undirected by edgesFrom so agents can return home.
const EDGES: MapEdge[] = [
  { id: "VILLAGE->FOREST", from: "VILLAGE", to: "FOREST", danger: 1, turnCost: 1 },
  { id: "VILLAGE->MINES", from: "VILLAGE", to: "MINES", danger: 1, turnCost: 1 },
  { id: "FOREST->RUINS", from: "FOREST", to: "RUINS", danger: 4, turnCost: 2 },
  { id: "MINES->RUINS", from: "MINES", to: "RUINS", danger: 4, turnCost: 2 },
];

export function createInitialCampaignState(): CampaignState {
  return {
    turn: 1,
    nodes: NODES.map((n) => ({ ...n })),
    edges: EDGES.map((e) => ({ ...e })),
    nextAgentId: 3,
    lastReport: [],
    agents: [
      {
        id: 1,
        name: "JimBob Agentson",
        portrait: "portrait-01.svg",
        skills: [
          { name: "Scouting", rating: 4 },
          { name: "Haggling", rating: 2 },
          { name: "Lockpicking", rating: 3 },
        ],
        location: { kind: "node", nodeId: "VILLAGE" },
        currentAction: "IDLE",
      },
      {
        id: 2,
        name: "Mathilda Quillfeather",
        portrait: "portrait-02.svg",
        skills: [
          { name: "Diplomacy", rating: 5 },
          { name: "Lore", rating: 3 },
          { name: "Stealth", rating: 2 },
        ],
        location: { kind: "node", nodeId: "VILLAGE" },
        currentAction: "IDLE",
      },
    ],
  };
}

/** Edges touching a node, treated as undirected (either endpoint matches). */
export function edgesFrom(state: CampaignState, nodeId: NodeId): MapEdge[] {
  return state.edges.filter((e) => e.from === nodeId || e.to === nodeId);
}

/** The other endpoint of an edge relative to a node. */
export function otherEnd(edge: MapEdge, nodeId: NodeId): NodeId {
  return edge.from === nodeId ? edge.to : edge.from;
}

export function nodeName(state: CampaignState, nodeId: NodeId): string {
  return state.nodes.find((n) => n.id === nodeId)?.name ?? nodeId;
}

export function findNode(state: CampaignState, nodeId: NodeId): MapNode | undefined {
  return state.nodes.find((n) => n.id === nodeId);
}
