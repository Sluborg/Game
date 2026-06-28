// Turn engine — the heart of the guild loop.
//
// advanceTurn() moves every active dispatch forward by one travel-turn:
//   * traverse the current edge; roll a seeded encounter against its chance;
//   * on an encounter, resolve a real fight via the combat adapter and store
//     the GROUND-TRUTH CombatOutcome on the dispatch;
//   * when the current edge is fully traversed, step to the next node;
//   * on arrival at the destination, resolve the quest fight (if any).
//
// Everything stochastic flows from the base seed, so any turn is replayable:
// same GuildState + same seed => identical result. The combat engine itself is
// deterministic, so it needs no seed.
//
// The optional `reporter` hook turns a ground-truth event into the (possibly
// distorted) PresentedReport the player sees. Phase C supplies the real one;
// without it, events carry truth only.

import type {
  Agent,
  CombatOutcome,
  Dispatch,
  DispatchEvent,
  EncounterKind,
  FidelityTier,
  Hero,
  PresentedReport,
} from "./types";
import { resolveEncounter } from "./combatAdapter";
import { deriveSeed, hashStr, makeRng } from "./rng";
import { edgeBetween } from "./graph";
import type { GuildState } from "./state";

export interface ReportContext {
  hero: Hero;
  agent: Agent | null;
  outcome: CombatOutcome;
  kind: EncounterKind;
  nodeId: string;
  /** Seed dedicated to this report's distortion rolls. */
  seed: number;
}

export interface ReportResult {
  tier: FidelityTier;
  presented: PresentedReport;
  /** Optional: a corruption event killed the agent (tier-0 path). */
  agentKilled?: boolean;
  /** Optional: the hero was lost (did not return). */
  heroLost?: boolean;
}

export type Reporter = (ctx: ReportContext) => ReportResult;

export interface AdvanceOptions {
  reporter?: Reporter;
}

/**
 * Run one turn. Returns a fresh GuildState (input is not mutated). Dispatches
 * already "arrived" / "lost" are carried through untouched.
 */
export function advanceTurn(state: GuildState, options: AdvanceOptions = {}): GuildState {
  const turn = state.turn + 1;
  const turnSeed = deriveSeed(state.seed, turn);

  // Working copies we thread through the dispatch loop.
  const heroMap = new Map<string, Hero>(state.heroes.map((h) => [h.id, h]));
  const agentMap = new Map<string, Agent>(state.agents.map((a) => [a.id, a]));
  let gold = state.gold;

  const newDispatches = state.dispatches.map((d) => {
    if (d.status !== "traveling") return d;

    const dispatchSeed = deriveSeed(turnSeed, hashStr(d.id));
    const rng = makeRng(dispatchSeed);
    let dispatch: Dispatch = { ...d, log: [...d.log] };

    const hero0 = heroMap.get(dispatch.heroId);
    if (!hero0) return dispatch; // hero vanished; nothing to do

    // Resolve one fight, store truth + (optionally) a presented report.
    const fight = (
      kind: EncounterKind,
      nodeId: string,
      type: import("../types").MonsterType,
      count: number,
      eventSeed: number,
    ): void => {
      const hero = heroMap.get(dispatch.heroId)!;
      const agent = dispatch.agentId ? agentMap.get(dispatch.agentId) ?? null : null;
      const { outcome, heroAfter } = resolveEncounter(
        hero,
        type,
        count,
        deriveSeed(eventSeed, 0xc0ffee),
      );
      heroMap.set(hero.id, heroAfter);
      gold += outcome.goldEarned;

      const event: DispatchEvent = { turn, kind, nodeId, truth: outcome };
      if (options.reporter) {
        const r = options.reporter({
          hero: heroAfter,
          agent,
          outcome,
          kind,
          nodeId,
          seed: deriveSeed(eventSeed, 0x12345),
        });
        event.tier = r.tier;
        event.presented = r.presented;
        if (r.agentKilled && agent) agentMap.set(agent.id, { ...agent, alive: false });
        if (r.heroLost) dispatch.status = "lost";
      }
      dispatch.log.push(event);

      // Hero down => lost, no further travel.
      if (heroMap.get(hero.id)!.stats.hp <= 0) dispatch.status = "lost";
    };

    // Already standing on the destination (e.g. zero-length path): resolve quest.
    if (dispatch.stepIndex >= dispatch.path.length - 1) {
      arriveAndResolveQuest(dispatch, state, fight, deriveSeed(dispatchSeed, 0xa));
      return dispatch;
    }

    const from = dispatch.path[dispatch.stepIndex];
    const to = dispatch.path[dispatch.stepIndex + 1];
    const edge = edgeBetween(state.graph, from, to);

    // Roll one roadside encounter for this travel-turn.
    if (edge && edge.encounterMonster && rng.chance(edge.encounterChance)) {
      fight(
        "road",
        to,
        edge.encounterMonster,
        edge.encounterCount ?? 1,
        deriveSeed(dispatchSeed, dispatch.stepIndex + 1, dispatch.legTurnsLeft),
      );
    }
    if (dispatch.status !== "traveling") return dispatch;

    // Spend one travel-turn on this edge.
    dispatch.legTurnsLeft -= 1;
    if (dispatch.legTurnsLeft <= 0) {
      dispatch.stepIndex += 1;
      if (dispatch.stepIndex >= dispatch.path.length - 1) {
        arriveAndResolveQuest(dispatch, state, fight, deriveSeed(dispatchSeed, 0xb));
      } else {
        const next = edgeBetween(
          state.graph,
          dispatch.path[dispatch.stepIndex],
          dispatch.path[dispatch.stepIndex + 1],
        );
        dispatch.legTurnsLeft = next ? next.travelTurns : 1;
      }
    }
    return dispatch;
  });

  return {
    ...state,
    turn,
    gold,
    heroes: Array.from(heroMap.values()),
    agents: Array.from(agentMap.values()),
    dispatches: newDispatches,
  };
}

function arriveAndResolveQuest(
  dispatch: Dispatch,
  state: GuildState,
  fight: (
    kind: EncounterKind,
    nodeId: string,
    type: import("../types").MonsterType,
    count: number,
    eventSeed: number,
  ) => void,
  questSeed: number,
): void {
  const node = state.graph.nodes.find((n) => n.id === dispatch.destNodeId);
  if (node?.questMonster) {
    fight("quest", node.id, node.questMonster, node.questCount ?? 1, questSeed);
  }
  if (dispatch.status === "traveling") dispatch.status = "arrived";
}
