// localStorage persistence. Replaces the Room + DataStore layer. There is no
// offline-progress timer (the game is turn-based now) — we just snapshot the
// whole GameState, including the current day, and restore it on load.

import { createInitialState } from "./economy";
import type { GameState } from "./types";

const SAVE_KEY = "majesty-day:v1";
const SAVE_VERSION = 1;

interface SaveEnvelope {
  version: number;
  state: GameState;
}

export function loadState(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as SaveEnvelope;
    if (parsed.version !== SAVE_VERSION || !parsed.state) {
      return createInitialState();
    }
    return parsed.state;
  } catch {
    return createInitialState();
  }
}

export function saveState(state: GameState): void {
  try {
    const envelope: SaveEnvelope = { version: SAVE_VERSION, state };
    localStorage.setItem(SAVE_KEY, JSON.stringify(envelope));
  } catch {
    // Ignore quota / unavailable storage; the game still runs in-memory.
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // no-op
  }
}
