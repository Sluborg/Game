// localStorage persistence for the guild layer. Its OWN namespace key, so the
// existing "majesty-day:v1" save is never touched. The world graph is NOT
// persisted (it is static data) — it is rehydrated from mapData on load, so map
// edits always take effect.

import { createInitialGuildState, type GuildState } from "./state";
import { TEST_WORLD } from "./mapData";

const SAVE_KEY = "assetReport.v1";
const SAVE_VERSION = 1;

type PersistedState = Omit<GuildState, "graph">;

interface SaveEnvelope {
  version: number;
  state: PersistedState;
}

export function loadGuildState(): GuildState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createInitialGuildState();
    const parsed = JSON.parse(raw) as SaveEnvelope;
    if (parsed.version !== SAVE_VERSION || !parsed.state) {
      return createInitialGuildState();
    }
    return { ...parsed.state, graph: TEST_WORLD };
  } catch {
    return createInitialGuildState();
  }
}

export function saveGuildState(state: GuildState): void {
  try {
    const { graph: _graph, ...rest } = state;
    const envelope: SaveEnvelope = { version: SAVE_VERSION, state: rest };
    localStorage.setItem(SAVE_KEY, JSON.stringify(envelope));
  } catch {
    // Ignore quota / unavailable storage; the game still runs in memory.
  }
}

export function clearGuildSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // no-op
  }
}
