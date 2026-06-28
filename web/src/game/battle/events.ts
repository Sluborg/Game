// The engine's output contract. A fight is a stream of timestamped events; the
// UI renders them (floaters, lunges, log lines) and never re-derives combat
// logic. State (hp, who's alive) is read separately via engine.getState().

export type FightResult = "victory" | "defeat";

interface BaseEvent {
  /** Simulation time, in seconds, when the event occurred. */
  t: number;
}

/** A unit begins a swing at its target (drives the attack/lunge animation). */
export interface SwingEvent extends BaseEvent {
  kind: "swing";
  sourceId: string;
  sourceCellId: string;
  targetId: string;
  targetCellId: string;
}

/** A swing connected. */
export interface HitEvent extends BaseEvent {
  kind: "hit";
  sourceId: string;
  sourceCellId: string;
  targetId: string;
  targetCellId: string;
  amount: number;
  crit: boolean;
  hpBefore: number;
  hpAfter: number;
  /** True if this hit reduced the target to 0. */
  lethal: boolean;
}

/** A swing was dodged. */
export interface MissEvent extends BaseEvent {
  kind: "miss";
  sourceId: string;
  sourceCellId: string;
  targetId: string;
  targetCellId: string;
}

/** A unit dropped to 0 hp (monster removed from its stack, or hero downed). */
export interface KnockoutEvent extends BaseEvent {
  kind: "knockout";
  unitId: string;
  cellId: string;
  side: "hero" | "monster";
}

/** The fight ended. */
export interface EndEvent extends BaseEvent {
  kind: "end";
  result: FightResult;
}

export type CombatEvent = SwingEvent | HitEvent | MissEvent | KnockoutEvent | EndEvent;
