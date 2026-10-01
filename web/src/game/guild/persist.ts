// Persistence (versioned serializable state) — localStorage save/load with a
// hard guard: ANY parse error or version mismatch discards the blob and reinits,
// and load NEVER throws into render (a corrupt/old save must not white-screen the
// app, and Reset must stay reachable). No migration function — the policy is
// simply discard-and-reinit on mismatch (v1 cut-era saves die on the version
// check). The storage key is unchanged on purpose so old blobs are overwritten,
// not orphaned.

import { createInitialState } from "./state";
import { SAVE_VERSION } from "./tuning";
import type { GuildState } from "./types";

const KEY = "guild.slice1.v1";

/** A fresh run seed. This is the ONE spot allowed to read wall-clock entropy —
 * it runs at the UI boundary (new game / reset), never inside a reducer, so the
 * sim itself stays pure and replayable from the stored seed. */
export function freshSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

export function loadState(seed: number): GuildState {
  if (typeof localStorage === "undefined") return createInitialState(seed);
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return createInitialState(seed);
  }
  if (!raw) return createInitialState(seed);
  try {
    const parsed = JSON.parse(raw) as GuildState;
    if (!parsed || typeof parsed !== "object" || parsed.version !== SAVE_VERSION) {
      return createInitialState(seed);
    }
    // Minimal shape sanity — anything off → reinit rather than render a broken
    // run. Guards every array/object the engine or Hall hard-dereferences
    // (queue/feed for the clock, wallets/buildings for life + the invest card,
    // dayLedger for night) — a truncated blob missing any would TypeError into
    // a white screen.
    if (
      !Array.isArray(parsed.parties) ||
      !Array.isArray(parsed.board) ||
      !Array.isArray(parsed.mail) ||
      !Array.isArray(parsed.queue) ||
      !Array.isArray(parsed.feed) ||
      !Array.isArray(parsed.dayLedger) ||
      typeof parsed.tick !== "number" ||
      // The id/ord counters and gold fields must be real numbers — a blob
      // missing seq would mint ev-NaN/mail-NaN ids and silently break the
      // sealedMailId linking (Review #2 Engineer).
      typeof parsed.seq !== "number" ||
      typeof parsed.rngSeed !== "number" ||
      typeof parsed.gold !== "number" ||
      typeof parsed.dayTakings !== "number" ||
      typeof parsed.villageSink !== "number" ||
      typeof parsed.sinkSeen !== "number" ||
      typeof parsed.wallets !== "object" ||
      parsed.wallets === null ||
      typeof parsed.buildings !== "object" ||
      parsed.buildings === null
    ) {
      return createInitialState(seed);
    }
    return parsed;
  } catch {
    return createInitialState(seed);
  }
}

export function saveState(state: GuildState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota / privacy mode — a failed save must never break the game */
  }
}

export function clearSave(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
