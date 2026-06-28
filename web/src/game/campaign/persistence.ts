// localStorage persistence for campaign mode. Mirrors game/persistence.ts but with
// a separate key/version so it never collides with the kingdom save.

import { createInitialCampaignState } from "./data";
import type { CampaignState } from "./types";

const SAVE_KEY = "guild-campaign:v1";
const SAVE_VERSION = 1;

interface SaveEnvelope {
  version: number;
  state: CampaignState;
}

export function loadCampaign(): CampaignState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createInitialCampaignState();
    const parsed = JSON.parse(raw) as SaveEnvelope;
    if (parsed.version !== SAVE_VERSION || !parsed.state) {
      return createInitialCampaignState();
    }
    return parsed.state;
  } catch {
    return createInitialCampaignState();
  }
}

export function saveCampaign(state: CampaignState): void {
  try {
    const envelope: SaveEnvelope = { version: SAVE_VERSION, state };
    localStorage.setItem(SAVE_KEY, JSON.stringify(envelope));
  } catch {
    // Ignore quota / unavailable storage; the game still runs in-memory.
  }
}

export function clearCampaign(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // no-op
  }
}
