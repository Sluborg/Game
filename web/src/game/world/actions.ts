// Pure player actions on the world-state (the priced decision). Rules live here,
// not in the React layer.

import { ECONOMY } from "./economy";
import type { QuestTier } from "./economy";
import type { WorldState } from "./types";

function clampCut(cut: number): number {
  return Math.max(ECONOMY.cutMin, Math.min(ECONOMY.cutMax, cut));
}

/** Set a posting's cut (clamped to 20–40). Freely adjustable during the day; the
 *  value in effect when you End Day is what tonight's single acceptance roll uses
 *  — so a mispriced posting costs at most a day, never the whole rot window. */
export function setCut(state: WorldState, questId: QuestTier, cut: number): WorldState {
  return state.quests.some((q) => q.id === questId)
    ? {
        ...state,
        quests: state.quests.map((q) =>
          q.id === questId ? { ...q, cut: clampCut(cut), cutRevisedToday: true } : q,
        ),
      }
    : state;
}

/** Nudge a posting's cut by a delta (the −10 / −5 / +5 / +10 buttons). */
export function adjustCut(state: WorldState, questId: QuestTier, delta: number): WorldState {
  const q = state.quests.find((x) => x.id === questId);
  if (!q) return state;
  return setCut(state, questId, q.cut + delta);
}
