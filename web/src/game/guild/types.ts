// Asset Report — guild layer types (Phase A+).
//
// Additive, self-contained domain for the guild-master turn sim. None of the
// existing combat/day/economy types are modified; where we need to talk to the
// combat engine we re-export its public shapes and adapt at the boundary
// (see combatAdapter.ts).

import type { CombatOutcome } from "../combat";
import type { HeroClass } from "../types";

// Re-export so guild consumers depend on this module, not deep engine paths.
export type { CombatOutcome } from "../combat";
export type { HeroClass } from "../types";

// --- Node map ---------------------------------------------------------------

export type NodeId = string;

/** A place on the world map — a town, a quest site, a waypoint. */
export interface MapNode {
  id: NodeId;
  name: string;
  /** Optional flavour kind, purely cosmetic. */
  kind?: "town" | "wild" | "dungeon" | "ruin";
  /**
   * If set, arriving here resolves a quest fight against this monster type.
   * (Consumed via the combat adapter; the engine's MonsterType.)
   */
  questMonster?: import("../types").MonsterType | null;
  /** How many of the quest monster appear on arrival (default 1). */
  questCount?: number;
}

/**
 * A road between two nodes. Treated as UNDIRECTED by the graph helpers
 * (adjacency is built both ways), but stored once.
 */
export interface Edge {
  from: NodeId;
  to: NodeId;
  /** Turns it takes to traverse this edge (>= 1). Summed into the ETA. */
  travelTurns: number;
  /** Per-travel-turn chance (0..1) of a random roadside encounter. */
  encounterChance: number;
  /** Monster met on a roadside encounter along this edge. */
  encounterMonster?: import("../types").MonsterType;
  /** How many appear in a roadside encounter (default 1). */
  encounterCount?: number;
}

export interface WorldGraph {
  nodes: MapNode[];
  edges: Edge[];
}

/** Result of a shortest-path query. */
export interface PathResult {
  /** Node ids from origin to destination, inclusive. Empty if unreachable. */
  path: NodeId[];
  /** Sum of edge.travelTurns along the path. 0 for a same-node path. */
  travelTurns: number;
  /** True when no path exists between the two nodes. */
  unreachable: boolean;
}

// --- Actors -----------------------------------------------------------------

/**
 * A hero's combat-relevant stats — enough to build an engine Hero in the
 * adapter and to chain HP/XP across encounters on a single journey.
 */
export interface HeroStats {
  level: number;
  heroClass: HeroClass;
  maxHp: number;
  /** Current HP. Threaded between encounters; healed between dispatches. */
  hp: number;
  experience: number;
}

/** A guild hero. `trust` (0..100) gates the fidelity of the reports you get back. */
export interface Hero {
  id: string;
  name: string;
  stats: HeroStats;
  /** 0..100. Low trust corrupts/blinds the field agent (see fidelity.ts). */
  trust: number;
}

/** A field agent who shadows a hero and files reports. */
export interface Agent {
  id: string;
  name: string;
  /** 0..100. Better agents raise the ceiling on report fidelity. */
  quality: number;
  alive: boolean;
}

// --- Dispatch ---------------------------------------------------------------

export type DispatchStatus =
  | "traveling" // en route to the destination
  | "arrived" // reached destination, quest resolved
  | "lost"; // hero failed to return (tier-0 corruption / wipe)

/**
 * A hero (optionally shadowed by an agent) sent to a destination node along a
 * precomputed path. `stepIndex` is the index of the CURRENT edge being
 * traversed (0 = path[0]->path[1]); `legTurnsLeft` is travel-turns remaining
 * on that edge. Reports/outcomes accumulate as the journey unfolds (Phase B/C).
 */
export interface Dispatch {
  id: string;
  heroId: string;
  agentId: string | null;
  destNodeId: NodeId;
  path: NodeId[];
  stepIndex: number;
  legTurnsLeft: number;
  status: DispatchStatus;
  /** Turn number (1-based) on which this dispatch was created. */
  startedTurn: number;
  /**
   * Everything that happened on this dispatch, newest last. Each entry pairs
   * the GROUND TRUTH outcome (never discarded) with the PresentedReport the
   * player actually sees (Phase C).
   */
  log: DispatchEvent[];
}

/** What kind of thing produced a report. */
export type EncounterKind = "road" | "quest";

/**
 * A single resolved event on a dispatch: the true combat outcome plus the
 * (possibly distorted) report shown to the player. The presented report is
 * filled in by Phase C; in Phase B only `truth` is populated.
 */
export interface DispatchEvent {
  turn: number;
  kind: EncounterKind;
  nodeId: NodeId; // where it happened (arrival node, or edge.to for road)
  /** GROUND TRUTH — the real combat result. Never mutated/discarded. */
  truth: CombatOutcome;
  /** The fidelity tier this report was rendered at (Phase C). */
  tier?: FidelityTier;
  /** What the player actually reads (Phase C). */
  presented?: PresentedReport;
}

// --- Fidelity / reports (Phase C) ------------------------------------------

/**
 * 0 no-witness   — outcome only, or "did not return".
 * 1 hearsay      — short summary, may be wrong.
 * 2 eyewitness   — turn log, biased / colored.
 * 3 embedded     — faithful full log == ground truth.
 * 4 compromised  — fabricated, convincing, and provably FALSE.
 */
export type FidelityTier = 0 | 1 | 2 | 3 | 4;

/** What the player sees for one event. Tier shapes which fields are present. */
export interface PresentedReport {
  tier: FidelityTier;
  /** One-line headline always present (even tier 0 has a cold "no word"). */
  headline: string;
  /** Body lines — a (possibly distorted) battle log; empty for tier 0. */
  lines: string[];
  /** The outcome as the player understands it (may be a lie at tier 4). */
  claimedDefeated: boolean;
  claimedGold: number;
  claimedKills: number;
  /** True when this report is known-fabricated (tier 4). For the audit view. */
  fabricated: boolean;
  /** True when no witness returned info (tier 0). */
  silent: boolean;
}
