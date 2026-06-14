// Game state hook. A thin React layer over the pure game/ reducers: holds the
// GameState, exposes typed actions, advances days, and persists to localStorage.

import { useCallback, useEffect, useRef, useState } from "react";
import { advanceDay } from "../game/dayEngine";
import {
  buildBuilding,
  recruitHero,
  upgradeBuilding,
} from "../game/economy";
import { clearSave, loadState, saveState } from "../game/persistence";
import type { BuildingType, GameState, HeroClass } from "../game/types";
import { createInitialState } from "../game/economy";

export interface GameApi {
  state: GameState;
  endDay: () => void;
  build: (type: BuildingType) => void;
  upgrade: (buildingId: number) => void;
  recruit: (heroClass: HeroClass) => void;
  reset: () => void;
}

export function useGame(): GameApi {
  const [state, setState] = useState<GameState>(() => loadState());
  // Skip persisting on the very first render (we just loaded it).
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    saveState(state);
  }, [state]);

  const endDay = useCallback(() => {
    setState((s) => advanceDay(s).state);
  }, []);

  const build = useCallback((type: BuildingType) => {
    setState((s) => buildBuilding(s, type));
  }, []);

  const upgrade = useCallback((buildingId: number) => {
    setState((s) => upgradeBuilding(s, buildingId));
  }, []);

  const recruit = useCallback((heroClass: HeroClass) => {
    setState((s) => recruitHero(s, heroClass));
  }, []);

  const reset = useCallback(() => {
    clearSave();
    setState(createInitialState());
  }, []);

  return { state, endDay, build, upgrade, recruit, reset };
}
