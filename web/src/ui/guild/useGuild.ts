// React state hook for the Asset Report (guild) screen. Thin layer over the
// pure guild/ logic: holds GuildState, advances turns through the standard
// reporter, dispatches heroes, and persists to the assetReport.v1 namespace.

import { useCallback, useEffect, useRef, useState } from "react";
import { advanceTurn } from "../../game/guild/turnEngine";
import { standardReporter } from "../../game/guild/reporter";
import {
  createInitialGuildState,
  dispatchHero,
  type GuildState,
} from "../../game/guild/state";
import {
  clearGuildSave,
  loadGuildState,
  saveGuildState,
} from "../../game/guild/persistence";
import type { NodeId } from "../../game/guild/types";

export interface GuildApi {
  state: GuildState;
  endTurn: () => void;
  dispatch: (heroId: string, destNodeId: NodeId, agentId: string | null) => void;
  reset: () => void;
}

export function useGuild(): GuildApi {
  const [state, setState] = useState<GuildState>(() => loadGuildState());
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    saveGuildState(state);
  }, [state]);

  const endTurn = useCallback(() => {
    setState((s) => advanceTurn(s, { reporter: standardReporter }));
  }, []);

  const dispatch = useCallback(
    (heroId: string, destNodeId: NodeId, agentId: string | null) => {
      setState((s) => dispatchHero(s, heroId, destNodeId, agentId));
    },
    [],
  );

  const reset = useCallback(() => {
    clearGuildSave();
    setState(createInitialGuildState());
  }, []);

  return { state, endTurn, dispatch, reset };
}
