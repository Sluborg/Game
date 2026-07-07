// React binding for the pure guild world-state. All rules live in game/world/;
// this only holds the current state, persists it, and exposes the player actions.
// Seeds come from Math.random HERE (a new run is genuinely random) — never inside
// the pure reducer — and are then stored, so the run replays deterministically.

import { useCallback, useEffect, useState } from "react";
import {
  adjustCut as adjustCutFn,
  endDay as endDayFn,
  load,
  newRun,
  save,
  type QuestTier,
  type WorldState,
} from "../../game/world";

function freshSeed(): number {
  return (Math.random() * 2 ** 32) >>> 0;
}

export function useGuildState() {
  const [state, setState] = useState<WorldState>(() => load() ?? newRun(freshSeed()));

  useEffect(() => {
    save(state); // save() swallows write failures; a storage error never breaks the loop
  }, [state]);

  const adjustCut = useCallback((questId: QuestTier, delta: number) => {
    setState((s) => adjustCutFn(s, questId, delta));
  }, []);

  const endDay = useCallback(() => {
    setState((s) => endDayFn(s));
  }, []);

  const startNewRun = useCallback(() => {
    setState(newRun(freshSeed()));
  }, []);

  return { state, adjustCut, endDay, startNewRun };
}
